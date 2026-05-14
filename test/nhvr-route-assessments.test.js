'use strict'

// ─── Inline pure functions (mirrored from srv/handlers/nhvr-compliance.js) ───

function defaultAssessmentStatus(d) {
  if (d.assessmentStatus === undefined) d.assessmentStatus = 'Current'
  return d
}

function validateDateRange(d) {
  if (d.validFrom && d.validTo && new Date(d.validTo) <= new Date(d.validFrom)) {
    return 'validTo must be after validFrom'
  }
  return null
}

function applyAp71ScoreMapping(d) {
  if (d.ap71ScoreNumeric) {
    const map = { 1: 'VeryLow', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'VeryHigh' }
    d.scourRiskCategoryAp71 = map[d.ap71ScoreNumeric] || d.scourRiskCategoryAp71
  }
  return d
}

// ─── Inline compliance rate computation (mirrored from getNhvrComplianceRate) ─

function computeComplianceRate(totalBridges, currentAssessments) {
  if (totalBridges === 0) return 0
  return Math.round((currentAssessments / totalBridges) * 100 * 10) / 10
}

function filterExpiringSoon(assessments, today, warnStr) {
  return assessments.filter(a => a.validTo && a.validTo >= today && a.validTo <= warnStr)
}

function filterCurrentAssessments(assessments, today) {
  return assessments.filter(a => a.assessmentStatus === 'Current' && (!a.validTo || a.validTo >= today))
}

// ─── defaultAssessmentStatus ──────────────────────────────────────────────────

describe('NhvrRouteAssessments — defaultAssessmentStatus', () => {
  test('defaults to Current when assessmentStatus is undefined', () => {
    expect(defaultAssessmentStatus({}).assessmentStatus).toBe('Current')
  })

  test('preserves Superseded when already set', () => {
    expect(defaultAssessmentStatus({ assessmentStatus: 'Superseded' }).assessmentStatus).toBe('Superseded')
  })

  test('preserves Current when explicitly provided', () => {
    expect(defaultAssessmentStatus({ assessmentStatus: 'Current' }).assessmentStatus).toBe('Current')
  })

  test('null assessmentStatus is preserved (not overwritten)', () => {
    expect(defaultAssessmentStatus({ assessmentStatus: null }).assessmentStatus).toBeNull()
  })
})

// ─── date range validation ────────────────────────────────────────────────────

describe('NhvrRouteAssessments — date range validation', () => {
  test('no error when validTo is clearly after validFrom', () => {
    expect(validateDateRange({ validFrom: '2026-01-01', validTo: '2027-06-30' })).toBeNull()
  })

  test('error when validTo equals validFrom (not strictly after)', () => {
    expect(validateDateRange({ validFrom: '2026-06-15', validTo: '2026-06-15' })).toMatch(/validTo must be after/)
  })

  test('error when validTo is before validFrom', () => {
    expect(validateDateRange({ validFrom: '2026-12-31', validTo: '2026-01-01' })).toMatch(/validTo must be after/)
  })

  test('no error when only validFrom present', () => {
    expect(validateDateRange({ validFrom: '2026-01-01' })).toBeNull()
  })

  test('no error when only validTo present', () => {
    expect(validateDateRange({ validTo: '2027-01-01' })).toBeNull()
  })

  test('no error when neither date is present', () => {
    expect(validateDateRange({})).toBeNull()
  })

  test('boundary: one day gap is valid', () => {
    expect(validateDateRange({ validFrom: '2026-06-01', validTo: '2026-06-02' })).toBeNull()
  })
})

// ─── computeComplianceRate ────────────────────────────────────────────────────

describe('getNhvrComplianceRate — compliancePercent calculation', () => {
  test('returns 0 when totalBridges is 0', () => {
    expect(computeComplianceRate(0, 0)).toBe(0)
    expect(computeComplianceRate(0, 5)).toBe(0)
  })

  test('returns 100 when all bridges have current assessments', () => {
    expect(computeComplianceRate(10, 10)).toBe(100)
  })

  test('returns 50 for half coverage', () => {
    expect(computeComplianceRate(10, 5)).toBe(50)
  })

  test('rounds to one decimal place', () => {
    expect(computeComplianceRate(3, 1)).toBeCloseTo(33.3, 1)
  })

  test('returns 0 when no assessments', () => {
    expect(computeComplianceRate(100, 0)).toBe(0)
  })

  test('handles single bridge with one assessment', () => {
    expect(computeComplianceRate(1, 1)).toBe(100)
  })
})

// ─── filterCurrentAssessments ─────────────────────────────────────────────────

describe('getNhvrComplianceRate — filterCurrentAssessments', () => {
  const TODAY = '2026-05-14'

  const assessments = [
    { assessmentStatus: 'Current', validTo: null },
    { assessmentStatus: 'Current', validTo: '2027-01-01' },
    { assessmentStatus: 'Current', validTo: '2026-01-01' },
    { assessmentStatus: 'Superseded', validTo: '2027-01-01' },
  ]

  test('includes Current with no validTo (open-ended)', () => {
    const result = filterCurrentAssessments(assessments, TODAY)
    expect(result).toContainEqual({ assessmentStatus: 'Current', validTo: null })
  })

  test('includes Current with future validTo', () => {
    const result = filterCurrentAssessments(assessments, TODAY)
    expect(result).toContainEqual({ assessmentStatus: 'Current', validTo: '2027-01-01' })
  })

  test('excludes Current with past validTo', () => {
    const result = filterCurrentAssessments(assessments, TODAY)
    expect(result).not.toContainEqual({ assessmentStatus: 'Current', validTo: '2026-01-01' })
  })

  test('excludes Superseded even with future validTo', () => {
    const result = filterCurrentAssessments(assessments, TODAY)
    expect(result).not.toContainEqual({ assessmentStatus: 'Superseded', validTo: '2027-01-01' })
  })

  test('returns 2 current valid assessments from sample set', () => {
    expect(filterCurrentAssessments(assessments, TODAY).length).toBe(2)
  })
})

// ─── filterExpiringSoon ───────────────────────────────────────────────────────

describe('getNhvrComplianceRate — filterExpiringSoon (90-day window)', () => {
  const TODAY = '2026-05-14'
  const WARN_DATE = '2026-08-12'

  test('includes assessment expiring within 90 days', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: '2026-07-01' }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(1)
  })

  test('excludes already-expired assessment', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: '2026-01-01' }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(0)
  })

  test('excludes assessment expiring beyond 90 days', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: '2027-06-01' }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(0)
  })

  test('excludes assessment with no validTo', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: null }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(0)
  })

  test('boundary: validTo equal to TODAY is included', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: TODAY }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(1)
  })

  test('boundary: validTo equal to WARN_DATE is included', () => {
    const assessments = [{ assessmentStatus: 'Current', validTo: WARN_DATE }]
    expect(filterExpiringSoon(assessments, TODAY, WARN_DATE).length).toBe(1)
  })
})
