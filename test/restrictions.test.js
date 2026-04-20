/**
 * Unit tests for Restrictions lifecycle business rules
 *
 * These tests validate the pure business-logic layer — status transitions,
 * auto-ref format, temporary-flag derivation, and soft-delete rules.
 * No CDS runtime or DB is required.
 *
 * Run: npm test
 */
'use strict'

// ─── Business-logic helpers (mirror what srv/admin-service.js enforces) ───────

/** Derive temporary boolean from category */
function deriveTemporary(restrictionCategory) {
  return restrictionCategory === 'Temporary'
}

/** Auto-generate a restriction reference in BR-NNNN format */
function generateRef(sequence) {
  return 'BR-' + String(sequence).padStart(4, '0')
}

/** Validate mandatory fields for a new BridgeRestriction */
function validateMandatoryFields(data) {
  const required = ['restrictionCategory', 'restrictionType', 'restrictionValue', 'restrictionUnit', 'effectiveFrom']
  return required.filter(f => data[f] == null || data[f] === '')
}

/** Validate mandatory temp fields when category is Temporary */
function validateTemporaryFields(data) {
  if (data.restrictionCategory !== 'Temporary') return []
  const required = ['temporaryFrom', 'temporaryTo']
  return required.filter(f => data[f] == null || data[f] === '')
}

/** Simulate deactivate action — returns updated record */
function deactivate(br) {
  if (br.restrictionStatus === 'Inactive') {
    throw new Error('Restriction is already inactive')
  }
  return { ...br, active: false, restrictionStatus: 'Inactive' }
}

/** Simulate reactivate action — returns updated record */
function reactivate(br) {
  if (br.restrictionStatus === 'Active') {
    throw new Error('Restriction is already active')
  }
  return { ...br, active: true, restrictionStatus: 'Active' }
}

/** Check whether a hard-delete should be blocked (active restrictions cannot be deleted) */
function canHardDelete(br) {
  return !br.active
}

// ─── Reference auto-generation ────────────────────────────────────────────────

describe('generateRef', () => {
  test('pads sequence to 4 digits', () => {
    expect(generateRef(1)).toBe('BR-0001')
    expect(generateRef(42)).toBe('BR-0042')
    expect(generateRef(999)).toBe('BR-0999')
    expect(generateRef(10000)).toBe('BR-10000') // beyond 4 digits still works
  })

  test('matches expected BR-NNNN pattern', () => {
    for (let i = 1; i <= 20; i++) {
      expect(generateRef(i)).toMatch(/^BR-\d{4,}$/)
    }
  })
})

// ─── deriveTemporary ──────────────────────────────────────────────────────────

describe('deriveTemporary', () => {
  test('returns true for Temporary category', () => {
    expect(deriveTemporary('Temporary')).toBe(true)
  })

  test('returns false for Permanent category', () => {
    expect(deriveTemporary('Permanent')).toBe(false)
  })

  test('returns false for any other value', () => {
    expect(deriveTemporary(null)).toBe(false)
    expect(deriveTemporary('')).toBe(false)
    expect(deriveTemporary('Seasonal')).toBe(false)
  })
})

// ─── validateMandatoryFields ──────────────────────────────────────────────────

describe('validateMandatoryFields', () => {
  const validData = {
    restrictionCategory: 'Permanent',
    restrictionType: 'Mass',
    restrictionValue: 20,
    restrictionUnit: 't',
    effectiveFrom: '2025-01-01'
  }

  test('returns empty array when all mandatory fields provided', () => {
    expect(validateMandatoryFields(validData)).toHaveLength(0)
  })

  test('returns missing field names when fields are absent', () => {
    const missing = validateMandatoryFields({})
    expect(missing).toContain('restrictionCategory')
    expect(missing).toContain('restrictionType')
    expect(missing).toContain('restrictionValue')
    expect(missing).toContain('restrictionUnit')
    expect(missing).toContain('effectiveFrom')
  })

  test('treats empty string as missing', () => {
    const missing = validateMandatoryFields({ ...validData, restrictionUnit: '' })
    expect(missing).toContain('restrictionUnit')
  })

  test('treats null as missing', () => {
    const missing = validateMandatoryFields({ ...validData, effectiveFrom: null })
    expect(missing).toContain('effectiveFrom')
  })
})

// ─── validateTemporaryFields ──────────────────────────────────────────────────

describe('validateTemporaryFields', () => {
  test('does not validate temp fields for Permanent restrictions', () => {
    const errors = validateTemporaryFields({
      restrictionCategory: 'Permanent',
      temporaryFrom: null,
      temporaryTo: null
    })
    expect(errors).toHaveLength(0)
  })

  test('requires temporaryFrom and temporaryTo for Temporary restrictions', () => {
    const errors = validateTemporaryFields({
      restrictionCategory: 'Temporary',
      temporaryFrom: null,
      temporaryTo: null
    })
    expect(errors).toContain('temporaryFrom')
    expect(errors).toContain('temporaryTo')
  })

  test('passes when both temp dates are provided', () => {
    const errors = validateTemporaryFields({
      restrictionCategory: 'Temporary',
      temporaryFrom: '2025-03-01',
      temporaryTo: '2025-03-31'
    })
    expect(errors).toHaveLength(0)
  })
})

// ─── Soft-delete lifecycle ────────────────────────────────────────────────────

describe('deactivate', () => {
  const activeBr = { ID: '1', active: true, restrictionStatus: 'Active' }

  test('sets active=false and restrictionStatus=Inactive', () => {
    const updated = deactivate(activeBr)
    expect(updated.active).toBe(false)
    expect(updated.restrictionStatus).toBe('Inactive')
  })

  test('throws when already inactive', () => {
    const inactiveBr = { ID: '2', active: false, restrictionStatus: 'Inactive' }
    expect(() => deactivate(inactiveBr)).toThrow('already inactive')
  })

  test('does not mutate the original record', () => {
    deactivate(activeBr)
    expect(activeBr.active).toBe(true) // original unchanged
  })
})

describe('reactivate', () => {
  const inactiveBr = { ID: '2', active: false, restrictionStatus: 'Inactive' }

  test('sets active=true and restrictionStatus=Active', () => {
    const updated = reactivate(inactiveBr)
    expect(updated.active).toBe(true)
    expect(updated.restrictionStatus).toBe('Active')
  })

  test('throws when already active', () => {
    const activeBr = { ID: '1', active: true, restrictionStatus: 'Active' }
    expect(() => reactivate(activeBr)).toThrow('already active')
  })
})

// ─── Hard-delete guard ────────────────────────────────────────────────────────

describe('canHardDelete', () => {
  test('allows hard-delete only for inactive restrictions', () => {
    expect(canHardDelete({ active: false })).toBe(true)
    expect(canHardDelete({ active: true })).toBe(false)
  })
})

// ─── Full lifecycle round-trip ────────────────────────────────────────────────

describe('Full lifecycle: Active → Inactive → Active → Delete', () => {
  test('round-trip passes all guards', () => {
    let br = {
      ID: 'test-001',
      restrictionCategory: 'Permanent',
      restrictionType: 'Mass',
      restrictionValue: 20,
      restrictionUnit: 't',
      effectiveFrom: '2025-01-01',
      active: true,
      restrictionStatus: 'Active'
    }

    // No mandatory fields missing
    expect(validateMandatoryFields(br)).toHaveLength(0)

    // Cannot hard-delete while active
    expect(canHardDelete(br)).toBe(false)

    // Deactivate
    br = deactivate(br)
    expect(br.restrictionStatus).toBe('Inactive')

    // Now eligible for hard-delete (or reactivation)
    expect(canHardDelete(br)).toBe(true)

    // Reactivate
    br = reactivate(br)
    expect(br.restrictionStatus).toBe('Active')
    expect(canHardDelete(br)).toBe(false)
  })
})
