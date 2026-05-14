'use strict'

// ─── Pure helpers (mirroring srv/handlers/permits.js) ─────────────────────────

function generatePermitRef(lastRef) {
  const m = lastRef?.match(/^PM-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `PM-${String(seq).padStart(4, '0')}`
}

function applyPermitDefaults(data) {
  const out = Object.assign({}, data)
  if (!out.status) out.status = 'Pending'
  if (out.active === undefined) out.active = true
  return out
}

/** Simulate approve action — sets status to Approved and records decision metadata */
function approvePermit(permit, decisionBy, validFrom, validTo) {
  if (permit.status === 'Approved') throw new Error('Permit is already approved')
  if (permit.status === 'Rejected') throw new Error('Cannot approve a rejected permit')
  const now = new Date('2099-01-01').toISOString().split('T')[0]
  return Object.assign({}, permit, {
    status: 'Approved',
    decisionBy,
    decisionDate: now,
    validFrom: validFrom || now,
    validTo: validTo || null
  })
}

/** Simulate rejectPermit action */
function rejectPermit(permit, decisionBy) {
  if (permit.status === 'Rejected') throw new Error('Permit is already rejected')
  if (permit.status === 'Approved') throw new Error('Cannot reject an already approved permit')
  const now = new Date('2099-01-01').toISOString().split('T')[0]
  return Object.assign({}, permit, {
    status: 'Rejected',
    decisionBy,
    decisionDate: now
  })
}

function buildPermitRecord(overrides) {
  return applyPermitDefaults(Object.assign({
    ID: 'test-prm-uuid-0001',
    permitRef: 'TEST-PM-0001',
    bridgeRef: 'BRG-NSW-001',
    bridge_ID: 'bridge-uuid-test-001',
    applicantName: 'Test Logistics Pty Ltd',
    vehicleClass: 'B-Double',
    grossMass: 55,
    appliedDate: '2099-01-01'
  }, overrides))
}

// ─── generatePermitRef ────────────────────────────────────────────────────────

describe('generatePermitRef', () => {
  test('generates PM-0001 when no prior permit exists', () => {
    expect(generatePermitRef(null)).toBe('PM-0001')
    expect(generatePermitRef(undefined)).toBe('PM-0001')
    expect(generatePermitRef('')).toBe('PM-0001')
  })

  test('increments from existing ref', () => {
    expect(generatePermitRef('PM-0001')).toBe('PM-0002')
    expect(generatePermitRef('PM-0099')).toBe('PM-0100')
    expect(generatePermitRef('PM-0999')).toBe('PM-1000')
  })

  test('uses regex — does not produce NaN', () => {
    const result = generatePermitRef('')
    expect(result).not.toContain('NaN')
    expect(result).toBe('PM-0001')
  })

  test('matches PM-NNNN pattern', () => {
    expect(generatePermitRef(null)).toMatch(/^PM-\d{4,}$/)
    expect(generatePermitRef('PM-0042')).toMatch(/^PM-\d{4,}$/)
  })
})

// ─── applyPermitDefaults ──────────────────────────────────────────────────────

describe('applyPermitDefaults', () => {
  test('status defaults to Pending when not provided', () => {
    const permit = applyPermitDefaults({ applicantName: 'ACME' })
    expect(permit.status).toBe('Pending')
  })

  test('active defaults to true', () => {
    const permit = applyPermitDefaults({ applicantName: 'ACME' })
    expect(permit.active).toBe(true)
  })

  test('explicit status is preserved', () => {
    const permit = applyPermitDefaults({ status: 'Approved' })
    expect(permit.status).toBe('Approved')
  })

  test('explicit active=false is preserved', () => {
    const permit = applyPermitDefaults({ active: false })
    expect(permit.active).toBe(false)
  })
})

// ─── approvePermit ────────────────────────────────────────────────────────────

describe('approvePermit', () => {
  test('transitions status from Pending to Approved', () => {
    const permit = buildPermitRecord({ status: 'Pending' })
    const approved = approvePermit(permit, 'bridge.manager@example.com', null, null)
    expect(approved.status).toBe('Approved')
    expect(approved.decisionBy).toBe('bridge.manager@example.com')
  })

  test('throws when permit is already approved', () => {
    const permit = buildPermitRecord({ status: 'Approved' })
    expect(() => approvePermit(permit, 'user@example.com', null, null))
      .toThrow(/already approved/)
  })

  test('throws when trying to approve a rejected permit', () => {
    const permit = buildPermitRecord({ status: 'Rejected' })
    expect(() => approvePermit(permit, 'user@example.com', null, null))
      .toThrow(/rejected/)
  })
})

// ─── rejectPermit ─────────────────────────────────────────────────────────────

describe('rejectPermit', () => {
  test('transitions status from Pending to Rejected', () => {
    const permit = buildPermitRecord({ status: 'Pending' })
    const rejected = rejectPermit(permit, 'bridge.manager@example.com')
    expect(rejected.status).toBe('Rejected')
    expect(rejected.decisionBy).toBe('bridge.manager@example.com')
  })

  test('throws when permit is already rejected', () => {
    const permit = buildPermitRecord({ status: 'Rejected' })
    expect(() => rejectPermit(permit, 'user@example.com')).toThrow(/already rejected/)
  })

  test('throws when trying to reject an already approved permit', () => {
    const permit = buildPermitRecord({ status: 'Approved' })
    expect(() => rejectPermit(permit, 'user@example.com')).toThrow(/approved/)
  })
})
