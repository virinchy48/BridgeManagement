'use strict'

// ─── Inline pure functions (mirrored from srv/handlers/capacities.js) ─────────

function defaultCapacityFields(d, today) {
  if (!d.effectiveFrom) d.effectiveFrom = today
  if (!d.capacityStatus) d.capacityStatus = 'Current'
  return d
}

function buildSupersedePatch(today) {
  return { capacityStatus: 'Superseded', effectiveTo: today }
}

function shouldAutoSupersede(prior) {
  return prior && prior.capacityStatus === 'Current'
}

// ─── defaultCapacityFields ────────────────────────────────────────────────────

describe('BridgeCapacities — defaultCapacityFields', () => {
  const TODAY = '2026-05-14'

  test('sets effectiveFrom to today when absent', () => {
    const d = defaultCapacityFields({}, TODAY)
    expect(d.effectiveFrom).toBe(TODAY)
  })

  test('preserves existing effectiveFrom when already set', () => {
    const d = defaultCapacityFields({ effectiveFrom: '2025-01-01' }, TODAY)
    expect(d.effectiveFrom).toBe('2025-01-01')
  })

  test('sets capacityStatus to Current when absent', () => {
    const d = defaultCapacityFields({}, TODAY)
    expect(d.capacityStatus).toBe('Current')
  })

  test('preserves existing capacityStatus when already set', () => {
    const d = defaultCapacityFields({ capacityStatus: 'Superseded' }, TODAY)
    expect(d.capacityStatus).toBe('Superseded')
  })

  test('sets both defaults when both absent', () => {
    const d = defaultCapacityFields({}, TODAY)
    expect(d.effectiveFrom).toBe(TODAY)
    expect(d.capacityStatus).toBe('Current')
  })

  test('preserves both when both are supplied', () => {
    const d = defaultCapacityFields({ effectiveFrom: '2024-06-01', capacityStatus: 'Superseded' }, TODAY)
    expect(d.effectiveFrom).toBe('2024-06-01')
    expect(d.capacityStatus).toBe('Superseded')
  })
})

// ─── shouldAutoSupersede ──────────────────────────────────────────────────────

describe('BridgeCapacities — shouldAutoSupersede', () => {
  test('returns true when prior record has capacityStatus Current', () => {
    expect(shouldAutoSupersede({ ID: 'abc', capacityStatus: 'Current' })).toBe(true)
  })

  test('returns false when prior record is Superseded', () => {
    expect(shouldAutoSupersede({ ID: 'abc', capacityStatus: 'Superseded' })).toBe(false)
  })

  test('returns falsy when prior is null (no existing record)', () => {
    expect(shouldAutoSupersede(null)).toBeFalsy()
  })

  test('returns falsy when prior is undefined', () => {
    expect(shouldAutoSupersede(undefined)).toBeFalsy()
  })
})

// ─── buildSupersedePatch ──────────────────────────────────────────────────────

describe('BridgeCapacities — buildSupersedePatch', () => {
  test('returns Superseded status and effectiveTo = today', () => {
    const patch = buildSupersedePatch('2026-05-14')
    expect(patch.capacityStatus).toBe('Superseded')
    expect(patch.effectiveTo).toBe('2026-05-14')
  })

  test('effectiveTo matches the provided today string exactly', () => {
    const today = '2026-03-31'
    const patch = buildSupersedePatch(today)
    expect(patch.effectiveTo).toBe(today)
  })
})

// ─── Integration: CREATE with missing required fields skips auto-supersede ────

describe('BridgeCapacities — CREATE guard: missing bridge_ID or capacityType', () => {
  function handleCreate(d, prior) {
    if (!d.bridge_ID || !d.capacityType) return { skipped: true, prior }
    const superseded = shouldAutoSupersede(prior)
    return { skipped: false, superseded }
  }

  test('skips when bridge_ID is absent', () => {
    expect(handleCreate({ capacityType: 'DesignLoad' }, null).skipped).toBe(true)
  })

  test('skips when capacityType is absent', () => {
    expect(handleCreate({ bridge_ID: 'uuid-1' }, null).skipped).toBe(true)
  })

  test('proceeds when both bridge_ID and capacityType are present', () => {
    expect(handleCreate({ bridge_ID: 'uuid-1', capacityType: 'DesignLoad' }, null).skipped).toBe(false)
  })

  test('does NOT supersede when no prior Current record exists', () => {
    const result = handleCreate({ bridge_ID: 'uuid-1', capacityType: 'DesignLoad' }, null)
    expect(result.superseded).toBeFalsy()
  })

  test('supersedes when prior Current record exists', () => {
    const prior = { ID: 'prior-uuid', capacityStatus: 'Current' }
    const result = handleCreate({ bridge_ID: 'uuid-1', capacityType: 'DesignLoad' }, prior)
    expect(result.superseded).toBe(true)
  })
})
