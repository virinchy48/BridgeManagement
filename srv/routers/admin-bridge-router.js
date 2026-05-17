const cds = require('@sap/cds')
const express = require('express')
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql

const EXPORT_COLUMNS = [
  'bridgeId', 'bridgeName', 'state', 'route', 'region', 'assetOwner',
  'structureType', 'yearBuilt', 'condition', 'conditionRating',
  'postingStatus', 'lastInspectionDate', 'scourRisk',
  'latitude', 'longitude',
  'nhvrAssessed', 'freightRoute', 'overMassRoute',
  'hmlApproved', 'bDoubleApproved', 'pbsApprovalClass',
  'remarks'
]

const ALLOWED_LINKED_ENTITIES = new Set(['BridgeInspections', 'BridgeDefects', 'Bridges'])

function isHanaDb() {
  const requires = cds.env.requires || {}
  return Object.values(requires).some(s => s && (s.kind === 'hana' || s.impl === '@cap-js/hana'))
    || process.env.NODE_ENV === 'production'
}

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
  if (typeof content.pipe === 'function' || content[Symbol.asyncIterator]) {
    const chunks = []
    for await (const chunk of content) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
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

async function assertBridgeExists(db, bridgeId) {
  const ID = Number(bridgeId)
  if (!Number.isInteger(ID)) {
    const error = new Error('Invalid bridge ID')
    error.status = 400
    throw error
  }
  let bridge = await db.run(SELECT.one.from('bridge.management.Bridges').columns('ID').where({ ID }))
  if (!bridge) {
    try {
      bridge = await db.run(SELECT.one.from('bridge.management.Bridges.drafts').columns('ID').where({ ID }))
    } catch (_) { /* drafts table may not exist */ }
  }
  if (!bridge) {
    const error = new Error('Bridge not found')
    error.status = 404
    throw error
  }
  return ID
}

function csvEscape(v) {
  if (v == null) return ''
  const s = String(v)
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function buildBridgeCardHtml(bridge, restrictions) {
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fmt = (v) => v == null || v === '' ? '—' : esc(v)
  const fmtBool = (v) => v === true || v === 1 ? 'Yes' : v === false || v === 0 ? 'No' : '—'
  const fmtDate = (v) => v ? esc(String(v).slice(0, 10)) : '—'
  const fmtCoord = (lat, lng) => (lat != null && lng != null) ? `${esc(lat)}, ${esc(lng)}` : '—'
  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
  const condRating = bridge.conditionRating != null ? `${esc(bridge.conditionRating)}/10` : '—'
  const fields = [
    ['Structure Type', fmt(bridge.structureType)], ['Year Built', fmt(bridge.yearBuilt)],
    ['Condition Rating', condRating], ['Condition', fmt(bridge.condition)],
    ['Span Length (m)', fmt(bridge.spanLength)], ['Deck Width (m)', fmt(bridge.deckWidth)],
    ['Clearance Height (m)', fmt(bridge.clearanceHeight)], ['Posting Status', fmt(bridge.postingStatus)],
    ['Scour Risk', fmt(bridge.scourRisk)], ['Last Assessment Date', fmtDate(bridge.lastInspectionDate)],
    ['Assessor', fmt(bridge.conditionAssessor)], ['Report Ref', fmt(bridge.conditionReportRef)],
    ['Managing Authority', fmt(bridge.managingAuthority)], ['Route', fmt(bridge.route)],
    ['Region', fmt(bridge.region)], ['Coordinates', fmtCoord(bridge.latitude, bridge.longitude)],
    ['NHVR Assessed', fmtBool(bridge.nhvrAssessed)], ['Freight Route', fmtBool(bridge.freightRoute)],
    ['Over Mass Route', fmtBool(bridge.overMassRoute)], ['HML Approved', fmtBool(bridge.hmlApproved)],
    ['B-Double Approved', fmtBool(bridge.bDoubleApproved)]
  ]
  const fieldRows = fields.map(([label, value]) =>
    `<div class="field"><span class="label">${label}</span><span class="value">${value}</span></div>`
  ).join('')
  const notesSection = bridge.conditionNotes
    ? `<div class="section"><h2>Notes</h2><p class="notes">${esc(bridge.conditionNotes)}</p></div>`
    : ''
  const restrictionsSection = restrictions && restrictions.length > 0
    ? `<div class="section">
        <h2>Active Restrictions</h2>
        <table class="restrictions-table">
          <thead><tr><th>Type</th><th>Value</th><th>Unit</th><th>Effective From</th><th>Effective To</th></tr></thead>
          <tbody>${restrictions.map(r =>
            `<tr><td>${fmt(r.restrictionType)}</td><td>${fmt(r.restrictionValue)}</td><td>${fmt(r.restrictionUnit)}</td><td>${fmtDate(r.effectiveFrom)}</td><td>${fmtDate(r.effectiveTo)}</td></tr>`
          ).join('')}</tbody>
        </table>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bridge Card — ${esc(bridge.bridgeName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0070a9; padding-bottom: 10px; margin-bottom: 18px; }
  .header-left h1 { font-size: 18pt; font-weight: bold; color: #0070a9; line-height: 1.2; }
  .header-left .subtitle { font-size: 10pt; color: #555; margin-top: 4px; }
  .header-right { text-align: right; }
  .bms-logo { font-size: 22pt; font-weight: 900; color: #0070a9; letter-spacing: 2px; }
  .date-generated { font-size: 9pt; color: #888; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 12pt; font-weight: bold; color: #0070a9; border-bottom: 1px solid #d0e8f5; padding-bottom: 4px; margin-bottom: 10px; }
  .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field { display: flex; flex-direction: column; padding: 4px 0; border-bottom: 1px dotted #e0e0e0; }
  .label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 10.5pt; color: #1a1a1a; margin-top: 2px; font-weight: 500; }
  .notes { font-size: 10pt; line-height: 1.5; color: #333; white-space: pre-wrap; }
  .restrictions-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .restrictions-table th { background: #f0f7ff; color: #0070a9; font-weight: bold; text-align: left; padding: 5px 8px; border: 1px solid #c8dff0; }
  .restrictions-table td { padding: 4px 8px; border: 1px solid #ddd; }
  .restrictions-table tr:nth-child(even) td { background: #f9fbfd; }
  .print-btn { display: inline-block; margin-bottom: 16px; padding: 8px 20px; background: #0070a9; color: #fff; border: none; border-radius: 4px; font-size: 11pt; cursor: pointer; }
  .print-btn:hover { background: #005a87; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
    .page { padding: 0; max-width: none; }
    @page { size: A4 portrait; margin: 20mm; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="padding-bottom:8px;"><button class="print-btn" onclick="window.print()">Print / Save as PDF</button></div>
  <div class="header">
    <div class="header-left">
      <h1>${esc(bridge.bridgeName)}</h1>
      <div class="subtitle">Bridge ID: ${esc(bridge.bridgeId)} &nbsp;|&nbsp; ${esc(bridge.state)}</div>
    </div>
    <div class="header-right">
      <div class="bms-logo">BMS</div>
      <div class="date-generated">Generated: ${today}</div>
    </div>
  </div>
  <div class="section">
    <h2>Bridge Details</h2>
    <div class="fields-grid">${fieldRows}</div>
  </div>
  ${notesSection}
  ${restrictionsSection}
</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`
}

const router = express.Router()
router.use(express.json({ limit: '25mb' }))

router.get('/bridges/:bridgeId/attachments', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
    const rows = await db.run(
      SELECT.from('bridge.management.BridgeDocuments')
        .columns('ID', 'title', 'fileName', 'mediaType', 'fileSize', 'createdAt', 'documentDate', 'referenceNumber')
        .where({ bridge_ID: bridgeId })
        .orderBy('createdAt desc')
    )
    res.json({ attachments: (rows || []).map(row => attachmentResponse(row, bridgeId)) })
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message || 'Failed to load attachments' } })
  }
})

router.post('/bridges/:bridgeId/attachments', async (req, res) => {
  try {
    const { fileName, mediaType, fileSize, contentBase64 } = req.body || {}
    if (!fileName) return res.status(400).json({ error: { message: 'fileName is required' } })
    if (!contentBase64) return res.status(400).json({ error: { message: 'File content is empty' } })

    const db = await cds.connect.to('db')
    const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
    const content = Buffer.from(contentBase64, 'base64')
    const safeName = sanitizeAttachmentName(fileName)
    const now = new Date()
    const entry = {
      ID: cds.utils.uuid(), bridge_ID: bridgeId,
      title: safeName, fileName: safeName,
      mediaType: mediaType || 'application/octet-stream',
      fileSize: Number(fileSize || content.length), content,
      documentDate: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(), createdBy: req.user?.id || 'anonymous',
      modifiedAt: now.toISOString(), modifiedBy: req.user?.id || 'anonymous'
    }

    await db.run(INSERT.into('bridge.management.BridgeDocuments').entries(entry))
    res.status(201).json({ attachment: attachmentResponse(entry, bridgeId) })
  } catch (error) {
    res.status(error.status || 422).json({ error: { message: error.message || 'Upload failed' } })
  }
})

router.get('/bridges/:bridgeId/attachments/:attachmentId/content', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
    const row = await db.run(
      SELECT.one.from('bridge.management.BridgeDocuments')
        .columns('ID', 'fileName', 'mediaType', 'content')
        .where({ ID: req.params.attachmentId, bridge_ID: bridgeId })
    )
    if (!row) return res.status(404).json({ error: { message: 'Attachment not found' } })

    const fileName = sanitizeAttachmentName(row.fileName)
    const content = await toAttachmentBuffer(row.content)
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline'
    res.setHeader('Content-Type', row.mediaType || 'application/octet-stream')
    res.setHeader('Content-Length', content.length)
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`)
    res.send(content)
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message || 'Failed to open attachment' } })
  }
})

router.get('/bridges/export', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const bridges = await db.run(
      SELECT.from('bridge.management.Bridges').columns(...EXPORT_COLUMNS).orderBy('bridgeId')
    )
    const rows = bridges || []
    const header = EXPORT_COLUMNS.join(',')
    const lines = rows.map(b => EXPORT_COLUMNS.map(c => csvEscape(b[c])).join(','))
    const csv = [header, ...lines].join('\r\n')
    const filename = `bridges-export-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Export failed' } })
  }
})

router.get('/bridges/:bridgeId/card', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
    const bridge = await db.run(
      SELECT.one.from('bridge.management.Bridges').where({ ID: bridgeId })
        .columns('bridgeName', 'bridgeId', 'state', 'route', 'region', 'managingAuthority',
          'structureType', 'yearBuilt', 'spanLength', 'totalLength', 'deckWidth',
          'clearanceHeight', 'numberOfLanes', 'condition', 'conditionRating',
          'structuralAdequacyRating', 'postingStatus', 'scourRisk',
          'lastInspectionDate', 'conditionAssessor', 'conditionReportRef', 'conditionNotes',
          'latitude', 'longitude', 'nhvrAssessed', 'freightRoute', 'overMassRoute',
          'hmlApproved', 'bDoubleApproved', 'remarks')
    )
    const restrictions = await db.run(
      SELECT.from('bridge.management.Restrictions')
        .where({ bridge_ID: bridgeId, active: true })
        .columns('restrictionType', 'restrictionValue', 'restrictionUnit', 'effectiveFrom', 'effectiveTo')
    )
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(buildBridgeCardHtml(bridge, restrictions))
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message || 'Failed to generate bridge card' } })
  }
})

router.delete('/bridges/:bridgeId/attachments/:attachmentId', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const bridgeId = await assertBridgeExists(db, req.params.bridgeId)
    const result = await db.run(
      DELETE.from('bridge.management.BridgeDocuments')
        .where({ ID: req.params.attachmentId, bridge_ID: bridgeId })
    )
    if (!result) return res.status(404).json({ error: { message: 'Attachment not found' } })
    res.status(204).end()
  } catch (error) {
    res.status(error.status || 500).json({ error: { message: error.message || 'Failed to delete attachment' } })
  }
})

router.head('/documents', (req, res) => {
  res.setHeader('x-csrf-token', 'bms-csrf-v1')
  res.status(204).end()
})

router.get('/documents', async (req, res) => {
  try {
    const { linkedEntity, linkedEntityId } = req.query
    if (!linkedEntity || !linkedEntityId) {
      return res.status(400).json({ error: 'linkedEntity and linkedEntityId are required' })
    }
    if (!ALLOWED_LINKED_ENTITIES.has(linkedEntity)) {
      return res.status(400).json({ error: 'Invalid linkedEntity' })
    }
    const db = await cds.connect.to('db')
    const rows = await db.run(
      SELECT.from('bridge.management.BridgeDocuments')
        .columns('ID', 'title', 'fileName', 'mediaType', 'fileSize', 'documentType', 'linkedEntity', 'linkedEntityId', 'createdAt', 'createdBy')
        .where({ linkedEntity, linkedEntityId, active: true })
        .orderBy('createdAt desc')
    )
    res.json({ documents: rows || [] })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load documents' })
  }
})

router.post('/documents', async (req, res) => {
  try {
    const { linkedEntity, linkedEntityId, bridge_ID, title, fileName, mediaType, documentType, contentBase64 } = req.body || {}
    if (!linkedEntity || !linkedEntityId || !contentBase64) {
      return res.status(400).json({ error: 'linkedEntity, linkedEntityId and contentBase64 are required' })
    }
    if (!ALLOWED_LINKED_ENTITIES.has(linkedEntity)) {
      return res.status(400).json({ error: 'Invalid linkedEntity' })
    }
    const content = Buffer.from(contentBase64, 'base64')
    const db = await cds.connect.to('db')
    const entry = {
      ID: cds.utils.uuid(), linkedEntity, linkedEntityId,
      bridge_ID: bridge_ID || null,
      title: title || fileName || 'Document',
      fileName: fileName || 'document',
      mediaType: mediaType || 'application/octet-stream',
      fileSize: content.length,
      documentType: documentType || 'Other',
      content, active: true
    }
    await db.run(INSERT.into('bridge.management.BridgeDocuments').entries(entry))
    res.status(201).json({ ID: entry.ID, title: entry.title, fileName: entry.fileName })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

router.get('/documents/:docId/content', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    const row = await db.run(
      SELECT.one.from('bridge.management.BridgeDocuments')
        .columns('content', 'fileName', 'mediaType')
        .where({ ID: req.params.docId, active: true })
    )
    if (!row) return res.status(404).json({ error: 'Document not found' })
    const buf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content)
    res.setHeader('Content-Type', row.mediaType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${row.fileName || 'document'}"`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Download failed' })
  }
})

router.delete('/documents/:docId', async (req, res) => {
  try {
    const db = await cds.connect.to('db')
    await db.run(
      UPDATE('bridge.management.BridgeDocuments')
        .set({ active: false })
        .where({ ID: req.params.docId })
    )
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message || 'Delete failed' })
  }
})

module.exports = router
