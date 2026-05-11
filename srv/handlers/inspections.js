'use strict'
const cds = require('@sap/cds')

module.exports = function registerInspectionHandlers (srv, { logAudit }) {

    srv.before('CREATE', 'BridgeInspections', async req => {
        const db = await cds.connect.to('db')
        const [last] = await db.run(
            SELECT.from('bridge.management.BridgeInspections')
                .columns('inspectionRef').orderBy('inspectionRef desc').limit(1)
        )
        const seq = last?.inspectionRef ? parseInt(last.inspectionRef.replace('INS-', ''), 10) + 1 : 1
        req.data.inspectionRef = `INS-${String(seq).padStart(4, '0')}`
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeInspections', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeInspection',
            data.ID, data.inspectionRef, data, `Inspection ${req.event.toLowerCase()}d`)
    })
}
