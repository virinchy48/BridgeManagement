const cds = require('@sap/cds')

module.exports = function registerDashboardHandlers (srv, { logAudit }) {

    srv.on('getNetworkKPIs', async req => {
        let db = await cds.connect.to('db')
        let [bridges, restrictions] = await Promise.all([
            db.run(SELECT.from('nhvr.Bridge').where({ isDeleted: false })),
            db.run(SELECT.from('nhvr.Restriction').where({ status: 'ACTIVE', isActive: true }))
        ])
        return {
            totalBridges:       bridges.length,
            activeBridges:      bridges.filter(b => b.isActive).length,
            restrictedBridges:  bridges.filter(b => b.postingStatus === 'RESTRICTED').length,
            closedBridges:      bridges.filter(b => b.postingStatus === 'CLOSED').length,
            criticalCondition:  bridges.filter(b => b.condition === 'CRITICAL').length,
            highPriority:       bridges.filter(b => b.highPriorityAsset).length,
            overdueInspections: bridges.filter(b => b.overdueFlag).length,
            activeRestrictions: restrictions.length
        }
    })

    srv.on('getConditionDistribution', async req => {
        let { state, region } = req.data
        let db = await cds.connect.to('db')
        let where = { isDeleted: false }
        if (state)  where.state  = state
        if (region) where.region = region
        let bridges = await db.run(SELECT.from('nhvr.Bridge').where(where))
        let dist = {}
        bridges.forEach(b => { dist[b.condition] = (dist[b.condition] || 0) + 1 })
        return Object.entries(dist).map(([condition, count]) => ({ condition, count }))
    })

    srv.on('getRestrictionSummary', async req => {
        let { state, region } = req.data
        let db = await cds.connect.to('db')
        let restrictions = await db.run(
            SELECT.from('nhvr.Restriction').where({ status: 'ACTIVE', isActive: true })
        )
        let summary = {}
        restrictions.forEach(activeRestriction => { summary[activeRestriction.restrictionType] = (summary[activeRestriction.restrictionType] || 0) + 1 })
        return Object.entries(summary).map(([restrictionType, count]) => ({ restrictionType, count }))
    })

    srv.on('me', req => ({
        id:    req.user?.id    || 'anonymous',
        name:  req.user?.name  || 'Anonymous',
        roles: (req.user?.roles || []).join(', ')
    }))
}
