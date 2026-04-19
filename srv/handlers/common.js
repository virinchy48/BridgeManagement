const cds = require('@sap/cds')
const LOG  = cds.log('bms-common')

module.exports = function registerCommonHelpers (srv) {

    let getBridge = async (ID, db) => {
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID }))
        return bridge
    }

    let getBridgeByKey = async (bridgeId, db) => {
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ bridgeId }))
        return bridge
    }

    let getRestriction = async (ID, db) => {
        let restriction = await db.run(SELECT.one.from('nhvr.Restriction').where({ ID }))
        return restriction
    }

    let logAudit = async (db, req, action, entity, entityId, entityName, changes, description) => {
        try {
            await db.run(INSERT.into('nhvr.AuditLog').entries({
                userId: req.user?.id || 'system',
                userRole: (req.user?.roles || []).join(','),
                action, entity, entityId, entityName,
                changes: typeof changes === 'object' ? JSON.stringify(changes) : changes,
                description
            }))
        } catch (e) {
            LOG.warn('Audit log failed', e.message)
        }
    }

    let updateBridgePostingStatus = async (bridgeID, db, req) => {
        let activeRestrictions = await db.run(
            SELECT.from('nhvr.Restriction')
                  .where({ bridge_ID: bridgeID, status: 'ACTIVE', isActive: true })
        )
        let postingStatus = activeRestrictions.length === 0 ? 'UNRESTRICTED'
            : activeRestrictions.some(r => r.restrictionType === 'CLOSURE') ? 'CLOSED'
            : 'RESTRICTED'
        await db.run(UPDATE('nhvr.Bridge').set({ postingStatus }).where({ ID: bridgeID }))
    }

    let validateEnum = (value, allowed, fieldName, req) => {
        if (value && !allowed.includes(value))
            return req.error(400, `Invalid ${fieldName}: ${value}. Allowed: ${allowed.join(', ')}`)
    }

    let logRestrictionChange = async (db, restrictionID, changedBy, changeType, oldStatus, newStatus, reason) => {
        await db.run(INSERT.into('nhvr.RestrictionChangeLog').entries({
            restriction_ID: restrictionID, changedBy, changeType, oldStatus, newStatus, reason
        }))
    }

    return { getBridge, getBridgeByKey, getRestriction, logAudit,
             updateBridgePostingStatus, validateEnum, logRestrictionChange }
}
