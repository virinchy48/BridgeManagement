/**
 * UAT Test Suite — Configurable Attributes
 * Covers: OData admin CRUD + REST attributes API (all endpoints)
 *
 * Run: node test/uat-attributes.js
 * Requires server running on http://localhost:8009
 */

'use strict'

const http = require('http')

const BASE      = 'http://localhost:8009'
const ODATA     = BASE + '/odata/v4/admin'
const ATTR_API  = BASE + '/attributes/api'

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      port:     u.port || 8009,
      path:     u.pathname + u.search,
      method,
      headers:  { 'Accept': 'application/json' }
    }
    const payload = body ? JSON.stringify(body) : null
    if (payload) {
      opts.headers['Content-Type']   = 'application/json'
      opts.headers['Content-Length'] = Buffer.byteLength(payload)
    }
    const req = http.request(opts, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString()
        let json
        try { json = JSON.parse(raw) } catch { json = null }
        resolve({ status: res.statusCode, headers: res.headers, json, raw })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

const get    = (url)       => request('GET',    url)
const post   = (url, body) => request('POST',   url, body)
const patch  = (url, body) => request('PATCH',  url, body)
const del    = (url)       => request('DELETE', url)

// ── Reporter ─────────────────────────────────────────────────────────────────

let passed = 0, failed = 0
const failures = []

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓  ${name}`)
    passed++
  } else {
    console.log(`  ✗  ${name}`)
    if (detail) console.log(`       ${detail}`)
    failed++
    failures.push({ name, detail })
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

// ── State shared between tests ────────────────────────────────────────────────

let bridgeGroupId, restrictionGroupId
let textAttrId, intAttrId, decAttrId, dateAttrId, boolAttrId, ssAttrId, msAttrId
let allowedVal1Id, allowedVal2Id
let bridgeConfigId, ssConfigId
let testBridgeId, testRestrictionId

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testServerHealth() {
  section('T01 — Server health')
  try {
    const r = await get(`${ODATA}/AttributeGroups?$top=1`)
    assert('Server is up on :8009', r.status < 500, `status=${r.status}`)
    assert('AttributeGroups entity accessible', r.status === 200, `status=${r.status}`)
  } catch (e) {
    assert('Server is up on :8009', false, e.message)
  }
}

async function testODataGroupCRUD() {
  section('T02 — OData: AttributeGroups CRUD')

  // Create bridge group
  let r = await post(`${ODATA}/AttributeGroups`, {
    objectType: 'bridge', name: 'UAT Hydraulic Assessment',
    internalKey: 'uat_hydraulic', displayOrder: 99, status: 'Active'
  })
  assert('POST bridge group → 201', r.status === 201, `status=${r.status} body=${r.raw.slice(0,200)}`)
  bridgeGroupId = r.json?.ID
  assert('Bridge group ID returned', !!bridgeGroupId, `ID=${bridgeGroupId}`)

  // Create restriction group
  r = await post(`${ODATA}/AttributeGroups`, {
    objectType: 'restriction', name: 'UAT Load Config',
    internalKey: 'uat_load_config', displayOrder: 99, status: 'Active'
  })
  assert('POST restriction group → 201', r.status === 201, `status=${r.status}`)
  restrictionGroupId = r.json?.ID
  assert('Restriction group ID returned', !!restrictionGroupId)

  // Read back
  r = await get(`${ODATA}/AttributeGroups?$filter=objectType eq 'bridge' and internalKey eq 'uat_hydraulic'`)
  assert('GET bridge groups list includes new group', r.json?.value?.some(g => g.ID === bridgeGroupId))

  // Patch
  r = await patch(`${ODATA}/AttributeGroups('${bridgeGroupId}')`, { displayOrder: 50 })
  assert('PATCH bridge group → 200', r.status === 200, `status=${r.status}`)

  // Verify patch
  r = await get(`${ODATA}/AttributeGroups('${bridgeGroupId}')`)
  assert('PATCH displayOrder persisted', r.json?.displayOrder === 50, `got=${r.json?.displayOrder}`)
}

async function testODataDefinitionCRUD() {
  section('T03 — OData: AttributeDefinitions CRUD (all 7 data types)')

  const defs = [
    { id: 'text',  body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Heritage Number', internalKey: 'uat_heritage_num', dataType: 'Text', displayOrder: 1, status: 'Active' } },
    { id: 'int',   body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Span Count',      internalKey: 'uat_span_count',   dataType: 'Integer', minValue: 1, maxValue: 50, displayOrder: 2, status: 'Active' } },
    { id: 'dec',   body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Freeboard m',     internalKey: 'uat_freeboard',    dataType: 'Decimal', minValue: 0, maxValue: 99.99, unit: 'm', displayOrder: 3, status: 'Active' } },
    { id: 'date',  body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Next Inspection', internalKey: 'uat_next_insp',    dataType: 'Date', displayOrder: 4, status: 'Active' } },
    { id: 'bool',  body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Coastal Env',     internalKey: 'uat_coastal',      dataType: 'Boolean', displayOrder: 5, status: 'Active' } },
    { id: 'ss',    body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Bridge Class',    internalKey: 'uat_bridge_class', dataType: 'SingleSelect', displayOrder: 6, status: 'Active' } },
    { id: 'ms',    body: { group_ID: bridgeGroupId, objectType: 'bridge', name: 'UAT Standards',       internalKey: 'uat_standards',    dataType: 'MultiSelect', displayOrder: 7, status: 'Active' } },
  ]

  const ids = {}
  for (const d of defs) {
    const r = await post(`${ODATA}/AttributeDefinitions`, d.body)
    assert(`POST ${d.id} attribute → 201`, r.status === 201, `status=${r.status} body=${r.raw.slice(0,200)}`)
    ids[d.id] = r.json?.ID
    assert(`${d.id} attribute ID returned`, !!ids[d.id])
  }

  textAttrId = ids.text; intAttrId  = ids.int;  decAttrId  = ids.dec
  dateAttrId = ids.date; boolAttrId = ids.bool; ssAttrId   = ids.ss; msAttrId = ids.ms

  // Patch name
  const r = await patch(`${ODATA}/AttributeDefinitions('${textAttrId}')`, { name: 'UAT Heritage Number (updated)' })
  assert('PATCH attribute name → 200', r.status === 200, `status=${r.status}`)
}

async function testODataAllowedValues() {
  section('T04 — OData: AttributeAllowedValues CRUD')

  // SingleSelect allowed values
  let r = await post(`${ODATA}/AttributeAllowedValues`, {
    attribute_ID: ssAttrId, value: 'T1', label: 'T1 — 44t GML', displayOrder: 1, status: 'Active'
  })
  assert('POST allowed value T1 → 201', r.status === 201, `status=${r.status}`)
  allowedVal1Id = r.json?.ID

  r = await post(`${ODATA}/AttributeAllowedValues`, {
    attribute_ID: ssAttrId, value: 'T2', label: 'T2 — 68t GML', displayOrder: 2, status: 'Active'
  })
  assert('POST allowed value T2 → 201', r.status === 201, `status=${r.status}`)
  allowedVal2Id = r.json?.ID

  // MultiSelect allowed values
  for (const [val, lbl, ord] of [['AS5100', 'AS 5100', 1], ['AS1418', 'AS 1418', 2], ['AUSTROADS', 'Austroads', 3]]) {
    r = await post(`${ODATA}/AttributeAllowedValues`, {
      attribute_ID: msAttrId, value: val, label: lbl, displayOrder: ord, status: 'Active'
    })
    assert(`POST MultiSelect allowed value ${val} → 201`, r.status === 201, `status=${r.status}`)
  }

  // Read back
  r = await get(`${ODATA}/AttributeAllowedValues?$filter=attribute_ID eq '${ssAttrId}'`)
  assert('GET allowed values lists T1 and T2', r.json?.value?.length === 2, `count=${r.json?.value?.length}`)
}

async function testODataObjectTypeConfig() {
  section('T05 — OData: AttributeObjectTypeConfig CRUD')

  // Enable all bridge attributes for object type "bridge"
  const attrIds = [textAttrId, intAttrId, decAttrId, dateAttrId, boolAttrId, ssAttrId, msAttrId]
  const labels  = ['text','int','dec','date','bool','ss','ms']
  const savedIds = []

  for (let i = 0; i < attrIds.length; i++) {
    const r = await post(`${ODATA}/AttributeObjectTypeConfig`, {
      attribute_ID: attrIds[i], objectType: 'bridge', enabled: true, required: false, displayOrder: i + 1
    })
    assert(`POST config for ${labels[i]} attr → 201`, r.status === 201, `status=${r.status} body=${r.raw.slice(0,200)}`)
    savedIds.push(r.json?.ID)
  }

  bridgeConfigId = savedIds[0]
  ssConfigId     = savedIds[5]

  // Patch required on int attr
  const r = await patch(`${ODATA}/AttributeObjectTypeConfig('${savedIds[1]}')`, { required: true })
  assert('PATCH config required → 200', r.status === 200, `status=${r.status}`)

  // Read back verify
  const check = await get(`${ODATA}/AttributeObjectTypeConfig('${savedIds[1]}')`)
  assert('PATCH required=true persisted', check.json?.required === true, `got=${check.json?.required}`)
}

async function resolveTestObjects() {
  section('T06 — Resolve test Bridge and Restriction IDs')

  // Get any bridge
  let r = await get(`${ODATA}/Bridges?$top=1&$select=ID,bridgeId`)
  testBridgeId = r.json?.value?.[0]?.ID
  const bridgeRef = r.json?.value?.[0]?.bridgeId
  assert('At least one Bridge record exists', !!testBridgeId, 'No bridges in DB — seed data required')
  if (testBridgeId) console.log(`       Using bridgeId=${bridgeRef} (ID=${testBridgeId})`)

  // Get any restriction
  r = await get(`${ODATA}/Restrictions?$top=1&$select=ID,restrictionRef`)
  testRestrictionId = r.json?.value?.[0]?.ID
  const restrictionRef = r.json?.value?.[0]?.restrictionRef
  assert('At least one Restriction record exists', !!testRestrictionId, 'No restrictions in DB — seed data required')
  if (testRestrictionId) console.log(`       Using restrictionRef=${restrictionRef} (ID=${testRestrictionId})`)
}

async function testAttrApiConfig() {
  section('T07 — REST /attributes/api/config')

  // Bridge config
  let r = await get(`${ATTR_API}/config?objectType=bridge`)
  assert('GET /config?objectType=bridge → 200', r.status === 200, `status=${r.status}`)
  assert('/config returns objectType field', r.json?.objectType === 'bridge')
  assert('/config returns groups array', Array.isArray(r.json?.groups))
  const uatGroup = r.json?.groups?.find(g => g.internalKey === 'uat_hydraulic')
  assert('/config includes UAT bridge group', !!uatGroup, `groups=${r.json?.groups?.map(g=>g.internalKey).join(',')}`)
  assert('UAT group has 7 attributes', uatGroup?.attributes?.length === 7, `count=${uatGroup?.attributes?.length}`)

  // Restriction config
  r = await get(`${ATTR_API}/config?objectType=restriction`)
  assert('GET /config?objectType=restriction → 200', r.status === 200, `status=${r.status}`)
  assert('/config restriction returns groups array', Array.isArray(r.json?.groups))

  // Missing objectType → 400
  r = await get(`${ATTR_API}/config`)
  assert('GET /config (no objectType) → 400', r.status === 400, `status=${r.status}`)
}

async function testAttrApiValues() {
  if (!testBridgeId) { console.log('\n  [SKIP] T08–T11 — no bridge ID'); return }

  section('T08 — REST /attributes/api/values — initial read (empty)')
  let r = await get(`${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('GET /values → 200', r.status === 200, `status=${r.status}`)
  assert('GET /values returns values object', typeof r.json?.values === 'object')

  section('T09 — REST /attributes/api/values — POST valid values')
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: {
      uat_heritage_num:  'NSW-HER-00142',
      uat_span_count:    3,
      uat_freeboard:     2.75,
      uat_next_insp:     '2026-09-15',
      uat_coastal:       true,
      uat_bridge_class:  'T1',
      uat_standards:     'AS5100,AUSTROADS'
    }
  })
  assert('POST valid values → 200', r.status === 200, `status=${r.status} body=${r.raw.slice(0,200)}`)
  assert('POST saved=7', r.json?.saved === 7, `saved=${r.json?.saved}`)

  section('T10 — REST /attributes/api/values — GET after save')
  r = await get(`${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('GET values after save → 200', r.status === 200)
  const v = r.json?.values || {}
  assert('Text value correct',         v.uat_heritage_num === 'NSW-HER-00142',   `got="${v.uat_heritage_num}"`)
  assert('Integer value correct',      v.uat_span_count === 3,                   `got=${v.uat_span_count}`)
  assert('Decimal value correct',      v.uat_freeboard === 2.75,                 `got=${v.uat_freeboard}`)
  assert('Date value correct',         v.uat_next_insp === '2026-09-15',         `got="${v.uat_next_insp}"`)
  assert('Boolean value correct',      v.uat_coastal === true,                   `got=${v.uat_coastal}`)
  assert('SingleSelect value correct', v.uat_bridge_class === 'T1',              `got="${v.uat_bridge_class}"`)
  assert('MultiSelect value correct',  v.uat_standards === 'AS5100,AUSTROADS',   `got="${v.uat_standards}"`)

  section('T11 — REST /attributes/api/values — update (produces history)')
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_span_count: 5, uat_bridge_class: 'T2' }
  })
  assert('POST update values → 200', r.status === 200, `status=${r.status}`)
  assert('POST update saved=2', r.json?.saved === 2, `saved=${r.json?.saved}`)

  r = await get(`${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('Integer updated to 5', r.json?.values?.uat_span_count === 5, `got=${r.json?.values?.uat_span_count}`)
  assert('SingleSelect updated to T2', r.json?.values?.uat_bridge_class === 'T2', `got=${r.json?.values?.uat_bridge_class}`)
}

async function testAttrApiHistory() {
  if (!testBridgeId) { console.log('\n  [SKIP] T12 — no bridge ID'); return }

  section('T12 — REST /attributes/api/history')

  let r = await get(`${ATTR_API}/history/bridge/${testBridgeId}/uat_span_count`)
  assert('GET /history → 200', r.status === 200, `status=${r.status}`)
  assert('/history returns array', Array.isArray(r.json?.history), `type=${typeof r.json?.history}`)
  assert('/history has ≥ 2 entries (create + update)', r.json?.history?.length >= 2, `count=${r.json?.history?.length}`)

  // Verify entry structure
  const latest = r.json?.history?.[0]
  assert('History entry has changedBy', !!latest?.changedBy, `changedBy=${latest?.changedBy}`)
  assert('History entry has changedAt', !!latest?.changedAt)
  assert('History entry has changeSource', !!latest?.changeSource, `changeSource=${latest?.changeSource}`)
  assert('Latest history newValueInteger=5', latest?.newValueInteger === 5, `got=${latest?.newValueInteger}`)

  const first = r.json?.history?.[r.json.history.length - 1]
  assert('Oldest history entry has no old value (initial create)', first?.oldValueInteger == null, `oldValue=${first?.oldValueInteger}`)
}

async function testAttrApiValidation() {
  if (!testBridgeId) { console.log('\n  [SKIP] T13 — no bridge ID'); return }

  section('T13 — REST /attributes/api/values — validation failures')

  // Wrong type: text where integer expected
  let r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_span_count: 'not-a-number' }
  })
  assert('Integer type violation → 422', r.status === 422, `status=${r.status}`)
  assert('422 errors array present', Array.isArray(r.json?.errors), `body=${r.raw.slice(0,200)}`)

  // Min/max violation: span count > 50
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_span_count: 999 }
  })
  assert('Max range violation → 422', r.status === 422, `status=${r.status}`)
  assert('Max error message mentions maximum', r.json?.errors?.[0]?.includes('maximum'), `err="${r.json?.errors?.[0]}"`)

  // Min violation
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_span_count: 0 }
  })
  assert('Min range violation → 422', r.status === 422, `status=${r.status}`)

  // Invalid SingleSelect value
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_bridge_class: 'T99' }
  })
  assert('Invalid SingleSelect value → 422', r.status === 422, `status=${r.status}`)
  assert('Allowed value error message', r.json?.errors?.[0]?.includes('not an allowed value'), `err="${r.json?.errors?.[0]}"`)

  // Invalid MultiSelect value (mix valid + invalid)
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_standards: 'AS5100,BOGUS' }
  })
  assert('Invalid MultiSelect member → 422', r.status === 422, `status=${r.status}`)

  // Invalid date format
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_next_insp: '15/09/2026' }
  })
  assert('Invalid date format → 422', r.status === 422, `status=${r.status}`)
  assert('Date format error message', r.json?.errors?.[0]?.includes('YYYY-MM-DD'), `err="${r.json?.errors?.[0]}"`)

  // Required field empty (uat_span_count is required)
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_span_count: '' }
  })
  assert('Required field empty → 422', r.status === 422, `status=${r.status}`)

  // Boolean coercions (should all pass)
  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_coastal: 'true' }
  })
  assert("Boolean string 'true' accepted → 200", r.status === 200, `status=${r.status}`)

  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_coastal: 'X' }
  })
  assert("Boolean 'X' accepted → 200", r.status === 200, `status=${r.status}`)

  r = await post(`${ATTR_API}/values/bridge/${testBridgeId}`, {
    values: { uat_coastal: 0 }
  })
  assert("Boolean 0 (false) accepted → 200", r.status === 200, `status=${r.status}`)
}

async function testAttrApiTemplate() {
  section('T14 — REST /attributes/api/template')

  // Bridge xlsx
  let r = await get(`${ATTR_API}/template?objectType=bridge`)
  assert('GET template bridge → 200', r.status === 200, `status=${r.status}`)
  assert('Template content-type is xlsx', r.headers['content-type']?.includes('spreadsheetml'), `ct=${r.headers['content-type']}`)
  assert('Template has bytes', r.raw.length > 500, `len=${r.raw.length}`)

  // Restriction xlsx
  r = await get(`${ATTR_API}/template?objectType=restriction`)
  assert('GET template restriction → 200', r.status === 200, `status=${r.status}`)

  // CSV format
  r = await get(`${ATTR_API}/template?objectType=bridge&format=csv`)
  assert('GET template bridge csv → 200', r.status === 200, `status=${r.status}`)
  assert('CSV content-type', r.headers['content-type']?.includes('text/csv'), `ct=${r.headers['content-type']}`)

  // Missing objectType → 400
  r = await get(`${ATTR_API}/template`)
  assert('GET template (no objectType) → 400', r.status === 400, `status=${r.status}`)
}

async function testAttrApiExport() {
  section('T15 — REST /attributes/api/export')

  let r = await get(`${ATTR_API}/export?objectType=bridge`)
  assert('GET export bridge → 200', r.status === 200, `status=${r.status}`)
  assert('Export content-type is xlsx', r.headers['content-type']?.includes('spreadsheetml'), `ct=${r.headers['content-type']}`)
  assert('Export has bytes', r.raw.length > 100, `len=${r.raw.length}`)

  r = await get(`${ATTR_API}/export?objectType=restriction`)
  assert('GET export restriction → 200', r.status === 200, `status=${r.status}`)

  r = await get(`${ATTR_API}/export?objectType=bridge&format=csv`)
  assert('GET export bridge csv → 200', r.status === 200, `status=${r.status}`)
  assert('Export CSV content-type', r.headers['content-type']?.includes('text/csv'), `ct=${r.headers['content-type']}`)

  r = await get(`${ATTR_API}/export`)
  assert('GET export (no objectType) → 400', r.status === 400, `status=${r.status}`)
}

async function testAttrApiRestrictionValues() {
  if (!testRestrictionId) { console.log('\n  [SKIP] T16 — no restriction ID'); return }

  // Enable restriction attribute first (restriction group has no attrs defined yet — skip deep test)
  section('T16 — REST /attributes/api/values — restriction object type')

  const r = await get(`${ATTR_API}/values/restriction/${testRestrictionId}`)
  assert('GET /values/restriction → 200', r.status === 200, `status=${r.status}`)
  assert('/values/restriction returns values object', typeof r.json?.values === 'object')
}

async function testODataReadonly() {
  section('T17 — OData: AttributeValues and AttributeValueHistory are read-only')

  // Should reject direct POST to AttributeValues
  const r1 = await post(`${ODATA}/AttributeValues`, {
    objectType: 'bridge', objectId: 'test', attributeKey: 'x', valueText: 'y'
  })
  assert('Direct POST to AttributeValues → 405 or 403', r1.status >= 400, `status=${r1.status}`)

  const r2 = await post(`${ODATA}/AttributeValueHistory`, { objectType: 'bridge' })
  assert('Direct POST to AttributeValueHistory → 405 or 403', r2.status >= 400, `status=${r2.status}`)
}

async function testODataStatusDisable() {
  section('T18 — Disable attribute and verify it disappears from /config')

  // Disable the text attribute
  let r = await patch(`${ODATA}/AttributeDefinitions('${textAttrId}')`, { status: 'Inactive' })
  assert('PATCH attr status=Inactive → 200', r.status === 200, `status=${r.status}`)

  // Config should no longer include it
  r = await get(`${ATTR_API}/config?objectType=bridge`)
  const uatGroup = r.json?.groups?.find(g => g.internalKey === 'uat_hydraulic')
  const textAttr = uatGroup?.attributes?.find(a => a.internalKey === 'uat_heritage_num')
  assert('Inactive attribute absent from /config', !textAttr, `found=${!!textAttr}`)
  assert('Other attributes still in /config', uatGroup?.attributes?.length === 6, `count=${uatGroup?.attributes?.length}`)

  // Re-activate
  r = await patch(`${ODATA}/AttributeDefinitions('${textAttrId}')`, { status: 'Active' })
  assert('Re-activate attribute → 200', r.status === 200, `status=${r.status}`)

  r = await get(`${ATTR_API}/config?objectType=bridge`)
  const uatGroupAfter = r.json?.groups?.find(g => g.internalKey === 'uat_hydraulic')
  assert('Re-activated attribute back in /config', uatGroupAfter?.attributes?.length === 7, `count=${uatGroupAfter?.attributes?.length}`)
}

async function testDeleteValues() {
  if (!testBridgeId) { console.log('\n  [SKIP] T19a — no bridge ID'); return }

  section('T19a — REST /attributes/api/values — DELETE (reset object values)')

  // Verify values exist first
  let r = await get(`${ATTR_API}/values/bridge/${testBridgeId}`)
  const countBefore = Object.keys(r.json?.values || {}).length
  assert('Bridge has attribute values before delete', countBefore > 0, `count=${countBefore}`)

  // Delete all values for the bridge
  r = await request('DELETE', `${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('DELETE /values/bridge/:id → 200', r.status === 200, `status=${r.status} body=${r.raw.slice(0,200)}`)
  assert('DELETE reports correct count', r.json?.deleted === countBefore, `deleted=${r.json?.deleted} expected=${countBefore}`)

  // Verify values are gone
  r = await get(`${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('GET /values after DELETE returns empty', Object.keys(r.json?.values || {}).length === 0, `count=${Object.keys(r.json?.values||{}).length}`)

  // DELETE on already-empty object → 200 deleted=0
  r = await request('DELETE', `${ATTR_API}/values/bridge/${testBridgeId}`)
  assert('DELETE on empty object → 200 deleted=0', r.status === 200 && r.json?.deleted === 0, `status=${r.status} deleted=${r.json?.deleted}`)

  // History records the deletion (old values recorded, no new values)
  r = await get(`${ATTR_API}/history/bridge/${testBridgeId}/uat_span_count`)
  const deletionEntry = r.json?.history?.find(h => h.newValueInteger == null && h.oldValueInteger != null)
  assert('History records value deletion (null new value)', !!deletionEntry, `history count=${r.json?.history?.length}`)
}

async function testCleanup() {
  section('T20 — Cleanup test data')

  // Delete allowed values (now safe — no values reference them)
  for (const id of [allowedVal1Id, allowedVal2Id].filter(Boolean)) {
    const r = await del(`${ODATA}/AttributeAllowedValues('${id}')`)
    assert(`DELETE allowed value ${id?.slice(0,8)} → 204`, r.status === 204 || r.status === 200, `status=${r.status}`)
  }

  // Delete attribute definitions (now safe — values were deleted in T19a)
  for (const [name, id] of [
    ['text',textAttrId],['int',intAttrId],['dec',decAttrId],
    ['date',dateAttrId],['bool',boolAttrId],['ss',ssAttrId],['ms',msAttrId]
  ]) {
    if (!id) continue
    const r = await del(`${ODATA}/AttributeDefinitions('${id}')`)
    assert(`DELETE ${name} attr → 204`, r.status === 204 || r.status === 200, `status=${r.status} body=${r.raw.slice(0,200)}`)
  }

  // Delete groups
  for (const [name, id] of [['bridge',bridgeGroupId],['restriction',restrictionGroupId]]) {
    if (!id) continue
    const r = await del(`${ODATA}/AttributeGroups('${id}')`)
    assert(`DELETE ${name} group → 204`, r.status === 204 || r.status === 200, `status=${r.status}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║   UAT Test Suite — Configurable Attributes                  ║')
  console.log('║   Server: http://localhost:8009                              ║')
  console.log(`║   Date:   ${new Date().toISOString()}                ║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')

  try {
    await testServerHealth()
    await testODataGroupCRUD()
    await testODataDefinitionCRUD()
    await testODataAllowedValues()
    await testODataObjectTypeConfig()
    await resolveTestObjects()
    await testAttrApiConfig()
    await testAttrApiValues()
    await testAttrApiHistory()
    await testAttrApiValidation()
    await testAttrApiTemplate()
    await testAttrApiExport()
    await testAttrApiRestrictionValues()
    await testODataReadonly()
    await testODataStatusDisable()
    await testDeleteValues()
    await testCleanup()
  } catch (e) {
    console.error('\nFATAL:', e.message)
    process.exitCode = 1
  }

  const total = passed + failed
  console.log('\n' + '═'.repeat(62))
  console.log(`  RESULTS: ${passed}/${total} passed   ${failed} failed`)
  console.log('═'.repeat(62))

  if (failures.length) {
    console.log('\nFAILED TESTS:')
    failures.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.name}`)
      if (f.detail) console.log(`     ${f.detail}`)
    })
    process.exitCode = 1
  } else {
    console.log('\n  All tests passed ✓')
  }
  console.log()
}

main()
