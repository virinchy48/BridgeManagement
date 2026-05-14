'use strict'

// ─── Pure helpers (copied from srv/audit-log.js) ──────────────────────────────

const SKIP_FIELDS = new Set([
  'modifiedAt', 'modifiedBy', 'createdAt', 'createdBy',
  'IsActiveEntity', 'HasActiveEntity', 'HasDraftEntity',
  'DraftAdministrativeData_DraftUUID', 'SiblingEntity',
  '__rowNumber', 'texts'
])

function valueToString(recordValue) {
  if (recordValue === null || recordValue === undefined) return ''
  if (typeof recordValue === 'boolean') return recordValue ? 'true' : 'false'
  if (recordValue instanceof Date) return recordValue.toISOString().slice(0, 10)
  if (typeof recordValue === 'object') return JSON.stringify(recordValue)
  return String(recordValue)
}

function diffRecords(oldRecord, newRecord) {
  const changes = []
  const allFields = new Set([
    ...Object.keys(oldRecord || {}),
    ...Object.keys(newRecord || {})
  ])
  for (const field of allFields) {
    if (SKIP_FIELDS.has(field)) continue
    const oldStr = valueToString((oldRecord || {})[field])
    const newStr = valueToString((newRecord || {})[field])
    if (oldStr !== newStr) {
      changes.push({ fieldName: field, oldValue: oldStr, newValue: newStr })
    }
  }
  return changes
}

function buildChangeLogEntries({ objectType, objectId, objectName, source, batchId, changedBy, changes }) {
  if (!changes || !changes.length) return []
  return changes.map(change => ({
    changedBy: changedBy || 'system',
    objectType,
    objectId: String(objectId),
    objectName: objectName || String(objectId),
    fieldName: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    changeSource: source,
    batchId: batchId || null
  }))
}

// ─── valueToString ────────────────────────────────────────────────────────────

describe('valueToString', () => {
  test('returns empty string for null and undefined', () => {
    expect(valueToString(null)).toBe('')
    expect(valueToString(undefined)).toBe('')
  })

  test('converts boolean to lowercase string', () => {
    expect(valueToString(true)).toBe('true')
    expect(valueToString(false)).toBe('false')
  })

  test('converts Date to ISO date string (yyyy-mm-dd)', () => {
    const d = new Date('2099-06-15T10:00:00Z')
    expect(valueToString(d)).toBe('2099-06-15')
  })

  test('serialises plain objects to JSON', () => {
    const obj = { lat: -33.8, lng: 151.0 }
    expect(valueToString(obj)).toBe(JSON.stringify(obj))
  })

  test('converts numbers and strings directly', () => {
    expect(valueToString(42)).toBe('42')
    expect(valueToString('hello')).toBe('hello')
  })
})

// ─── diffRecords ──────────────────────────────────────────────────────────────

describe('diffRecords', () => {
  test('returns empty array when records are identical', () => {
    const rec = { ID: 1, bridgeName: 'Lennox Bridge', state: 'NSW' }
    expect(diffRecords(rec, Object.assign({}, rec))).toEqual([])
  })

  test('detects a changed field', () => {
    const old = { bridgeName: 'Old Name', state: 'NSW' }
    const next = { bridgeName: 'New Name', state: 'NSW' }
    const changes = diffRecords(old, next)
    expect(changes).toHaveLength(1)
    expect(changes[0].fieldName).toBe('bridgeName')
    expect(changes[0].oldValue).toBe('Old Name')
    expect(changes[0].newValue).toBe('New Name')
  })

  test('detects field set from null to a value (CREATE scenario)', () => {
    const old = null
    const next = { ID: 900001, bridgeName: 'TEST-NSW-001 Bridge', state: 'NSW' }
    const changes = diffRecords(old, next)
    const fieldNames = changes.map(c => c.fieldName)
    expect(fieldNames).toContain('bridgeName')
    expect(fieldNames).toContain('state')
  })

  test('skips managed CAP metadata fields', () => {
    const old = { bridgeName: 'A', createdAt: '2099-01-01', modifiedAt: '2099-01-01' }
    const next = { bridgeName: 'B', createdAt: '2099-01-01', modifiedAt: '2099-02-01' }
    const changes = diffRecords(old, next)
    const fieldNames = changes.map(c => c.fieldName)
    expect(fieldNames).toContain('bridgeName')
    expect(fieldNames).not.toContain('modifiedAt')
    expect(fieldNames).not.toContain('createdAt')
  })

  test('skips draft-entity technical fields', () => {
    const old = { bridgeName: 'A', IsActiveEntity: true, HasDraftEntity: false }
    const next = { bridgeName: 'A', IsActiveEntity: false, HasDraftEntity: true }
    const changes = diffRecords(old, next)
    expect(changes).toHaveLength(0)
  })
})

// ─── buildChangeLogEntries ────────────────────────────────────────────────────

describe('buildChangeLogEntries', () => {
  test('returns empty array when no changes', () => {
    const entries = buildChangeLogEntries({
      objectType: 'Bridge', objectId: '900001',
      objectName: 'Test Bridge', source: 'OData', batchId: null,
      changedBy: 'test@example.com', changes: []
    })
    expect(entries).toEqual([])
  })

  test('creates one entry per changed field', () => {
    const changes = [
      { fieldName: 'bridgeName', oldValue: 'Old', newValue: 'New' },
      { fieldName: 'state', oldValue: 'NSW', newValue: 'VIC' },
    ]
    const entries = buildChangeLogEntries({
      objectType: 'Bridge', objectId: '900001',
      objectName: 'Test Bridge', source: 'OData',
      batchId: 'batch-uuid-001', changedBy: 'user@example.com', changes
    })
    expect(entries).toHaveLength(2)
    expect(entries[0].fieldName).toBe('bridgeName')
    expect(entries[0].objectType).toBe('Bridge')
    expect(entries[0].changeSource).toBe('OData')
    expect(entries[0].changedBy).toBe('user@example.com')
    expect(entries[0].batchId).toBe('batch-uuid-001')
  })

  test('objectId is coerced to string even when integer PK', () => {
    const changes = [{ fieldName: 'bridgeName', oldValue: '', newValue: 'New' }]
    const entries = buildChangeLogEntries({
      objectType: 'Bridge', objectId: 900001, objectName: 'Test',
      source: 'MassUpload', batchId: null, changedBy: 'system', changes
    })
    expect(typeof entries[0].objectId).toBe('string')
    expect(entries[0].objectId).toBe('900001')
  })

  test('changedBy defaults to system when not provided', () => {
    const changes = [{ fieldName: 'bridgeName', oldValue: '', newValue: 'X' }]
    const entries = buildChangeLogEntries({
      objectType: 'Bridge', objectId: '1', objectName: 'X',
      source: 'OData', batchId: null, changedBy: undefined, changes
    })
    expect(entries[0].changedBy).toBe('system')
  })
})
