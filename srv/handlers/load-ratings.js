const cds = require('@sap/cds')

module.exports = function registerLoadRatingHandlers (srv) {
    const { LoadRatingCertificates } = cds.entities('bridge.management')

    srv.before(['CREATE', 'UPDATE'], 'LoadRatingCertificates', req => {
        const d = req.data
        if (d.inherentRiskScore === undefined && d.likelihood && d.consequence) {
            d.inherentRiskScore = d.likelihood * d.consequence
        }
        if (d.certificateExpiryDate && d.certificateIssueDate) {
            if (new Date(d.certificateExpiryDate) <= new Date(d.certificateIssueDate)) {
                req.error(400, 'Certificate expiry date must be after issue date')
            }
        }
    })

    srv.on('supersede', 'LoadRatingCertificates', async (req) => {
        const { newCertificateNumber, reason } = req.data
        const cert = await SELECT.one(LoadRatingCertificates, req.params[0])
        if (!cert) return req.error(404, 'Certificate not found')
        if (cert.status !== 'Current') return req.error(400, 'Only Current certificates can be superseded')

        await UPDATE(LoadRatingCertificates, cert.ID).set({
            status: 'Superseded',
            supersessionReason: reason
        })
        const newCert = await INSERT.into(LoadRatingCertificates).entries({
            ...cert,
            ID: cds.utils.uuid(),
            certificateNumber: newCertificateNumber,
            certificateVersion: (cert.certificateVersion || 1) + 1,
            status: 'Current',
            previousCertId: cert.certificateNumber,
            supersessionReason: null,
            certificateIssueDate: new Date().toISOString().split('T')[0]
        })
        return SELECT.one(LoadRatingCertificates).where({ certificateNumber: newCertificateNumber })
    })

    srv.on('getExpiringCertificates', async req => {
        const days = req.data.daysAhead || 90
        const db = await cds.connect.to('db')
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + days)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]

        const certs = await db.run(
            SELECT.from('bridge.management.LoadRatingCertificates')
                .where({ status: 'Current' })
                .and('certificateExpiryDate <=', cutoffStr)
                .and('certificateExpiryDate >=', today)
        )
        return certs.map(c => {
            const expiry = new Date(c.certificateExpiryDate)
            const now = new Date()
            const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
            return {
                bridgeId: c.bridge_ID,
                bridgeName: '',
                certificateNumber: c.certificateNumber,
                certificateExpiryDate: c.certificateExpiryDate,
                daysUntilExpiry,
                status: c.status
            }
        })
    })
}
