const cds = require('@sap/cds')

module.exports = function registerRiskAssessmentHandlers (srv) {

    srv.before(['CREATE', 'UPDATE'], 'BridgeRiskAssessments', async req => {
        const db = await cds.connect.to('db')
        const d = req.data

        if (req.event === 'CREATE' && !d.assessmentId) {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeRiskAssessments')
                    .columns('assessmentId').orderBy('assessmentId desc').limit(1)
            )
            const seq = last?.assessmentId ? parseInt(last.assessmentId.replace('RSK-', ''), 10) + 1 : 1
            d.assessmentId = `RSK-${String(seq).padStart(4, '0')}`
        }

        if (d.likelihood && d.consequence) {
            d.inherentRiskScore = d.likelihood * d.consequence
            d.inherentRiskLevel = scoreToLevel(d.inherentRiskScore)
        }
        if (d.residualRiskScore === undefined && d.inherentRiskScore) {
            d.residualRiskScore = d.inherentRiskScore
            d.residualRiskLevel = d.inherentRiskLevel
        }
    })

    srv.on('getNetworkRiskSummary', async req => {
        const { state, region } = req.data
        const db = await cds.connect.to('db')
        const risks = await db.run(
            SELECT.from('bridge.management.BridgeRiskAssessments')
        )
        const summary = {}
        risks.forEach(r => {
            const key = `${r.riskType}|${r.residualRiskLevel || 'Unknown'}`
            summary[key] = (summary[key] || 0) + 1
        })
        return Object.entries(summary).map(([k, count]) => {
            const [riskType, riskLevel] = k.split('|')
            return { riskType, riskLevel, count }
        })
    })

    srv.on('getHighRiskBridges', async req => {
        const minScore = Math.max(0, Math.min(100, Number(req.data.minResidualScore) || 15))
        const db = await cds.connect.to('db')
        const risks = await db.run(
            SELECT.from('bridge.management.BridgeRiskAssessments')
                .where('residualRiskScore >=', minScore)
                .orderBy('residualRiskScore desc')
        )
        return risks.map(r => ({
            bridgeId: r.bridge_ID,
            bridgeName: '',
            riskType: r.riskType,
            residualRiskScore: r.residualRiskScore,
            residualRiskLevel: r.residualRiskLevel,
            treatmentDeadline: r.treatmentDeadline,
            assessor: r.assessor
        }))
    })
}

function scoreToLevel(score) {
    if (score >= 20) return 'Critical'
    if (score >= 12) return 'High'
    if (score >= 6)  return 'Medium'
    return 'Low'
}
