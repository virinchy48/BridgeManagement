'use strict'

// ─── Pure helpers (mirroring srv/mass-upload.js INSPECTION_COLUMNS) ───────────

function column(name, type, opts = {}) {
  return { name, type, required: !!opts.required, ...opts }
}

const INSPECTION_COLUMNS = [
  column('ID', 'string'),
  column('bridgeRef', 'string', { required: true }),
  column('inspectionRef', 'string'),
  column('inspectionDate', 'date', { required: true }),
  column('inspectionType', 'string', { required: true }),
  column('inspector', 'string', { required: true }),
  column('inspectorAccreditationLevel', 'string'),
  column('overallConditionRating', 'integer'),
  column('loadCarryingCapacityConfirmed', 'boolean'),
  column('criticalFindings', 'boolean'),
  column('followUpRequired', 'boolean'),
  column('recommendedActions', 'string'),
  column('inspectionNotes', 'string'),
  column('active', 'boolean'),
]

function buildInspectionHeaderRow(columns) {
  return columns.map(col => col.required ? `${col.name} *` : col.name)
}

function validateInspectionRow(row) {
  const required = INSPECTION_COLUMNS.filter(c => c.required)
  return required
    .filter(c => row[c.name] == null || row[c.name] === '')
    .map(c => c.name)
}

function resolveInspectionRef(provided, lastRef) {
  if (provided && provided.trim()) return provided.trim()
  const m = lastRef?.match(/^INS-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `INS-${String(seq).padStart(4, '0')}`
}

function buildInspectionUploadSummary(rows, existingIds) {
  const existingSet = new Set(existingIds)
  let inserted = 0, updated = 0
  for (const row of rows) {
    if (row.ID && existingSet.has(row.ID)) updated++
    else inserted++
  }
  return { dataset: 'BridgeInspections', inserted, updated, processed: rows.length }
}

// ─── INSPECTION_COLUMNS structure ─────────────────────────────────────────────

describe('INSPECTION_COLUMNS structure', () => {
  test('bridgeRef is required', () => {
    const col = INSPECTION_COLUMNS.find(c => c.name === 'bridgeRef')
    expect(col).toBeDefined()
    expect(col.required).toBe(true)
  })

  test('inspectionDate and inspectionType and inspector are required', () => {
    const required = INSPECTION_COLUMNS.filter(c => c.required).map(c => c.name)
    expect(required).toContain('inspectionDate')
    expect(required).toContain('inspectionType')
    expect(required).toContain('inspector')
  })

  test('inspectionRef is optional (auto-generated server-side)', () => {
    const col = INSPECTION_COLUMNS.find(c => c.name === 'inspectionRef')
    expect(col.required).toBe(false)
  })
})

// ─── buildInspectionHeaderRow ─────────────────────────────────────────────────

describe('buildInspectionHeaderRow', () => {
  test('required columns have asterisk in header', () => {
    const header = buildInspectionHeaderRow(INSPECTION_COLUMNS)
    expect(header).toContain('bridgeRef *')
    expect(header).toContain('inspectionDate *')
    expect(header).toContain('inspectionType *')
    expect(header).toContain('inspector *')
  })

  test('optional columns have no asterisk', () => {
    const header = buildInspectionHeaderRow(INSPECTION_COLUMNS)
    expect(header).toContain('inspectionRef')
    expect(header).not.toContain('inspectionRef *')
    expect(header).toContain('inspectionNotes')
    expect(header).not.toContain('inspectionNotes *')
  })
})

// ─── validateInspectionRow ────────────────────────────────────────────────────

describe('validateInspectionRow', () => {
  test('valid row referencing a known bridge passes', () => {
    const row = {
      bridgeRef: 'BRG-NSW-001',
      inspectionDate: '2099-01-15',
      inspectionType: 'Routine',
      inspector: 'Test Inspector'
    }
    expect(validateInspectionRow(row)).toEqual([])
  })

  test('missing bridgeRef reported as error', () => {
    const row = {
      inspectionDate: '2099-01-15',
      inspectionType: 'Routine',
      inspector: 'Test Inspector'
    }
    const missing = validateInspectionRow(row)
    expect(missing).toContain('bridgeRef')
  })

  test('missing inspectionDate reported as error', () => {
    const row = {
      bridgeRef: 'BRG-NSW-001',
      inspectionType: 'Routine',
      inspector: 'Test Inspector'
    }
    const missing = validateInspectionRow(row)
    expect(missing).toContain('inspectionDate')
  })
})

// ─── resolveInspectionRef ─────────────────────────────────────────────────────

describe('resolveInspectionRef', () => {
  test('uses provided ref if non-empty', () => {
    expect(resolveInspectionRef('TEST-INS-0001', null)).toBe('TEST-INS-0001')
    expect(resolveInspectionRef('INS-0050', 'INS-0049')).toBe('INS-0050')
  })

  test('auto-generates from sequence when no ref provided', () => {
    expect(resolveInspectionRef(null, 'INS-0005')).toBe('INS-0006')
    expect(resolveInspectionRef('', 'INS-0010')).toBe('INS-0011')
  })

  test('starts from INS-0001 when no prior ref and no provided ref', () => {
    expect(resolveInspectionRef(null, null)).toBe('INS-0001')
    expect(resolveInspectionRef('', '')).toBe('INS-0001')
  })
})

// ─── buildInspectionUploadSummary ─────────────────────────────────────────────

describe('buildInspectionUploadSummary', () => {
  test('new inspections are inserted', () => {
    const rows = [
      { bridgeRef: 'BRG-NSW-001', inspectionDate: '2099-01-15' },
      { bridgeRef: 'BRG-NSW-002', inspectionDate: '2099-02-01' },
    ]
    const summary = buildInspectionUploadSummary(rows, [])
    expect(summary.inserted).toBe(2)
    expect(summary.updated).toBe(0)
    expect(summary.processed).toBe(2)
    expect(summary.dataset).toBe('BridgeInspections')
  })

  test('existing inspections (matched by ID) are updated', () => {
    const existingId = 'insp-uuid-existing-001'
    const rows = [
      { ID: existingId, bridgeRef: 'BRG-NSW-001' },
      { bridgeRef: 'BRG-NSW-002' },
    ]
    const summary = buildInspectionUploadSummary(rows, [existingId])
    expect(summary.inserted).toBe(1)
    expect(summary.updated).toBe(1)
    expect(summary.processed).toBe(2)
  })
})
