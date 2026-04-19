const cds = require('@sap/cds')
const { INSERT, SELECT } = cds.ql

// Fields that carry no business meaning and should not be diff'd
const SKIP_FIELDS = new Set([
  'modifiedAt', 'modifiedBy', 'createdAt', 'createdBy',
  'IsActiveEntity', 'HasActiveEntity', 'HasDraftEntity',
  'DraftAdministrativeData_DraftUUID', 'SiblingEntity',
  '__rowNumber', 'texts'
])

function valueToString(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function diffRecords(oldRecord, newRecord) {
  const changes = []
  const allFields = new Set([
    ...Object.keys(oldRecord || {}),
    ...Object.keys(newRecord || {})
  ])

  for (const field of allFields) {
    if (SKIP_FIELDS.has(field)) continue
    const oldStr = valueToString((oldRecord || {})[field])
    const newStr = valueToString((newRecord || {})[field])
    if (oldStr !== newStr) {
      changes.push({ fieldName: field, oldValue: oldStr, newValue: newStr })
    }
  }
  return changes
}

async function writeChangeLogs(db, { objectType, objectId, objectName, source, batchId, changedBy, changes }) {
  if (!changes || !changes.length) return

  const entries = changes.map(change => ({
    ID: cds.utils.uuid(),
    changedAt: new Date().toISOString(),
    changedBy: changedBy || 'system',
    objectType,
    objectId: String(objectId),
    objectName: objectName || String(objectId),
    fieldName: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    changeSource: source,
    batchId: batchId || null
  }))

  try {
    await db.run(INSERT.into('bridge.management.ChangeLog').entries(entries))
  } catch (e) {
    // Never break a business transaction because of audit logging
    console.error('[audit-log] Failed to write change log:', e.message)
  }
}

async function fetchCurrentRecord(db, entity, where) {
  try {
    return await db.run(SELECT.one.from(entity).where(where))
  } catch (_) {
    return null
  }
}

module.exports = { diffRecords, writeChangeLogs, fetchCurrentRecord, valueToString }
