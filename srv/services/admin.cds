using nhvr from '../../db/schema';
using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [{ grant: '*', to: 'admin' }]
    entity Lookups as projection on nhvr.Lookup;

    @restrict: [{ grant: '*', to: 'admin' }]
    entity AttributeDefinitions as projection on nhvr.AttributeDefinition {
        *, validValues: redirected to AttributeValidValues
    };

    @cds.redirection.target: true
    @restrict: [{ grant: '*', to: 'admin' }]
    entity AttributeValidValues as projection on nhvr.AttributeValidValue;

    @restrict: [{ grant: '*', to: 'admin' }]
    entity RoleConfigs as projection on nhvr.RoleConfig;

    @readonly
    @restrict: [{ grant: ['READ'], to: ['admin','manage'] }]
    entity AuditLogs as projection on nhvr.AuditLog;

    // Read-only BNAC mapping — keyed by bridgeId String, navigated from Bridges.bnacMapping
    @readonly
    @restrict: [{ grant: ['READ'], to: ['view','manage','admin'] }]
    entity BnacObjectIdMaps as projection on bridge.management.BnacObjectIdMap;

    @requires: ['admin']
    action saveRoleConfig(configs: array of {
        role: String; featureKey: String; featureType: String;
        label: String; visible: Boolean; editable: Boolean; featureEnabled: Boolean
    }) returns { saved: Integer };
}
