'use strict'

// ─── Inline pure functions (mirrored from srv/handlers/nhvr-compliance.js) ───

function applyScourRiskCategory(d) {
  if (d.ap71ScoreNumeric) {
    const map = { 1: 'VeryLow', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'VeryHigh' }
    d.scourRiskCategoryAp71 = map[d.ap71ScoreNumeric] || d.scourRiskCategoryAp71
  }
  return d
}

function validateNhvrDateRange(d) {
  if (d.validFrom && d.validTo && new Date(d.validTo) <= new Date(d.validFrom)) {
    return { error: 'validTo must be after validFrom' }
  }
  return null
}

function defaultAssessmentStatus(d) {
  if (d.assessmentStatus === undefined) d.assessmentStatus = 'Current'
  return d
}

// ─── BridgeScourAssessmentDetail — AP-G71 score mapping ──────────────────────

describe('BridgeScourAssessmentDetail — AP-G71 score category mapping', () => {
  test('maps numeric 1 to VeryLow', () => {
    const d = { ap71ScoreNumeric: 1 }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('VeryLow')
  })

  test('maps numeric 2 to Low', () => {
    const d = { ap71ScoreNumeric: 2 }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('Low')
  })

  test('maps numeric 3 to Medium', () => {
    const d = { ap71ScoreNumeric: 3 }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('Medium')
  })

  test('maps numeric 4 to High', () => {
    const d = { ap71ScoreNumeric: 4 }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('High')
  })

  test('maps numeric 5 to VeryHigh', () => {
    const d = { ap71ScoreNumeric: 5 }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('VeryHigh')
  })

  test('out-of-range numeric preserves existing scourRiskCategoryAp71', () => {
    const d = { ap71ScoreNumeric: 9, scourRiskCategoryAp71: 'Medium' }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('Medium')
  })

  test('zero numeric is not in map — preserves existing value', () => {
    const d = { ap71ScoreNumeric: 0, scourRiskCategoryAp71: 'Low' }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('Low')
  })

  test('absent ap71ScoreNumeric leaves scourRiskCategoryAp71 unchanged', () => {
    const d = { scourRiskCategoryAp71: 'High' }
    expect(applyScourRiskCategory(d).scourRiskCategoryAp71).toBe('High')
  })

  test('all five canonical scores map to distinct non-null values', () => {
    const results = [1, 2, 3, 4, 5].map(n => applyScourRiskCategory({ ap71ScoreNumeric: n }).scourRiskCategoryAp71)
    expect(new Set(results).size).toBe(5)
    results.forEach(r => expect(r).toBeTruthy())
  })
})

// ─── NhvrRouteAssessments — date range validation ─────────────────────────────

describe('NhvrRouteAssessments — date range validation', () => {
  test('returns null when validTo is after validFrom', () => {
    expect(validateNhvrDateRange({ validFrom: '2026-01-01', validTo: '2027-01-01' })).toBeNull()
  })

  test('returns error when validTo equals validFrom', () => {
    const result = validateNhvrDateRange({ validFrom: '2026-06-01', validTo: '2026-06-01' })
    expect(result).not.toBeNull()
    expect(result.error).toMatch(/validTo must be after validFrom/)
  })

  test('returns error when validTo is before validFrom', () => {
    const result = validateNhvrDateRange({ validFrom: '2026-12-01', validTo: '2026-01-01' })
    expect(result).not.toBeNull()
    expect(result.error).toMatch(/validTo must be after validFrom/)
  })

  test('returns null when validFrom is absent', () => {
    expect(validateNhvrDateRange({ validTo: '2027-01-01' })).toBeNull()
  })

  test('returns null when validTo is absent', () => {
    expect(validateNhvrDateRange({ validFrom: '2026-01-01' })).toBeNull()
  })

  test('returns null when both dates are absent', () => {
    expect(validateNhvrDateRange({})).toBeNull()
  })
})

// ─── NhvrRouteAssessments — default assessmentStatus ─────────────────────────

describe('NhvrRouteAssessments — assessmentStatus defaulting', () => {
  test('defaults assessmentStatus to Current when not supplied', () => {
    const d = defaultAssessmentStatus({})
    expect(d.assessmentStatus).toBe('Current')
  })

  test('preserves existing assessmentStatus when already set', () => {
    const d = defaultAssessmentStatus({ assessmentStatus: 'Superseded' })
    expect(d.assessmentStatus).toBe('Superseded')
  })

  test('preserves assessmentStatus when explicitly set to Current', () => {
    const d = defaultAssessmentStatus({ assessmentStatus: 'Current' })
    expect(d.assessmentStatus).toBe('Current')
  })
})
