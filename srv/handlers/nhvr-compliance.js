const cds = require('@sap/cds')

module.exports = function registerNhvrComplianceHandlers (srv) {

    srv.before(['CREATE', 'UPDATE'], 'NhvrRouteAssessments', req => {
        const d = req.data
        if (d.assessmentStatus === undefined) d.assessmentStatus = 'Current'
        if (d.validFrom && d.validTo && new Date(d.validTo) <= new Date(d.validFrom)) {
            req.error(400, 'validTo must be after validFrom')
        }
    })

    srv.before(['CREATE', 'UPDATE'], 'BridgeScourAssessmentDetail', req => {
        const d = req.data
        if (d.ap71ScoreNumeric) {
            const map = { 1: 'VeryLow', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'VeryHigh' }
            d.scourRiskCategoryAp71 = map[d.ap71ScoreNumeric] || d.scourRiskCategoryAp71
        }
    })

    srv.on('getNhvrComplianceRate', async req => {
        const { state } = req.data
        const db = await cds.connect.to('db')
        const where = { isDeleted: false }
        if (state) where.state = state
        const bridges = await db.run(SELECT.from('nhvr.Bridge').where(where))
        const totalBridges = bridges.length
        const assessedBridges = bridges.filter(b => b.nhvrRouteAssessed).length

        const today = new Date().toISOString().split('T')[0]
        const warnDate = new Date()
        warnDate.setDate(warnDate.getDate() + 90)
        const warnStr = warnDate.toISOString().split('T')[0]

        const assessments = await db.run(
            SELECT.from('bridge.management.NhvrRouteAssessments')
                .where({ assessmentStatus: 'Current' })
        )
        const currentAssessments = assessments.filter(a => !a.validTo || a.validTo >= today).length
        const expiringSoon = assessments.filter(a => a.validTo && a.validTo >= today && a.validTo <= warnStr).length

        return {
            totalBridges,
            assessedBridges,
            currentAssessments,
            compliancePercent: totalBridges > 0 ? Math.round((currentAssessments / totalBridges) * 100 * 10) / 10 : 0,
            expiringSoon
        }
    })

    srv.on('exportNhvrPortalJson', async req => {
        const { bridgeId } = req.data
        const db = await cds.connect.to('db')
        const assessments = await db.run(
            SELECT.from('bridge.management.NhvrRouteAssessments')
                .where({ bridge_ID: bridgeId, assessmentStatus: 'Current' })
                .orderBy('assessmentDate desc')
                .limit(1)
        )
        const restrictions = await db.run(
            SELECT.from('nhvr.Restriction')
                .where({ bridge_ID: bridgeId, status: 'ACTIVE', isActive: true })
        )

        const output = {
            bridgeId,
            assessmentRef: assessments[0]?.assessmentId,
            conditions: restrictions.map(r => ({
                conditionType: r.restrictionType,
                conditionValue: r.value,
                conditionUnit: r.unit,
                vehicleCategory: r.vehicleClassApplicable,
                directionality: r.directionApplied,
                massLimitType: r.massLimitType,
                grossMassLimit: r.grossMassLimit,
                permitRequired: r.permitRequired
            }))
        }

        return {
            bridgeId,
            conditions: JSON.stringify(output),
            generatedAt: new Date()
        }
    })
}
