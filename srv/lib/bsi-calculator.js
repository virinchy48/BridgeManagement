'use strict'

/**
 * BSI Calculator v1.0 — Bridge Sufficiency Index
 * Adapted from FHWA Sufficiency Rating for Australian context (AS 5100, TfNSW)
 *
 * BSI = (structuralAdequacy × 0.55) + (serviceability × 0.30) + (essentiality × 0.15)
 * Output: 0–100  (<50 = structurally deficient, <25 = SD + functionally obsolete)
 *
 * Inputs sourced from:
 *   structuralAdequacy: BHI score (primary) + load rating factor RF
 *   serviceability:     deck condition + alignment + clearance + approach
 *   essentiality:       AADT + detour length + freight/emergency route flags
 */

const BSI_VERSION = 'v1.0'

/**
 * Structural adequacy sub-score (0–100).
 * @param {number} bhiScore       0–100
 * @param {number} loadRatingFactor  RF from AS 5100.7 (0.0–2.0+; ≥1.0 = adequate)
 */
function structuralAdequacyScore(bhiScore, loadRatingFactor) {
  const bhiContrib = bhiScore * 0.7
  const rfContrib  = Math.min(loadRatingFactor / 1.5, 1.0) * 30
  return Math.round((bhiContrib + rfContrib) * 10) / 10
}

/**
 * Serviceability sub-score (0–100).
 * @param {{ deckCondition, geometricAlignment, verticalClearance, approachCondition }} inputs
 *   All values: 1–5 AS 5100 scale
 */
function serviceabilityScore({ deckCondition, geometricAlignment, verticalClearance, approachCondition }) {
  const weights = {
    deckCondition:      0.40,
    geometricAlignment: 0.25,
    verticalClearance:  0.20,
    approachCondition:  0.15
  }
  const raw =
    deckCondition      * weights.deckCondition      +
    geometricAlignment * weights.geometricAlignment +
    verticalClearance  * weights.verticalClearance  +
    approachCondition  * weights.approachCondition
  return Math.round((raw / 5) * 100 * 10) / 10
}

/**
 * Essentiality sub-score (0–100).
 * @param {{ aadt, detourLengthKm, isFreightRoute, isEmergencyRoute }} inputs
 */
function essentialityScore({ aadt, detourLengthKm, isFreightRoute, isEmergencyRoute }) {
  let score = 0

  // AADT contribution (0–50 points)
  if (aadt >= 10000)      score += 50
  else if (aadt >= 5000)  score += 35
  else if (aadt >= 1000)  score += 20
  else if (aadt >= 100)   score += 10
  else                    score += 2

  // Detour contribution (0–30 points)
  if (detourLengthKm >= 100)     score += 30
  else if (detourLengthKm >= 50) score += 20
  else if (detourLengthKm >= 20) score += 12
  else                           score += 5

  // Route flags (0–20 points)
  if (isFreightRoute)   score += 12
  if (isEmergencyRoute) score += 8

  return Math.min(score, 100)
}

/**
 * Calculate full BSI.
 * @param {{ bhiScore, loadRatingFactor, serviceabilityInputs, essentialityInputs }} params
 * @returns {{ score, structuralAdequacy, serviceability, essentiality, deficiencyFlag,
 *             calculationVersion, calculatedAt }}
 */
function calculateBSI({ bhiScore, loadRatingFactor, serviceabilityInputs, essentialityInputs }) {
  const sa  = structuralAdequacyScore(bhiScore, loadRatingFactor)
  const svc = serviceabilityScore(serviceabilityInputs)
  const ess = essentialityScore(essentialityInputs)

  const score = Math.round((sa * 0.55 + svc * 0.30 + ess * 0.15) * 10) / 10

  return {
    score,
    structuralAdequacy: sa,
    serviceability:     svc,
    essentiality:       ess,
    deficiencyFlag:     score < 50,
    calculationVersion: BSI_VERSION,
    calculatedAt:       new Date().toISOString()
  }
}

/**
 * Network BSI — portfolio-level sufficiency rating.
 * @param {number[]} bridgeBSIScores  array of individual BSI scores
 */
function calculateNetworkBSI(bridgeBSIScores) {
  if (!bridgeBSIScores.length) {
    return { networkScore: 0, deficientCount: 0, deficientPct: 0, sdAndFOCount: 0 }
  }

  const networkScore   = Math.round((bridgeBSIScores.reduce((s, v) => s + v, 0) / bridgeBSIScores.length) * 10) / 10
  const deficientCount = bridgeBSIScores.filter(s => s < 50).length
  const sdAndFOCount   = bridgeBSIScores.filter(s => s < 25).length

  return {
    networkScore,
    deficientCount,
    deficientPct: Math.round((deficientCount / bridgeBSIScores.length) * 100 * 10) / 10,
    sdAndFOCount
  }
}

module.exports = {
  calculateBSI,
  calculateNetworkBSI,
  structuralAdequacyScore,
  serviceabilityScore,
  essentialityScore,
  BSI_VERSION
}
