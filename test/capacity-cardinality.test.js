'use strict'

const {
  getBridgeIdFromCapacityRequest,
  getCapacityIdFromRequest,
  rejectSecondCapacity
} = require('../srv/capacity-cardinality')

describe('capacity cardinality helpers', () => {
  test('extracts bridge ID from direct capacity create payload', () => {
    const req = { data: { bridge_ID: 42 } }
    expect(getBridgeIdFromCapacityRequest(req)).toBe(42)
  })

  test('extracts bridge ID from nested Bridge navigation params', () => {
    const req = {
      data: { capacityType: 'AS 5100.7' },
      params: [{ ID: 42, IsActiveEntity: false }]
    }
    expect(getBridgeIdFromCapacityRequest(req)).toBe(42)
  })

  test('extracts current capacity ID from payload or child params', () => {
    expect(getCapacityIdFromRequest({ data: { ID: 'cap-1' } })).toBe('cap-1')
    expect(getCapacityIdFromRequest({ params: [{ ID: 42 }, { ID: 'cap-2' }] })).toBe('cap-2')
  })

  test('rejects second capacity with a conflict status and actionable message', () => {
    const error = jest.fn()
    rejectSecondCapacity({ error })

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      code: 'BRIDGE_CAPACITY_ALREADY_EXISTS',
      status: 409,
      target: 'bridge'
    }))
    expect(error.mock.calls[0][0].message).toContain('Only one capacity record')
  })
})
