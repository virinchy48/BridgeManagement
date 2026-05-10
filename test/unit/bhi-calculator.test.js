'use strict'

const { calculateBHI, calculateBHIFromFinancials, bhiToLikelihood } = require('../../srv/lib/bhi-calculator')

describe('BHI Calculator v2.1', () => {
  test('perfect scores = BHI 100', () => {
    const r = calculateBHI({ superstructure: 5, substructure: 5, deck: 5, bearing: 5, joint: 5 })
    expect(r.score).toBe(100)
    expect(r.conditionBand).toBe('EXCELLENT')
  })

  test('minimum scores = BHI 20', () => {
    const r = calculateBHI({ superstructure: 1, substructure: 1, deck: 1, bearing: 1, joint: 1 })
    expect(r.score).toBe(20)
    expect(r.conditionBand).toBe('CRITICAL')
  })

  test('mixed scores — weighted correctly', () => {
    // superstructure=4(×0.30=1.2), sub=3(×0.28=0.84), deck=4(×0.20=0.8),
    // bearing=3(×0.12=0.36), joint=3(×0.10=0.30) = 3.50 × 20 = 70.0
    const r = calculateBHI({ superstructure: 4, substructure: 3, deck: 4, bearing: 3, joint: 3 })
    expect(r.score).toBe(70.0)
    expect(r.conditionBand).toBe('GOOD')
  })

  test('financial proxy: WDV=1.5M, CRC=2M → 75% GOOD', () => {
    const r = calculateBHIFromFinancials(1500000, 2000000)
    expect(r.score).toBe(75)
    expect(r.conditionBand).toBe('GOOD')
    expect(r.method).toBe('FINANCIAL_PROXY')
  })

  test('financial proxy: WDV=0.7M, CRC=2M → 35% POOR', () => {
    const r = calculateBHIFromFinancials(700000, 2000000)
    expect(r.score).toBe(35)
    expect(r.conditionBand).toBe('POOR')
  })

  test('financial proxy: WDV > CRC capped at 100', () => {
    const r = calculateBHIFromFinancials(3000000, 2000000)
    expect(r.score).toBe(100)
    expect(r.conditionBand).toBe('EXCELLENT')
  })

  test('missing element throws error', () => {
    expect(() => calculateBHI({ superstructure: 4, substructure: 3, deck: 4, bearing: 3 }))
      .toThrow("missing element score 'joint'")
  })

  test('out-of-range element throws error', () => {
    expect(() => calculateBHI({ superstructure: 6, substructure: 3, deck: 4, bearing: 3, joint: 3 }))
      .toThrow('must be integer 1–5')
  })

  test('zero element throws error', () => {
    expect(() => calculateBHI({ superstructure: 0, substructure: 3, deck: 4, bearing: 3, joint: 3 }))
      .toThrow('must be integer 1–5')
  })

  test('BHI 30 → Likely, Annual+restriction', () => {
    // superstructure=1(0.30),sub=2(0.28),deck=2(0.20),bearing=1(0.12),joint=2(0.10)
    // = 0.30+0.56+0.40+0.12+0.20 = 1.58 × 20 = 31.6
    const r = calculateBHI({ superstructure: 1, substructure: 2, deck: 2, bearing: 1, joint: 2 })
    const l = bhiToLikelihood(r.score)
    expect(l.score).toBe(4)
    expect(l.inspectCycle).toBe('Annual+restriction')
  })

  test('calculationVersion is v2.1', () => {
    const r = calculateBHI({ superstructure: 3, substructure: 3, deck: 3, bearing: 3, joint: 3 })
    expect(r.calculationVersion).toBe('v2.1')
  })

  test('financial proxy CRC=0 throws', () => {
    expect(() => calculateBHIFromFinancials(500000, 0))
      .toThrow('currentReplacementCost must be > 0')
  })
})
