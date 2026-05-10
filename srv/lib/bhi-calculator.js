'use strict'

/**
 * BHI Calculator v2.1
 * Formula: BHI = (superstructure×0.30 + substructure×0.28 + deck×0.20 +
 *                 bearing×0.12 + joint×0.10) × 20
 *
 * Inputs: element scores on 1–5 scale (AS 5100.7 condition ratings)
 * Output: BHI on 20–100 scale
 *
 * Weights derived from AS 5100.7 structural significance hierarchy.
 * Peer-review reference: ADR-BHI-001 (outstanding — log when engineer signs off).
 * Version history stored in bhiCalculationVersion field on BridgeInspections entity.
 */

const BHI_VERSION = 'v2.1'

const WEIGHTS = {
  superstructure: 0.30,   // Primary load-carrying members — highest weight
  substructure:   0.28,   // Piers, abutments, foundations
  deck:           0.20,   // Riding surface, wearing course
  bearing:        0.12,   // Expansion joints and bearings
  joint:          0.10    // Deck joints — lowest weight
}

const BANDS = [
  { min: 85, label: 'EXCELLENT' },
  { min: 70, label: 'GOOD' },
  { min: 50, label: 'FAIR' },
  { min: 30, label: 'POOR' },
  { min: 0,  label: 'CRITICAL' }
]

/**
 * Calculate BHI from inspection element scores.
 * @param {{ superstructure, substructure, deck, bearing, joint }} elements
 *   Each value: integer 1–5 (AS 5100.7 scale)
 * @returns {{ score, conditionBand, calculationVersion, calculatedAt, calculatedBy }}
 */
function calculateBHI(elements) {
  const { superstructure, substructure, deck, bearing, joint } = elements
  const fields = { superstructure, substructure, deck, bearing, joint }

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined) {
      throw new Error(`BHI calculation failed: missing element score '${key}'`)
    }
    const n = Number(val)
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error(`BHI calculation failed: '${key}' must be integer 1–5, got ${val}`)
    }
  }

  const raw =
    superstructure * WEIGHTS.superstructure +
    substructure   * WEIGHTS.substructure   +
    deck           * WEIGHTS.deck           +
    bearing        * WEIGHTS.bearing        +
    joint          * WEIGHTS.joint

  const score = Math.round(raw * 20 * 10) / 10

  const conditionBand = BANDS.find(b => score >= b.min)?.label ?? 'CRITICAL'

  return {
    score,
    conditionBand,
    calculationVersion: BHI_VERSION,
    calculatedAt: new Date().toISOString(),
    calculatedBy: 'AUTO'
  }
}

/**
 * Derive BHI from financial values (investment panel use case).
 * BHI (financial proxy) = WDV / CRC × 100
 * NOTE: approximation — prefer element-score BHI where inspection data exists.
 * @param {number} writtenDownValue
 * @param {number} currentReplacementCost
 */
function calculateBHIFromFinancials(writtenDownValue, currentReplacementCost) {
  if (!currentReplacementCost || currentReplacementCost <= 0) {
    throw new Error('BHI financial proxy: currentReplacementCost must be > 0')
  }
  const raw = (writtenDownValue / currentReplacementCost) * 100
  const score = Math.round(Math.min(raw, 100) * 10) / 10
  const conditionBand = BANDS.find(b => score >= b.min)?.label ?? 'CRITICAL'

  return {
    score,
    conditionBand,
    calculationVersion: `${BHI_VERSION}-FIN`,
    calculatedAt: new Date().toISOString(),
    method: 'FINANCIAL_PROXY'
  }
}

/**
 * Map BHI score to posting status (aligns with NHVR postingStatus enum).
 * @param {number} bhiScore
 * @returns {string}
 */
function bhiToPostingStatus(bhiScore) {
  if (bhiScore >= 70) return 'UNRESTRICTED'
  if (bhiScore >= 50) return 'MONITOR'
  if (bhiScore >= 30) return 'WEIGHT_RESTRICTED'
  return 'CLOSURE_RECOMMENDED'
}

/**
 * Map BHI score to risk likelihood (L1–L5 for risk matrix).
 * @param {number} bhiScore
 * @returns {{ score, label, inspectCycle }}
 */
function bhiToLikelihood(bhiScore) {
  if (bhiScore >= 85) return { score: 1, label: 'Rare',           inspectCycle: '5yr' }
  if (bhiScore >= 70) return { score: 2, label: 'Unlikely',       inspectCycle: '5yr' }
  if (bhiScore >= 50) return { score: 3, label: 'Possible',       inspectCycle: '3yr+monitor' }
  if (bhiScore >= 30) return { score: 4, label: 'Likely',         inspectCycle: 'Annual+restriction' }
  return               { score: 5, label: 'Almost Certain',       inspectCycle: 'Immediate closure' }
}

module.exports = {
  calculateBHI,
  calculateBHIFromFinancials,
  bhiToPostingStatus,
  bhiToLikelihood,
  BHI_VERSION,
  WEIGHTS,
  BANDS
}
