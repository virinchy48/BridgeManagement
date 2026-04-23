/**
 * Unit tests for condition rating logic
 *
 * Tests: deriveConditionFromRating (numeric 1–10 → text label) and
 *        _matchesRange (used in the map filter panel to test value against
 *        a min/max band).
 *
 * No CDS runtime or DB is required.
 *
 * Run: npm test
 */
'use strict'

// ─── Inline pure functions (mirrored from app/map-view controller) ────────────

function deriveConditionFromRating(rating) {
  if (rating == null) return null
  if (rating >= 8 && rating <= 10) return 'Good'
  if (rating >= 5 && rating <= 7)  return 'Fair'
  if (rating >= 3 && rating <= 4)  return 'Poor'
  if (rating >= 1 && rating <= 2)  return 'Critical'
  return null
}

function _matchesRange(value, min, max) {
  if (value == null) return true
  return value >= min && value <= max
}

// ─── deriveConditionFromRating ────────────────────────────────────────────────

describe('deriveConditionFromRating', () => {
  test('returns Good for ratings 8–10', () => {
    expect(deriveConditionFromRating(8)).toBe('Good')
    expect(deriveConditionFromRating(9)).toBe('Good')
    expect(deriveConditionFromRating(10)).toBe('Good')
  })

  test('returns Fair for ratings 5–7', () => {
    expect(deriveConditionFromRating(5)).toBe('Fair')
    expect(deriveConditionFromRating(6)).toBe('Fair')
    expect(deriveConditionFromRating(7)).toBe('Fair')
  })

  test('returns Poor for ratings 3–4', () => {
    expect(deriveConditionFromRating(3)).toBe('Poor')
    expect(deriveConditionFromRating(4)).toBe('Poor')
  })

  test('returns Critical for ratings 1–2', () => {
    expect(deriveConditionFromRating(1)).toBe('Critical')
    expect(deriveConditionFromRating(2)).toBe('Critical')
  })

  test('returns null for rating 0 (below scale)', () => {
    expect(deriveConditionFromRating(0)).toBeNull()
  })

  test('returns null for rating 11 (above scale)', () => {
    expect(deriveConditionFromRating(11)).toBeNull()
  })

  test('returns null for null rating', () => {
    expect(deriveConditionFromRating(null)).toBeNull()
  })

  test('boundary values land in the correct band', () => {
    expect(deriveConditionFromRating(2)).toBe('Critical')
    expect(deriveConditionFromRating(3)).toBe('Poor')
    expect(deriveConditionFromRating(4)).toBe('Poor')
    expect(deriveConditionFromRating(5)).toBe('Fair')
    expect(deriveConditionFromRating(7)).toBe('Fair')
    expect(deriveConditionFromRating(8)).toBe('Good')
    expect(deriveConditionFromRating(10)).toBe('Good')
  })
})

// ─── _matchesRange ────────────────────────────────────────────────────────────

describe('_matchesRange', () => {
  test('null value always returns true', () => {
    expect(_matchesRange(null, 0, 100)).toBe(true)
    expect(_matchesRange(null, 5, 10)).toBe(true)
    expect(_matchesRange(null, -999, 999)).toBe(true)
  })

  test('value exactly at min bound returns true', () => {
    expect(_matchesRange(5, 5, 10)).toBe(true)
  })

  test('value exactly at max bound returns true', () => {
    expect(_matchesRange(10, 5, 10)).toBe(true)
  })

  test('value strictly inside range returns true', () => {
    expect(_matchesRange(7, 5, 10)).toBe(true)
  })

  test('value below min returns false', () => {
    expect(_matchesRange(4, 5, 10)).toBe(false)
  })

  test('value above max returns false', () => {
    expect(_matchesRange(11, 5, 10)).toBe(false)
  })

  test('works correctly with zero bounds', () => {
    expect(_matchesRange(0, 0, 0)).toBe(true)
    expect(_matchesRange(1, 0, 0)).toBe(false)
  })

  test('works correctly with negative values', () => {
    expect(_matchesRange(-5, -10, -1)).toBe(true)
    expect(_matchesRange(0, -10, -1)).toBe(false)
  })
})
