/**
 * Unit tests for operations-app URL construction and search filtering
 *
 * Tests: buildBridgesUrl (constructs bbox query string when viewport mode is
 *        active and zoom is sufficient) and filterBridgesBySearch (filters a
 *        bridge array by name or ID against a case-insensitive query string).
 *
 * No CDS runtime or DB is required.
 *
 * Run: npm test
 */
'use strict'

// ─── Inline pure functions (mirrored from the operations/map controller) ──────

function buildBridgesUrl(viewportMode, zoom, bounds) {
  let url = '/map/api/bridges'
  if (viewportMode && zoom >= 8 && bounds) {
    const bbox = [bounds.west, bounds.south, bounds.east, bounds.north]
      .map(v => v.toFixed(5)).join(',')
    url += '?bbox=' + bbox
  }
  return url
}

function filterBridgesBySearch(bridges, query) {
  if (!query) return bridges
  const q = query.toLowerCase()
  return bridges.filter(function (b) {
    return (b.bridgeName || '').toLowerCase().includes(q)
        || (b.bridgeId  || '').toLowerCase().includes(q)
  })
}

// ─── buildBridgesUrl ──────────────────────────────────────────────────────────

describe('buildBridgesUrl', () => {
  const bounds = { west: 150.5, south: -34.0, east: 151.5, north: -33.0 }

  test('returns plain URL when viewportMode is false', () => {
    expect(buildBridgesUrl(false, 12, bounds)).toBe('/map/api/bridges')
  })

  test('returns plain URL when viewportMode is true but zoom is below 8', () => {
    expect(buildBridgesUrl(true, 7, bounds)).toBe('/map/api/bridges')
    expect(buildBridgesUrl(true, 0, bounds)).toBe('/map/api/bridges')
  })

  test('returns plain URL when viewportMode is true, zoom >= 8 but bounds is null', () => {
    expect(buildBridgesUrl(true, 10, null)).toBe('/map/api/bridges')
  })

  test('appends bbox when viewportMode is true, zoom >= 8, and bounds provided', () => {
    const url = buildBridgesUrl(true, 8, bounds)
    expect(url).toMatch(/^\/map\/api\/bridges\?bbox=/)
    expect(url).toBe('/map/api/bridges?bbox=150.50000,-34.00000,151.50000,-33.00000')
  })

  test('bbox coordinates appear in west,south,east,north order', () => {
    const url = buildBridgesUrl(true, 12, bounds)
    const bbox = url.split('?bbox=')[1].split(',').map(Number)
    expect(bbox[0]).toBeCloseTo(bounds.west)
    expect(bbox[1]).toBeCloseTo(bounds.south)
    expect(bbox[2]).toBeCloseTo(bounds.east)
    expect(bbox[3]).toBeCloseTo(bounds.north)
  })

  test('zoom of exactly 8 triggers bbox mode', () => {
    const url = buildBridgesUrl(true, 8, bounds)
    expect(url).toContain('?bbox=')
  })
})

// ─── filterBridgesBySearch ────────────────────────────────────────────────────

describe('filterBridgesBySearch', () => {
  const bridges = [
    { bridgeId: 'BMS-001', bridgeName: 'Sydney Harbour Bridge' },
    { bridgeId: 'BMS-002', bridgeName: 'West Gate Bridge' },
    { bridgeId: 'BMS-003', bridgeName: 'Story Bridge' },
    { bridgeId: 'BMS-004', bridgeName: 'Gateway Bridge' }
  ]

  test('empty query returns all bridges', () => {
    expect(filterBridgesBySearch(bridges, '')).toHaveLength(4)
    expect(filterBridgesBySearch(bridges, null)).toHaveLength(4)
    expect(filterBridgesBySearch(bridges, undefined)).toHaveLength(4)
  })

  test('matches by bridge name (partial)', () => {
    const result = filterBridgesBySearch(bridges, 'harbour')
    expect(result).toHaveLength(1)
    expect(result[0].bridgeId).toBe('BMS-001')
  })

  test('matches by bridge ID', () => {
    const result = filterBridgesBySearch(bridges, 'BMS-003')
    expect(result).toHaveLength(1)
    expect(result[0].bridgeName).toBe('Story Bridge')
  })

  test('matching is case-insensitive', () => {
    expect(filterBridgesBySearch(bridges, 'SYDNEY')).toHaveLength(1)
    expect(filterBridgesBySearch(bridges, 'sydney')).toHaveLength(1)
    expect(filterBridgesBySearch(bridges, 'Sydney')).toHaveLength(1)
  })

  test('returns multiple matches when query fits more than one bridge', () => {
    const result = filterBridgesBySearch(bridges, 'bridge')
    expect(result.length).toBeGreaterThan(1)
    expect(result.every(b => b.bridgeName.toLowerCase().includes('bridge'))).toBe(true)
  })

  test('returns empty array when no bridge matches', () => {
    const result = filterBridgesBySearch(bridges, 'zzznomatch')
    expect(result).toHaveLength(0)
  })

  test('handles bridges with null/missing name or ID gracefully', () => {
    const sparse = [
      { bridgeId: null, bridgeName: null },
      { bridgeId: 'X-001', bridgeName: null },
      { bridgeId: null, bridgeName: 'Null Name Bridge' }
    ]
    expect(() => filterBridgesBySearch(sparse, 'x-001')).not.toThrow()
    expect(filterBridgesBySearch(sparse, 'x-001')).toHaveLength(1)
    expect(filterBridgesBySearch(sparse, 'null name')).toHaveLength(1)
  })
})
