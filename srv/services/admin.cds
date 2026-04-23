using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [{ grant: '*', to: 'Admin' }]
    entity Lookups as projection on nhvr.Lookup;

    @restrict: [{ grant: '*', to: 'Admin' }]
    entity AttributeDefinitions as projection on nhvr.AttributeDefinition {
        *, validValues: redirected to AttributeValidValues
    };

    @cds.redirection.target: true
    @restrict: [{ grant: '*', to: 'Admin' }]
    entity AttributeValidValues as projection on nhvr.AttributeValidValue;

    @restrict: [{ grant: '*', to: 'Admin' }]
    entity RoleConfigs as projection on nhvr.RoleConfig;

    @readonly
    @restrict: [{ grant: ['READ'], to: ['Admin','BridgeManager'] }]
    entity AuditLogs as projection on nhvr.AuditLog;

    @requires: ['Admin']
    action saveRoleConfig(configs: array of {
        role: String; featureKey: String; featureType: String;
        label: String; visible: Boolean; editable: Boolean; featureEnabled: Boolean
    }) returns { saved: Integer };
}
