// Importers for all sub-domain entities (gap entities).
// Each function delegates to importCuidEntityRows from upload-engine.

const cds = require('@sap/cds')
const { SELECT, INSERT } = cds.ql
const {
  normalizeRows,
  enrichRowsWithBridgeId,
  batchGenerateRefs,
  importCuidEntityRows,
  emptySummary
} = require('./upload-engine')

async function importInspectionRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'inspectionDate',
    objectType: 'BridgeInspection',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.inspectionDate}`
  })
}

async function importElementRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'elementId',
    objectType: 'BridgeElement',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.elementId}`
  })
}

async function importBridgeRestrictionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)

  for (const row of normalized) {
    if (row.active === null || row.active === undefined) row.active = true
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'restrictionRef',
    objectType: 'BridgeRestriction',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.restrictionRef}`
  })
}

async function importLrcRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  await enrichRowsWithBridgeId(tx, normalized, dataset.name)

  for (const row of normalized) {
    if (!row.status) row.status = 'Current'
    if (row.certificateVersion === null || row.certificateVersion === undefined) row.certificateVersion = 1
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'certificateNumber',
    objectType: 'LoadRatingCertificate',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.certificateNumber}`
  })
}

async function importProvisionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  const restrictionRefs = [...new Set(normalized.map(r => r.restrictionRef).filter(Boolean))]
  if (restrictionRefs.length) {
    const restrictions = await tx.run(
      SELECT.from('bridge.management.BridgeRestrictions').columns('ID', 'restrictionRef').where({ restrictionRef: { in: restrictionRefs } })
    )
    const restrictionMap = new Map(restrictions.map(r => [r.restrictionRef, r.ID]))
    for (const row of normalized) {
      if (!row.restrictionRef) continue
      const id = restrictionMap.get(row.restrictionRef)
      if (!id) throw new Error(`BridgeRestrictionProvisions row ${row.__rowNumber}: unknown restrictionRef "${row.restrictionRef}" — no matching BridgeRestriction exists.`)
      row.restriction_ID = id
    }
  }

  for (const row of normalized) {
    if (row.active === null || row.active === undefined) row.active = true
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'provisionNumber',
    objectType: 'BridgeRestrictionProvision',
    getName: r => `${r.restrictionRef} / Provision ${r.provisionNumber}`
  })
}

async function importRstProvisionRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)

  const refs = [...new Set(normalized.map(r => r.restrictionRef).filter(Boolean))]
  if (refs.length) {
    const restrictions = await tx.run(
      SELECT.from('bridge.management.Restrictions').columns('ID', 'restrictionRef').where({ restrictionRef: { in: refs } })
    )
    const map = new Map(restrictions.map(r => [r.restrictionRef, r.ID]))
    for (const row of normalized) {
      if (!row.restrictionRef) continue
      const id = map.get(row.restrictionRef)
      if (!id) { warnings.push(`Row ${row.__rowNumber}: unknown restrictionRef "${row.restrictionRef}" — skipped`); continue }
      row.restriction_ID = id
    }
  }

  for (const row of normalized) {
    if (row.active === null || row.active === undefined) row.active = true
    if (!row.sortOrder) row.sortOrder = 1
  }

  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'provisionCode',
    objectType: 'RestrictionProvision',
    getName: r => `${r.restrictionRef} / ${r.provisionCode}`
  })
}

async function importConditionSurveyRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgeConditionSurveys', 'surveyRef', 'CS-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Draft'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'surveyRef',
    objectType: 'BridgeConditionSurvey',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.surveyRef}`
  })
}

async function importLoadRatingRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgeLoadRatings', 'ratingRef', 'LR-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Active'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'ratingRef',
    objectType: 'BridgeLoadRating',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.ratingRef}`
  })
}

async function importPermitRows(tx, dataset, rows, warnings, auditContext) {
  const normalized = normalizeRows(dataset, rows, warnings)
  if (!normalized.length) return emptySummary(dataset)
  await enrichRowsWithBridgeId(tx, normalized, dataset.name)
  await batchGenerateRefs(tx, 'bridge.management.BridgePermits', 'permitRef', 'PM-', normalized)
  for (const row of normalized) {
    if (!row.status) row.status = 'Pending'
    if (row.active === null || row.active === undefined) row.active = true
  }
  return importCuidEntityRows(tx, dataset, normalized.map(r => ({ ...r, __alreadyNormalized: true })), warnings, auditContext, {
    naturalKey: 'permitRef',
    objectType: 'BridgePermit',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.permitRef}`
  })
}

async function importDefectRows(tx, dataset, rows, warnings, auditContext) {
  await batchGenerateRefs(tx, 'bridge.management.BridgeDefects', 'defectId', 'DEF-', rows)
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'defectId',
    objectType: 'BridgeDefect',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.defectId}`,
    extraEnrich: async (innerTx, normalized, innerWarnings) => {
      const withInspRef = normalized.filter(r => r.inspectionRef)
      if (!withInspRef.length) return
      const inspRefs = [...new Set(withInspRef.map(r => r.inspectionRef))]
      const inspections = await innerTx.run(
        SELECT.from('bridge.management.BridgeInspections').columns('ID', 'inspectionRef')
          .where({ inspectionRef: { in: inspRefs } })
      )
      const inspMap = new Map(inspections.map(i => [i.inspectionRef, i.ID]))
      for (const row of withInspRef) {
        const id = inspMap.get(row.inspectionRef)
        if (id) row.inspection_ID = id
        else innerWarnings.push(`Row ${row.__rowNumber}: inspectionRef "${row.inspectionRef}" not found — defect created without inspection link`)
        delete row.inspectionRef
      }
      for (const row of normalized.filter(r => !r.inspectionRef && Object.prototype.hasOwnProperty.call(r, 'inspectionRef'))) {
        delete row.inspectionRef
      }
    }
  })
}

async function importCapacityRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'effectiveFrom',
    objectType: 'BridgeCapacity',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.capacityType} / ${r.effectiveFrom}`
  })
}

async function importScourRows(tx, dataset, rows, warnings, auditContext) {
  return importCuidEntityRows(tx, dataset, rows, warnings, auditContext, {
    naturalKey: 'assessmentDate',
    objectType: 'BridgeScourAssessment',
    getName: r => `${r.bridgeRef || r.bridge_ID} / ${r.assessmentDate}`
  })
}

module.exports = {
  importInspectionRows,
  importElementRows,
  importBridgeRestrictionRows,
  importLrcRows,
  importProvisionRows,
  importRstProvisionRows,
  importConditionSurveyRows,
  importLoadRatingRows,
  importPermitRows,
  importDefectRows,
  importCapacityRows,
  importScourRows
}
