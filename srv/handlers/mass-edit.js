const cds = require('@sap/cds')
const LOG = cds.log('bms-mass-edit')

const EDITABLE_GRID_FIELDS = ['condition', 'conditionRating', 'postingStatus', 'loadRating',
                               'hmlApproved', 'bDoubleApproved', 'freightRoute']

const LEGACY_RATING_TO_TFNSW = {
    10: 1, 9: 1,
    8: 2,  7: 2,
    6: 3,  5: 3,
    4: 4,  3: 4,
    2: 5,  1: 5
}

const CONDITION_LABELS = {
    1: 'Good',
    2: 'Fair',
    3: 'Poor',
    4: 'Very Poor',
    5: 'Critical'
}

module.exports = function registerMassEditHandlers (srv, { logAudit, validateEnum }) {

    srv.on('massEditBridges', async req => {
        const { rows } = req.data
        if (!rows?.length) return req.error(400, 'rows array is required')
        const db = await cds.connect.to('db')
        let updated = 0, failed = 0
        const errors = []

        for (const [rowIndex, row] of rows.entries()) {
            try {
                if (!row.ID) { failed++; errors.push(`Row ${rowIndex + 1}: ID required`); continue }
                const currentBridge = await db.run(
                    SELECT.one.from('bridge.management.Bridges').where({ ID: row.ID })
                )
                if (!currentBridge) {
                    failed++; errors.push(`Row ${rowIndex + 1}: Bridge ${row.ID} not found`); continue
                }
                const patch = {}
                EDITABLE_GRID_FIELDS.forEach(fieldName => {
                    if (row[fieldName] !== undefined) patch[fieldName] = row[fieldName]
                })
                if (patch.conditionRating !== undefined) {
                    const parsedRating = parseInt(patch.conditionRating, 10)
                    if (parsedRating < 1 || parsedRating > 10) {
                        failed++; errors.push(`Row ${rowIndex + 1}: conditionRating must be 1-10`); continue
                    }
                    const tfnswRating = LEGACY_RATING_TO_TFNSW[parsedRating]
                    patch.condition = CONDITION_LABELS[tfnswRating]
                    patch.highPriorityAsset = parsedRating <= 4
                }
                await db.run(UPDATE('bridge.management.Bridges').set(patch).where({ ID: row.ID }))
                updated++
            } catch (rowError) { failed++; errors.push(`Row ${rowIndex + 1}: ${rowError.message}`) }
        }
        return { updated, failed, errors: errors.join('\n') }
    })
}
