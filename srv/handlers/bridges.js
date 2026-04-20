const cds = require('@sap/cds')

// FIX 1 — TfNSW Bridge Inspection Manual condition scale (1=Good, 5=Critical)
// Reference: TfNSW Bridge Inspection Manual — Condition Rating definitions
const CONDITION_LABELS = {
    1: 'GOOD',
    2: 'FAIR',
    3: 'POOR',
    4: 'VERY_POOR',
    5: 'CRITICAL'
}

// For backward compatibility with legacy 1-10 numeric rating, map to TfNSW 1-5:
const LEGACY_RATING_TO_TFNSW = {
    10: 1, 9: 1,   // Excellent/Very Good → Good (1)
    8: 2,  7: 2,   // Good → Fair (2)
    6: 3,  5: 3,   // Fair/Average → Poor (3)
    4: 4,  3: 4,   // Poor → Very Poor (4)
    2: 5,  1: 5    // Critical → Critical (5)
}

// FIX 2 — Safe date arithmetic: avoids Feb-29 blowup in non-leap years
function addYearsSafe(date, years) {
    if (!date) return null
    const d = new Date(date)
    const targetYear  = d.getFullYear() + years
    const targetMonth = d.getMonth()
    const targetDay   = d.getDate()
    // Feb 29 in a non-leap target year → clamp to Feb 28
    const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate()
    d.setFullYear(targetYear, targetMonth, Math.min(targetDay, maxDay))
    return d
}

// FIX 4 — Write a ConditionHistory row after a condition change (standalone, no S/4)
const writeConditionHistory = async (bridgeId, conditionData, user) => {
    try {
        await INSERT.into('nhvr.ConditionHistory').entries({
            ID:                  cds.utils.uuid(),
            bridge_ID:           bridgeId,
            conditionRatingTfnsw: conditionData.conditionRatingTfnsw || conditionData.newRating,
            assessmentDate:      conditionData.assessmentDate || new Date().toISOString().split('T')[0],
            assessor:            user || 'System',
            source:              'bms_manual_entry',  // standalone — not from S/4
            notes:               conditionData.notes || '',
            createdAt:           new Date().toISOString()
        })
    } catch (e) {
        // Non-fatal — log but don't block the main update
        LOG.warn('ConditionHistory write failed:', e.message)
    }
}

// FIX 3 — Optimistic lock check helper (also registered as srv.before handler below)
// Exported for unit-testing and for any caller that wants to invoke it standalone.
async function beforeUpdateBridge (req) {
    const { ID, version } = req.data
    if (version !== undefined) {
        const current = await SELECT.one.from('nhvr.Bridge')
            .columns(['version'])
            .where({ ID })
        if (current && current.version !== version) {
            req.error(409, 'Bridge was modified by another user. Please refresh and try again.', 'OPTIMISTIC_LOCK_CONFLICT')
        }
    }
    // Increment version on save
    req.data.version = (version || 0) + 1
}

function registerBridgeHandlers (srv, { logAudit, validateEnum }) {

    // ── Before CREATE / UPDATE ──────────────────────────────────────────────
    srv.before(['CREATE', 'UPDATE'], 'Bridges', async req => {
        let data = req.data

        // FIX 1 + FIX 5 — legacy 1-10 conditionRating → TfNSW 1-5 + correct label
        if (data.conditionRating !== undefined) {
            let rating = data.conditionRating
            if (rating < 1 || rating > 10) return req.error(400, 'conditionRating must be 1–10')

            // Derive TfNSW rating and label
            const tfnswRating   = LEGACY_RATING_TO_TFNSW[rating] || rating
            data.conditionRatingTfnsw = tfnswRating
            data.condition            = CONDITION_LABELS[tfnswRating]
            data.conditionScore       = Math.round((rating / 10) * 100)
            data.highPriorityAsset    = rating <= 4   // legacy scale: ≤4 is poor/critical
            data.conditionRatingDate  = new Date().toISOString().split('T')[0]
        }

        // FIX 5 — direct TfNSW 1-5 rating set
        if (data.conditionRatingTfnsw !== undefined && data.conditionRating === undefined) {
            if (data.conditionRatingTfnsw < 1 || data.conditionRatingTfnsw > 5) {
                return req.error(400, 'conditionRatingTfnsw must be 1 (Good) to 5 (Critical) per TfNSW scale')
            }
            data.condition           = CONDITION_LABELS[data.conditionRatingTfnsw]
            data.conditionRatingDate = new Date().toISOString().split('T')[0]
            // highPriorityAsset: TfNSW ≥ 4 (Very Poor or Critical) flags the bridge
            data.highPriorityAsset   = data.conditionRatingTfnsw >= 4
        }

        // FIX 2 — next inspection date using leap-year-safe arithmetic
        if (data.inspectionFrequencyYrs && data.inspectionDate) {
            const next = addYearsSafe(data.inspectionDate, data.inspectionFrequencyYrs)
            data.nextInspectionDueDate = next.toISOString().split('T')[0]
        }
    })

    // FIX 3 — Optimistic lock: before UPDATE, verify version and increment
    srv.before('UPDATE', 'Bridges', beforeUpdateBridge)

    // ── After READ / QUERY ─────────────────────────────────────────────────
    srv.after(['READ', 'QUERY'], 'Bridges', results => {
        let bridges = Array.isArray(results) ? results : [results]
        let today   = new Date()
        bridges.forEach(b => {
            if (!b) return
            if (b.yearBuilt && b.designLife)
                b.remainingUsefulLifeYrs = (b.yearBuilt + b.designLife) - today.getFullYear()
            if (b.nextInspectionDueDate && new Date(b.nextInspectionDueDate) < today)
                b.overdueFlag = true
        })
    })

    // ── changeCondition action ─────────────────────────────────────────────
    srv.on('changeCondition', 'Bridges', async req => {
        let { conditionValue, score } = req.data
        let { ID } = req.params[0]

        // FIX 5 — derive TfNSW rating from the incoming conditionValue string
        // Reverse-lookup: find the TfNSW key whose label matches conditionValue
        const tfnswRating = Object.keys(CONDITION_LABELS).find(
            k => CONDITION_LABELS[k] === conditionValue
        )
        const tfnswNum = tfnswRating ? parseInt(tfnswRating, 10) : null

        await UPDATE('nhvr.Bridge').set({
            condition:            conditionValue,
            conditionRatingTfnsw: tfnswNum,
            conditionRatingDate:  new Date().toISOString().split('T')[0],
            conditionScore:       score,
            highPriorityAsset:    ['CRITICAL', 'VERY_POOR'].includes(conditionValue)
        }).where({ ID })

        let bridge = await SELECT.one.from('nhvr.Bridge').where({ ID })
        await logAudit(null, req, 'ACTION', 'Bridge', ID, bridge?.name,
            { conditionValue, score }, 'Condition changed')

        // FIX 4 — write ConditionHistory (standalone, non-fatal)
        await writeConditionHistory(
            ID,
            {
                conditionRatingTfnsw: tfnswNum,
                assessmentDate:       new Date().toISOString().split('T')[0],
                notes:                `Condition set to ${conditionValue} via changeCondition action`
            },
            req.user?.id || req.user?.name || 'System'
        )

        return {
            ID,
            bridgeId:       bridge?.bridgeId,
            name:           bridge?.name,
            condition:      bridge?.condition,
            conditionScore: bridge?.conditionScore
        }
    })

    // ── changeConditionTfnsw action (TfNSW 1-5 scale, records ConditionHistory) ──
    srv.on('changeConditionTfnsw', 'Bridges', async req => {
        const { conditionRatingTfnsw, notes, assessmentDate } = req.data
        const { ID } = req.params[0]

        if (!conditionRatingTfnsw || conditionRatingTfnsw < 1 || conditionRatingTfnsw > 5) {
            req.error(400, 'conditionRatingTfnsw must be 1 (Good) to 5 (Critical)')
            return
        }

        const conditionLabel = CONDITION_LABELS[conditionRatingTfnsw] || 'UNKNOWN'
        const today = new Date().toISOString().split('T')[0]

        await UPDATE('nhvr.Bridge').set({
            conditionRatingTfnsw,
            conditionRatingDate:  assessmentDate || today,
            conditionRatingNotes: notes || null,
            condition:            conditionLabel,
            criticalDefectFlag:   conditionRatingTfnsw === 5,
            highPriorityAsset:    conditionRatingTfnsw >= 4
        }).where({ ID })

        await writeConditionHistory(ID, {
            conditionRatingTfnsw,
            assessmentDate: assessmentDate || today,
            notes
        }, req.user?.id || 'System')

        const bridge = await SELECT.one.from('nhvr.Bridge').where({ ID })
        await logAudit(null, req, 'ACTION', 'Bridge', ID, bridge?.name,
            { conditionRatingTfnsw, notes }, 'TfNSW condition rating updated')

        return bridge
    })

    // ── closeForTraffic action ─────────────────────────────────────────────
    srv.on('closeForTraffic', 'Bridges', async req => {
        let { ID } = req.params[0]
        await UPDATE('nhvr.Bridge').set({ postingStatus: 'CLOSED', isActive: false }).where({ ID })
        let bridge = await SELECT.one.from('nhvr.Bridge').where({ ID })
        await logAudit(null, req, 'ACTION', 'Bridge', ID, bridge?.name, {}, 'Closed for traffic')
        return { ID, bridgeId: bridge?.bridgeId, name: bridge?.name, postingStatus: 'CLOSED' }
    })

    // ── reopenForTraffic action ────────────────────────────────────────────
    srv.on('reopenForTraffic', 'Bridges', async req => {
        let { ID } = req.params[0]
        await UPDATE('nhvr.Bridge').set({ postingStatus: 'UNRESTRICTED', isActive: true }).where({ ID })
        let bridge = await SELECT.one.from('nhvr.Bridge').where({ ID })
        await logAudit(null, req, 'ACTION', 'Bridge', ID, bridge?.name, {}, 'Reopened for traffic')
        return { ID, bridgeId: bridge?.bridgeId, name: bridge?.name, postingStatus: 'UNRESTRICTED' }
    })

    // ── addRestriction action ──────────────────────────────────────────────
    srv.on('addRestriction', 'Bridges', async req => {
        let { ID } = req.params[0]
        let bridge = await SELECT.one.from('nhvr.Bridge').where({ ID })
        if (!bridge) return req.error(404, 'Bridge not found')
        let { restrictionType, value, unit, validFromDate, validToDate,
              status, permitRequired, directionApplied, gazetteRef, notes } = req.data
        let newID = cds.utils.uuid()
        await INSERT.into('nhvr.Restriction').entries({
            ID: newID, bridge_ID: ID, restrictionType, value, unit,
            validFromDate, validToDate, status: status || 'ACTIVE',
            permitRequired, directionApplied, gazetteRef, notes,
            bridgeName: bridge.name, isActive: true, version: 1
        })
        return { status: 'CREATED', message: 'Restriction added', ID: newID }
    })
}

// Export the registration function as default; also expose helper for unit tests
module.exports = registerBridgeHandlers
module.exports.beforeUpdateBridge = beforeUpdateBridge
