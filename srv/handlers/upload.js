const cds  = require('@sap/cds')
const path = require('path')
const LOG  = cds.log('bms-upload')

// ─── File validation constants ────────────────────────────────────────────────
const ALLOWED_EXTENSIONS     = ['.xlsx', '.csv', '.xls']
const MAX_FILE_SIZE_BYTES    = 50 * 1024 * 1024    // 50 MB raw file
const MAX_DECOMPRESSED_BYTES = 200 * 1024 * 1024  // 200 MB decompressed (ZIP bomb protection)
const MAX_ROWS               = 50000               // Max rows per upload

// All bridge fields written by mass upload (maps CSV column → entity field)
const BRIDGE_DOWNLOAD_HEADERS = [
    'bridgeId','name','state','region','lga','suburb',
    'latitude','longitude','structureType','material',
    'yearBuilt','yearRebuilt','spanLengthM','totalLengthM','deckWidthM','clearanceHeightM',
    'numberOfSpans','numberOfLanes','designLoad','designLoadCode',
    'condition','conditionRating','conditionRatingTfnsw','conditionRatingDate',
    'postingStatus','postingStatusReason',
    'assetOwner','maintenanceAuthority',
    'scourRisk','scourRiskLevel','floodImpacted','floodImmunityAri',
    'hmlApproved','bdoubleApproved','freightRoute','overMassRoute',
    'nhvrRouteAssessed','pbsApprovalClass','networkClassification',
    'importanceLevel','seismicZone',
    'aadt','heavyVehiclePercentage',
    'highPriorityAsset','remarks','isActive',
    'dataSource','sourceReferenceUrl','openDataReference','geoJson'
]

function validateUploadFile (fileName, fileContent) {
    const ext = path.extname(fileName || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw { code: 400, message: `Invalid file type '${ext}'. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.` }
    }
    const sizeBytes = Buffer.isBuffer(fileContent)
        ? fileContent.length
        : Buffer.byteLength(fileContent, 'base64')
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        throw { code: 400, message: `File too large: ${Math.round(sizeBytes / 1024 / 1024)}MB. Maximum allowed: 50MB.` }
    }
    return { ext, sizeBytes }
}

function parseCSV (csv) {
    let lines = csv.split('\n').filter(l => l.trim())
    if (lines.length < 2) return { headers: [], rows: [] }
    let headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    let rows = lines.slice(1).map(line => {
        let cols = [], cur = '', inQ = false
        for (let ch of line) {
            if (ch === '"') { inQ = !inQ }
            else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
            else cur += ch
        }
        cols.push(cur.trim())
        return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
    })
    return { headers, rows }
}

// Parse helpers — return null for empty/invalid values
const str  = v => (v && v.trim()) ? v.trim() : null
const int  = v => (v && v.trim()) ? parseInt(v,  10)  : null
const dec  = v => (v && v.trim()) ? parseFloat(v)     : null
const bool = v => v === 'true' ? true : v === 'false' ? false : null
const date = v => (v && v.trim()) ? v.trim() : null

module.exports = function registerUploadHandlers (srv, { logAudit }) {

    // ── massUploadBridges ────────────────────────────────────────────────────
    srv.on('massUploadBridges', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload.`)
            }

            let succeeded = 0, failed = 0, errors = []
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!str(row.bridgeId) || !str(row.name)) {
                            failed++; errors.push(`Row ${i+2}: bridgeId and name are required`); continue
                        }

                        let entry = {
                            // ── Identity (mandatory)
                            bridgeId:   str(row.bridgeId),
                            name:       str(row.name),
                            // ── Location
                            state:      str(row.state)  || 'NSW',
                            region:     str(row.region),
                            lga:        str(row.lga),
                            suburb:     str(row.suburb),
                            latitude:   dec(row.latitude),
                            longitude:  dec(row.longitude),
                            // ── Structure
                            structureType:    str(row.structureType),
                            material:         str(row.material),
                            yearBuilt:        int(row.yearBuilt),
                            yearRebuilt:      int(row.yearRebuilt),
                            spanLengthM:      dec(row.spanLengthM),
                            totalLengthM:     dec(row.totalLengthM),
                            deckWidthM:       dec(row.deckWidthM),
                            clearanceHeightM: dec(row.clearanceHeightM),
                            numberOfSpans:    int(row.numberOfSpans),
                            numberOfLanes:    int(row.numberOfLanes),
                            designLoad:       str(row.designLoad),
                            designLoadCode:   str(row.designLoadCode),
                            // ── Condition
                            condition:             str(row.condition)   || 'GOOD',
                            conditionRating:       int(row.conditionRating),
                            conditionRatingTfnsw:  int(row.conditionRatingTfnsw),
                            conditionRatingDate:   date(row.conditionRatingDate),
                            conditionRatingNotes:  str(row.conditionRatingNotes),
                            conditionTrendCurrent: str(row.conditionTrendCurrent),
                            criticalDefectFlag:    int(row.conditionRatingTfnsw) === 5 ? true : false,
                            // ── Status
                            postingStatus:       str(row.postingStatus)       || 'UNRESTRICTED',
                            postingStatusReason: str(row.postingStatusReason),
                            // ── Ownership
                            assetOwner:           str(row.assetOwner),
                            maintenanceAuthority: str(row.maintenanceAuthority),
                            // ── Scour & Flood
                            scourRisk:          str(row.scourRisk),
                            scourRiskLevel:     str(row.scourRiskLevel),
                            floodImpacted:      bool(row.floodImpacted) ?? false,
                            floodImmunityAri:   int(row.floodImmunityAri),
                            // ── NHVR/HML flags
                            hmlApproved:         bool(row.hmlApproved)     ?? false,
                            bdoubleApproved:     bool(row.bdoubleApproved) ?? false,
                            freightRoute:        bool(row.freightRoute)    ?? false,
                            overMassRoute:       bool(row.overMassRoute)   ?? false,
                            nhvrRouteAssessed:   bool(row.nhvrRouteAssessed) ?? false,
                            pbsApprovalClass:    str(row.pbsApprovalClass),
                            networkClassification: str(row.networkClassification),
                            // ── Standards
                            importanceLevel:  str(row.importanceLevel),
                            seismicZone:      str(row.seismicZone),
                            // ── Traffic
                            aadt:                  int(row.aadt),
                            heavyVehiclePercentage: dec(row.heavyVehiclePercentage),
                            // ── Inspection scheduling
                            lastInspectionDate:      date(row.lastInspectionDate),
                            lastInspectionType:      str(row.lastInspectionType),
                            nextInspectionDate:      date(row.nextInspectionDate),
                            inspectionFrequencyYears: int(row.inspectionFrequencyYears),
                            // ── Gazette
                            gazetteNumber:          str(row.gazetteRef || row.gazetteNumber),
                            gazetteEffectiveDate:   date(row.gazetteEffectiveDate),
                            gazetteExpiryDate:      date(row.gazetteExpiryDate),
                            // ── NHVR PBS approval
                            pbsApprovalDate:   date(row.pbsApprovalDate),
                            pbsApprovalExpiry: date(row.pbsApprovalExpiry),
                            hmlApprovalDate:   date(row.hmlApprovalDate),
                            hmlApprovalExpiry: date(row.hmlApprovalExpiry),
                            // ── Data provenance
                            remarks:            str(row.remarks),
                            highPriorityAsset:  bool(row.highPriorityAsset) ?? false,
                            // GeoJSON for map display — stored in remarks extension or custom field if available
                            // ── Lifecycle
                            isActive:  bool(row.isActive) ?? true,
                            isDeleted: false,
                            version:   1,
                        }

                        // Remove null values so CAP uses entity defaults where set
                        Object.keys(entry).forEach(k => { if (entry[k] === null) delete entry[k] })

                        let exists = await tx.run(
                            SELECT.one.from('nhvr.Bridge').where({ bridgeId: entry.bridgeId })
                        )
                        if (exists) {
                            // Idempotent update — increment version for optimistic lock
                            delete entry.version
                            await tx.run(
                                UPDATE('nhvr.Bridge').set({ ...entry, version: (exists.version || 1) + 1 })
                                    .where({ bridgeId: entry.bridgeId })
                            )
                        } else {
                            await tx.run(INSERT.into('nhvr.Bridge').entries(entry))
                        }
                        succeeded++
                    } catch (e) { failed++; errors.push(`Row ${i+2} (${row.bridgeId}): ${e.message}`) }
                }
                await tx.commit()
            } catch (e) {
                await tx.rollback()
                return req.error(500, `Upload failed: ${e.message}`)
            }
            return { processed: rows.length, succeeded, failed, errors: errors.join('\n') }
        } catch (e) {
            if (e.code === 400) return req.error(400, e.message)
            LOG.error('massUploadBridges unexpected error', e)
            return req.error(500, `Upload failed: ${e.message}`)
        }
    })

    // ── massUploadRestrictions ───────────────────────────────────────────────
    srv.on('massUploadRestrictions', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload.`)
            }

            let succeeded = 0, failed = 0, errors = []
            // Cache bridgeId→UUID lookups to avoid repeated DB hits
            let bridgeIdCache = new Map()
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!str(row.restrictionType) || !str(row.value) || !str(row.unit)) {
                            failed++
                            errors.push(`Row ${i+2}: restrictionType, value, unit are required`)
                            continue
                        }

                        // Resolve bridge FK: accept either bridge_ID (UUID) or bridgeRef (bridgeId string)
                        let bridgeUUID = str(row.bridge_ID) || null
                        if (!bridgeUUID && str(row.bridgeRef)) {
                            let ref = str(row.bridgeRef)
                            if (!bridgeIdCache.has(ref)) {
                                let b = await tx.run(
                                    SELECT.one('ID').from('nhvr.Bridge').where({ bridgeId: ref })
                                )
                                bridgeIdCache.set(ref, b ? b.ID : null)
                            }
                            bridgeUUID = bridgeIdCache.get(ref)
                            if (!bridgeUUID) {
                                failed++
                                errors.push(`Row ${i+2}: bridge '${ref}' not found — upload bridges first`)
                                continue
                            }
                        }

                        let entry = {
                            restrictionType:   str(row.restrictionType),
                            value:             dec(row.value),
                            unit:              str(row.unit),
                            bridge_ID:         bridgeUUID,
                            restrictionCategory: str(row.restrictionCategory) || 'Permanent',
                            status:            str(row.restrictionStatus || row.status) || 'Active',
                            vehicleClassApplicable: str(row.vehicleClassApplicable),
                            grossMassLimit:    dec(row.grossMassLimit),
                            axleMassLimit:     dec(row.axleMassLimit),
                            dimensionLimitHeight: dec(row.dimensionLimitHeight),
                            dimensionLimitWidth:  dec(row.dimensionLimitWidth),
                            dimensionLimitLength: dec(row.dimensionLimitLength),
                            speedLimitKmh:     int(row.speedLimitKmh),
                            permitRequired:    bool(row.permitRequired) ?? false,
                            escortRequired:    bool(row.escortRequired) ?? false,
                            isTemporary:       bool(row.isTemporary)    ?? false,
                            validFromDate:     date(row.validFromDate),
                            validToDate:       date(row.validToDate),
                            directionApplied:  str(row.directionApplied),
                            issuingAuthority:  str(row.issuingAuthority),
                            legalReference:    str(row.legalReference),
                            remarks:           str(row.remarks),
                            isActive: true,
                            version:  1,
                        }

                        Object.keys(entry).forEach(k => { if (entry[k] === null) delete entry[k] })

                        await tx.run(INSERT.into('nhvr.Restriction').entries(entry))
                        succeeded++
                    } catch (e) { failed++; errors.push(`Row ${i+2}: ${e.message}`) }
                }
                await tx.commit()
            } catch (e) {
                await tx.rollback()
                return req.error(500, `Upload failed: ${e.message}`)
            }
            return { processed: rows.length, succeeded, failed, errors: errors.join('\n') }
        } catch (e) {
            if (e.code === 400) return req.error(400, e.message)
            LOG.error('massUploadRestrictions unexpected error', e)
            return req.error(500, `Upload failed: ${e.message}`)
        }
    })

    // ── massUploadRoutes ─────────────────────────────────────────────────────
    srv.on('massUploadRoutes', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload.`)
            }

            let succeeded = 0, failed = 0, errors = []
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!str(row.routeCode)) {
                            failed++; errors.push(`Row ${i+2}: routeCode required`); continue
                        }
                        let exists = await tx.run(
                            SELECT.one.from('nhvr.Route').where({ routeCode: str(row.routeCode) })
                        )
                        let entry = {
                            routeCode:   str(row.routeCode),
                            description: str(row.description) || str(row.routeCode),
                            state:       str(row.state),
                            region:      str(row.region),
                            isActive:    bool(row.isActive) ?? true,
                        }
                        if (exists) {
                            await tx.run(UPDATE('nhvr.Route').set(entry).where({ routeCode: entry.routeCode }))
                        } else {
                            await tx.run(INSERT.into('nhvr.Route').entries(entry))
                        }
                        succeeded++
                    } catch (e) { failed++; errors.push(`Row ${i+2}: ${e.message}`) }
                }
                await tx.commit()
            } catch (e) {
                await tx.rollback()
                return req.error(500, `Upload failed: ${e.message}`)
            }
            return { processed: rows.length, succeeded, failed, errors: errors.join('\n') }
        } catch (e) {
            if (e.code === 400) return req.error(400, e.message)
            LOG.error('massUploadRoutes unexpected error', e)
            return req.error(500, `Upload failed: ${e.message}`)
        }
    })

    // ── massDownloadBridges ──────────────────────────────────────────────────
    srv.on('massDownloadBridges', async req => {
        let { region, state, routeCode } = req.data
        let db = await cds.connect.to('db')
        let where = { isDeleted: false }
        if (state)  where.state  = state
        if (region) where.region = region
        let bridges = await db.run(SELECT.from('nhvr.Bridge').where(where))

        // Quote a CSV value safely
        const csvVal = v => {
            if (v == null || v === '') return ''
            let s = String(v)
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"'
            }
            return s
        }
        let csv = [
            BRIDGE_DOWNLOAD_HEADERS.join(','),
            ...bridges.map(b => BRIDGE_DOWNLOAD_HEADERS.map(h => csvVal(b[h])).join(','))
        ].join('\n')

        return {
            csvData: csv,
            filename: `bridges_${state || 'all'}_${new Date().toISOString().split('T')[0]}.csv`,
            recordCount: bridges.length
        }
    })
}
