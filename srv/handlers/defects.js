'use strict'
const cds = require('@sap/cds')

module.exports = function registerDefectHandlers (srv, { logAudit }) {

    srv.before('CREATE', 'BridgeDefects', async req => {
        const db = await cds.connect.to('db')
        const d = req.data

        if (!d.defectId) {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeDefects')
                    .columns('defectId').orderBy('defectId desc').limit(1)
            )
            const seq = last?.defectId ? parseInt(last.defectId.replace('DEF-', ''), 10) + 1 : 1
            d.defectId = `DEF-${String(seq).padStart(4, '0')}`
        }

        if (d.active === undefined) d.active = true

        // severity 1=Low, 2=Moderate, 3=High, 4=Critical — auto-open for high/critical
        if (d.severity >= 3 || d.urgency >= 3) {
            d.remediationStatus = d.remediationStatus || 'Open'
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeDefects', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeDefect',
            data.ID, data.defectId, data, `Defect ${req.event.toLowerCase()}d`)
    })

    srv.on('deactivate', 'BridgeDefects', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const defect = await db.run(
            SELECT.one.from('bridge.management.BridgeDefects').where({ ID })
        )
        if (!defect) return req.error(404, 'Defect not found')
        await db.run(
            UPDATE('bridge.management.BridgeDefects')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeDefect',
            ID, defect.defectId, { active: false }, 'Deactivated')
        return Object.assign({}, defect, { active: false })
    })

    srv.on('reactivate', 'BridgeDefects', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const defect = await db.run(
            SELECT.one.from('bridge.management.BridgeDefects').where({ ID })
        )
        if (!defect) return req.error(404, 'Defect not found')
        await db.run(
            UPDATE('bridge.management.BridgeDefects')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeDefect',
            ID, defect.defectId, { active: true }, 'Reactivated')
        return Object.assign({}, defect, { active: true })
    })

    srv.on('getDefectSummary', async req => {
        const { bridgeId } = req.data
        const db = await cds.connect.to('db')
        const defects = await db.run(
            SELECT.from('bridge.management.BridgeDefects').where({ bridge_ID: bridgeId, active: true })
        )
        return {
            totalDefects:   defects.length,
            criticalCount:  defects.filter(d => d.severity >= 4).length,
            highCount:      defects.filter(d => d.severity === 3).length,
            openCount:      defects.filter(d => d.remediationStatus === 'Open').length,
            completedCount: defects.filter(d => d.remediationStatus === 'Completed').length
        }
    })
}
