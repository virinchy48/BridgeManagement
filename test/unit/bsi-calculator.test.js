'use strict'

const { calculateBSI, calculateNetworkBSI } = require('../../srv/lib/bsi-calculator')

const goodInputs = {
  bhiScore: 80,
  loadRatingFactor: 1.2,
  serviceabilityInputs: {
    deckCondition: 4, geometricAlignment: 4, verticalClearance: 5, approachCondition: 4
  },
  essentialityInputs: {
    aadt: 8000, detourLengthKm: 55, isFreightRoute: true, isEmergencyRoute: false
  }
}

describe('BSI Calculator v1.0', () => {
  test('good bridge produces non-deficient BSI', () => {
    const r = calculateBSI(goodInputs)
    expect(r.score).toBeGreaterThanOrEqual(50)
    expect(r.deficiencyFlag).toBe(false)
  })

  test('all sub-scores present in result', () => {
    const r = calculateBSI(goodInputs)
    expect(r.structuralAdequacy).toBeDefined()
    expect(r.serviceability).toBeDefined()
    expect(r.essentiality).toBeDefined()
  })

  test('poor bridge with low AADT = deficient', () => {
    const r = calculateBSI({
      bhiScore: 25,
      loadRatingFactor: 0.6,
      serviceabilityInputs: { deckCondition: 2, geometricAlignment: 2, verticalClearance: 2, approachCondition: 2 },
      essentialityInputs: { aadt: 50, detourLengthKm: 5, isFreightRoute: false, isEmergencyRoute: false }
    })
    expect(r.deficiencyFlag).toBe(true)
    expect(r.score).toBeLessThan(50)
  })

  test('network BSI with 3 bridges', () => {
    const r = calculateNetworkBSI([80, 45, 60])
    expect(r.networkScore).toBe(61.7)
    expect(r.deficientCount).toBe(1)
    expect(r.deficientPct).toBe(33.3)
  })

  test('empty network returns zeros', () => {
    const r = calculateNetworkBSI([])
    expect(r.networkScore).toBe(0)
    expect(r.deficientCount).toBe(0)
  })

  test('all bridges deficient', () => {
    const r = calculateNetworkBSI([30, 40, 20])
    expect(r.deficientCount).toBe(3)
    expect(r.deficientPct).toBe(100)
  })

  test('sdAndFOCount = bridges with score < 25', () => {
    const r = calculateNetworkBSI([80, 20, 60, 24])
    expect(r.sdAndFOCount).toBe(2)  // 20 and 24 are < 25
  })

  test('BSI score = weighted sum of sub-scores', () => {
    const r = calculateBSI(goodInputs)
    const expected = Math.round((r.structuralAdequacy * 0.55 + r.serviceability * 0.30 + r.essentiality * 0.15) * 10) / 10
    expect(r.score).toBe(expected)
  })

  test('calculationVersion is v1.0', () => {
    const r = calculateBSI(goodInputs)
    expect(r.calculationVersion).toBe('v1.0')
  })

  test('high freight+emergency route boosts essentiality', () => {
    const { essentialityScore } = require('../../srv/lib/bsi-calculator')
    const lowRoute  = essentialityScore({ aadt: 1000, detourLengthKm: 10, isFreightRoute: false, isEmergencyRoute: false })
    const highRoute = essentialityScore({ aadt: 1000, detourLengthKm: 10, isFreightRoute: true, isEmergencyRoute: true })
    expect(highRoute).toBeGreaterThan(lowRoute)
    expect(highRoute - lowRoute).toBe(20)  // 12 (freight) + 8 (emergency)
  })
})
