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

module.exports = { computeBhiBsi, MODE_PARAMS }
