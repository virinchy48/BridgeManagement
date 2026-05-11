'use strict'
const cds = require('@sap/cds')

module.exports = function registerCapacityHandlers (srv, { logAudit }) {

    srv.before('CREATE', 'BridgeCapacities', async req => {
        const { bridge_ID, capacityType } = req.data
        if (!bridge_ID || !capacityType) return

        const today = new Date().toISOString().slice(0, 10)

        // Auto-supersede existing Current record for same bridge + capacityType
        const db = await cds.connect.to('db')
        const prior = await db.run(
            SELECT.one.from('bridge.management.BridgeCapacities')
                .columns('ID', 'capacityStatus')
                .where({ bridge_ID, capacityType, capacityStatus: 'Current' })
        )
        if (prior) {
            await db.run(
                UPDATE('bridge.management.BridgeCapacities')
                    .set({ capacityStatus: 'Superseded', effectiveTo: today })
                    .where({ ID: prior.ID })
            )
            await logAudit(db, req, 'ACTION', 'BridgeCapacity',
                prior.ID, `${bridge_ID}/${capacityType}`,
                { capacityStatus: 'Superseded', effectiveTo: today },
                'Auto-superseded by new capacity record')
        }

        // Default effectiveFrom to today if caller did not supply it
        if (!req.data.effectiveFrom) req.data.effectiveFrom = today
        if (!req.data.capacityStatus) req.data.capacityStatus = 'Current'
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeCapacities', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeCapacity',
            data.ID, `${data.bridge_ID}/${data.capacityType}`,
            data, `Capacity record ${req.event.toLowerCase()}d`)
    })
}
