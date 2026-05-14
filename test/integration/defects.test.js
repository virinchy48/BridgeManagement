'use strict'

// ─── Pure helpers (mirroring srv/handlers/defects.js) ─────────────────────────

function generateDefectId(lastDefectId) {
  const m = lastDefectId?.match(/^DEF-(\d+)$/)
  const seq = m ? parseInt(m[1], 10) + 1 : 1
  return `DEF-${String(seq).padStart(4, '0')}`
}

function applyDefectDefaults(data) {
  const out = Object.assign({}, data)
  if (out.active === undefined) out.active = true
  if (out.severity >= 3 || out.urgency >= 3) {
    out.remediationStatus = out.remediationStatus || 'Open'
  }
  return out
}

function shouldCreateAlert(defect) {
  return defect.severity >= 4 && !defect.alertSent
}

function buildAlertForDefect(defect) {
  if (!shouldCreateAlert(defect)) return null
  return {
    bridge_ID: defect.bridge_ID,
    alertType: 'DefectSeverity',
    severity: 'Critical',
    alertTitle: `Severity ${defect.severity} Defect — ${defect.defectType}`,
    alertDescription: `A severity ${defect.severity} defect has been recorded. Defect ID: ${defect.defectId || defect.ID}. Immediate review required.`,
    entityType: 'BridgeDefects',
    entityId: defect.ID,
    status: 'Open',
    active: true
  }
}

function buildDefectRecord(overrides) {
  return applyDefectDefaults(Object.assign({
    ID: 'test-def-uuid-0001',
    defectId: 'TEST-DEF-0001',
    bridge_ID: 'bridge-uuid-test-001',
    defectType: 'Cracking',
    severity: 1,
    urgency: 1,
    alertSent: false
  }, overrides))
}

// ─── generateDefectId ─────────────────────────────────────────────────────────

describe('generateDefectId', () => {
  test('generates DEF-0001 when no prior defect exists', () => {
    expect(generateDefectId(null)).toBe('DEF-0001')
    expect(generateDefectId(undefined)).toBe('DEF-0001')
    expect(generateDefectId('')).toBe('DEF-0001')
  })

  test('increments sequence correctly', () => {
    expect(generateDefectId('DEF-0001')).toBe('DEF-0002')
    expect(generateDefectId('DEF-0099')).toBe('DEF-0100')
    expect(generateDefectId('DEF-0999')).toBe('DEF-1000')
  })

  test('uses regex match — does not produce NaN on empty string input', () => {
    const result = generateDefectId('')
    expect(result).toBe('DEF-0001')
    expect(result).not.toContain('NaN')
  })

  test('output always matches DEF-NNNN pattern', () => {
    ['DEF-0001', 'DEF-0010', 'DEF-0999'].forEach(prev => {
      expect(generateDefectId(prev)).toMatch(/^DEF-\d{4,}$/)
    })
  })
})

// ─── applyDefectDefaults ──────────────────────────────────────────────────────

describe('applyDefectDefaults', () => {
  test('active defaults to true', () => {
    const defect = applyDefectDefaults({ severity: 1 })
    expect(defect.active).toBe(true)
  })

  test('severity 1 (Low) does not auto-set remediationStatus', () => {
    const defect = applyDefectDefaults({ severity: 1 })
    expect(defect.remediationStatus).toBeUndefined()
  })

  test('severity 3 (High) auto-sets remediationStatus to Open', () => {
    const defect = applyDefectDefaults({ severity: 3 })
    expect(defect.remediationStatus).toBe('Open')
  })

  test('severity 4 (Critical) auto-sets remediationStatus to Open', () => {
    const defect = applyDefectDefaults({ severity: 4 })
    expect(defect.remediationStatus).toBe('Open')
  })

  test('existing remediationStatus is not overwritten by default', () => {
    const defect = applyDefectDefaults({ severity: 3, remediationStatus: 'In Progress' })
    expect(defect.remediationStatus).toBe('In Progress')
  })
})

// ─── shouldCreateAlert / buildAlertForDefect ──────────────────────────────────

describe('shouldCreateAlert', () => {
  test('severity 4 with alertSent=false triggers alert', () => {
    const defect = buildDefectRecord({ severity: 4, alertSent: false })
    expect(shouldCreateAlert(defect)).toBe(true)
  })

  test('severity 4 with alertSent=true does not trigger duplicate alert', () => {
    const defect = buildDefectRecord({ severity: 4, alertSent: true })
    expect(shouldCreateAlert(defect)).toBe(false)
  })

  test('severity 1 never triggers alert', () => {
    const defect = buildDefectRecord({ severity: 1, alertSent: false })
    expect(shouldCreateAlert(defect)).toBe(false)
  })

  test('severity 3 does not trigger alert (threshold is 4)', () => {
    const defect = buildDefectRecord({ severity: 3, alertSent: false })
    expect(shouldCreateAlert(defect)).toBe(false)
  })
})

describe('buildAlertForDefect', () => {
  test('returns alert with correct fields for severity 4 defect', () => {
    const defect = buildDefectRecord({
      ID: 'def-uuid-9001',
      defectId: 'DEF-0001',
      severity: 4,
      defectType: 'Spalling',
      bridge_ID: 'bridge-uuid-abc',
      alertSent: false
    })
    const alert = buildAlertForDefect(defect)
    expect(alert).not.toBeNull()
    expect(alert.alertType).toBe('DefectSeverity')
    expect(alert.severity).toBe('Critical')
    expect(alert.entityType).toBe('BridgeDefects')
    expect(alert.entityId).toBe('def-uuid-9001')
    expect(alert.status).toBe('Open')
    expect(alert.active).toBe(true)
  })

  test('returns null for low severity defect (no alert needed)', () => {
    const defect = buildDefectRecord({ severity: 1, alertSent: false })
    expect(buildAlertForDefect(defect)).toBeNull()
  })

  test('alert title includes severity and defect type', () => {
    const defect = buildDefectRecord({ severity: 4, defectType: 'Corrosion', alertSent: false })
    const alert = buildAlertForDefect(defect)
    expect(alert.alertTitle).toContain('4')
    expect(alert.alertTitle).toContain('Corrosion')
  })
})
