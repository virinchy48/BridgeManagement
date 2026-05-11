const cds = require('@sap/cds')

// ─── Optimistic lock — before UPDATE ─────────────────────────────────────────
const beforeUpdateRestriction = async (req) => {
    const { ID, version } = req.data
    if (version !== undefined) {
        const current = await SELECT.one.from('nhvr.Restriction')
            .columns(['version', 'status'])
            .where({ ID })
        if (current && current.version !== version) {
            return req.error(409,
                'This restriction was modified by another user. Please refresh and try again.',
                'RESTRICTION_LOCK_CONFLICT'
            )
        }
    }
    // Increment version on every update
    req.data.version = (version || 0) + 1
    req.data.modifiedAt = new Date().toISOString()
}

// ─── RestrictionChangeLog writer ──────────────────────────────────────────────
const writeRestrictionChangeLog = async (db, restrictionId, changeType, oldStatus, newStatus, reason, user) => {
    try {
        const uuid = cds.utils?.uuid
            ? cds.utils.uuid()
            : require('crypto').randomUUID()
        await db.run(INSERT.into('nhvr.RestrictionChangeLog').entries({
            ID: uuid,
            restriction_ID: restrictionId,
            changeType,
            oldStatus: oldStatus || null,
            newStatus: newStatus || null,
            reason: reason || '',
            changedBy: user || 'System',
            changedAt: new Date().toISOString()
        }))
    } catch (e) {
        // Non-fatal — RestrictionChangeLog may not exist yet
        LOG.warn('RestrictionChangeLog write skipped:', e.message)
    }
}

module.exports = function registerRestrictionHandlers (srv, { logAudit, updateBridgePostingStatus, logRestrictionChange }) {

    // ── Optimistic lock registration ──────────────────────────────────────────
    srv.before('UPDATE', 'Restrictions', beforeUpdateRestriction)

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
            // Write to RestrictionChangeLog
            await writeRestrictionChangeLog(db, data.ID, 'CREATED', null, data.status,
                'Restriction created', req.user?.id || 'system')
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
        // Write to RestrictionChangeLog
        await writeRestrictionChangeLog(db, ID, 'DISABLED', oldStatus, 'DISABLED',
            reason, req.user?.id || 'system')
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
        // Write to RestrictionChangeLog
        await writeRestrictionChangeLog(db, ID, 'ENABLED', oldStatus, 'ACTIVE',
            reason, req.user?.id || 'system')
        return { status: 'ACTIVE', message: 'Restriction enabled' }
    })

    srv.on('createTemporaryRestriction', 'Restrictions', async req => {
        let { ID } = req.params[0]
        let { fromDate, toDate, reason } = req.data
        let db = await cds.connect.to('db')
        let restriction = await db.run(SELECT.one.from('nhvr.Restriction').where({ ID }))
        let oldStatus = restriction?.status || null
        await db.run(UPDATE('nhvr.Restriction').set({
            isTemporary: true, temporaryFromDate: fromDate,
            temporaryToDate: toDate, temporaryReason: reason,
            temporaryApprovedBy: req.user?.id || 'system', status: 'ACTIVE'
        }).where({ ID }))
        await logRestrictionChange(db, ID, req.user?.id || 'system',
            'TEMP_APPLIED', null, 'ACTIVE', reason)
        // Write to RestrictionChangeLog
        await writeRestrictionChangeLog(db, ID, 'TEMP_APPLIED', oldStatus, 'ACTIVE',
            reason, req.user?.id || 'system')
        return { status: 'ACTIVE', message: 'Temporary restriction created', ID }
    })

    srv.after('READ', 'Restrictions', (data) => {
        const results = Array.isArray(data) ? data : [data]
        const today = new Date()
        const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        results.forEach(r => {
            if (!r.reviewDueDate) { r.reviewCriticality = null; return }
            const due = new Date(r.reviewDueDate)
            r.reviewCriticality = due < today ? 1 : due <= in30 ? 2 : 3
        })
    })

    srv.after(['CREATE', 'UPDATE'], 'Restrictions', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await _createGazetteAlerts(db, data)
    })
}

async function _createGazetteAlerts(db, restriction) {
    if (!restriction.bridge_ID) return

    const today = new Date()
    const threshold = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

    const checks = [
        { dateField: restriction.gazetteExpiryDate, alertType: 'GazetteExpiring',
          titlePrefix: 'Gazette Expiring: ' },
        { dateField: restriction.reviewDueDate,     alertType: 'RestrictionReviewDue',
          titlePrefix: 'Review Due: ' }
    ]

    const ref = restriction.restrictionRef || restriction.restrictionCode || restriction.ID

    for (const { dateField, alertType, titlePrefix } of checks) {
        if (!dateField) continue
        const date = new Date(dateField)
        if (date > threshold) continue

        const existing = await db.run(
            SELECT.one.from('bridge.management.AlertsAndNotifications')
                .columns('ID')
                .where({ alertType, entityId: String(restriction.ID), status: 'Open' })
        )
        if (existing) continue

        await db.run(
            INSERT.into('bridge.management.AlertsAndNotifications').entries({
                ID:               cds.utils.uuid(),
                bridge_ID:        restriction.bridge_ID,
                alertType,
                entityType:       'Restriction',
                entityId:         String(restriction.ID),
                entityDescription: ref,
                alertTitle:       titlePrefix + ref,
                alertDescription: `${titlePrefix}${ref} — due ${dateField}`,
                severity:         'High',
                priority:         3,
                triggeredDate:    new Date().toISOString(),
                dueDate:          dateField,
                status:           'Open'
            })
        )
    }
}
