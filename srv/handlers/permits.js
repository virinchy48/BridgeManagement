'use strict'
const cds = require('@sap/cds')

module.exports = function registerPermitHandlers (srv, { logAudit }) {

    srv.before(['CREATE', 'UPDATE'], 'BridgePermits', async req => {
        const db = await cds.connect.to('db')

        if (req.event === 'CREATE') {
            // Auto-generate permitRef (PM-NNNN) once at creation
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgePermits')
                    .columns('permitRef').orderBy('permitRef desc').limit(1)
            )
            const m = last?.permitRef?.match(/^PM-(\d+)$/)
            const seq = m ? parseInt(m[1], 10) + 1 : 1
            req.data.permitRef = `PM-${String(seq).padStart(4, '0')}`
            if (!req.data.status) req.data.status = 'Pending'
            if (req.data.active === undefined) req.data.active = true
        }

        // Resolve bridge_ID from bridgeRef on CREATE and UPDATE so that
        // FE4 draft edits (PATCH after initial create) carry bridge_ID correctly
        if (req.data.bridgeRef) {
            const bridge = await db.run(
                SELECT.one.from('bridge.management.Bridges')
                    .columns('ID').where({ bridgeId: req.data.bridgeRef })
            )
            if (bridge) req.data.bridge_ID = bridge.ID
            else return req.error(400, `Bridge '${req.data.bridgeRef}' not found`)
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgePermits', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgePermit',
            data.ID, data.permitRef, data, `Permit ${req.event.toLowerCase()}d`)
    })

    srv.on('approve', 'BridgePermits', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const permit = await db.run(
            SELECT.one.from('bridge.management.BridgePermits').where({ ID })
        )
        if (!permit) return req.error(404, 'Permit not found')
        const now = new Date().toISOString().split('T')[0]
        await db.run(
            UPDATE('bridge.management.BridgePermits')
                .set({ status: 'Approved', decisionBy: req.user?.id || 'System', decisionDate: now })
                .where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgePermit',
            ID, permit.permitRef, { status: 'Approved' }, 'Permit approved')
        return Object.assign({}, permit, { status: 'Approved', decisionBy: req.user?.id || 'System', decisionDate: now })
    })

    srv.on('rejectPermit', 'BridgePermits', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const permit = await db.run(
            SELECT.one.from('bridge.management.BridgePermits').where({ ID })
        )
        if (!permit) return req.error(404, 'Permit not found')
        const now = new Date().toISOString().split('T')[0]
        await db.run(
            UPDATE('bridge.management.BridgePermits')
                .set({ status: 'Rejected', decisionBy: req.user?.id || 'System', decisionDate: now })
                .where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgePermit',
            ID, permit.permitRef, { status: 'Rejected' }, 'Permit rejected')
        return Object.assign({}, permit, { status: 'Rejected', decisionBy: req.user?.id || 'System', decisionDate: now })
    })

    srv.on('deactivate', 'BridgePermits', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const permit = await db.run(
            SELECT.one.from('bridge.management.BridgePermits').where({ ID })
        )
        if (!permit) return req.error(404, 'Permit not found')
        await db.run(
            UPDATE('bridge.management.BridgePermits')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgePermit',
            ID, permit.permitRef, { active: false }, 'Deactivated')
        return Object.assign({}, permit, { active: false })
    })

    srv.on('reactivate', 'BridgePermits', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const permit = await db.run(
            SELECT.one.from('bridge.management.BridgePermits').where({ ID })
        )
        if (!permit) return req.error(404, 'Permit not found')
        await db.run(
            UPDATE('bridge.management.BridgePermits')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgePermit',
            ID, permit.permitRef, { active: true }, 'Reactivated')
        return Object.assign({}, permit, { active: true })
    })
}
