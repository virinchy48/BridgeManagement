const cds = require('@sap/cds')
const LOG  = cds.log('bms-restrictions')

module.exports = function registerRestrictionHandlers (srv, { logAudit, updateBridgePostingStatus, logRestrictionChange }) {

    srv.before('CREATE', 'Restrictions', async req => {
        if (!req.data.status)          req.data.status = 'ACTIVE'
        if (!req.data.directionApplied) req.data.directionApplied = 'BOTH'
        if (!req.data.version)         req.data.version = 1
        if (req.data.bridge_ID) {
            let db = await cds.connect.to('db')
            let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID: req.data.bridge_ID }))
            if (bridge) req.data.bridgeName = bridge.name
        }
    })

    srv.after('CREATE', 'Restrictions', async (data, req) => {
        if (data?.bridge_ID) {
            let db = await cds.connect.to('db')
            await updateBridgePostingStatus(data.bridge_ID, db, req)
            await logRestrictionChange(db, data.ID, req.user?.id || 'system',
                'CREATED', null, data.status, 'Restriction created')
        }
    })

    srv.on('disableRestriction', 'Restrictions', async req => {
        let { ID } = req.params[0]
        let { reason } = req.data
        let db = await cds.connect.to('db')
        let restriction = await db.run(SELECT.one.from('nhvr.Restriction').where({ ID }))
        if (!restriction) return req.error(404, 'Restriction not found')
        let oldStatus = restriction.status
        await db.run(UPDATE('nhvr.Restriction').set({
            status: 'DISABLED', disabledAt: new Date().toISOString(),
            disabledBy: req.user?.id || 'system', disableReason: reason
        }).where({ ID }))
        if (restriction.bridge_ID) await updateBridgePostingStatus(restriction.bridge_ID, db, req)
        await logRestrictionChange(db, ID, req.user?.id || 'system',
            'DISABLED', oldStatus, 'DISABLED', reason)
        return { status: 'DISABLED', message: 'Restriction disabled' }
    })

    srv.on('enableRestriction', 'Restrictions', async req => {
        let { ID } = req.params[0]
        let { reason } = req.data
        let db = await cds.connect.to('db')
        let restriction = await db.run(SELECT.one.from('nhvr.Restriction').where({ ID }))
        if (!restriction) return req.error(404, 'Restriction not found')
        let oldStatus = restriction.status
        await db.run(UPDATE('nhvr.Restriction').set({
            status: 'ACTIVE', disabledAt: null, disabledBy: null, disableReason: null
        }).where({ ID }))
        if (restriction.bridge_ID) await updateBridgePostingStatus(restriction.bridge_ID, db, req)
        await logRestrictionChange(db, ID, req.user?.id || 'system',
            'ENABLED', oldStatus, 'ACTIVE', reason)
        return { status: 'ACTIVE', message: 'Restriction enabled' }
    })

    srv.on('createTemporaryRestriction', 'Restrictions', async req => {
        let { ID } = req.params[0]
        let { fromDate, toDate, reason } = req.data
        let db = await cds.connect.to('db')
        await db.run(UPDATE('nhvr.Restriction').set({
            isTemporary: true, temporaryFromDate: fromDate,
            temporaryToDate: toDate, temporaryReason: reason,
            temporaryApprovedBy: req.user?.id || 'system', status: 'ACTIVE'
        }).where({ ID }))
        await logRestrictionChange(db, ID, req.user?.id || 'system',
            'TEMP_APPLIED', null, 'ACTIVE', reason)
        return { status: 'ACTIVE', message: 'Temporary restriction created', ID }
    })
}
