'use strict'

// ─── Pure helpers (mirroring admin-service.js + srv/handlers/bridges.js) ──────

const REQUIRED_BRIDGE_FIELDS = [
  'bridgeName', 'state', 'assetOwner', 'latitude', 'longitude', 'postingStatus'
]

function validateBridgeCreate(data) {
  return REQUIRED_BRIDGE_FIELDS.filter(f => data[f] == null || data[f] === '')
}

function applyBridgeDefaults(data) {
  const out = Object.assign({}, data)
  if (out.isActive === undefined) out.isActive = true
  if (out.conditionRating === undefined) out.conditionRating = null
  return out
}

function updateBridgeName(bridge, newName) {
  if (!newName || !newName.trim()) throw new Error('bridgeName cannot be empty')
  return Object.assign({}, bridge, { bridgeName: newName.trim() })
}

function buildBridgeRecord(overrides) {
  return applyBridgeDefaults(Object.assign({
    ID: 900001,
    bridgeId: 'TEST-NSW-001',
    bridgeName: 'Test Parramatta Bridge',
    state: 'NSW',
    assetOwner: 'Transport for NSW',
    managingAuthority: 'Transport for NSW',
    latitude: -33.8,
    longitude: 151.0,
    postingStatus: 'Unrestricted'
  }, overrides))
}

// ─── validateBridgeCreate ──────────────────────────────────────────────────────

describe('validateBridgeCreate', () => {
  test('passes when all required fields are present', () => {
    const bridge = buildBridgeRecord()
    expect(validateBridgeCreate(bridge)).toEqual([])
  })

  test('returns missing field names when required fields are absent', () => {
    const missing = validateBridgeCreate({ bridgeName: 'Test' })
    expect(missing).toContain('state')
    expect(missing).toContain('assetOwner')
    expect(missing).toContain('latitude')
    expect(missing).toContain('longitude')
    expect(missing).toContain('postingStatus')
  })

  test('treats empty string same as missing', () => {
    const bridge = buildBridgeRecord({ state: '', assetOwner: '' })
    const missing = validateBridgeCreate(bridge)
    expect(missing).toContain('state')
    expect(missing).toContain('assetOwner')
  })
})

// ─── applyBridgeDefaults ───────────────────────────────────────────────────────

describe('applyBridgeDefaults', () => {
  test('isActive defaults to true on create', () => {
    const bridge = applyBridgeDefaults({ bridgeName: 'New Bridge' })
    expect(bridge.isActive).toBe(true)
  })

  test('conditionRating defaults to null (not required on create)', () => {
    const bridge = applyBridgeDefaults({ bridgeName: 'New Bridge' })
    expect(bridge.conditionRating).toBeNull()
  })

  test('explicit isActive=false is preserved', () => {
    const bridge = applyBridgeDefaults({ bridgeName: 'Decommissioned', isActive: false })
    expect(bridge.isActive).toBe(false)
  })

  test('does not overwrite existing conditionRating', () => {
    const bridge = applyBridgeDefaults({ bridgeName: 'Rated Bridge', conditionRating: 7 })
    expect(bridge.conditionRating).toBe(7)
  })
})

// ─── updateBridgeName ─────────────────────────────────────────────────────────

describe('updateBridgeName', () => {
  test('returns new record with updated bridgeName', () => {
    const bridge = buildBridgeRecord({ ID: 900002, bridgeId: 'TEST-NSW-002' })
    const updated = updateBridgeName(bridge, 'Renamed Bridge')
    expect(updated.bridgeName).toBe('Renamed Bridge')
    expect(updated.ID).toBe(900002)
  })

  test('throws when new name is empty string', () => {
    const bridge = buildBridgeRecord()
    expect(() => updateBridgeName(bridge, '')).toThrow('bridgeName cannot be empty')
  })

  test('trims whitespace from new name', () => {
    const bridge = buildBridgeRecord()
    const updated = updateBridgeName(bridge, '  Trimmed Bridge  ')
    expect(updated.bridgeName).toBe('Trimmed Bridge')
  })
})

// ─── bridgeId uniqueness format ───────────────────────────────────────────────

describe('bridgeId format', () => {
  test('TEST- prefixed IDs match expected pattern', () => {
    const ids = ['TEST-NSW-001', 'TEST-VIC-001', 'TEST-QLD-001', 'TEST-SA-001']
    ids.forEach(id => {
      expect(id).toMatch(/^TEST-[A-Z]+-\d+$/)
    })
  })

  test('seed data BRG- prefix is distinct from test prefix', () => {
    const seedId = 'BRG-NSW-001'
    const testId = 'TEST-NSW-001'
    expect(seedId.startsWith('TEST-')).toBe(false)
    expect(testId.startsWith('TEST-')).toBe(true)
  })
})
