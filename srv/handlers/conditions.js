'use strict'
const cds = require('@sap/cds')

module.exports = function registerConditionHandlers (srv, { logAudit }) {

    srv.before(['CREATE', 'UPDATE'], 'BridgeConditionSurveys', async req => {
        const db = await cds.connect.to('db')

        if (req.event === 'CREATE') {
            // Auto-generate surveyRef (CS-NNNN) once at creation
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeConditionSurveys')
                    .columns('surveyRef').orderBy('surveyRef desc').limit(1)
            )
            const m = last?.surveyRef?.match(/^CS-(\d+)$/)
            const seq = m ? parseInt(m[1], 10) + 1 : 1
            req.data.surveyRef = `CS-${String(seq).padStart(4, '0')}`
            if (!req.data.status) req.data.status = 'Draft'
            if (req.data.active === undefined) req.data.active = true
        }

        // Resolve bridge_ID from bridgeRef on CREATE and UPDATE so that
        // FE4 draft edits (PATCH after initial create) carry bridge_ID correctly
        if (req.data.bridgeRef && !req.data.bridge_ID) {
            const bridge = await db.run(
                SELECT.one.from('bridge.management.Bridges')
                    .columns('ID').where({ bridgeId: req.data.bridgeRef })
            )
            if (bridge) req.data.bridge_ID = bridge.ID
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeConditionSurveys', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeConditionSurvey',
            data.ID, data.surveyRef, data, `Condition survey ${req.event.toLowerCase()}d`)
    })

    srv.on('deactivate', 'BridgeConditionSurveys', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const survey = await db.run(
            SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID })
        )
        if (!survey) return req.error(404, 'Condition survey not found')
        await db.run(
            UPDATE('bridge.management.BridgeConditionSurveys')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeConditionSurvey',
            ID, survey.surveyRef, { active: false }, 'Deactivated')
        return Object.assign({}, survey, { active: false })
    })

    srv.on('reactivate', 'BridgeConditionSurveys', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const survey = await db.run(
            SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID })
        )
        if (!survey) return req.error(404, 'Condition survey not found')
        await db.run(
            UPDATE('bridge.management.BridgeConditionSurveys')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeConditionSurvey',
            ID, survey.surveyRef, { active: true }, 'Reactivated')
        return Object.assign({}, survey, { active: true })
    })

    srv.on('submitForReview', 'BridgeConditionSurveys', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const survey = await db.run(
            SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID })
        )
        if (!survey) return req.error(404, 'Condition survey not found')
        if (survey.status !== 'Draft') return req.error(400, 'Only Draft surveys can be submitted for review')
        await db.run(
            UPDATE('bridge.management.BridgeConditionSurveys')
                .set({ status: 'Submitted' }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeConditionSurvey',
            ID, survey.surveyRef, { status: 'Submitted' }, 'Submitted for review')
        return Object.assign({}, survey, { status: 'Submitted' })
    })

    srv.on('approveSurvey', 'BridgeConditionSurveys', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const survey = await db.run(
            SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID })
        )
        if (!survey) return req.error(404, 'Condition survey not found')
        if (survey.status !== 'Submitted') return req.error(400, 'Only Submitted surveys can be approved')
        await db.run(
            UPDATE('bridge.management.BridgeConditionSurveys')
                .set({ status: 'Approved' }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeConditionSurvey',
            ID, survey.surveyRef, { status: 'Approved' }, 'Survey approved')
        return Object.assign({}, survey, { status: 'Approved' })
    })

    srv.on('rejectSurvey', 'BridgeConditionSurveys', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const survey = await db.run(
            SELECT.one.from('bridge.management.BridgeConditionSurveys').where({ ID })
        )
        if (!survey) return req.error(404, 'Condition survey not found')
        if (survey.status !== 'Submitted')
            return req.error(422, `Cannot reject survey in status "${survey.status}" — only Submitted surveys can be rejected`)
        await db.run(
            UPDATE('bridge.management.BridgeConditionSurveys')
                .set({ status: 'Rejected' }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeConditionSurvey',
            ID, survey.surveyRef, { status: 'Rejected' }, 'Survey rejected')
        return Object.assign({}, survey, { status: 'Rejected' })
    })
}
