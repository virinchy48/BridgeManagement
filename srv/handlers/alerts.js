const cds = require('@sap/cds')

module.exports = function registerAlertHandlers (srv) {
    const { AlertsAndNotifications } = cds.entities('bridge.management')

    srv.on('acknowledge', 'AlertsAndNotifications', async req => {
        const { note } = req.data
        const alert = await SELECT.one(AlertsAndNotifications, req.params[0])
        if (!alert) return req.error(404, 'Alert not found')
        await UPDATE(AlertsAndNotifications, alert.ID).set({
            status: 'Acknowledged',
            acknowledgedBy: req.user?.id || 'system',
            acknowledgedDate: new Date(),
            acknowledgementNote: note
        })
        return SELECT.one(AlertsAndNotifications, alert.ID)
    })

    srv.on('resolveAlert', 'AlertsAndNotifications', async req => {
        const { note, proofRef } = req.data
        const alert = await SELECT.one(AlertsAndNotifications, req.params[0])
        if (!alert) return req.error(404, 'Alert not found')
        await UPDATE(AlertsAndNotifications, alert.ID).set({
            status: 'Resolved',
            resolvedBy: req.user?.id || 'system',
            resolvedDate: new Date(),
            resolutionNote: note,
            resolutionProof: proofRef
        })
        return SELECT.one(AlertsAndNotifications, alert.ID)
    })

    srv.on('suppress', 'AlertsAndNotifications', async req => {
        const { reason, suppressUntil } = req.data
        const alert = await SELECT.one(AlertsAndNotifications, req.params[0])
        if (!alert) return req.error(404, 'Alert not found')
        await UPDATE(AlertsAndNotifications, alert.ID).set({
            status: 'Suppressed',
            suppressionReason: reason,
            suppressedUntil: suppressUntil,
            suppressedBy: req.user?.id || 'system'
        })
        return SELECT.one(AlertsAndNotifications, alert.ID)
    })

    srv.on('getAlertSummary', async req => {
        const db = await cds.connect.to('db')
        const alerts = await db.run(
            SELECT.from('bridge.management.AlertsAndNotifications')
                .where({ status: 'Open' })
        )
        const now = new Date()
        const overdueAck = alerts.filter(a => {
            if (!a.triggeredDate) return false
            const triggered = new Date(a.triggeredDate)
            const hoursSince = (now - triggered) / (1000 * 60 * 60)
            return a.severity === 'Critical' && hoursSince > 24
        }).length
        return {
            totalOpen:             alerts.length,
            critical:              alerts.filter(a => a.severity === 'Critical').length,
            warning:               alerts.filter(a => a.severity === 'Warning').length,
            info:                  alerts.filter(a => a.severity === 'Info').length,
            overdueAcknowledgement: overdueAck
        }
    })
}
