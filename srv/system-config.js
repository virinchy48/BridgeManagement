const cds = require('@sap/cds')
const { SELECT } = cds.ql

const _cache = new Map()
const CACHE_TTL_MS = 60_000

async function getConfig(key) {
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.value
  try {
    const db = await cds.connect.to('db')
    const row = await db.run(SELECT.one.from('bridge.management.SystemConfig').where({ configKey: key }))
    const val = row?.value ?? row?.defaultValue ?? null
    _cache.set(key, { value: val, ts: Date.now() })
    return val
  } catch { return null }
}

function getConfigInt(key, fallback = 0) {
  return getConfig(key).then(v => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n })
}

function getConfigBool(key, fallback = false) {
  return getConfig(key).then(v => v === 'true' || v === '1' || v === 'yes')
}

function invalidateCache(key) { _cache.delete(key) }

module.exports = { getConfig, getConfigInt, getConfigBool, invalidateCache }
