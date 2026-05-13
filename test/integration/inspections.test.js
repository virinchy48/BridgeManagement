'use strict'

// ─── Pure helpers (mirroring srv/handlers/inspections.js) ─────────────────────

function generateInspectionRef(lastRef) {
  if (!lastRef) return 'INS-0001'
  const m = lastRef.match(/^INS-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `INS-${String(seq).padStart(4, '0')}`
}

function applyInspectionDefaults(data) {
  const out = Object.assign({}, data)
  if (out.active === undefined) out.active = true
  return out
}

function validateAccreditationLevel(inspectionType, accreditationLevel) {
  const restrictedTypes = ['Principal', 'Detailed']
  if (!restrictedTypes.includes(inspectionType)) return null
  const allowed = ['Level 3', 'Level 4']
  if (accreditationLevel && !allowed.includes(accreditationLevel)) {
    return `${inspectionType} inspections require Level 3 or Level 4 accreditation (current: ${accreditationLevel})`
  }
  return null
}

function buildInspectionRecord(bridgeId, overrides) {
  return applyInspectionDefaults(Object.assign({
    ID: 'test-insp-uuid-0001',
    bridge_ID: bridgeId,
    inspectionRef: 'TEST-INS-0001',
    inspectionDate: '2099-01-15',
    inspectionType: 'Routine',
    inspectedBy: 'Test Inspector'
  }, overrides))
}

// ─── generateInspectionRef ────────────────────────────────────────────────────

describe('generateInspectionRef', () => {
  test('generates INS-0001 when no prior inspections exist', () => {
    expect(generateInspectionRef(null)).toBe('INS-0001')
    expect(generateInspectionRef(undefined)).toBe('INS-0001')
    expect(generateInspectionRef('')).toBe('INS-0001')
  })

  test('increments sequence correctly from existing ref', () => {
    expect(generateInspectionRef('INS-0001')).toBe('INS-0002')
    expect(generateInspectionRef('INS-0042')).toBe('INS-0043')
    expect(generateInspectionRef('INS-0999')).toBe('INS-1000')
  })

  test('output matches INS-NNNN pattern', () => {
    for (let i = 1; i <= 20; i++) {
      const ref = generateInspectionRef(i === 1 ? null : `INS-${String(i - 1).padStart(4, '0')}`)
      expect(ref).toMatch(/^INS-\d{4,}$/)
    }
  })

  test('handles malformed previous ref gracefully (resets to 0001)', () => {
    // malformed input: no match → seq=1
    expect(generateInspectionRef('INVALID')).toBe('INS-0001')
  })
})

// ─── applyInspectionDefaults ──────────────────────────────────────────────────

describe('applyInspectionDefaults', () => {
  test('active defaults to true', () => {
    const insp = applyInspectionDefaults({ inspectionDate: '2099-01-15' })
    expect(insp.active).toBe(true)
  })

  test('explicit active=false is preserved', () => {
    const insp = applyInspectionDefaults({ inspectionDate: '2099-01-15', active: false })
    expect(insp.active).toBe(false)
  })

  test('bridge_ID is preserved in defaults pass-through', () => {
    const uuid = 'bridge-uuid-abcd'
    const insp = buildInspectionRecord(uuid)
    expect(insp.bridge_ID).toBe(uuid)
  })
})

// ─── validateAccreditationLevel ───────────────────────────────────────────────

describe('validateAccreditationLevel', () => {
  test('Routine inspection allows any accreditation level', () => {
    expect(validateAccreditationLevel('Routine', 'Level 1')).toBeNull()
    expect(validateAccreditationLevel('Routine', 'Level 2')).toBeNull()
    expect(validateAccreditationLevel('Routine', null)).toBeNull()
  })

  test('Principal inspection blocks Level 1 and Level 2', () => {
    const err = validateAccreditationLevel('Principal', 'Level 1')
    expect(err).toMatch(/Level 3 or Level 4/)
    const err2 = validateAccreditationLevel('Principal', 'Level 2')
    expect(err2).toMatch(/Level 3 or Level 4/)
  })

  test('Detailed inspection allows Level 3 and Level 4', () => {
    expect(validateAccreditationLevel('Detailed', 'Level 3')).toBeNull()
    expect(validateAccreditationLevel('Detailed', 'Level 4')).toBeNull()
  })

  test('Principal inspection with no level provided is not blocked', () => {
    expect(validateAccreditationLevel('Principal', null)).toBeNull()
    expect(validateAccreditationLevel('Principal', undefined)).toBeNull()
  })
})

// ─── sequential ref generation ────────────────────────────────────────────────

describe('sequential inspection ref generation', () => {
  test('second inspection ref increments from first', () => {
    const first = generateInspectionRef(null)
    const second = generateInspectionRef(first)
    expect(first).toBe('INS-0001')
    expect(second).toBe('INS-0002')
  })

  test('generating 5 sequential refs produces correct series', () => {
    let last = null
    const refs = []
    for (let i = 0; i < 5; i++) {
      last = generateInspectionRef(last)
      refs.push(last)
    }
    expect(refs).toEqual(['INS-0001', 'INS-0002', 'INS-0003', 'INS-0004', 'INS-0005'])
  })
})
