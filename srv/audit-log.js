const cds = require('@sap/cds')
const { INSERT, SELECT } = cds.ql

// Fields that carry no business meaning and should not be diff'd
const SKIP_FIELDS = new Set([
  'modifiedAt', 'modifiedBy', 'createdAt', 'createdBy',
  'IsActiveEntity', 'HasActiveEntity', 'HasDraftEntity',
  'DraftAdministrativeData_DraftUUID', 'SiblingEntity',
  '__rowNumber', 'texts'
])

function valueToString(recordValue) {
  if (recordValue === null || recordValue === undefined) return ''
  if (typeof recordValue === 'boolean') return recordValue ? 'true' : 'false'
  if (recordValue instanceof Date) return recordValue.toISOString().slice(0, 10)
  if (typeof recordValue === 'object') return JSON.stringify(recordValue)
  return String(recordValue)
}

/**
 * Computes field-level diff between two record snapshots.
 * Returns only changed fields; skips managed/draft metadata.
 *
 * @param {object} oldRecord - Record before mutation (null-safe)
 * @param {object} newRecord - Record after mutation (null-safe)
 * @returns {Array<{fieldName: string, oldValue: string, newValue: string}>}
 */
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

/**
 * Writes field-level change records to bridge.management.ChangeLog.
 * Safe to call — errors are caught and logged without throwing.
 *
 * @param {object} db - CDS database connection (from cds.connect.to('db'))
 * @param {object} payload
 * @param {string} payload.objectType  - Entity type label e.g. 'Bridge'
 * @param {string} payload.objectId    - Primary key as string
 * @param {string} payload.objectName  - Human-readable record name
 * @param {string} payload.source      - 'OData' | 'MassEdit' | 'MassUpload'
 * @param {string} payload.batchId     - UUID grouping all fields from one save
 * @param {string} payload.changedBy   - User ID or 'system'
 * @param {Array<{fieldName,oldValue,newValue}>} payload.changes - From diffRecords()
 */
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
  } catch (error) {
    // Never break a business transaction because of audit logging
    console.error('[audit-log] Failed to write change log:', JSON.stringify({
      objectType: objectType,
      objectId:   String(objectId),
      batchId:    batchId || null,
      error:      error.message,
      ts:         new Date().toISOString()
    }))
  }
}

/**
 * Fetches a single record from the database by primary key.
 * Used to capture the pre-mutation snapshot for audit diffing.
 *
 * @param {object} db - CDS database connection
 * @param {string} entity - Fully-qualified entity name e.g. 'bridge.management.Bridges'
 * @param {object} where  - Filter object e.g. { ID: 'uuid' } or { ID: 123 }
 * @returns {Promise<object|null>}
 */
async function fetchCurrentRecord(db, entity, where) {
  try {
    return await db.run(SELECT.one.from(entity).where(where))
  } catch (_) {
    return null
  }
}

module.exports = { diffRecords, writeChangeLogs, fetchCurrentRecord, valueToString }
