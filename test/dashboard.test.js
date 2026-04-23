/**
 * Unit tests for dashboard analytics aggregation logic
 *
 * Tests: computeConditionDistribution (bucket bridges by condition label),
 *        computeSufficiencyPct (average structural adequacy as a 0–100 score),
 *        computeDeficient (count of poor + critical bridges).
 *
 * Functions are extracted inline — no CDS runtime or DB is required.
 *
 * Run: npm test
 */
'use strict'

// ─── Inline pure functions (extracted from loadDashboardAnalytics in srv/server.js) ─

function computeConditionDistribution(bridges) {
  const dist = { good: 0, fair: 0, poor: 0, critical: 0 }
  for (const b of bridges) {
    const cond = (b.condition || 'Good').toLowerCase()
    if      (cond === 'critical') dist.critical++
    else if (cond === 'poor')     dist.poor++
    else if (cond === 'fair')     dist.fair++
    else                          dist.good++
  }
  return dist
}

function computeSufficiencyPct(bridges) {
  const rated = bridges.filter(b => b.structuralAdequacyRating != null && b.structuralAdequacyRating > 0)
  if (!rated.length) return 0
  const sum = rated.reduce((s, b) => s + Number(b.structuralAdequacyRating), 0)
  return Math.round((sum / rated.length / 10) * 100)
}

function computeDeficient(dist) {
  return dist.poor + dist.critical
}

// ─── computeConditionDistribution ────────────────────────────────────────────

describe('computeConditionDistribution', () => {
  test('returns all-zero distribution for an empty array', () => {
    expect(computeConditionDistribution([])).toEqual({ good: 0, fair: 0, poor: 0, critical: 0 })
  })

  test('counts all Good when every bridge has condition Good', () => {
    const bridges = [
      { condition: 'Good' },
      { condition: 'Good' },
      { condition: 'Good' }
    ]
    expect(computeConditionDistribution(bridges)).toEqual({ good: 3, fair: 0, poor: 0, critical: 0 })
  })

  test('counts mixed conditions correctly', () => {
    const bridges = [
      { condition: 'Good' },
      { condition: 'Fair' },
      { condition: 'Fair' },
      { condition: 'Poor' },
      { condition: 'Critical' },
      { condition: 'Critical' }
    ]
    expect(computeConditionDistribution(bridges)).toEqual({ good: 1, fair: 2, poor: 1, critical: 2 })
  })

  test('null condition counts as Good', () => {
    const bridges = [
      { condition: null },
      { condition: null }
    ]
    const dist = computeConditionDistribution(bridges)
    expect(dist.good).toBe(2)
    expect(dist.fair + dist.poor + dist.critical).toBe(0)
  })

  test('unknown condition string counts as Good (fallback bucket)', () => {
    const bridges = [{ condition: 'Excellent' }, { condition: 'Unknown' }]
    const dist = computeConditionDistribution(bridges)
    expect(dist.good).toBe(2)
  })

  test('matching is case-insensitive', () => {
    const bridges = [
      { condition: 'GOOD' },
      { condition: 'fair' },
      { condition: 'POOR' },
      { condition: 'CRITICAL' }
    ]
    expect(computeConditionDistribution(bridges)).toEqual({ good: 1, fair: 1, poor: 1, critical: 1 })
  })
})

// ─── computeSufficiencyPct ────────────────────────────────────────────────────

describe('computeSufficiencyPct', () => {
  test('returns 0 for an empty array', () => {
    expect(computeSufficiencyPct([])).toBe(0)
  })

  test('returns 0 when no bridges have a positive rating', () => {
    const bridges = [
      { structuralAdequacyRating: null },
      { structuralAdequacyRating: 0 }
    ]
    expect(computeSufficiencyPct(bridges)).toBe(0)
  })

  test('computes average correctly when all bridges are rated', () => {
    const bridges = [
      { structuralAdequacyRating: 10 },
      { structuralAdequacyRating: 10 }
    ]
    expect(computeSufficiencyPct(bridges)).toBe(100)
  })

  test('excludes null/zero-rated bridges from the average', () => {
    const bridges = [
      { structuralAdequacyRating: 8 },
      { structuralAdequacyRating: null },
      { structuralAdequacyRating: 0 }
    ]
    expect(computeSufficiencyPct(bridges)).toBe(80)
  })

  test('single bridge with rating 5 gives 50%', () => {
    const bridges = [{ structuralAdequacyRating: 5 }]
    expect(computeSufficiencyPct(bridges)).toBe(50)
  })

  test('rounds to nearest integer', () => {
    const bridges = [
      { structuralAdequacyRating: 7 },
      { structuralAdequacyRating: 8 }
    ]
    // avg = 7.5, /10 = 0.75, *100 = 75 → rounds to 75
    expect(computeSufficiencyPct(bridges)).toBe(75)
  })
})

// ─── computeDeficient ────────────────────────────────────────────────────────

describe('computeDeficient', () => {
  test('returns 0 when there are no poor or critical bridges', () => {
    expect(computeDeficient({ good: 5, fair: 3, poor: 0, critical: 0 })).toBe(0)
  })

  test('sums poor and critical counts', () => {
    expect(computeDeficient({ good: 2, fair: 1, poor: 3, critical: 4 })).toBe(7)
  })

  test('handles all-deficient distribution', () => {
    expect(computeDeficient({ good: 0, fair: 0, poor: 6, critical: 2 })).toBe(8)
  })
})
