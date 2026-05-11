'use strict'
const cds = require('@sap/cds')

module.exports = function registerInspectionHandlers (srv, { logAudit }) {

    srv.before(['CREATE', 'UPDATE'], 'BridgeInspections', async req => {
        const db = await cds.connect.to('db')

        if (req.event === 'CREATE' && req.data.active === undefined) req.data.active = true

        if (req.event === 'CREATE') {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeInspections')
                    .columns('inspectionRef').orderBy('inspectionRef desc').limit(1)
            )
            const seq = last?.inspectionRef ? parseInt(last.inspectionRef.replace('INS-', ''), 10) + 1 : 1
            req.data.inspectionRef = `INS-${String(seq).padStart(4, '0')}`
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeInspections', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeInspection',
            data.ID, data.inspectionRef, data, `Inspection ${req.event.toLowerCase()}d`)
    })

    srv.on('deactivate', 'BridgeInspections', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const inspection = await db.run(
            SELECT.one.from('bridge.management.BridgeInspections').where({ ID })
        )
        if (!inspection) return req.error(404, 'Inspection not found')
        await db.run(
            UPDATE('bridge.management.BridgeInspections')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeInspection',
            ID, inspection.inspectionRef, { active: false }, 'Deactivated')
        return Object.assign({}, inspection, { active: false })
    })

    srv.on('reactivate', 'BridgeInspections', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const inspection = await db.run(
            SELECT.one.from('bridge.management.BridgeInspections').where({ ID })
        )
        if (!inspection) return req.error(404, 'Inspection not found')
        await db.run(
            UPDATE('bridge.management.BridgeInspections')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeInspection',
            ID, inspection.inspectionRef, { active: true }, 'Reactivated')
        return Object.assign({}, inspection, { active: true })
    })
}
