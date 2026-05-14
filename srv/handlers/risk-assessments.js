'use strict'
const cds = require('@sap/cds')

module.exports = function registerRiskAssessmentHandlers (srv, { logAudit }) {

    srv.before(['CREATE', 'UPDATE'], 'BridgeRiskAssessments', async req => {
        const db = await cds.connect.to('db')
        const d = req.data

        if (req.event === 'CREATE' && !d.assessmentId) {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeRiskAssessments')
                    .columns('assessmentId').orderBy('assessmentId desc').limit(1)
            )
            const m = last?.assessmentId?.match(/^RSK-(\d+)$/)
            const seq = m ? parseInt(m[1], 10) + 1 : 1
            d.assessmentId = `RSK-${String(seq).padStart(4, '0')}`
        }

        if (req.event === 'CREATE' && d.active === undefined) d.active = true

        const likelihood = d.likelihood ?? null
        const consequence = d.consequence ?? null
        const residualL = d.residualLikelihood ?? null
        const residualC = d.residualConsequence ?? null

        if (likelihood !== null && consequence !== null) {
            d.inherentRiskScore = likelihood * consequence
            d.inherentRiskLevel = scoreToLevel(d.inherentRiskScore)
        } else if (req.event === 'UPDATE' && (likelihood !== null || consequence !== null)) {
            const existing = await db.run(
                SELECT.one.from('bridge.management.BridgeRiskAssessments')
                    .columns('likelihood', 'consequence').where({ ID: d.ID })
            )
            const l = likelihood ?? existing?.likelihood
            const c = consequence ?? existing?.consequence
            if (l && c) {
                d.inherentRiskScore = l * c
                d.inherentRiskLevel = scoreToLevel(d.inherentRiskScore)
            }
        }

        if (residualL !== null && residualC !== null) {
            d.residualRiskScore = residualL * residualC
            d.residualRiskLevel = scoreToLevel(d.residualRiskScore)
        } else if (req.event === 'UPDATE' && (residualL !== null || residualC !== null)) {
            const existing = await db.run(
                SELECT.one.from('bridge.management.BridgeRiskAssessments')
                    .columns('residualLikelihood', 'residualConsequence').where({ ID: d.ID })
            )
            const rl = residualL ?? existing?.residualLikelihood
            const rc = residualC ?? existing?.residualConsequence
            if (rl && rc) {
                d.residualRiskScore = rl * rc
                d.residualRiskLevel = scoreToLevel(d.residualRiskScore)
            }
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeRiskAssessments', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeRiskAssessment',
            data.ID, data.assessmentId, data, `Risk assessment ${req.event.toLowerCase()}d`)
    })

    srv.on('getNetworkRiskSummary', async req => {
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

    srv.on('deactivate', 'BridgeRiskAssessments', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const assessment = await db.run(
            SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID })
        )
        if (!assessment) return req.error(404, 'Risk assessment not found')
        await db.run(
            UPDATE('bridge.management.BridgeRiskAssessments')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeRiskAssessment',
            ID, assessment.assessmentId, { active: false }, 'Deactivated')
        return Object.assign({}, assessment, { active: false })
    })

    srv.on('reactivate', 'BridgeRiskAssessments', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const assessment = await db.run(
            SELECT.one.from('bridge.management.BridgeRiskAssessments').where({ ID })
        )
        if (!assessment) return req.error(404, 'Risk assessment not found')
        await db.run(
            UPDATE('bridge.management.BridgeRiskAssessments')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeRiskAssessment',
            ID, assessment.assessmentId, { active: true }, 'Reactivated')
        return Object.assign({}, assessment, { active: true })
    })
}

function scoreToLevel(score) {
    if (score >= 15) return 'Extreme'
    if (score >= 10) return 'High'
    if (score >= 5)  return 'Medium'
    return 'Low'
}
