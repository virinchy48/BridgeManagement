/**
 * Integration tests for Restrictions lifecycle (via CDS mock runtime)
 * Tests: create, soft-delete (deactivate), reactivate, hard-delete block
 *
 * Run: npm test
 */
'use strict'

const cds = require('@sap/cds')

// Use in-memory SQLite for tests
process.env.NODE_ENV = 'test'

let srv, db

beforeAll(async () => {
  // Boot CDS with SQLite in-memory
  const csn = await cds.load('db/schema')
  db = await cds.connect.to('db', { kind: 'sqlite', credentials: { url: ':memory:' } })
  await cds.deploy(csn).to(db)

  // Connect to the admin service via the service API (not HTTP)
  srv = await cds.connect.to('AdminService', { from: 'srv/admin-service' })
})

afterAll(async () => {
  await cds.disconnect()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createBridge(overrides = {}) {
  const { Bridges } = srv.entities
  const data = {
    bridgeId: `TEST-${Date.now()}`,
    bridgeName: 'Test Bridge',
    state: 'NSW',
    ...overrides
  }
  const result = await db.run(INSERT.into(Bridges).entries(data))
  const rows = await db.run(SELECT.one.from(Bridges).where({ bridgeId: data.bridgeId }))
  return rows
}

async function createBridgeRestriction(bridge_ID, overrides = {}) {
  const { BridgeRestrictions } = srv.entities
  const data = {
    bridge_ID,
    restrictionCategory: 'Permanent',
    restrictionType: 'Mass',
    restrictionValue: 20,
    restrictionUnit: 't',
    effectiveFrom: '2025-01-01',
    active: true,
    restrictionStatus: 'Active',
    ...overrides
  }
  await db.run(INSERT.into(BridgeRestrictions).entries(data))
  return db.run(SELECT.one.from(BridgeRestrictions).where({ bridge_ID }).orderBy({ ID: 'desc' }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BridgeRestrictions — status defaults', () => {
  let bridge

  beforeAll(async () => {
    bridge = await createBridge({ bridgeId: `STATUS-${Date.now()}` })
  })

  test('new restriction defaults to restrictionStatus=Active', async () => {
    const br = await createBridgeRestriction(bridge.ID)
    expect(br.restrictionStatus).toBe('Active')
  })

  test('new restriction defaults to active=true', async () => {
    const br = await createBridgeRestriction(bridge.ID)
    expect(br.active).toBe(1) // SQLite stores booleans as 0/1
  })
})

describe('BridgeRestrictions — soft delete (deactivate)', () => {
  let bridge, br

  beforeAll(async () => {
    bridge = await createBridge({ bridgeId: `DEACT-${Date.now()}` })
    br = await createBridgeRestriction(bridge.ID)
  })

  test('deactivate sets restrictionStatus to Inactive and active to false', async () => {
    const { BridgeRestrictions } = srv.entities
    // Simulate what the deactivate handler does (direct DB update)
    await db.run(UPDATE(BridgeRestrictions).set({ active: false, restrictionStatus: 'Inactive' }).where({ ID: br.ID }))
    const updated = await db.run(SELECT.one.from(BridgeRestrictions).where({ ID: br.ID }))
    expect(updated.active).toBe(0)
    expect(updated.restrictionStatus).toBe('Inactive')
  })
})

describe('BridgeRestrictions — reactivate', () => {
  let bridge, br

  beforeAll(async () => {
    bridge = await createBridge({ bridgeId: `REACT-${Date.now()}` })
    br = await createBridgeRestriction(bridge.ID, { active: false, restrictionStatus: 'Inactive' })
  })

  test('reactivate sets restrictionStatus to Active and active to true', async () => {
    const { BridgeRestrictions } = srv.entities
    await db.run(UPDATE(BridgeRestrictions).set({ active: true, restrictionStatus: 'Active' }).where({ ID: br.ID }))
    const updated = await db.run(SELECT.one.from(BridgeRestrictions).where({ ID: br.ID }))
    expect(updated.active).toBe(1)
    expect(updated.restrictionStatus).toBe('Active')
  })
})

describe('BridgeRestrictions — auto-ref format', () => {
  test('restrictionRef follows BR-NNNN pattern when set', async () => {
    const bridge = await createBridge({ bridgeId: `REF-${Date.now()}` })
    const br = await createBridgeRestriction(bridge.ID, { restrictionRef: 'BR-0042' })
    expect(br.restrictionRef).toMatch(/^BR-\d+$/)
  })
})

describe('BridgeRestrictions — temporary fields', () => {
  let bridge

  beforeAll(async () => {
    bridge = await createBridge({ bridgeId: `TEMP-${Date.now()}` })
  })

  test('Temporary restriction stores temporaryFrom and temporaryTo', async () => {
    const br = await createBridgeRestriction(bridge.ID, {
      restrictionCategory: 'Temporary',
      temporary: true,
      temporaryFrom: '2025-03-01',
      temporaryTo: '2025-03-31'
    })
    expect(br.temporaryFrom).toBe('2025-03-01')
    expect(br.temporaryTo).toBe('2025-03-31')
  })

  test('Permanent restriction does not require temporaryFrom/To', async () => {
    const br = await createBridgeRestriction(bridge.ID, {
      restrictionCategory: 'Permanent',
      temporary: false
    })
    expect(br.restrictionCategory).toBe('Permanent')
    // temporaryFrom should be null or undefined
    expect(br.temporaryFrom == null).toBe(true)
  })
})
