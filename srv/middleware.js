const cds = require('@sap/cds')

/**
 * Factory function — called inside cds.on('bootstrap') so cds.env is fully loaded.
 * Returns { requiresAuthentication, validateCsrfToken, requireScope }.
 */
module.exports = function createMiddleware() {
  const _isDummyAuth = !process.env.VCAP_SERVICES && cds.env.requires?.auth?.kind === 'dummy'

  const requiresAuthentication = (req, res, next) => {
    if (req.user || req.tokenInfo || req.authInfo) return next()
    if ((req.headers.authorization || '').startsWith('Bearer ')) return next()
    if (_isDummyAuth) {
      const auth = req.headers.authorization || ''
      if (auth.startsWith('Basic ')) {
        const username = Buffer.from(auth.slice(6), 'base64').toString().split(':')[0]
        const userCfg  = cds.env.requires?.auth?.users?.[username]
        req.user = { id: username, roles: userCfg?.roles || [] }
      } else {
        req.user = { id: 'alice', roles: cds.env.requires?.auth?.users?.alice?.roles || ['Admin'] }
      }
      return next()
    }
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' })
  }

  const validateCsrfToken = (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token']
      if (!csrfToken || csrfToken.length < 4 || csrfToken.toLowerCase() === 'fetch' || csrfToken.toLowerCase() === 'unsafe') {
        return res.status(403).json({ error: 'CSRF token required', code: 'CSRF_MISSING' })
      }
    }
    next()
  }

  const requireScope = (...scopes) => (req, res, next) => {
    if (_isDummyAuth) return next()
    const userRoles = req.user?.roles || req.authInfo?.getGrantedScopes?.() || []
    const hasScope = scopes.some(s => userRoles.includes(s))
    if (!hasScope) return res.status(403).json({ error: 'Insufficient scope', code: 'FORBIDDEN', required: scopes })
    next()
  }

  return { requiresAuthentication, validateCsrfToken, requireScope }
}
