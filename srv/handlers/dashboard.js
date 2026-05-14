const cds = require('@sap/cds')

module.exports = function registerDashboardHandlers (srv, { logAudit }) {

    srv.on('getNetworkKPIs', async req => {
        const db = await cds.connect.to('db')
        const [bridges, restrictions] = await Promise.all([
            db.run(SELECT.from('bridge.management.Bridges').columns('ID','isActive','postingStatus','condition','highPriorityAsset','overdueFlag').where({ isActive: true })),
            db.run(SELECT.from('bridge.management.Restrictions').columns('ID','status').where({ status: 'Active' }))
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
        const { state, region } = req.data
        const db = await cds.connect.to('db')
        const where = { isActive: true }
        if (state)  where.state  = state
        if (region) where.region = region
        const bridges = await db.run(SELECT.from('bridge.management.Bridges').columns('condition').where(where))
        const dist = {}
        bridges.forEach(b => { dist[b.condition] = (dist[b.condition] || 0) + 1 })
        return Object.entries(dist).map(([condition, count]) => ({ condition, count }))
    })

    srv.on('getRestrictionSummary', async req => {
        const { state, region } = req.data
        const db = await cds.connect.to('db')
        let restrictions = await db.run(
            SELECT.from('bridge.management.Restrictions').columns('ID','restrictionType','bridge_ID').where({ status: 'Active' })
        )
        if (state || region) {
            const bridgeWhere = { isActive: true }
            if (state)  bridgeWhere.state  = state
            if (region) bridgeWhere.region = region
            const bridges = await db.run(SELECT.from('bridge.management.Bridges').columns('ID').where(bridgeWhere))
            const bridgeIds = new Set(bridges.map(b => b.ID))
            restrictions = restrictions.filter(r => bridgeIds.has(r.bridge_ID))
        }
        const summary = {}
        restrictions.forEach(r => {
            summary[r.restrictionType] = (summary[r.restrictionType] || 0) + 1
        })
        return Object.entries(summary).map(([restrictionType, count]) => ({ restrictionType, count }))
    })

    srv.on('getConditionTrend', async req => {
        const { months = 12, state } = req.data
        const db = await cds.connect.to('db')
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - months)
        const where = { snapshotType: 'Daily' }
        if (state) where.state = state
        const snapshots = await db.run(
            SELECT.from('bridge.management.KPISnapshots')
                .where(where)
                .and('snapshotDate >=', cutoff.toISOString().split('T')[0])
                .orderBy('snapshotDate asc')
        )
        return snapshots.map(s => ({
            snapshotDate: s.snapshotDate,
            avgConditionRating: s.avgConditionRating,
            criticalCondition: s.criticalCondition
        }))
    })

    srv.on('getGazetteExpiryTimeline', async req => {
        const { daysAhead = 90, state } = req.data
        const db = await cds.connect.to('db')
        const today = new Date().toISOString().split('T')[0]
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + daysAhead)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const where = { isActive: true }
        if (state) where.state = state
        const bridges = await db.run(SELECT.from('bridge.management.Bridges').columns('bridgeId','bridgeName','gazetteExpiryDate','postingStatus').where(where))
        return bridges
            .filter(b => b.gazetteExpiryDate && b.gazetteExpiryDate >= today && b.gazetteExpiryDate <= cutoffStr)
            .map(b => {
                const expiry = new Date(b.gazetteExpiryDate)
                const now = new Date()
                const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
                return {
                    bridgeId: b.bridgeId,
                    bridgeName: b.bridgeName,
                    gazetteExpiryDate: b.gazetteExpiryDate,
                    daysUntilExpiry,
                    postingStatus: b.postingStatus
                }
            })
            .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    })

    srv.on('captureKPISnapshot', async req => {
        const { snapshotType = 'Daily' } = req.data
        const db = await cds.connect.to('db')
        const today = new Date().toISOString().split('T')[0]
        const bridges = await db.run(SELECT.from('bridge.management.Bridges').columns('ID','state','isActive','condition','conditionRating','highPriorityAsset','overdueFlag').where({ isActive: true }))
        const restrictions = await db.run(
            SELECT.from('bridge.management.Restrictions').columns('ID','bridge_ID','status').where({ status: 'Active' })
        )
        const states = [...new Set(bridges.map(b => b.state).filter(Boolean)), 'ALL']
        let recorded = 0
        for (const state of states) {
            const subset = state === 'ALL' ? bridges : bridges.filter(b => b.state === state)
            if (subset.length === 0) continue
            const avgRating = subset.reduce((s, b) => s + (b.conditionRating || 0), 0) / subset.length
            await db.run(
                INSERT.into('bridge.management.KPISnapshots').entries({
                    snapshotDate:      today,
                    snapshotType,
                    state,
                    totalBridges:      subset.length,
                    activeBridges:     subset.filter(b => b.isActive).length,
                    criticalCondition: subset.filter(b => b.condition === 'CRITICAL').length,
                    highPriority:      subset.filter(b => b.highPriorityAsset).length,
                    overdueInspections: subset.filter(b => b.overdueFlag).length,
                    activeRestrictions: state === 'ALL' ? restrictions.length
                        : restrictions.filter(r => {
                            const br = bridges.find(b => b.ID === r.bridge_ID)
                            return br?.state === state
                        }).length,
                    openAlerts:        0,
                    avgConditionRating: Math.round(avgRating * 100) / 100,
                    highRiskCount:     0,
                    lrcExpiringCount:  0,
                    nhvrExpiringCount: 0
                })
            )
            recorded++
        }
        return { recorded, snapshotDate: today }
    })

    srv.on('me', req => ({
        id:    req.user?.id    || 'anonymous',
        name:  req.user?.name  || 'Anonymous',
        roles: (req.user?.roles || []).join(', ')
    }))
}
