const cds = require('@sap/cds')

const GRID_FIELDS = ['condition','conditionRating','postingStatus','loadRating',
                     'hmlApproved','bdoubleApproved','freightRoute','isActive']

const CONDITION_LABELS = {
    1:'CRITICAL',2:'CRITICAL',3:'POOR',4:'POOR',5:'FAIR',
    6:'FAIR',7:'GOOD',8:'VERY_GOOD',9:'EXCELLENT',10:'EXCELLENT'
}

module.exports = function registerMassEditHandlers (srv, { logAudit, validateEnum }) {

    srv.on('massEditBridges', async req => {
        let { rows } = req.data
        if (!rows?.length) return req.error(400, 'rows array is required')
        let db = await cds.connect.to('db')
        let updated = 0, failed = 0, errors = []

        for (let [rowIndex, row] of rows.entries()) {
            try {
                if (!row.ID) { failed++; errors.push(`Row ${rowIndex + 1}: ID required`); continue }
                let current = await db.run(SELECT.one.from('nhvr.Bridge').where({ ID: row.ID }))
                if (!current) { failed++; errors.push(`Row ${rowIndex + 1}: Bridge ${row.ID} not found`); continue }
                if (row.version !== undefined && current.version !== row.version) {
                    failed++; errors.push(`Row ${rowIndex + 1}: Version conflict for ${current.bridgeId}`); continue
                }
                let patch = {}
                GRID_FIELDS.forEach(fieldName => { if (row[fieldName] !== undefined) patch[fieldName] = row[fieldName] })
                if (patch.conditionRating) {
                    let conditionRating = parseInt(patch.conditionRating)
                    if (conditionRating < 1 || conditionRating > 10) { failed++; errors.push(`Row ${rowIndex + 1}: conditionRating must be 1-10`); continue }
                    patch.condition = CONDITION_LABELS[conditionRating]
                    patch.conditionScore = Math.round((conditionRating / 10) * 100)
                    patch.highPriorityAsset = conditionRating <= 4
                }
                patch.version = current.version + 1
                await db.run(UPDATE('nhvr.Bridge').set(patch).where({ ID: row.ID }))
                updated++
            } catch (error) { failed++; errors.push(`Row ${rowIndex + 1}: ${error.message}`) }
        }
        return { updated, failed, errors: errors.join('\n') }
    })
}
