'use strict'

// ─── Inline pure functions (mirrored from srv/handlers/alerts.js) ─────────────

function getAlertSummary(alerts) {
  const now = new Date()
  const overdueAck = alerts.filter(a => {
    if (!a.triggeredDate) return false
    const triggered = new Date(a.triggeredDate)
    const hoursSince = (now - triggered) / (1000 * 60 * 60)
    return a.severity === 'Critical' && hoursSince > 24
  }).length
  return {
    totalOpen:              alerts.length,
    critical:               alerts.filter(a => a.severity === 'Critical').length,
    warning:                alerts.filter(a => a.severity === 'Warning').length,
    info:                   alerts.filter(a => a.severity === 'Info').length,
    overdueAcknowledgement: overdueAck
  }
}

// ─── State transition models (mirrored from alert action handlers) ────────────

function acknowledgeAlert(alert, userId, note) {
  if (!alert) return { error: 'Alert not found', code: 404 }
  return {
    ...alert,
    status: 'Acknowledged',
    acknowledgedBy: userId || 'system',
    acknowledgementNote: note
  }
}

function resolveAlert(alert, userId, note, proofRef) {
  if (!alert) return { error: 'Alert not found', code: 404 }
  return {
    ...alert,
    status: 'Resolved',
    resolvedBy: userId || 'system',
    resolutionNote: note,
    resolutionProof: proofRef
  }
}

function suppressAlert(alert, userId, reason, suppressUntil) {
  if (!alert) return { error: 'Alert not found', code: 404 }
  return {
    ...alert,
    status: 'Suppressed',
    suppressedBy: userId || 'system',
    suppressionReason: reason,
    suppressedUntil: suppressUntil
  }
}

// ─── getAlertSummary ──────────────────────────────────────────────────────────

describe('AlertsAndNotifications — getAlertSummary', () => {
  test('returns all-zero summary for empty alert list', () => {
    const summary = getAlertSummary([])
    expect(summary.totalOpen).toBe(0)
    expect(summary.critical).toBe(0)
    expect(summary.warning).toBe(0)
    expect(summary.info).toBe(0)
    expect(summary.overdueAcknowledgement).toBe(0)
  })

  test('counts severity buckets correctly', () => {
    const alerts = [
      { severity: 'Critical', triggeredDate: null },
      { severity: 'Critical', triggeredDate: null },
      { severity: 'Warning',  triggeredDate: null },
      { severity: 'Info',     triggeredDate: null },
    ]
    const summary = getAlertSummary(alerts)
    expect(summary.totalOpen).toBe(4)
    expect(summary.critical).toBe(2)
    expect(summary.warning).toBe(1)
    expect(summary.info).toBe(1)
  })

  test('overdueAcknowledgement counts Critical alerts older than 24h', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const alerts = [
      { severity: 'Critical', triggeredDate: twoDaysAgo },
    ]
    const summary = getAlertSummary(alerts)
    expect(summary.overdueAcknowledgement).toBe(1)
  })

  test('overdueAcknowledgement does not count Critical alerts less than 24h old', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const alerts = [
      { severity: 'Critical', triggeredDate: oneHourAgo },
    ]
    const summary = getAlertSummary(alerts)
    expect(summary.overdueAcknowledgement).toBe(0)
  })

  test('overdueAcknowledgement ignores Warning/Info alerts regardless of age', () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    const alerts = [
      { severity: 'Warning',  triggeredDate: threeDaysAgo },
      { severity: 'Info',     triggeredDate: threeDaysAgo },
    ]
    const summary = getAlertSummary(alerts)
    expect(summary.overdueAcknowledgement).toBe(0)
  })

  test('overdueAcknowledgement ignores Critical alerts with null triggeredDate', () => {
    const alerts = [{ severity: 'Critical', triggeredDate: null }]
    const summary = getAlertSummary(alerts)
    expect(summary.overdueAcknowledgement).toBe(0)
  })
})

// ─── acknowledge action ───────────────────────────────────────────────────────

describe('AlertsAndNotifications — acknowledge action', () => {
  test('transitions status to Acknowledged', () => {
    const alert = { ID: 'a1', status: 'Open', severity: 'Critical' }
    const result = acknowledgeAlert(alert, 'user@bms', 'Noted by field inspector')
    expect(result.status).toBe('Acknowledged')
  })

  test('sets acknowledgedBy to provided userId', () => {
    const alert = { ID: 'a1', status: 'Open' }
    expect(acknowledgeAlert(alert, 'user@bms', '').acknowledgedBy).toBe('user@bms')
  })

  test('defaults acknowledgedBy to system when userId is falsy', () => {
    const alert = { ID: 'a1', status: 'Open' }
    expect(acknowledgeAlert(alert, null, '').acknowledgedBy).toBe('system')
  })

  test('stores acknowledgementNote on the result', () => {
    const alert = { ID: 'a1', status: 'Open' }
    const note = 'Inspector visited site on 2026-05-14'
    expect(acknowledgeAlert(alert, 'user@bms', note).acknowledgementNote).toBe(note)
  })

  test('returns 404 error object when alert not found', () => {
    const result = acknowledgeAlert(null, 'user@bms', 'note')
    expect(result.error).toBe('Alert not found')
    expect(result.code).toBe(404)
  })
})

// ─── resolveAlert action ──────────────────────────────────────────────────────

describe('AlertsAndNotifications — resolveAlert action', () => {
  test('transitions status to Resolved', () => {
    const alert = { ID: 'a2', status: 'Open' }
    expect(resolveAlert(alert, 'eng@bms', 'Defect repaired', 'https://example.com/proof.pdf').status).toBe('Resolved')
  })

  test('sets resolvedBy to provided userId', () => {
    const alert = { ID: 'a2', status: 'Open' }
    expect(resolveAlert(alert, 'eng@bms', '', null).resolvedBy).toBe('eng@bms')
  })

  test('defaults resolvedBy to system when userId is falsy', () => {
    const alert = { ID: 'a2', status: 'Open' }
    expect(resolveAlert(alert, '', '', null).resolvedBy).toBe('system')
  })

  test('stores resolutionNote', () => {
    const alert = { ID: 'a2', status: 'Open' }
    expect(resolveAlert(alert, 'user', 'Fixed', null).resolutionNote).toBe('Fixed')
  })

  test('stores resolutionProof URL', () => {
    const alert = { ID: 'a2', status: 'Open' }
    const url = 'https://docs.bms.gov.au/repair-cert-123.pdf'
    expect(resolveAlert(alert, 'user', 'Fixed', url).resolutionProof).toBe(url)
  })

  test('returns 404 error object when alert not found', () => {
    const result = resolveAlert(null, 'user', 'note', null)
    expect(result.code).toBe(404)
  })
})

// ─── suppress action ─────────────────────────────────────────────────────────

describe('AlertsAndNotifications — suppress action', () => {
  test('transitions status to Suppressed', () => {
    const alert = { ID: 'a3', status: 'Open' }
    expect(suppressAlert(alert, 'admin@bms', 'Planned maintenance window', '2026-06-01').status).toBe('Suppressed')
  })

  test('stores suppressionReason', () => {
    const alert = { ID: 'a3', status: 'Open' }
    const reason = 'Bridge under scheduled maintenance — alert noise expected'
    expect(suppressAlert(alert, 'admin', reason, null).suppressionReason).toBe(reason)
  })

  test('stores suppressedUntil date', () => {
    const alert = { ID: 'a3', status: 'Open' }
    expect(suppressAlert(alert, 'admin', 'reason', '2026-08-01').suppressedUntil).toBe('2026-08-01')
  })

  test('sets suppressedBy to system when userId is falsy', () => {
    const alert = { ID: 'a3', status: 'Open' }
    expect(suppressAlert(alert, null, 'reason', null).suppressedBy).toBe('system')
  })

  test('returns 404 error object when alert not found', () => {
    expect(suppressAlert(null, 'admin', 'reason', null).code).toBe(404)
  })
})
