'use strict'

// ─── Pure helpers (mirroring srv/feature-flags.js) ────────────────────────────

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

/** Cascade-disable children when a parent flag is turned off (server-side logic) */
function cascadeDisable(flagKey, currentFlags) {
  const updated = Object.assign({}, currentFlags)
  updated[flagKey] = false
  const cascaded = []
  for (const [child, parent] of Object.entries(DEPENDENCIES)) {
    if (parent === flagKey && updated[child]) {
      updated[child] = false
      cascaded.push(child)
    }
  }
  return { updated, cascadeDisabled: cascaded }
}

/** Validate that a child flag cannot be enabled when its parent is disabled */
function validateFlagEnable(flagKey, currentFlags) {
  const parent = DEPENDENCIES[flagKey]
  if (!parent) return null
  if (!currentFlags[parent]) {
    return `Cannot enable '${flagKey}' — parent flag '${parent}' is disabled`
  }
  return null
}

/** Build the flags response shape expected by GET /system/api/features */
function buildFlagsResponse(flagRows) {
  return { flags: flagRows.map(row => ({
    flagKey: row.key.replace('feature.', ''),
    enabled: row.value === 'true',
    label: row.label || row.key,
    description: row.description || ''
  })) }
}

// ─── KNOWN_FLAGS ──────────────────────────────────────────────────────────────

describe('KNOWN_FLAGS', () => {
  test('contains bhiBsiAssessment', () => {
    expect(KNOWN_FLAGS).toContain('bhiBsiAssessment')
  })

  test('all child flags in DEPENDENCIES are in KNOWN_FLAGS', () => {
    Object.keys(DEPENDENCIES).forEach(child => {
      expect(KNOWN_FLAGS).toContain(child)
    })
  })

  test('all parent flags referenced in DEPENDENCIES are in KNOWN_FLAGS', () => {
    Object.values(DEPENDENCIES).forEach(parent => {
      expect(KNOWN_FLAGS).toContain(parent)
    })
  })

  test('has 5 known flags', () => {
    expect(KNOWN_FLAGS).toHaveLength(5)
  })
})

// ─── cascadeDisable ───────────────────────────────────────────────────────────

describe('cascadeDisable', () => {
  const allEnabled = {
    bhiBsiAssessment: true,
    bhiBsiOrgComparison: true,
    bhiBsiScourPoa: true,
    bhiBsiCertificationWorkflow: true,
    bhiBsiAdminWeightConfig: true,
  }

  test('disabling bhiBsiAssessment cascades to all child flags', () => {
    const { updated, cascadeDisabled } = cascadeDisable('bhiBsiAssessment', allEnabled)
    expect(updated.bhiBsiAssessment).toBe(false)
    expect(updated.bhiBsiOrgComparison).toBe(false)
    expect(updated.bhiBsiScourPoa).toBe(false)
    expect(updated.bhiBsiCertificationWorkflow).toBe(false)
    expect(updated.bhiBsiAdminWeightConfig).toBe(false)
    expect(cascadeDisabled).toHaveLength(4)
  })

  test('disabling a child flag does not cascade further', () => {
    const { updated, cascadeDisabled } = cascadeDisable('bhiBsiOrgComparison', allEnabled)
    expect(updated.bhiBsiOrgComparison).toBe(false)
    expect(updated.bhiBsiAssessment).toBe(true)
    expect(cascadeDisabled).toHaveLength(0)
  })

  test('disabling already-disabled child produces empty cascade', () => {
    const flags = Object.assign({}, allEnabled, { bhiBsiOrgComparison: false })
    const { cascadeDisabled } = cascadeDisable('bhiBsiAssessment', flags)
    expect(cascadeDisabled).not.toContain('bhiBsiOrgComparison')
  })
})

// ─── validateFlagEnable ───────────────────────────────────────────────────────

describe('validateFlagEnable', () => {
  test('root flag (no parent) can always be enabled', () => {
    const err = validateFlagEnable('bhiBsiAssessment', { bhiBsiAssessment: false })
    expect(err).toBeNull()
  })

  test('child flag can be enabled when parent is enabled', () => {
    const flags = { bhiBsiAssessment: true, bhiBsiOrgComparison: false }
    expect(validateFlagEnable('bhiBsiOrgComparison', flags)).toBeNull()
  })

  test('child flag is blocked when parent is disabled', () => {
    const flags = { bhiBsiAssessment: false, bhiBsiOrgComparison: false }
    const err = validateFlagEnable('bhiBsiOrgComparison', flags)
    expect(err).toMatch(/bhiBsiAssessment/)
    expect(err).toMatch(/disabled/)
  })
})

// ─── buildFlagsResponse ───────────────────────────────────────────────────────

describe('buildFlagsResponse', () => {
  test('maps DB rows to expected flags response shape', () => {
    const rows = [
      { key: 'feature.bhiBsiAssessment', value: 'false', label: 'BHI/BSI Assessment', description: 'Enables multi-modal scoring' },
    ]
    const resp = buildFlagsResponse(rows)
    expect(resp.flags).toHaveLength(1)
    expect(resp.flags[0].flagKey).toBe('bhiBsiAssessment')
    expect(resp.flags[0].enabled).toBe(false)
    expect(resp.flags[0].label).toBe('BHI/BSI Assessment')
  })

  test('value=true maps to enabled=true', () => {
    const rows = [{ key: 'feature.bhiBsiAssessment', value: 'true', label: 'BHI/BSI' }]
    const resp = buildFlagsResponse(rows)
    expect(resp.flags[0].enabled).toBe(true)
  })

  test('strips feature. prefix from flagKey', () => {
    const rows = [
      { key: 'feature.bhiBsiScourPoa', value: 'false', label: 'Scour POA' },
    ]
    const resp = buildFlagsResponse(rows)
    expect(resp.flags[0].flagKey).toBe('bhiBsiScourPoa')
    expect(resp.flags[0].flagKey).not.toContain('feature.')
  })
})
