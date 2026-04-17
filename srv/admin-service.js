const cds = require('@sap/cds')

module.exports = class AdminService extends cds.ApplicationService { init() {

  const { Bridges } = this.entities

  /**
   * Generate IDs for new Bridges drafts
   */
  this.before ('NEW', Bridges.drafts, async (req) => {
    if (req.data.ID) return
    const { ID:id1 } = await SELECT.one.from(Bridges).columns('max(ID) as ID')
    const { ID:id2 } = await SELECT.one.from(Bridges.drafts).columns('max(ID) as ID')
    req.data.ID = Math.max(id1||0, id2||0) + 1
    if (!req.data.bridgeId) {
      req.data.bridgeId = `BRG-NSW001-${String(req.data.ID).padStart(3, '0')}`
    }
  })
  return super.init()
}}
