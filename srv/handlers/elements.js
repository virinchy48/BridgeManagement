const cds = require('@sap/cds')

module.exports = function registerElementHandlers (srv) {

    srv.before('CREATE', 'BridgeElements', req => {
        const d = req.data
        if (!d.elementId) {
            req.error(400, 'elementId is required')
        }
    })

    srv.on('getElementConditionSummary', async req => {
        const { bridgeId } = req.data
        const db = await cds.connect.to('db')
        const elements = await db.run(
            SELECT.from('bridge.management.BridgeElements')
                .where({ bridge_ID: bridgeId })
                .orderBy('elementType', 'spanNumber')
        )
        return elements.map(e => ({
            elementType: e.elementType,
            elementName: e.elementName,
            currentConditionRating: e.currentConditionRating,
            conditionTrend: e.conditionTrend,
            maintenanceRequired: e.maintenanceRequired,
            urgencyLevel: e.urgencyLevel
        }))
    })
}
