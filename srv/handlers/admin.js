const cds = require('@sap/cds')
const LOG  = cds.log('bms-admin')

module.exports = function registerAdminHandlers (srv, { logAudit }) {

    srv.after(['CREATE','UPDATE','DELETE'], 'Lookups', async (data, req) => {
        let db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'Lookup',
            data?.ID, `${data?.category}:${data?.code}`, data, `Lookup ${req.event.toLowerCase()}d`)
    })

    srv.after(['CREATE','UPDATE','DELETE'], 'AttributeDefinitions', async (data, req) => {
        let db = await cds.connect.to('db')
        await logAudit(db, req, req.event, 'AttributeDefinition',
            data?.ID, data?.name, data, `AttributeDefinition ${req.event.toLowerCase()}d`)
    })

    srv.on('saveRoleConfig', async req => {
        let { configs } = req.data
        if (!configs?.length) return req.error(400, 'configs array is required')
        let db = await cds.connect.to('db')
        let saved = 0
        for (let cfg of configs) {
            let id = `rc-${cfg.role}-${cfg.featureKey}`
            let exists = await db.run(SELECT.one.from('nhvr.RoleConfig').where({ ID: id }))
            let entry = { ID: id, ...cfg }
            if (exists) await db.run(UPDATE('nhvr.RoleConfig').set(entry).where({ ID: id }))
            else        await db.run(INSERT.into('nhvr.RoleConfig').entries(entry))
            saved++
        }
        await logAudit(db, req, 'ACTION', 'RoleConfig', null, 'bulk', configs, `${saved} role configs saved`)
        return { saved }
    })
}
