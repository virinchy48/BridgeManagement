'use strict'

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function getBridgeIdFromCapacityRequest(req) {
  const data = req?.data || {}
  const params = Array.isArray(req?.params) ? req.params : []
  const parent = params.find(param => param && firstDefined(param.ID, param.bridge_ID, param.bridge?.ID) !== undefined)

  return firstDefined(
    data.bridge_ID,
    data.bridge?.ID,
    data.bridge?.ID_ID,
    parent?.bridge_ID,
    parent?.bridge?.ID,
    parent?.ID
  )
}

function getCapacityIdFromRequest(req) {
  const data = req?.data || {}
  const params = Array.isArray(req?.params) ? req.params : []
  const child = [...params].reverse().find(param => param?.ID)

  return firstDefined(data.ID, child?.ID)
}

function rejectSecondCapacity(req) {
  req.error({
    code: 'BRIDGE_CAPACITY_ALREADY_EXISTS',
    message: 'Only one capacity record can be created for a bridge. Open the existing capacity record to edit it.',
    target: 'bridge',
    status: 409
  })
}

module.exports = {
  getBridgeIdFromCapacityRequest,
  getCapacityIdFromRequest,
  rejectSecondCapacity
}
