'use strict'
const cds = require('@sap/cds')

module.exports = function registerDefectHandlers (srv, { logAudit }) {

    srv.before('CREATE', 'BridgeDefects', async req => {
        const db = await cds.connect.to('db')
        const d = req.data

        if (!d.defectId) {
            const [last] = await db.run(
                SELECT.from('bridge.management.BridgeDefects')
                    .columns('defectId').orderBy('defectId desc').limit(1)
            )
            const m = last?.defectId?.match(/^DEF-(\d+)$/)
            const seq = m ? parseInt(m[1], 10) + 1 : 1
            d.defectId = `DEF-${String(seq).padStart(4, '0')}`
        }

        if (d.active === undefined) d.active = true

        // severity 1=Low, 2=Moderate, 3=High, 4=Critical — auto-open for high/critical
        if (d.severity >= 3 || d.urgency >= 3) {
            d.remediationStatus = d.remediationStatus || 'Open'
        }
    })

    srv.after(['CREATE', 'UPDATE'], 'BridgeDefects', async (data, req) => {
        if (!data?.ID) return
        const db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'BridgeDefect',
            data.ID, data.defectId, data, `Defect ${req.event.toLowerCase()}d`)

        const defect = await db.run(SELECT.one.from('bridge.management.BridgeDefects').where({ ID: data.ID }))
        if (!defect) return

        if (defect.severity >= 4 && !defect.alertSent) {
            const existing = await db.run(
                SELECT.one.from('bridge.management.AlertsAndNotifications')
                    .where({ entityType: 'BridgeDefects', entityId: defect.ID, status: 'Open' })
            )
            if (!existing) {
                await db.run(INSERT.into('bridge.management.AlertsAndNotifications').entries({
                    ID: cds.utils.uuid(),
                    bridge_ID: defect.bridge_ID,
                    alertType: 'DefectSeverity',
                    severity: 'Critical',
                    alertTitle: `Severity ${defect.severity} Defect — ${defect.defectType}`,
                    alertDescription: `A severity ${defect.severity} defect has been recorded. Defect ID: ${defect.defectId || defect.ID}. Immediate review required.`,
                    entityType: 'BridgeDefects',
                    entityId: defect.ID,
                    entityDescription: defect.defectId || defect.ID,
                    triggeredDate: new Date().toISOString(),
                    status: 'Open',
                    active: true
                }))
                await db.run(UPDATE('bridge.management.BridgeDefects').set({ alertSent: true }).where({ ID: defect.ID }))
            }
        }

        if (defect.requiresLoadRestriction && defect.bridge_ID) {
            const existingRestriction = await db.run(
                SELECT.one.from('bridge.management.Restrictions')
                    .where({ bridge_ID: defect.bridge_ID, restrictionType: 'Weight', restrictionStatus: 'Draft' })
                    .columns('ID')
            )
            if (!existingRestriction) {
                await db.run(INSERT.into('bridge.management.Restrictions').entries({
                    ID: cds.utils.uuid(),
                    bridge_ID: defect.bridge_ID,
                    name: `Auto-suggested: Load restriction from defect ${defect.defectId || defect.ID}`,
                    descr: `Defect ${defect.defectId || defect.ID} requires load assessment. Auto-suggested restriction pending review.`,
                    restrictionType: 'Weight',
                    restrictionStatus: 'Draft',
                    restrictionCategory: 'Temporary',
                    bridgeRef: defect.bridge?.bridgeId || defect.bridge_ID?.toString() || '',
                    restrictionValue: 'TBD',
                    restrictionUnit: 'T',
                    restrictionRef: 'AUTO-' + (defect.defectId || defect.ID?.substring(0, 8) || 'PENDING'),
                    notes: `Auto-suggested from defect ${defect.defectId || defect.ID}: requires engineering review before posting`,
                    active: false,
                    effectiveFrom: new Date().toISOString().split('T')[0]
                }))
            }
        }
    })

    srv.on('deactivate', 'BridgeDefects', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const defect = await db.run(
            SELECT.one.from('bridge.management.BridgeDefects').where({ ID })
        )
        if (!defect) return req.error(404, 'Defect not found')
        await db.run(
            UPDATE('bridge.management.BridgeDefects')
                .set({ active: false }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeDefect',
            ID, defect.defectId, { active: false }, 'Deactivated')
        return Object.assign({}, defect, { active: false })
    })

    srv.on('reactivate', 'BridgeDefects', async req => {
        const { ID } = req.params[0]
        const db = await cds.connect.to('db')
        const defect = await db.run(
            SELECT.one.from('bridge.management.BridgeDefects').where({ ID })
        )
        if (!defect) return req.error(404, 'Defect not found')
        await db.run(
            UPDATE('bridge.management.BridgeDefects')
                .set({ active: true }).where({ ID })
        )
        await logAudit(db, req, 'ACTION', 'BridgeDefect',
            ID, defect.defectId, { active: true }, 'Reactivated')
        return Object.assign({}, defect, { active: true })
    })

    srv.on('getDefectSummary', async req => {
        const { bridgeId } = req.data
        const db = await cds.connect.to('db')
        const defects = await db.run(
            SELECT.from('bridge.management.BridgeDefects').where({ bridge_ID: bridgeId, active: true })
        )
        return {
            totalDefects:   defects.length,
            criticalCount:  defects.filter(d => d.severity >= 4).length,
            highCount:      defects.filter(d => d.severity === 3).length,
            openCount:      defects.filter(d => d.remediationStatus === 'Open').length,
            completedCount: defects.filter(d => d.remediationStatus === 'Completed').length
        }
    })
}
