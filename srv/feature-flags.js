const { getConfigBool } = require('./system-config')

/**
 * Keys that are child flags of bhiBsiAssessment.
 * Enforced in setFeatureFlag — service layer only, not DB constraint.
 */
const DEPENDENCIES = {
  'bhiBsiOrgComparison':         'bhiBsiAssessment',
  'bhiBsiScourPoa':              'bhiBsiAssessment',
  'bhiBsiCertificationWorkflow': 'bhiBsiAssessment',
  'bhiBsiAdminWeightConfig':     'bhiBsiAssessment',
}

const KNOWN_FLAGS = [
  'bhiBsiAssessment',
  'bhiBsiOrgComparison',
  'bhiBsiScourPoa',
  'bhiBsiCertificationWorkflow',
  'bhiBsiAdminWeightConfig',
]

/**
 * Return true only when the SystemConfig row for this flag has value 'true'.
 * Delegates to system-config.js which handles caching + DB reads.
 *
 * @param {string} flagKey  short key, e.g. 'bhiBsiAssessment'
 */
async function isFeatureEnabled(flagKey) {
  return getConfigBool('feature.' + flagKey, false)
}

/**
 * Guard: call at the top of any handler that requires a feature flag.
 * Returns req.error(403, …) — caller must `return` the result.
 *
 * @param {string} flagKey
 * @param {object} req  CAP request context
 */
async function requireFeature(flagKey, req) {
  const enabled = await isFeatureEnabled(flagKey)
  if (!enabled) {
    return req.error(403,
      `Feature '${flagKey}' is not enabled. ` +
      `A BMS Admin can enable it under Admin → Feature Flags.`
    )
  }
}

module.exports = { isFeatureEnabled, requireFeature, DEPENDENCIES, KNOWN_FLAGS }
