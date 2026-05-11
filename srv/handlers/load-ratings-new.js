'use strict'
const cds = require('@sap/cds')

module.exports = function registerLoadRatingHandlers (srv, { logAudit }) {

    srv.before(['CREATE', 'UPDATE'], 'BridgeLoadRatings', async req => {
        const db = await cds.connect.to('db')

        if (req.event === 'CREATE') {
            // Auto-generate ratingRef (LR-NNNN) once at creation
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeLoadRatings')
                    .columns('ratingRef').orderBy('ratingRef desc').limit(1)
            )
            const seq = last?.ratingRef ? parseInt(last.ratingRef.replace('LR-', ''), 10) + 1 : 1
            req.data.ratingRef = `LR-${String(seq).padStart(4, '0')}`
            if (!req.data.status) req.data.status = 'Active'
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

    srv.after(['CREATE', 'UPDATE'], 'BridgeLoadRatings', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeLoadRating',
            data.ID, data.ratingRef, data, `Load rating ${req.event.toLowerCase()}d`)
    })

    srv.on('deactivate', 'BridgeLoadRatings', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const rating = await db.run(
            SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID })
        )
        if (!rating) return req.error(404, 'Load rating not found')
        await db.run(
            UPDATE('bridge.management.BridgeLoadRatings')
                .set({ active: false, status: 'Superseded' }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeLoadRating',
            ID, rating.ratingRef, { active: false }, 'Deactivated')
        return Object.assign({}, rating, { active: false, status: 'Superseded' })
    })

    srv.on('reactivate', 'BridgeLoadRatings', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const rating = await db.run(
            SELECT.one.from('bridge.management.BridgeLoadRatings').where({ ID })
        )
        if (!rating) return req.error(404, 'Load rating not found')
        await db.run(
            UPDATE('bridge.management.BridgeLoadRatings')
                .set({ active: true, status: 'Active' }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeLoadRating',
            ID, rating.ratingRef, { active: true }, 'Reactivated')
        return Object.assign({}, rating, { active: true, status: 'Active' })
    })
}
