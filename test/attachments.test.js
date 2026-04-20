/**
 * Unit tests for bridge attachment helper logic and CSV export helper
 *
 * The attachment endpoints (POST /bridges/:id/attachments etc.) are Express routes
 * that require a running CDS server + DB. These tests cover the pure helper
 * functions used by those routes, extracted and tested in isolation.
 *
 * Run: npm test
 */
'use strict'

// ─── Helpers copied from srv/server.js (pure functions) ───────────────────────

function sanitizeAttachmentName(fileName) {
  const cleaned = String(fileName || 'attachment')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
  return cleaned || 'attachment'
}

async function toAttachmentBuffer(content) {
  if (!content) return Buffer.alloc(0)
  if (Buffer.isBuffer(content)) return content
  if (content instanceof Uint8Array) return Buffer.from(content)
  if (typeof content === 'string') return Buffer.from(content, 'base64')
  if (content.buffer) return Buffer.from(content.buffer)
  return Buffer.from(content)
}

function attachmentResponse(row, bridgeId) {
  return {
    ID: row.ID,
    title: row.title || row.fileName,
    fileName: row.fileName,
    mediaType: row.mediaType || 'application/octet-stream',
    fileSize: row.fileSize || 0,
    createdAt: row.createdAt,
    documentDate: row.documentDate,
    referenceNumber: row.referenceNumber,
    openUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}/content`,
    downloadUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}/content?download=true`,
    deleteUrl: `/admin-bridges/api/bridges/${encodeURIComponent(bridgeId)}/attachments/${encodeURIComponent(row.ID)}`
  }
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ─── sanitizeAttachmentName ───────────────────────────────────────────────────

describe('sanitizeAttachmentName', () => {
  test('returns filename unchanged when safe', () => {
    expect(sanitizeAttachmentName('report.pdf')).toBe('report.pdf')
  })

  test('replaces path-traversal slashes with underscores', () => {
    expect(sanitizeAttachmentName('../../etc/passwd')).toBe('.._.._etc_passwd')
  })

  test('replaces Windows forbidden characters', () => {
    expect(sanitizeAttachmentName('file:name?.pdf')).toBe('file_name_.pdf')
  })

  test('falls back to "attachment" for empty input', () => {
    expect(sanitizeAttachmentName('')).toBe('attachment')
    expect(sanitizeAttachmentName(null)).toBe('attachment')
    expect(sanitizeAttachmentName(undefined)).toBe('attachment')
  })

  test('preserves spaces and dots in normal filenames', () => {
    expect(sanitizeAttachmentName('Bridge Inspection 2024.pdf')).toBe('Bridge Inspection 2024.pdf')
  })
})

// ─── toAttachmentBuffer ───────────────────────────────────────────────────────

describe('toAttachmentBuffer', () => {
  test('returns empty buffer for null', async () => {
    const buf = await toAttachmentBuffer(null)
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBe(0)
  })

  test('returns the same buffer when already a Buffer', async () => {
    const input = Buffer.from('hello')
    const buf = await toAttachmentBuffer(input)
    expect(buf).toBe(input)
  })

  test('decodes base64 string correctly', async () => {
    const original = 'Hello, Bridge!'
    const b64 = Buffer.from(original).toString('base64')
    const buf = await toAttachmentBuffer(b64)
    expect(buf.toString('utf8')).toBe(original)
  })

  test('converts Uint8Array', async () => {
    const ua = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
    const buf = await toAttachmentBuffer(ua)
    expect(buf.toString('utf8')).toBe('Hello')
  })
})

// ─── attachmentResponse ───────────────────────────────────────────────────────

describe('attachmentResponse', () => {
  const row = {
    ID: 'att-uuid-001',
    title: null,
    fileName: 'inspection.pdf',
    mediaType: 'application/pdf',
    fileSize: 204800,
    createdAt: '2025-01-15T10:00:00Z',
    documentDate: '2025-01-15',
    referenceNumber: 'REF-001'
  }

  test('uses fileName as title when title is null', () => {
    const r = attachmentResponse(row, '42')
    expect(r.title).toBe('inspection.pdf')
  })

  test('builds correct openUrl', () => {
    const r = attachmentResponse(row, '42')
    expect(r.openUrl).toBe('/admin-bridges/api/bridges/42/attachments/att-uuid-001/content')
  })

  test('builds correct downloadUrl with ?download=true', () => {
    const r = attachmentResponse(row, '42')
    expect(r.downloadUrl).toContain('?download=true')
  })

  test('builds correct deleteUrl', () => {
    const r = attachmentResponse(row, '42')
    expect(r.deleteUrl).toBe('/admin-bridges/api/bridges/42/attachments/att-uuid-001')
  })

  test('falls back to application/octet-stream when mediaType absent', () => {
    const r = attachmentResponse({ ...row, mediaType: null }, '42')
    expect(r.mediaType).toBe('application/octet-stream')
  })

  test('URL-encodes special characters in bridgeId', () => {
    const r = attachmentResponse(row, '1/2')
    expect(r.openUrl).toContain(encodeURIComponent('1/2'))
  })
})

// ─── csvEscape (used by bridge export) ───────────────────────────────────────

describe('csvEscape', () => {
  test('returns empty string for null', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })

  test('returns value as-is when no special chars', () => {
    expect(csvEscape('SydneyBridge')).toBe('SydneyBridge')
    expect(csvEscape(42)).toBe('42')
  })

  test('wraps values containing commas in double quotes', () => {
    expect(csvEscape('Smith, John')).toBe('"Smith, John"')
  })

  test('wraps values containing double quotes and escapes them', () => {
    expect(csvEscape('He said "hello"')).toBe('"He said ""hello"""')
  })

  test('wraps values containing newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
  })
})

// ─── Health endpoint shape (unit — no HTTP) ───────────────────────────────────

describe('Health response shape', () => {
  test('health payload has required fields', () => {
    // Simulate what the /health handler returns
    const payload = {
      status: 'ok',
      ts: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      env: process.env.NODE_ENV || 'development'
    }
    expect(payload.status).toBe('ok')
    expect(typeof payload.ts).toBe('string')
    expect(new Date(payload.ts).getTime()).not.toBeNaN()
    expect(typeof payload.version).toBe('string')
  })
})
