const cds = require('@sap/cds')

module.exports = class CatalogService extends cds.ApplicationService { init() {

  const { Bridges } = cds.entities('bridge.management')
  const { ListOfBridges } = this.entities

  this.after('each', ListOfBridges, bridge => {
    if (!bridge.bridgeName && bridge.title) bridge.bridgeName = bridge.title
  })

  this.on('submitUpdate', async req => {
    let { bridge:id, quantity } = req.data
    let bridge = await SELECT.one.from (Bridges, id, b => b.stock)

    if (!bridge) return req.error (404, `Bridge #${id} doesn't exist`)
    if (quantity < 1) return req.error (400, `quantity has to be 1 or more`)
    if (!bridge.stock || quantity > bridge.stock) return req.error (409, `${quantity} exceeds stock for bridge #${id}`)

    await UPDATE (Bridges, id) .with ({ stock: bridge.stock -= quantity })
    return bridge
  })

  this.after('submitUpdate', async (_,req) => {
    let { bridge, quantity } = req.data
    await this.emit('BridgeUpdated', { bridge, quantity, buyer: req.user.id })
  })

  return super.init()
}}
