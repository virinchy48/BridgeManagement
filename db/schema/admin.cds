namespace nhvr;
using { cuid, managed } from '@sap/cds/common';
using { nhvr.Bridge } from './core';

entity Lookup : cuid, managed {
    category     : String(50)  @mandatory;
    code         : String(200) @mandatory;
    description  : String(300);
    displayOrder : Integer default 0;
    isActive     : Boolean default true;
}

entity AttributeDefinition : cuid, managed {
    name            : String(100) @mandatory;
    label           : String(200) @mandatory;
    dataType        : String(20)  @mandatory;
    entityTarget    : String(50) default 'BRIDGE';
    isRequired      : Boolean default false;
    defaultValue    : String(500);
    displayOrder    : Integer default 0;
    isActive        : Boolean default true;
    filterEnabled   : Boolean default true;
    reportEnabled   : Boolean default true;
    massEditEnabled : Boolean default false;
    exportEnabled   : Boolean default true;
    validValues     : Composition of many AttributeValidValue on validValues.attribute = $self;
    bridgeAttributes: Association to many BridgeAttribute on bridgeAttributes.attribute = $self;
}

entity AttributeValidValue : cuid, managed {
    attribute    : Association to AttributeDefinition @mandatory;
    value        : String(200) @mandatory;
    label        : String(300);
    displayOrder : Integer default 0;
    isActive     : Boolean default true;
}

entity BridgeAttribute : cuid, managed {
    bridge    : Association to Bridge @mandatory;
    attribute : Association to AttributeDefinition @mandatory;
    value     : String(2000);
}

extend Bridge with {
    attributes : Association to many BridgeAttribute on attributes.bridge = $self;
}

entity RoleConfig : managed {
    key ID        : String(100) @mandatory;
    role          : String(50)  @mandatory;
    featureKey    : String(100) @mandatory;
    featureType   : String(20)  @mandatory;
    label         : String(200);
    visible       : Boolean default true;
    editable      : Boolean default true;
    featureEnabled: Boolean default true;
    sortOrder     : Integer default 0;
    fieldName     : String(100);
    fieldVisible  : Boolean default true;
    fieldEditable : Boolean default true;
    fieldRequired : Boolean default false;
}

entity UploadLog : cuid, managed {
    fileName     : String(255);
    uploadType   : String(50);
    totalRecords : Integer;
    successCount : Integer;
    failureCount : Integer;
    status       : String(20);
    errorDetails : LargeString;
}

entity AuditLog : cuid {
    timestamp  : DateTime @cds.on.insert: $now;
    userId     : String(100);
    userRole   : String(100);
    action     : String(20);
    entity     : String(100);
    entityId   : String(100);
    entityName : String(300);
    changes    : LargeString;
    description: String(500);
}

annotate AuditLog with @(cds.persistence.indexes: [
    { name: 'idx_auditlog_timestamp', columns: ['timestamp'] },
    { name: 'idx_auditlog_entity',    columns: ['entity', 'entityId'] },
    { name: 'idx_auditlog_userId',    columns: ['userId'] }
]);
