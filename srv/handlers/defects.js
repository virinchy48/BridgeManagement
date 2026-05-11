const cds = require('@sap/cds')

module.exports = function registerDefectHandlers (srv) {

    srv.before('CREATE', 'BridgeDefects', req => {
        const d = req.data
        if (!d.inspection_ID) {
            req.error(422, 'Defects must be created through an Inspection record. ' +
                'Open an Inspection and add defects from the Defects tab.')
        }
        if (!d.defectId) {
            req.error(400, 'defectId is required')
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
