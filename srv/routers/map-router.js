const cds = require('@sap/cds')
const express = require('express')
const { SELECT } = cds.ql

function parseBbox(bbox) {
  if (!bbox) return null
  const parts = String(bbox).split(',').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  const [minLon, minLat, maxLon, maxLat] = parts
  if (minLon >= maxLon || minLat >= maxLat) return null
  return { minLon, minLat, maxLon, maxLat }
}

function isHanaDb() {
  const requires = cds.env.requires || {}
  return Object.values(requires).some(s => s && (s.kind === 'hana' || s.impl === '@cap-js/hana'))
    || process.env.NODE_ENV === 'production'
}

function zoomToCellSize(zoom) {
  if (zoom <= 4)  return 2.0
  if (zoom <= 5)  return 1.0
  if (zoom <= 6)  return 0.5
  if (zoom <= 7)  return 0.25
  if (zoom <= 8)  return 0.1
  return null
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const haversineTerm = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm))
}

function buildBridgesCsv(bridges, customAttributeColumns = [], customFieldValuesByObjectId = new Map()) {
  const BRIDGE_EXPORT_FIELDS = ['ID','bridgeId','bridgeName','state','latitude','longitude','postingStatus',
    'conditionRating','yearBuilt','structureType','route','region','clearanceHeight','spanLength',
    'assetOwner','scourRisk','nhvrAssessed','freightRoute','overMassRoute','hmlApproved','bDoubleApproved']
  const customFieldHeaders = customAttributeColumns.map(c => c.label)
  const header = [...BRIDGE_EXPORT_FIELDS, ...customFieldHeaders].join(',')
  const rows = bridges.map(bridge => {
    const bridgeCustomFields = customFieldValuesByObjectId.get(String(bridge.ID)) || new Map()
    const bridgeExportCells = BRIDGE_EXPORT_FIELDS.map(p => {
      const v = bridge[p]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s
    })
    const customFieldCells = customAttributeColumns.map(col => {
      const v = String(bridgeCustomFields.get(col.key) || '')
      return v.includes(',') || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v
    })
    return [...bridgeExportCells, ...customFieldCells].join(',')
  })
  return header + '\n' + rows.join('\n')
}

function buildRestrictionsCsv(restrictions, customAttributeColumns = [], customFieldValuesByObjectId = new Map()) {
  const RESTRICTION_EXPORT_FIELDS = ['ID','restrictionRef','bridgeRef','bridgeName','state','restrictionType',
    'restrictionCategory','restrictionValue','restrictionUnit','restrictionStatus',
    'grossMassLimit','axleMassLimit','heightLimit','widthLimit','lengthLimit','speedLimit',
    'permitRequired','escortRequired','effectiveFrom','effectiveTo','approvedBy','direction']
  const customFieldHeaders = customAttributeColumns.map(c => c.label)
  const header = [...RESTRICTION_EXPORT_FIELDS, ...customFieldHeaders].join(',')
  const rows = restrictions.map(restriction => {
    const restrictionCustomFields = customFieldValuesByObjectId.get(String(restriction.ID)) || new Map()
    const restrictionExportCells = RESTRICTION_EXPORT_FIELDS.map(p => {
      const v = restriction[p]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s
    })
    const customFieldCells = customAttributeColumns.map(col => {
      const v = String(restrictionCustomFields.get(col.key) || '')
      return v.includes(',') || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v
    })
    return [...restrictionExportCells, ...customFieldCells].join(',')
  })
  return header + '\n' + rows.join('\n')
}

async function _mapBridgeRows(bridges, db) {
  const bridgeIds = bridges.map(bridge => bridge.ID).filter(Boolean)
  let vehicleClassByRestriction = new Map()
  const restrictionsByBridgeId = new Map()

  if (bridgeIds.length) {
    const allRestrictions = await db.run(
      SELECT.from('bridge.management.Restrictions')
        .columns('ID', 'bridge_ID', 'active', 'name', 'restrictionType', 'restrictionValue',
          'restrictionUnit', 'restrictionStatus', 'remarks', 'appliesToVehicleClass')
        .where({ bridge_ID: { in: bridgeIds }, active: true })
    )

    vehicleClassByRestriction = new Map(
      allRestrictions.map(r => [r.ID, r.appliesToVehicleClass || null])
    )

    for (const restriction of allRestrictions) {
      if (!restriction.bridge_ID) continue
      if (!restrictionsByBridgeId.has(restriction.bridge_ID)) {
        restrictionsByBridgeId.set(restriction.bridge_ID, [])
      }
      restrictionsByBridgeId.get(restriction.bridge_ID).push({
        name: restriction.name || restriction.restrictionType || 'Restriction',
        restrictionType: restriction.restrictionType || null,
        restrictionValue: restriction.restrictionValue || null,
        restrictionUnit: restriction.restrictionUnit || null,
        restrictionStatus: restriction.restrictionStatus || null,
        remarks: restriction.remarks || null
      })
    }
  }

  return bridges
    .filter(bridge => Number.isFinite(Number(bridge.latitude)) && Number.isFinite(Number(bridge.longitude)))
    .map(bridge => ({
      ID: bridge.ID,
      bridgeId: bridge.bridgeId,
      bridgeName: bridge.bridgeName,
      state: bridge.state,
      latitude: Number(bridge.latitude),
      longitude: Number(bridge.longitude),
      postingStatus: bridge.postingStatus || null,
      conditionRating: bridge.conditionRating == null ? null : Number(bridge.conditionRating),
      yearBuilt: bridge.yearBuilt == null ? null : Number(bridge.yearBuilt),
      structureType: bridge.structureType || null,
      route: bridge.route || null,
      region: bridge.region || null,
      clearanceHeight: bridge.clearanceHeight == null ? null : Number(bridge.clearanceHeight),
      spanLength: bridge.spanLength == null ? null : Number(bridge.spanLength),
      lastInspectionDate: bridge.lastInspectionDate || null,
      nhvrAssessed: Boolean(bridge.nhvrAssessed),
      scourRisk: bridge.scourRisk || null,
      freightRoute: Boolean(bridge.freightRoute),
      overMassRoute: Boolean(bridge.overMassRoute),
      hmlApproved: Boolean(bridge.hmlApproved),
      bDoubleApproved: Boolean(bridge.bDoubleApproved),
      vehicleClass: vehicleClassByRestriction.get(bridge.restriction_ID) || null,
      restrictions: restrictionsByBridgeId.get(bridge.ID) || [],
      assetOwner: bridge.assetOwner || null,
      managingAuthority: bridge.managingAuthority || null,
      material: bridge.material || null,
      spanCount: bridge.spanCount || null,
      totalLength: bridge.totalLength ? Number(bridge.totalLength) : null,
      deckWidth: bridge.deckWidth ? Number(bridge.deckWidth) : null,
      averageDailyTraffic: bridge.averageDailyTraffic || null,
      loadRating: bridge.loadRating ? Number(bridge.loadRating) : null,
      importanceLevel: bridge.importanceLevel || null,
      geoJson: bridge.geoJson || null
    }))
}

async function loadMapBridges({ bbox } = {}) {
  const db = await cds.connect.to('db')
  const bboxParsed = parseBbox(bbox)

  let query = SELECT.from('bridge.management.Bridges').columns(
    'ID', 'bridgeId', 'bridgeName', 'state', 'latitude', 'longitude',
    'postingStatus', 'conditionRating', 'yearBuilt', 'structureType', 'route', 'region',
    'clearanceHeight', 'spanLength', 'lastInspectionDate', 'nhvrAssessed', 'scourRisk',
    'freightRoute', 'overMassRoute', 'hmlApproved', 'bDoubleApproved', 'restriction_ID',
    'assetOwner', 'managingAuthority', 'material', 'spanCount', 'totalLength', 'deckWidth',
    'averageDailyTraffic', 'loadRating', 'importanceLevel', 'scourDepthLastMeasured', 'geoJson'
  )

  if (bboxParsed) {
    const { minLat, maxLat, minLon, maxLon } = bboxParsed
    query = query
      .where('latitude >=', minLat)
      .and('latitude <=', maxLat)
      .and('longitude >=', minLon)
      .and('longitude <=', maxLon)
  }

  const bridges = await db.run(query)
  return _mapBridgeRows(bridges, db)
}

async function loadMapRestrictions({ bbox } = {}) {
  const db = await cds.connect.to('db')
  const bboxParsed = parseBbox(bbox)

  const restrictions = await db.run(
    SELECT.from('bridge.management.Restrictions')
      .columns('ID', 'restrictionRef', 'bridgeRef', 'bridge_ID', 'restrictionType',
        'restrictionValue', 'restrictionUnit', 'restrictionStatus', 'active',
        'restrictionCategory', 'grossMassLimit', 'axleMassLimit', 'heightLimit',
        'widthLimit', 'lengthLimit', 'speedLimit', 'permitRequired', 'escortRequired',
        'effectiveFrom', 'effectiveTo', 'approvedBy', 'direction', 'remarks')
      .where({ active: true })
  )

  if (!restrictions.length) return []

  const bridgeIds = [...new Set(restrictions.map(r => r.bridge_ID).filter(Boolean))]
  const bridges = bridgeIds.length ? await db.run(
    SELECT.from('bridge.management.Bridges')
      .columns('ID', 'latitude', 'longitude', 'bridgeId', 'bridgeName', 'state', 'postingStatus')
      .where({ ID: { in: bridgeIds } })
  ) : []

  const bridgeMap = new Map(bridges.map(b => [b.ID, b]))

  return restrictions
    .filter(r => {
      const bridge = bridgeMap.get(r.bridge_ID)
      if (!bridge) return false
      if (!Number.isFinite(Number(bridge.latitude)) || !Number.isFinite(Number(bridge.longitude))) return false
      if (bboxParsed) {
        const lat = Number(bridge.latitude), lon = Number(bridge.longitude)
        if (lat < bboxParsed.minLat || lat > bboxParsed.maxLat) return false
        if (lon < bboxParsed.minLon || lon > bboxParsed.maxLon) return false
      }
      return true
    })
    .map(r => {
      const bridge = bridgeMap.get(r.bridge_ID)
      return {
        ID: r.ID,
        restrictionRef: r.restrictionRef || '—',
        bridgeRef: r.bridgeRef || '—',
        bridge_ID: r.bridge_ID,
        bridgeId: bridge.bridgeId,
        bridgeName: bridge.bridgeName,
        state: bridge.state || null,
        bridgePostingStatus: bridge.postingStatus || null,
        latitude: Number(bridge.latitude),
        longitude: Number(bridge.longitude),
        restrictionType: r.restrictionType || null,
        restrictionCategory: r.restrictionCategory || null,
        restrictionValue: r.restrictionValue || null,
        restrictionUnit: r.restrictionUnit || null,
        restrictionStatus: r.restrictionStatus || null,
        grossMassLimit: r.grossMassLimit ? Number(r.grossMassLimit) : null,
        axleMassLimit: r.axleMassLimit ? Number(r.axleMassLimit) : null,
        heightLimit: r.heightLimit ? Number(r.heightLimit) : null,
        widthLimit: r.widthLimit ? Number(r.widthLimit) : null,
        lengthLimit: r.lengthLimit ? Number(r.lengthLimit) : null,
        speedLimit: r.speedLimit ? Number(r.speedLimit) : null,
        permitRequired: Boolean(r.permitRequired),
        escortRequired: Boolean(r.escortRequired),
        effectiveFrom: r.effectiveFrom || null,
        effectiveTo: r.effectiveTo || null,
        approvedBy: r.approvedBy || null,
        direction: r.direction || null,
        remarks: r.remarks || null
      }
    })
}

async function loadClusters({ bbox, zoom = 6 } = {}) {
  const db = await cds.connect.to('db')
  const bboxParsed = parseBbox(bbox)
  const cellSize = zoomToCellSize(Number(zoom))

  if (!cellSize) {
    const bridges = await loadMapBridges({ bbox })
    return {
      type: 'points',
      features: bridges.map(b => ({
        lat: b.latitude,
        lng: b.longitude,
        id: b.ID,
        bridgeId: b.bridgeId,
        bridgeName: b.bridgeName,
        postingStatus: b.postingStatus,
        conditionRating: b.conditionRating
      }))
    }
  }

  let query
  let queryParams = []
  if (bboxParsed) {
    const { minLat, maxLat, minLon, maxLon } = bboxParsed
    if (isHanaDb()) {
      query = `
        SELECT
          ROUND("LATITUDE" / ${cellSize}) * ${cellSize} AS "gridLat",
          ROUND("LONGITUDE" / ${cellSize}) * ${cellSize} AS "gridLon",
          COUNT(*) AS "cnt",
          AVG("CONDITIONRATING") AS "avgCondition",
          SUM(CASE WHEN "POSTINGSTATUS" = 'Closed' THEN 1 ELSE 0 END) AS "closedCount",
          SUM(CASE WHEN "POSTINGSTATUS" IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS "restrictedCount"
        FROM "BRIDGE_MANAGEMENT_BRIDGES"
        WHERE "LATITUDE" BETWEEN ? AND ?
          AND "LONGITUDE" BETWEEN ? AND ?
          AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        GROUP BY ROUND("LATITUDE" / ${cellSize}), ROUND("LONGITUDE" / ${cellSize})
      `
      queryParams = [minLat, maxLat, minLon, maxLon]
    } else {
      query = `
        SELECT
          ROUND(latitude / ${cellSize}) * ${cellSize} AS gridLat,
          ROUND(longitude / ${cellSize}) * ${cellSize} AS gridLon,
          COUNT(*) AS cnt,
          AVG(conditionRating) AS avgCondition,
          SUM(CASE WHEN postingStatus = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN postingStatus IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS restrictedCount
        FROM bridge_management_Bridges
        WHERE latitude BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?
          AND latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(latitude / ${cellSize}), ROUND(longitude / ${cellSize})
      `
      queryParams = [minLat, maxLat, minLon, maxLon]
    }
  } else {
    if (isHanaDb()) {
      query = `
        SELECT
          ROUND("LATITUDE" / ${cellSize}) * ${cellSize} AS "gridLat",
          ROUND("LONGITUDE" / ${cellSize}) * ${cellSize} AS "gridLon",
          COUNT(*) AS "cnt",
          AVG("CONDITIONRATING") AS "avgCondition",
          SUM(CASE WHEN "POSTINGSTATUS" = 'Closed' THEN 1 ELSE 0 END) AS "closedCount",
          SUM(CASE WHEN "POSTINGSTATUS" IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS "restrictedCount"
        FROM "BRIDGE_MANAGEMENT_BRIDGES"
        WHERE "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        GROUP BY ROUND("LATITUDE" / ${cellSize}), ROUND("LONGITUDE" / ${cellSize})
      `
    } else {
      query = `
        SELECT
          ROUND(latitude / ${cellSize}) * ${cellSize} AS gridLat,
          ROUND(longitude / ${cellSize}) * ${cellSize} AS gridLon,
          COUNT(*) AS cnt,
          AVG(conditionRating) AS avgCondition,
          SUM(CASE WHEN postingStatus = 'Closed' THEN 1 ELSE 0 END) AS closedCount,
          SUM(CASE WHEN postingStatus IN ('Restricted','Under Review') THEN 1 ELSE 0 END) AS restrictedCount
        FROM bridge_management_Bridges
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY ROUND(latitude / ${cellSize}), ROUND(longitude / ${cellSize})
      `
    }
  }

  const rows = await db.run(query, queryParams)
  return {
    type: 'clusters',
    cellSize,
    features: (rows || []).map(row => {
      const lat = Number(row.gridLat || row['gridLat'])
      const lng = Number(row.gridLon || row['gridLon'])
      const cnt = Number(row.cnt || row['cnt'] || 0)
      const avg = row.avgCondition || row['avgCondition']
      const closed = Number(row.closedCount || row['closedCount'] || 0)
      const restricted = Number(row.restrictedCount || row['restrictedCount'] || 0)
      return {
        lat,
        lng,
        count: cnt,
        avgCondition: avg != null ? Math.round(Number(avg) * 10) / 10 : null,
        closedCount: closed,
        restrictedCount: restricted
      }
    }).filter(f => Number.isFinite(f.lat) && Number.isFinite(f.lng))
  }
}

async function loadProximityBridges({ lat, lng, radiusKm = 10 } = {}) {
  const db = await cds.connect.to('db')
  const latN = Number(lat), lngN = Number(lng), radN = Number(radiusKm)

  if (!Number.isFinite(latN) || !Number.isFinite(lngN) || radN <= 0) {
    throw new Error('lat, lng and radius (km) are required')
  }

  const latDelta = radN / 111
  const lngDelta = radN / (111 * Math.cos(latN * Math.PI / 180))
  const minLat = latN - latDelta, maxLat = latN + latDelta
  const minLon = lngN - lngDelta, maxLon = lngN + lngDelta

  let bridges
  if (isHanaDb()) {
    bridges = await db.run(`
      SELECT "ID","bridgeId","bridgeName","state","latitude","longitude",
             "postingStatus","conditionRating","structureType","route","region",
             "clearanceHeight","spanLength","nhvrAssessed","scourRisk",
             "geoLocation".ST_Distance(NEW ST_Point(?, ?, 4326), 'meter') / 1000 AS "distanceKm"
      FROM "BRIDGE_MANAGEMENT_BRIDGES"
      WHERE "LATITUDE" BETWEEN ? AND ?
        AND "LONGITUDE" BETWEEN ? AND ?
        AND "LATITUDE" IS NOT NULL AND "LONGITUDE" IS NOT NULL
        AND "geoLocation".ST_Distance(NEW ST_Point(?, ?, 4326), 'meter') / 1000 <= ?
      ORDER BY "distanceKm"
    `, [lngN, latN, minLat, maxLat, minLon, maxLon, lngN, latN, radN])
  } else {
    const candidateQuery = SELECT.from('bridge.management.Bridges')
      .columns('ID', 'bridgeId', 'bridgeName', 'state', 'latitude', 'longitude',
        'postingStatus', 'conditionRating', 'structureType', 'route', 'region',
        'clearanceHeight', 'spanLength', 'nhvrAssessed', 'scourRisk')
      .where('latitude >=', minLat).and('latitude <=', maxLat)
      .and('longitude >=', minLon).and('longitude <=', maxLon)
    const candidates = await db.run(candidateQuery)
    bridges = candidates
      .map(b => ({
        ...b,
        distanceKm: haversineDistanceKm(latN, lngN, Number(b.latitude), Number(b.longitude))
      }))
      .filter(b => b.distanceKm <= radN)
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }

  return (bridges || []).map(b => ({
    ID: b.ID,
    bridgeId: b.bridgeId || '—',
    bridgeName: b.bridgeName || 'Bridge',
    state: b.state || null,
    latitude: Number(b.latitude),
    longitude: Number(b.longitude),
    postingStatus: b.postingStatus || null,
    conditionRating: b.conditionRating != null ? Number(b.conditionRating) : null,
    structureType: b.structureType || null,
    route: b.route || null,
    region: b.region || null,
    clearanceHeight: b.clearanceHeight != null ? Number(b.clearanceHeight) : null,
    spanLength: b.spanLength != null ? Number(b.spanLength) : null,
    nhvrAssessed: Boolean(b.nhvrAssessed),
    scourRisk: b.scourRisk || null,
    distanceKm: Math.round(Number(b.distanceKm || 0) * 100) / 100
  }))
}

const router = express.Router()

router.get('/bridges', async (req, res) => {
  try {
    const { bbox } = req.query
    if (bbox && !parseBbox(bbox)) {
      return res.status(400).json({ error: { message: 'Invalid bbox parameter. Expected: minLon,minLat,maxLon,maxLat (numeric, minLon<maxLon, minLat<maxLat)' } })
    }
    const bridges = await loadMapBridges({ bbox })
    res.json({ bridges })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load bridge map data' } })
  }
})

router.get('/restrictions', async (req, res) => {
  try {
    const { bbox } = req.query
    if (bbox && !parseBbox(bbox)) {
      return res.status(400).json({ error: { message: 'Invalid bbox parameter. Expected: minLon,minLat,maxLon,maxLat (numeric, minLon<maxLon, minLat<maxLat)' } })
    }
    const restrictions = await loadMapRestrictions({ bbox })
    res.json({ restrictions })
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load restriction map data' } })
  }
})

router.get('/export', async (req, res) => {
  try {
    const format = (req.query.format || 'geojson').toLowerCase()
    const layer = (req.query.layer || 'bridges').toLowerCase()
    const bbox = req.query.bbox

    async function loadAttrData(objectType, objectIds) {
      try {
        const db2 = await cds.connect.to('db')
        const configs = await db2.run(
          SELECT.from('bridge.management.AttributeObjectTypeConfig').where({ objectType, enabled: true })
        )
        if (!configs.length) return { attrCols: [], attrValues: new Map() }
        const defIds = configs.map(c => c.attribute_ID)
        const defs = await db2.run(
          SELECT.from('bridge.management.AttributeDefinitions').where({ status: 'Active' })
        )
        const activeDefs = defs.filter(d => defIds.includes(d.ID))
        const attrCols = activeDefs.map(d => ({ label: `${d.name} (${d.internalKey})`, key: d.internalKey }))
        const allVals = objectIds.length
          ? await db2.run(SELECT.from('bridge.management.AttributeValues').where({ objectType }))
          : []
        const attrValues = new Map()
        for (const f of allVals) {
          if (!attrValues.has(f.objectId)) attrValues.set(f.objectId, new Map())
          attrValues.get(f.objectId).set(f.attributeKey, f.valueText ?? f.valueInteger ?? f.valueDecimal ?? f.valueDate ?? f.valueBoolean ?? '')
        }
        return { attrCols, attrValues }
      } catch (_) { return { attrCols: [], attrValues: new Map() } }
    }

    if (layer === 'restrictions') {
      const restrictions = await loadMapRestrictions({ bbox })
      const { attrCols, attrValues } = await loadAttrData('restriction', restrictions.map(r => String(r.ID)))
      if (format === 'csv') {
        const csv = buildRestrictionsCsv(restrictions, attrCols, attrValues)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="bridge-restrictions.csv"')
        return res.send(csv)
      }
      const geojson = {
        type: 'FeatureCollection',
        features: restrictions.map(r => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
          properties: { ...r, latitude: undefined, longitude: undefined }
        }))
      }
      res.setHeader('Content-Type', 'application/geo+json')
      res.setHeader('Content-Disposition', 'attachment; filename="bridge-restrictions.geojson"')
      return res.json(geojson)
    }

    const bridges = await loadMapBridges({ bbox })
    const { attrCols, attrValues } = await loadAttrData('bridge', bridges.map(b => String(b.ID)))
    if (format === 'csv') {
      const csv = buildBridgesCsv(bridges, attrCols, attrValues)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="bridges.csv"')
      return res.send(csv)
    }
    const geojson = {
      type: 'FeatureCollection',
      features: bridges.map(b => ({
        type: 'Feature',
        geometry: (() => { try { return b.geoJson ? JSON.parse(b.geoJson) : null } catch (_) { return null } })() || { type: 'Point', coordinates: [b.longitude, b.latitude] },
        properties: { ...b, geoJson: undefined, latitude: undefined, longitude: undefined }
      }))
    }
    res.setHeader('Content-Type', 'application/geo+json')
    res.setHeader('Content-Disposition', 'attachment; filename="bridges.geojson"')
    res.json(geojson)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Export failed' } })
  }
})

router.get('/clusters', async (req, res) => {
  try {
    const result = await loadClusters({ bbox: req.query.bbox, zoom: req.query.zoom })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: { message: error.message || 'Failed to load cluster data' } })
  }
})

router.get('/proximity', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query
    const latNum = Number(lat)
    const lngNum = Number(lng)
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ error: { message: 'lat and lng are required and must be valid numbers' } })
    }
    const radiusKm = Math.max(0.1, Math.min(500, Number(radius || 10)))
    if (!Number.isFinite(radiusKm)) return res.status(400).json({ error: { message: 'Invalid radius' } })
    const bridges = await loadProximityBridges({ lat: latNum, lng: lngNum, radiusKm })
    res.json({ bridges, searchCenter: { lat: latNum, lng: lngNum }, radiusKm })
  } catch (error) {
    res.status(error.message.includes('required') ? 400 : 500)
       .json({ error: { message: error.message || 'Proximity search failed' } })
  }
})

router.get('/config', async (_req, res) => {
  try {
    const db = await cds.connect.to('db')
    let cfg = await db.run(SELECT.one.from('bridge_management_GISConfig').where({ id: 'default' }))
    if (!cfg) {
      cfg = {
        id: 'default', defaultBasemap: 'osm', hereApiKey: '',
        showStateBoundaries: false, showLgaBoundaries: false,
        enableScaleBar: true, enableGps: true,
        enableMinimap: true, enableHeatmap: false, enableTimeSlider: false,
        enableStatsPanel: true, enableProximity: true, enableMgaCoords: true,
        enableStreetView: true, enableConditionAlerts: true, enableCustomWms: false,
        enableServerClustering: false, conditionAlertThreshold: 3,
        proximityDefaultRadiusKm: 10, heatmapRadius: 20, heatmapBlur: 15,
        viewportLoadingZoom: 8, customWmsLayers: null
      }
    }
    if (cfg.customWmsLayers) {
      try { cfg.customWmsLayers = JSON.parse(cfg.customWmsLayers) } catch (_) { cfg.customWmsLayers = [] }
    } else {
      cfg.customWmsLayers = []
    }
    delete cfg.hereApiKey
    res.json(cfg)
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'Failed to load GIS config' } })
  }
})

module.exports = router
