const cds = require('@sap/cds')
const LOG  = cds.log('bms-bridges')

const CONDITION_LABELS = {
    1: 'CRITICAL', 2: 'CRITICAL', 3: 'POOR', 4: 'POOR',
    5: 'FAIR', 6: 'FAIR', 7: 'GOOD', 8: 'VERY_GOOD',
    9: 'EXCELLENT', 10: 'EXCELLENT'
}

module.exports = function registerBridgeHandlers (srv, { logAudit, validateEnum }) {

    srv.before(['CREATE','UPDATE'], 'Bridges', async req => {
        let data = req.data
        if (data.conditionRating !== undefined) {
            let rating = data.conditionRating
            if (rating < 1 || rating > 10) return req.error(400, 'conditionRating must be 1–10')
            data.condition     = CONDITION_LABELS[rating]
            data.conditionScore = Math.round((rating / 10) * 100)
            data.highPriorityAsset = rating <= 4
        }
        if (data.inspectionFrequencyYrs && data.inspectionDate) {
            let next = new Date(data.inspectionDate)
            next.setFullYear(next.getFullYear() + data.inspectionFrequencyYrs)
            data.nextInspectionDueDate = next.toISOString().split('T')[0]
        }
    })

    srv.before('UPDATE', 'Bridges', async req => {
        if (req.data.version === undefined) return
        let db = await cds.connect.to('db')
        let current = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID: req.data.ID }))
        if (!current) return req.error(404, `Bridge ${req.data.ID} not found`)
        if (current.version !== req.data.version)
            return req.error(409, 'Bridge was modified by another user. Please refresh and retry.')
        req.data.version = current.version + 1
    })

    srv.after(['READ','QUERY'], 'Bridges', results => {
        let bridges = Array.isArray(results) ? results : [results]
        let today = new Date()
        bridges.forEach(b => {
            if (!b) return
            if (b.yearBuilt && b.designLife)
                b.remainingUsefulLifeYrs = (b.yearBuilt + b.designLife) - today.getFullYear()
            if (b.nextInspectionDueDate && new Date(b.nextInspectionDueDate) < today)
                b.overdueFlag = true
        })
    })

    srv.on('changeCondition', 'Bridges', async req => {
        let { conditionValue, score } = req.data
        let { ID } = req.params[0]
        let db = await cds.connect.to('db')
        await db.run(UPDATE('nhvr.Bridge').set({
            condition: conditionValue, conditionScore: score,
            highPriorityAsset: ['CRITICAL','POOR'].includes(conditionValue)
        }).where({ ID }))
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID }))
        await logAudit(db, req, 'ACTION', 'Bridge', ID, bridge?.name,
            { conditionValue, score }, 'Condition changed')
        return { ID, bridgeId: bridge?.bridgeId, name: bridge?.name,
                 condition: bridge?.condition, conditionScore: bridge?.conditionScore }
    })

    srv.on('closeForTraffic', 'Bridges', async req => {
        let { ID } = req.params[0]
        let db = await cds.connect.to('db')
        await db.run(UPDATE('nhvr.Bridge').set({ postingStatus: 'CLOSED', isActive: false }).where({ ID }))
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID }))
        await logAudit(db, req, 'ACTION', 'Bridge', ID, bridge?.name, {}, 'Closed for traffic')
        return { ID, bridgeId: bridge?.bridgeId, name: bridge?.name, postingStatus: 'CLOSED' }
    })

    srv.on('reopenForTraffic', 'Bridges', async req => {
        let { ID } = req.params[0]
        let db = await cds.connect.to('db')
        await db.run(UPDATE('nhvr.Bridge').set({ postingStatus: 'UNRESTRICTED', isActive: true }).where({ ID }))
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID }))
        await logAudit(db, req, 'ACTION', 'Bridge', ID, bridge?.name, {}, 'Reopened for traffic')
        return { ID, bridgeId: bridge?.bridgeId, name: bridge?.name, postingStatus: 'UNRESTRICTED' }
    })

    srv.on('addRestriction', 'Bridges', async req => {
        let { ID } = req.params[0]
        let db = await cds.connect.to('db')
        let bridge = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID }))
        if (!bridge) return req.error(404, 'Bridge not found')
        let { restrictionType, value, unit, validFromDate, validToDate,
              status, permitRequired, directionApplied, gazetteRef, notes } = req.data
        let newID = cds.utils.uuid()
        await db.run(INSERT.into('nhvr.Restriction').entries({
            ID: newID, bridge_ID: ID, restrictionType, value, unit,
            validFromDate, validToDate, status: status || 'ACTIVE',
            permitRequired, directionApplied, gazetteRef, notes,
            bridgeName: bridge.name, isActive: true, version: 1
        }))
        return { status: 'CREATED', message: 'Restriction added', ID: newID }
    })
}
