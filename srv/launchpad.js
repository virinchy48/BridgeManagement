'use strict'

function buildSandboxConfig (isAdmin) {
  const operationsTiles = [
    {
      id: 'Dashboard',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Dashboard', subtitle: 'Portfolio Insights', icon: 'sap-icon://home', targetURL: '#Dashboard-display' }
    },
    {
      id: 'Bridges',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Bridges', subtitle: 'Asset Registry', icon: 'sap-icon://functional-location', targetURL: '#Bridges-manage' }
    },
    {
      id: 'Restrictions',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Restrictions', subtitle: 'Active & Scheduled', icon: 'sap-icon://alert', targetURL: '#Restrictions-manage' }
    },
    {
      id: 'MapView',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Map View', subtitle: 'Geographic Explorer', icon: 'sap-icon://map-2', targetURL: '#Map-display' }
    }
  ]

  const adminGroupTiles = [
    {
      id: 'MassUpload',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Mass Upload', subtitle: 'CSV & Excel Import', icon: 'sap-icon://upload-to-cloud', targetURL: '#MassUpload-display' }
    },
    {
      id: 'MassEdit',
      tileType: 'sap.ushell.ui.tile.StaticTile',
      properties: { title: 'Mass Edit', subtitle: 'In-App Grid Editor', icon: 'sap-icon://edit', targetURL: '#MassEdit-manage' }
    }
  ]

  if (isAdmin) {
    adminGroupTiles.push(
      {
        id: 'BmsAdmin',
        tileType: 'sap.ushell.ui.tile.StaticTile',
        properties: { title: 'BMS Administration', subtitle: 'Audit, Config & User Access', icon: 'sap-icon://action-settings', targetURL: '#BmsAdmin-manage' }
      },
      {
        id: 'AttributesAdmin',
        tileType: 'sap.ushell.ui.tile.StaticTile',
        properties: { title: 'Attributes Admin', subtitle: 'Custom Field Config', icon: 'sap-icon://customize', targetURL: '#AttributesAdmin-manage' }
      }
    )
  }

  const inbounds = {
    'Dashboard-display': {
      semanticObject: 'Dashboard', action: 'display', title: 'Dashboard',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.dashboard', url: '/BridgeManagementdashboard' }
    },
    'Bridges-manage': {
      semanticObject: 'Bridges', action: 'manage', title: 'Bridges',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.adminbridges', url: '/BridgeManagementadminbridges' }
    },
    'Restrictions-manage': {
      semanticObject: 'Restrictions', action: 'manage', title: 'Restrictions',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.restrictions', url: '/BridgeManagementrestrictions' }
    },
    'Map-display': {
      semanticObject: 'Map', action: 'display', title: 'Map View',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.mapview', url: '/BridgeManagementmapview' }
    },
    'MassUpload-display': {
      semanticObject: 'MassUpload', action: 'display', title: 'Mass Upload',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.massupload', url: '/BridgeManagementmassupload' }
    },
    'MassEdit-manage': {
      semanticObject: 'MassEdit', action: 'manage', title: 'Mass Edit',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.massedit', url: '/BridgeManagementmassedit' }
    }
  }

  if (isAdmin) {
    inbounds['BmsAdmin-manage'] = {
      semanticObject: 'BmsAdmin', action: 'manage', title: 'BMS Administration',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.bmsadmin', url: '/BridgeManagementbmsadmin' }
    }
    inbounds['AttributesAdmin-manage'] = {
      semanticObject: 'AttributesAdmin', action: 'manage', title: 'Attributes Admin',
      signature: { parameters: {}, additionalParameters: 'allowed' },
      resolutionResult: { applicationType: 'SAPUI5', additionalInformation: 'SAPUI5.Component=BridgeManagement.attributesadmin', url: '/BridgeManagementattributesadmin' }
    }
  }

  return {
    services: {
      LaunchPage: {
        adapter: {
          config: {
            catalogs: [],
            groups: [
              {
                id: 'bms.group.operations',
                title: 'OPERATIONS',
                isPreset: true, isVisible: true, isGroupLocked: false,
                tiles: operationsTiles
              },
              {
                id: 'bms.group.admin',
                title: 'BMS ADMIN',
                isPreset: true, isVisible: true, isGroupLocked: false,
                tiles: adminGroupTiles
              }
            ]
          }
        }
      },
      NavTargetResolution: { config: { enableClientSideTargetResolution: true } },
      ClientSideTargetResolution: { adapter: { config: { inbounds } } }
    }
  }
}

module.exports = { buildSandboxConfig }
