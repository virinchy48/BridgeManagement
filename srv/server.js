const cds = require('@sap/cds')
const express = require('express')
const helmet = require('helmet')
const { recordActivity } = require('./user-activity')

const createMiddleware = require('./middleware')

const mountAttributesApi = require('./attributes-api')
const mountReportsApi = require('./reports-api')
const mountBhiBsiApi = require('./bhi-bsi-api')

const massUploadRouter   = require('./routers/mass-upload-router')
const dashboardRouter    = require('./routers/dashboard-router')
const mapRouter          = require('./routers/map-router')
const massEditRouter     = require('./routers/mass-edit-router')
const auditRouter        = require('./routers/audit-router')
const accessRouter       = require('./routers/access-router')
const qualityRouter      = require('./routers/quality-router')
const systemRouter       = require('./routers/system-router')
const featureFlagsRouter = require('./routers/feature-flags-router')
const adminBridgeRouter  = require('./routers/admin-bridge-router')
const bnacRouter         = require('./routers/bnac-router')

function isHanaDb() {
  const requires = cds.env.requires || {}
  return Object.values(requires).some(s => s && (s.kind === 'hana' || s.impl === '@cap-js/hana'))
    || process.env.NODE_ENV === 'production'
}

cds.on('bootstrap', (app) => {
  // ── FE4 draft-protocol UUID guard ─────────────────────────────────────────
  // FE4 passes the parent Bridge's integer ID as the key for UUID-keyed
  // composition child entities when checking for draft/sibling entities.
  // CAP rejects non-UUID values for cds.UUID-typed keys with 400; FE4 shows
  // that as an error dialog. This middleware converts those to 404 so FE4
  // silently moves on.
  const UUID_CHILD_WITH_INT_KEY = /^\/odata\/v4\/admin\/(Bridge[A-Z][A-Za-z]*|LoadRating[A-Za-z]*|NhvrRoute[A-Za-z]+|AlertsAnd[A-Za-z]+)\(ID=\d+(,|\))/
  app.use((req, res, next) => {
    if (UUID_CHILD_WITH_INT_KEY.test(req.path)) {
      return res.status(404).json({ error: { message: 'Not found', code: '404' } })
    }
    next()
  })

  // ── Helmet security headers ───────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src':  ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', "'unsafe-inline'", "'unsafe-eval'"],
        'style-src':   ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https:', "'unsafe-inline'"],
        'font-src':    ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https:', 'data:'],
        'img-src':     ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https://*.tile.openstreetmap.org', 'https://unpkg.com', 'https://cdnjs.cloudflare.com', 'data:', 'blob:'],
        'connect-src': ["'self'", 'https://ui5.sap.com', 'https://sapui5.hana.ondemand.com', 'https://*.tile.openstreetmap.org', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
        'worker-src':  ["'self'", 'blob:'],
      }
    }
  }))

  // ── Health probe (no auth) ────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'UP',
      ts: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      env: process.env.NODE_ENV || 'development'
    })
  })

  // ── Middleware factory ────────────────────────────────────────────────────
  const { requiresAuthentication, validateCsrfToken, requireScope } = createMiddleware()

  // ── Activity tracking ─────────────────────────────────────────────────────
  app.use((req, _res, next) => {
    const userId = req.user?.id
    if (userId) {
      const displayName = req.user?.name || req.user?.email || userId
      recordActivity(userId, displayName, req.path).catch(() => {})
    }
    next()
  })

  // ── Router mounts ─────────────────────────────────────────────────────────
  app.use('/mass-upload/api',  requiresAuthentication, requireScope('admin', 'manage'), validateCsrfToken, massUploadRouter)
  app.use('/dashboard/api',   requiresAuthentication, dashboardRouter)
  app.use('/map/api',         requiresAuthentication, mapRouter)
  app.use('/mass-edit/api',   requiresAuthentication, requireScope('admin', 'manage'), validateCsrfToken, massEditRouter)

  mountAttributesApi(app, requiresAuthentication, requireScope('manage', 'admin'))

  app.use('/audit/api',       requiresAuthentication, requireScope('admin', 'manage'), auditRouter)
  app.use('/access/api',      requiresAuthentication, accessRouter)
  app.use('/quality/api',     requiresAuthentication, validateCsrfToken, qualityRouter)
  app.use('/system/api',      requiresAuthentication, requireScope('admin'), validateCsrfToken, systemRouter)

  // Feature flags: read-only for all authenticated users; write requires scope (enforced in router)
  app.use('/system/api/features', requiresAuthentication, featureFlagsRouter)

  app.use('/admin-bridges/api', requiresAuthentication, requireScope('admin', 'manage', 'inspect'), validateCsrfToken, adminBridgeRouter)

  mountReportsApi(app, requiresAuthentication, requireScope('view', 'inspect', 'manage', 'admin'))
  mountBhiBsiApi(app, requiresAuthentication, requireScope)

  app.use('/bnac/api', requiresAuthentication, requireScope('admin'), validateCsrfToken, bnacRouter)
})

cds.on('served', async () => {
  // ── HANA: back-fill spatial geoLocation column after first boot ─────────────
  if (!isHanaDb()) return
  try {
    const db = await cds.connect.to('db')
    await db.run(`UPDATE "BRIDGE_MANAGEMENT_BRIDGES"
      SET "GEOLOCATION" = NEW ST_Point("LONGITUDE", "LATITUDE", 4326)
      WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL AND "GEOLOCATION" IS NULL`)
  } catch (_error) {
    // Spatial column may not exist in dev — ignore
  }
})

// ── Hide internal apps from the CDS welcome-page listing ─────────────────────
;(function () {
  const _find = cds.utils.find
  cds.utils.find = function (dir, patterns) {
    const results = _find.call(this, dir, patterns)
    return Array.isArray(results)
      ? results.filter(f => !f.includes('bms-admin') && !f.includes('app/router'))
      : results
  }
})()

module.exports = cds.server
