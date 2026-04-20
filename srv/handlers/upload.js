const cds  = require('@sap/cds')
const path = require('path')
const LOG  = cds.log('bms-upload')

// ─── File validation constants ────────────────────────────────────────────────
const ALLOWED_EXTENSIONS    = ['.xlsx', '.csv', '.xls']
const MAX_FILE_SIZE_BYTES   = 50 * 1024 * 1024    // 50 MB raw file
const MAX_DECOMPRESSED_BYTES = 200 * 1024 * 1024  // 200 MB decompressed (ZIP bomb protection)
const MAX_ROWS              = 50000               // Max rows per upload

function validateUploadFile (fileName, fileContent) {
    // Check extension
    const ext = path.extname(fileName || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw { code: 400, message: `Invalid file type '${ext}'. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.` }
    }

    // Check raw file size
    const sizeBytes = Buffer.isBuffer(fileContent)
        ? fileContent.length
        : Buffer.byteLength(fileContent, 'base64')
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        throw { code: 400, message: `File too large: ${Math.round(sizeBytes / 1024 / 1024)}MB. Maximum allowed: 50MB.` }
    }

    return { ext, sizeBytes }
}

let parseCSV = (csv) => {
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

module.exports = function registerUploadHandlers (srv, { logAudit }) {

    srv.on('massUploadBridges', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            // Validate file type and size before any parsing
            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload. Split into smaller files.`)
            }

            let succeeded = 0, failed = 0, errors = []
            let db = await cds.connect.to('db')
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!row.bridgeId || !row.name) { failed++; errors.push(`Row ${i+2}: bridgeId and name required`); continue }
                        let exists = await tx.run(SELECT.one.from('nhvr.Bridge').where({ bridgeId: row.bridgeId }))
                        let entry = {
                            bridgeId: row.bridgeId, name: row.name, state: row.state, region: row.region,
                            lga: row.lga, condition: row.condition || 'GOOD',
                            conditionRating: row.conditionRating ? parseInt(row.conditionRating) : null,
                            postingStatus: row.postingStatus || 'UNRESTRICTED',
                            yearBuilt: row.yearBuilt ? parseInt(row.yearBuilt) : null,
                            latitude: row.latitude ? parseFloat(row.latitude) : null,
                            longitude: row.longitude ? parseFloat(row.longitude) : null,
                            isActive: row.isActive !== 'false', version: 1
                        }
                        if (exists) { await tx.run(UPDATE('nhvr.Bridge').set(entry).where({ bridgeId: row.bridgeId })) }
                        else { await tx.run(INSERT.into('nhvr.Bridge').entries(entry)) }
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
            LOG.error('massUploadBridges unexpected error', e)
            return req.error(500, `Upload failed: ${e.message}`)
        }
    })

    srv.on('massUploadRestrictions', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            // Validate file type and size before any parsing
            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload. Split into smaller files.`)
            }

            let succeeded = 0, failed = 0, errors = []
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!row.restrictionType || !row.value || !row.unit) {
                            failed++; errors.push(`Row ${i+2}: restrictionType, value, unit required`); continue
                        }
                        await tx.run(INSERT.into('nhvr.Restriction').entries({
                            restrictionType: row.restrictionType, value: parseFloat(row.value),
                            unit: row.unit, bridge_ID: row.bridge_ID || null,
                            status: row.status || 'ACTIVE', validFromDate: row.validFromDate || null,
                            isActive: true, version: 1
                        }))
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

    srv.on('massUploadRoutes', async req => {
        try {
            let { csvData, fileName } = req.data
            if (!csvData) return req.error(400, 'csvData is required')

            // Validate file type and size before any parsing
            validateUploadFile(fileName || 'upload.csv', csvData)

            let { rows } = parseCSV(csvData)
            if (rows.length > MAX_ROWS) {
                return req.error(400,
                    `Too many rows: ${rows.length}. Maximum ${MAX_ROWS} rows per upload. Split into smaller files.`)
            }

            let succeeded = 0, failed = 0, errors = []
            let tx = cds.tx(req)
            try {
                for (let [i, row] of rows.entries()) {
                    try {
                        if (!row.routeCode) { failed++; errors.push(`Row ${i+2}: routeCode required`); continue }
                        await tx.run(INSERT.into('nhvr.Route').entries({
                            routeCode: row.routeCode, description: row.description,
                            state: row.state, region: row.region, isActive: true
                        }))
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

    srv.on('massDownloadBridges', async req => {
        let { region, state, routeCode } = req.data
        let db = await cds.connect.to('db')
        let where = { isDeleted: false }
        if (state)  where.state  = state
        if (region) where.region = region
        let bridges = await db.run(SELECT.from('nhvr.Bridge').where(where))
        let headers = ['bridgeId','name','state','region','lga','condition','conditionRating','postingStatus','yearBuilt','latitude','longitude','isActive']
        let csv = [headers.join(','), ...bridges.map(b => headers.map(h => b[h] ?? '').join(','))].join('\n')
        return { csvData: csv, filename: `bridges_${new Date().toISOString().split('T')[0]}.csv`, recordCount: bridges.length }
    })
}
