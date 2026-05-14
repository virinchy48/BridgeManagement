'use strict'

// ─── Pure helpers (mirroring srv/mass-upload.js) ──────────────────────────────

function column(name, type, opts = {}) {
  return { name, type, required: !!opts.required, ...opts }
}

const BRIDGE_COLUMNS = [
  column('ID', 'integer'),
  column('bridgeId', 'string'),
  column('bridgeName', 'string', { required: true }),
  column('state', 'string', { required: true }),
  column('latitude', 'decimal', { required: true }),
  column('longitude', 'decimal', { required: true }),
  column('assetOwner', 'string', { required: true }),
  column('managingAuthority', 'string'),
  column('postingStatus', 'string'),
  column('condition', 'string'),
  column('conditionRating', 'integer'),
  column('yearBuilt', 'integer'),
  column('structureType', 'string'),
  column('floodImpacted', 'boolean'),
  column('highPriorityAsset', 'boolean'),
]

function buildHeaderRow(columns) {
  return columns.map(col => col.required ? `${col.name} *` : col.name)
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  const normalized = String(value).trim().toLowerCase()
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true
  if (['false', 'no', 'n', '0'].includes(normalized)) return false
  throw new Error(`Value "${value}" cannot be parsed as boolean`)
}

function validateUploadRow(row, columns) {
  return columns
    .filter(col => col.required)
    .filter(col => row[col.name] == null || row[col.name] === '')
    .map(col => col.name)
}

function buildUploadSummary(rows, existingIds) {
  const existingSet = new Set(existingIds)
  let inserted = 0, updated = 0
  for (const row of rows) {
    if (row.bridgeId && existingSet.has(row.bridgeId)) updated++
    else inserted++
  }
  return { dataset: 'Bridges', inserted, updated, processed: rows.length }
}

// ─── buildHeaderRow ───────────────────────────────────────────────────────────

describe('buildHeaderRow', () => {
  test('required columns get asterisk suffix', () => {
    const header = buildHeaderRow(BRIDGE_COLUMNS)
    expect(header).toContain('bridgeName *')
    expect(header).toContain('state *')
    expect(header).toContain('latitude *')
    expect(header).toContain('longitude *')
    expect(header).toContain('assetOwner *')
  })

  test('optional columns have no asterisk', () => {
    const header = buildHeaderRow(BRIDGE_COLUMNS)
    expect(header).toContain('condition')
    expect(header).not.toContain('condition *')
    expect(header).toContain('yearBuilt')
    expect(header).not.toContain('yearBuilt *')
  })

  test('header includes all core bridge columns', () => {
    const header = buildHeaderRow(BRIDGE_COLUMNS)
    expect(header.some(h => h.startsWith('bridgeName'))).toBe(true)
    expect(header.some(h => h.startsWith('state'))).toBe(true)
    expect(header.some(h => h.startsWith('latitude'))).toBe(true)
    expect(header.some(h => h.startsWith('longitude'))).toBe(true)
    expect(header.some(h => h.startsWith('assetOwner'))).toBe(true)
  })
})

// ─── parseBoolean ─────────────────────────────────────────────────────────────

describe('parseBoolean', () => {
  test('parses true/false strings', () => {
    expect(parseBoolean('true')).toBe(true)
    expect(parseBoolean('TRUE')).toBe(true)
    expect(parseBoolean('false')).toBe(false)
    expect(parseBoolean('FALSE')).toBe(false)
  })

  test('parses yes/no strings', () => {
    expect(parseBoolean('yes')).toBe(true)
    expect(parseBoolean('YES')).toBe(true)
    expect(parseBoolean('no')).toBe(false)
    expect(parseBoolean('NO')).toBe(false)
  })

  test('parses 1/0 numbers', () => {
    expect(parseBoolean(1)).toBe(true)
    expect(parseBoolean(0)).toBe(false)
  })

  test('passes through native boolean values', () => {
    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
  })

  test('throws on unrecognised value', () => {
    expect(() => parseBoolean('maybe')).toThrow()
    expect(() => parseBoolean('unknown')).toThrow()
  })
})

// ─── validateUploadRow ────────────────────────────────────────────────────────

describe('validateUploadRow', () => {
  test('valid row passes with no missing fields', () => {
    const row = {
      bridgeName: 'Test Bridge', state: 'NSW',
      latitude: -33.8, longitude: 151.0, assetOwner: 'TfNSW'
    }
    expect(validateUploadRow(row, BRIDGE_COLUMNS)).toEqual([])
  })

  test('reports missing required fields', () => {
    const row = { bridgeName: 'Test Bridge' }
    const missing = validateUploadRow(row, BRIDGE_COLUMNS)
    expect(missing).toContain('state')
    expect(missing).toContain('latitude')
    expect(missing).toContain('longitude')
    expect(missing).toContain('assetOwner')
  })
})

// ─── buildUploadSummary ───────────────────────────────────────────────────────

describe('buildUploadSummary', () => {
  test('new rows are counted as inserted', () => {
    const rows = [
      { bridgeId: 'TEST-NSW-091' },
      { bridgeId: 'TEST-NSW-092' },
    ]
    const summary = buildUploadSummary(rows, [])
    expect(summary.inserted).toBe(2)
    expect(summary.updated).toBe(0)
    expect(summary.processed).toBe(2)
  })

  test('existing rows are counted as updated', () => {
    const rows = [
      { bridgeId: 'BRG-NSW-001' },
      { bridgeId: 'TEST-NSW-092' },
    ]
    const summary = buildUploadSummary(rows, ['BRG-NSW-001'])
    expect(summary.inserted).toBe(1)
    expect(summary.updated).toBe(1)
    expect(summary.processed).toBe(2)
  })

  test('dataset name is always Bridges', () => {
    const summary = buildUploadSummary([], [])
    expect(summary.dataset).toBe('Bridges')
  })
})
