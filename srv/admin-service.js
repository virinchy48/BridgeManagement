const cds = require('@sap/cds')

module.exports = class AdminService extends cds.ApplicationService { init() {

  const { Bridges, Restrictions } = this.entities

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

  const { GISConfig } = this.entities

  // Auto-seed the singleton GIS config record on first access
  this.before('READ', GISConfig, async () => {
    const existing = await SELECT.one.from(GISConfig).where({ id: 'default' })
    if (!existing) {
      await INSERT.into(GISConfig).entries({ id: 'default' })
    }
  })

  this.before ('NEW', Restrictions.drafts, async (req) => {
    if (!req.data.restrictionRef) {
      const total = await SELECT.from(Restrictions).columns('ID')
      req.data.restrictionRef = `RST-${String((total?.length || 0) + 1).padStart(4, '0')}`
    }
  })

  this.before (['CREATE', 'UPDATE'], Restrictions, req => {
    if (req.data.restrictionCategory) {
      req.data.temporary = req.data.restrictionCategory === 'Temporary'
    }
    if (req.data.bridgeRef) {
      const bridge = SELECT.one.from(Bridges).where({ bridgeId: req.data.bridgeRef })
      return bridge.then(found => {
        if (!found) req.error(400, `Unknown bridge reference: ${req.data.bridgeRef}`)
        else req.data.bridge_ID = found.ID
        if (!req.data.name) {
          req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
        }
      })
    }
    if (!req.data.name) {
      req.data.name = req.data.restrictionRef || req.data.restrictionType || 'Restriction'
    }
  })
  return super.init()
}}
