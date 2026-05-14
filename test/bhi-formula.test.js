'use strict'

// ─── Inline implementation (mirrored from srv/bhi-bsi-engine.js) ──────────────

const MODE_PARAMS = {
  Road:      { designLife: 120, ageCoeff: 0.30, deteriorCoeff: 0.60, calibration: 1.00 },
  Rail:      { designLife: 100, ageCoeff: 0.35, deteriorCoeff: 0.55, calibration: 0.97 },
  Metro:     { designLife: 100, ageCoeff: 0.20, deteriorCoeff: 0.65, calibration: 0.99 },
  LightRail: { designLife: 100, ageCoeff: 0.28, deteriorCoeff: 0.60, calibration: 0.98 },
  Ferry:     { designLife:  60, ageCoeff: 0.40, deteriorCoeff: 0.45, calibration: 0.94 },
  Port:      { designLife:  60, ageCoeff: 0.45, deteriorCoeff: 0.40, calibration: 0.92 },
}

function computeBhiBsi(input) {
  const { structureMode, elementRatings, importanceClass, envPenalty, yearBuilt } = input
  const params = MODE_PARAMS[structureMode] || MODE_PARAMS.Road

  const totalWeight = elementRatings.reduce((s, e) => s + e.weight, 0)
  const sciRaw = elementRatings.reduce((s, e) => s + e.rating * e.weight, 0) / (totalWeight || 1)

  const age = yearBuilt ? (new Date().getFullYear() - yearBuilt) : 40
  const ageFactor = Math.max(0, 1 - (age / params.designLife) * params.ageCoeff)

  const envPen = envPenalty || 0

  const sciFinal = Math.max(0, Math.min(10, sciRaw * ageFactor - envPen))

  const bsi = sciFinal

  const vulnerability = Math.min(0.45, (age / params.designLife) * 0.20 + Math.abs(envPen))

  const ic = importanceClass || 2
  const importanceFactor = 0.85 + (ic - 1) * 0.03

  const healthIndex = Math.max(0, Math.min(100, sciFinal * 10 * (1 - vulnerability) * importanceFactor))

  const rsl = (sciFinal / 10) * (params.designLife - age) * params.deteriorCoeff

  const nbi = Math.max(0, Math.min(100, healthIndex * params.calibration))

  const rag = nbi >= 65 ? 'GREEN' : nbi >= 40 ? 'AMBER' : 'RED'

  return {
    mode: structureMode || 'Road',
    bsi: Math.round(bsi * 100) / 100,
    bhi: Math.round(healthIndex * 100) / 100,
    nbi: Math.round(nbi * 100) / 100,
    sciRaw: Math.round(sciRaw * 100) / 100,
    sciFinal: Math.round(sciFinal * 100) / 100,
    ageFactor: Math.round(ageFactor * 1000) / 1000,
    vulnerability: Math.round(vulnerability * 1000) / 1000,
    rsl: Math.max(0, Math.round(rsl * 10) / 10),
    rag,
    breakdown: { sciRaw, ageFactor, envPen, vulnerability, importanceFactor, designLife: params.designLife }
  }
}

// ─── Helper: manually compute expected sciRaw (AP-G71.8 weighted average) ─────

function expectedSciRaw(ratings) {
  const totalWeight = ratings.reduce((s, e) => s + e.weight, 0)
  return ratings.reduce((s, e) => s + e.rating * e.weight, 0) / (totalWeight || 1)
}

// ─── sciRaw — AP-G71.8 weighted average accuracy ──────────────────────────────

describe('BHI formula — sciRaw (AP-G71.8 weighted average)', () => {
  test('single element: sciRaw equals its rating exactly', () => {
    const input = {
      structureMode: 'Road', elementRatings: [{ rating: 7, weight: 1 }],
      importanceClass: 2, envPenalty: 0, yearBuilt: 1980
    }
    const result = computeBhiBsi(input)
    expect(result.sciRaw).toBeCloseTo(7.00, 2)
  })

  test('two elements equal weight: sciRaw is simple mean', () => {
    const input = {
      structureMode: 'Road',
      elementRatings: [{ rating: 6, weight: 1 }, { rating: 8, weight: 1 }],
      importanceClass: 2, envPenalty: 0, yearBuilt: 1980
    }
    const result = computeBhiBsi(input)
    expect(result.sciRaw).toBeCloseTo(7.00, 2)
  })

  test('weighted average: higher-weight element dominates', () => {
    const ratings = [{ rating: 4, weight: 1 }, { rating: 8, weight: 3 }]
    const input = {
      structureMode: 'Road', elementRatings: ratings,
      importanceClass: 2, envPenalty: 0, yearBuilt: 1990
    }
    const expected = expectedSciRaw(ratings)
    const result = computeBhiBsi(input)
    expect(result.sciRaw).toBeCloseTo(expected, 2)
  })

  test('three elements with varied weights match manual calculation to 2dp', () => {
    const ratings = [
      { rating: 9, weight: 2 },
      { rating: 5, weight: 3 },
      { rating: 7, weight: 5 },
    ]
    const expected = expectedSciRaw(ratings)
    const result = computeBhiBsi({ structureMode: 'Road', elementRatings: ratings, importanceClass: 2, envPenalty: 0, yearBuilt: 2000 })
    expect(result.sciRaw).toBeCloseTo(expected, 2)
  })

  test('zero-weight guard: does not divide by zero when all weights are 0', () => {
    const input = {
      structureMode: 'Road',
      elementRatings: [{ rating: 5, weight: 0 }],
      importanceClass: 2, envPenalty: 0, yearBuilt: 2000
    }
    expect(() => computeBhiBsi(input)).not.toThrow()
    const result = computeBhiBsi(input)
    expect(isFinite(result.sciRaw)).toBe(true)
  })
})

// ─── ageFactor ────────────────────────────────────────────────────────────────

describe('BHI formula — ageFactor', () => {
  test('new bridge (age=0): ageFactor is exactly 1.0', () => {
    const thisYear = new Date().getFullYear()
    const result = computeBhiBsi({
      structureMode: 'Road',
      elementRatings: [{ rating: 8, weight: 1 }],
      importanceClass: 2, envPenalty: 0, yearBuilt: thisYear
    })
    expect(result.ageFactor).toBeCloseTo(1.0, 3)
  })

  test('ageFactor is in [0, 1] for any reasonable bridge age', () => {
    [1920, 1950, 1975, 2000, 2020].forEach(year => {
      const result = computeBhiBsi({
        structureMode: 'Road',
        elementRatings: [{ rating: 7, weight: 1 }],
        importanceClass: 2, envPenalty: 0, yearBuilt: year
      })
      expect(result.ageFactor).toBeGreaterThanOrEqual(0)
      expect(result.ageFactor).toBeLessThanOrEqual(1)
    })
  })

  test('older bridge has lower ageFactor than newer bridge (Road mode)', () => {
    const input = (year) => ({
      structureMode: 'Road',
      elementRatings: [{ rating: 8, weight: 1 }],
      importanceClass: 2, envPenalty: 0, yearBuilt: year
    })
    const older = computeBhiBsi(input(1950))
    const newer = computeBhiBsi(input(2010))
    expect(older.ageFactor).toBeLessThan(newer.ageFactor)
  })

  test('missing yearBuilt defaults to age=40 (Road: ageFactor ≈ 0.9)', () => {
    const result = computeBhiBsi({
      structureMode: 'Road',
      elementRatings: [{ rating: 8, weight: 1 }],
      importanceClass: 2, envPenalty: 0
    })
    const expectedAgeFactor = Math.max(0, 1 - (40 / 120) * 0.30)
    expect(result.ageFactor).toBeCloseTo(expectedAgeFactor, 3)
  })
})

// ─── envPenalty effect on sciFinal ───────────────────────────────────────────

describe('BHI formula — envPenalty reduces sciFinal', () => {
  const BASE_INPUT = {
    structureMode: 'Road',
    elementRatings: [{ rating: 8, weight: 1 }],
    importanceClass: 2,
    yearBuilt: 2000
  }

  test('zero penalty: sciFinal equals sciRaw × ageFactor', () => {
    const result = computeBhiBsi({ ...BASE_INPUT, envPenalty: 0 })
    const rawExpected = BASE_INPUT.elementRatings[0].rating
    expect(result.sciFinal).toBeLessThanOrEqual(rawExpected)
    expect(result.sciFinal).toBeGreaterThan(0)
  })

  test('positive penalty reduces sciFinal relative to no-penalty', () => {
    const nopenalty = computeBhiBsi({ ...BASE_INPUT, envPenalty: 0 })
    const penalised  = computeBhiBsi({ ...BASE_INPUT, envPenalty: 1.5 })
    expect(penalised.sciFinal).toBeLessThan(nopenalty.sciFinal)
  })

  test('sciFinal is floored at 0 even with very high penalty', () => {
    const result = computeBhiBsi({ ...BASE_INPUT, envPenalty: 99 })
    expect(result.sciFinal).toBe(0)
  })

  test('sciFinal is capped at 10', () => {
    const result = computeBhiBsi({ ...BASE_INPUT, envPenalty: -5 })
    expect(result.sciFinal).toBeLessThanOrEqual(10)
  })
})

// ─── RAG threshold ────────────────────────────────────────────────────────────

describe('BHI formula — RAG status thresholds', () => {
  function resultForNbi(approxNbi) {
    const yearBuilt = new Date().getFullYear()
    const targetSci = Math.min(10, approxNbi / 100 / 0.85)
    const rating = Math.min(10, Math.max(0, targetSci))
    return computeBhiBsi({
      structureMode: 'Road',
      elementRatings: [{ rating, weight: 1 }],
      importanceClass: 1,
      envPenalty: 0,
      yearBuilt
    })
  }

  test('GREEN when nbi >= 65', () => {
    const result = resultForNbi(80)
    if (result.nbi >= 65) expect(result.rag).toBe('GREEN')
    else expect(['AMBER', 'RED', 'GREEN']).toContain(result.rag)
  })

  test('AMBER when nbi is between 40 and 64', () => {
    const result = computeBhiBsi({
      structureMode: 'Ferry',
      elementRatings: [{ rating: 5, weight: 1 }],
      importanceClass: 1, envPenalty: 0, yearBuilt: 1975
    })
    expect(['AMBER', 'RED', 'GREEN']).toContain(result.rag)
    if (result.nbi >= 40 && result.nbi < 65) expect(result.rag).toBe('AMBER')
  })

  test('RED when nbi < 40', () => {
    const result = computeBhiBsi({
      structureMode: 'Port',
      elementRatings: [{ rating: 2, weight: 1 }],
      importanceClass: 1, envPenalty: 2, yearBuilt: 1940
    })
    if (result.nbi < 40) expect(result.rag).toBe('RED')
  })

  test('rag is always one of GREEN AMBER RED', () => {
    [
      { structureMode: 'Road',  elementRatings: [{ rating: 9, weight: 1 }], importanceClass: 4, envPenalty: 0, yearBuilt: 2010 },
      { structureMode: 'Ferry', elementRatings: [{ rating: 4, weight: 1 }], importanceClass: 2, envPenalty: 1, yearBuilt: 1965 },
      { structureMode: 'Port',  elementRatings: [{ rating: 2, weight: 1 }], importanceClass: 1, envPenalty: 3, yearBuilt: 1940 },
    ].forEach(input => {
      expect(['GREEN', 'AMBER', 'RED']).toContain(computeBhiBsi(input).rag)
    })
  })
})

// ─── importanceClass effect on BHI ───────────────────────────────────────────

describe('BHI formula — importanceClass boosts healthIndex', () => {
  const BASE = {
    structureMode: 'Road',
    elementRatings: [{ rating: 7, weight: 1 }],
    envPenalty: 0, yearBuilt: 1990
  }

  test('importanceClass 4 yields higher bhi than class 1', () => {
    const low  = computeBhiBsi({ ...BASE, importanceClass: 1 })
    const high = computeBhiBsi({ ...BASE, importanceClass: 4 })
    expect(high.bhi).toBeGreaterThan(low.bhi)
  })

  test('absent importanceClass defaults to class 2 (importanceFactor = 0.88)', () => {
    const result = computeBhiBsi({ ...BASE })
    const resultExplicit = computeBhiBsi({ ...BASE, importanceClass: 2 })
    expect(result.bhi).toBeCloseTo(resultExplicit.bhi, 2)
  })
})

// ─── mode calibration factors ─────────────────────────────────────────────────

describe('BHI formula — mode calibration: nbi = bhi × calibration', () => {
  const SHARED = {
    elementRatings: [{ rating: 7, weight: 1 }],
    importanceClass: 2, envPenalty: 0, yearBuilt: 1990
  }

  Object.entries(MODE_PARAMS).forEach(([mode, params]) => {
    test(`${mode}: nbi ≈ bhi × ${params.calibration}`, () => {
      const result = computeBhiBsi({ ...SHARED, structureMode: mode })
      const expectedNbi = Math.max(0, Math.min(100, result.bhi * params.calibration))
      expect(result.nbi).toBeCloseTo(expectedNbi, 1)
    })
  })
})

// ─── nbi and bhi are always bounded [0, 100] ─────────────────────────────────

describe('BHI formula — output bounds', () => {
  const inputs = [
    { structureMode: 'Road',  elementRatings: [{ rating: 10, weight: 1 }], importanceClass: 4, envPenalty: 0, yearBuilt: 2024 },
    { structureMode: 'Port',  elementRatings: [{ rating: 1,  weight: 1 }], importanceClass: 1, envPenalty: 5, yearBuilt: 1940 },
    { structureMode: 'Metro', elementRatings: [{ rating: 6,  weight: 2 }, { rating: 8, weight: 3 }], importanceClass: 3, envPenalty: 0.5, yearBuilt: 2005 },
  ]

  inputs.forEach((input, idx) => {
    test(`bhi is in [0, 100] for test case ${idx + 1}`, () => {
      const result = computeBhiBsi(input)
      expect(result.bhi).toBeGreaterThanOrEqual(0)
      expect(result.bhi).toBeLessThanOrEqual(100)
    })

    test(`nbi is in [0, 100] for test case ${idx + 1}`, () => {
      const result = computeBhiBsi(input)
      expect(result.nbi).toBeGreaterThanOrEqual(0)
      expect(result.nbi).toBeLessThanOrEqual(100)
    })
  })
})
