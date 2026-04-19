const cds = require('@sap/cds')
const LOG  = cds.log('bms-upload')

const MAX_ROWS = 10000

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
        let { csvData } = req.data
        if (!csvData) return req.error(400, 'csvData is required')
        let { rows } = parseCSV(csvData)
        if (rows.length > MAX_ROWS) return req.error(400, `Max ${MAX_ROWS} rows allowed`)
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
    })

    srv.on('massUploadRestrictions', async req => {
        let { csvData } = req.data
        if (!csvData) return req.error(400, 'csvData is required')
        let { rows } = parseCSV(csvData)
        if (rows.length > MAX_ROWS) return req.error(400, `Max ${MAX_ROWS} rows allowed`)
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
    })

    srv.on('massUploadRoutes', async req => {
        let { csvData } = req.data
        if (!csvData) return req.error(400, 'csvData is required')
        let { rows } = parseCSV(csvData)
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
