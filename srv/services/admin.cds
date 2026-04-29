using nhvr from '../../db/schema';
using { bridge.management as bms } from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [{ grant: '*', to: 'admin' }]
    entity Lookups as projection on nhvr.Lookup;

    @restrict: [{ grant: '*', to: 'admin' }]
    entity AttributeDefinitions as projection on bms.AttributeDefinitions {
        *, allowedValues: redirected to AttributeAllowedValues
    };

    @cds.redirection.target: true
    @restrict: [{ grant: '*', to: 'admin' }]
    entity AttributeAllowedValues as projection on bms.AttributeAllowedValues;

    @restrict: [{ grant: '*', to: 'admin' }]
    entity RoleConfigs as projection on nhvr.RoleConfig;

    @readonly
    @restrict: [{ grant: ['READ'], to: ['manage','admin'] }]
    entity AuditLogs as projection on bms.ChangeLog {
        key ID,
        changedAt  as timestamp,
        changedBy  as userId,
        objectType as entity,
        objectId   as entityId,
        objectName as entityName,
        fieldName  as action,
        oldValue,
        newValue,
        changeSource,
        batchId
    };

    action saveRoleConfig(configs: array of {
        role: String; featureKey: String; featureType: String;
        label: String; visible: Boolean; editable: Boolean; featureEnabled: Boolean
    }) returns { saved: Integer };
}
