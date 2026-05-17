'use strict'
const cds = require('@sap/cds')

module.exports = function registerMaintenance(svc) {
  const BridgeMaintenanceActions = svc.entities.BridgeMaintenanceActions

  svc.before(['CREATE', 'UPDATE'], BridgeMaintenanceActions, async req => {
    const d = req.data
    if (req.event === 'CREATE' && !d.actionRef) {
      const last = await SELECT.one.from(BridgeMaintenanceActions).columns('actionRef').orderBy('createdAt desc')
      const m = last?.actionRef?.match(/^MA-(\d+)$/)
      const seq = m ? parseInt(m[1], 10) + 1 : 1
      d.actionRef = 'MA-' + String(seq).padStart(4, '0')
    }
    if (d.bridgeRef) {
      const bridge = await SELECT.one.from(svc.entities.Bridges).columns('ID').where({ bridgeId: d.bridgeRef })
      if (bridge) d.bridge_ID = bridge.ID
      else req.error(404, `Bridge '${d.bridgeRef}' not found`)
    }
  })

  svc.on('deactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0]
    await UPDATE(BridgeMaintenanceActions).set({ active: false }).where({ ID })
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID })
  })

  svc.on('reactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0]
    await UPDATE(BridgeMaintenanceActions).set({ active: true }).where({ ID })
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID })
  })

  if (BridgeMaintenanceActions?.drafts) {
    svc.on('deactivate', BridgeMaintenanceActions.drafts, req => req.error(409, 'Save or discard changes before deactivating.'))
    svc.on('reactivate', BridgeMaintenanceActions.drafts, req => req.error(409, 'Save or discard changes before reactivating.'))
    svc.before('NEW', BridgeMaintenanceActions.drafts, async req => {
      if (req.data.active === undefined) req.data.active = true
      if (!req.data.actionRef) {
        const last = await SELECT.one.from(BridgeMaintenanceActions).columns('actionRef').orderBy('createdAt desc')
        const m = last?.actionRef?.match(/^MA-(\d+)$/)
        const seq = m ? parseInt(m[1], 10) + 1 : 1
        req.data.actionRef = 'MA-' + String(seq).padStart(4, '0')
      }
    })
  }
}
