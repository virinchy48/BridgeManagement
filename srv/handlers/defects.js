const cds = require('@sap/cds')

module.exports = function registerDefectHandlers (srv) {

    srv.before('CREATE', 'BridgeDefects', async req => {
        const db = await cds.connect.to('db')
        const d = req.data

        // Auto-generate defectId (DEF-NNNN) if not supplied
        if (!d.defectId) {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeDefects')
                    .columns('defectId').orderBy('defectId desc').limit(1)
            )
            const seq = last?.defectId ? parseInt(last.defectId.replace('DEF-', ''), 10) + 1 : 1
            d.defectId = `DEF-${String(seq).padStart(4, '0')}`
        }

        if (d.severity === 1 || d.urgency === 1) {
            d.remediationStatus = d.remediationStatus || 'Open'
        }
    })

    srv.on('getDefectSummary', async req => {
        const { bridgeId } = req.data
        const db = await cds.connect.to('db')
        const defects = await db.run(
            SELECT.from('bridge.management.BridgeDefects').where({ bridge_ID: bridgeId })
        )
        return {
            totalDefects:   defects.length,
            criticalCount:  defects.filter(d => d.severity === 1).length,
            highCount:      defects.filter(d => d.severity === 2).length,
            openCount:      defects.filter(d => d.remediationStatus === 'Open').length,
            completedCount: defects.filter(d => d.remediationStatus === 'Completed').length
        }
    })
}
