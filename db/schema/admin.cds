namespace nhvr;
using { cuid, managed } from '@sap/cds/common';

entity Lookup : cuid, managed {
    category     : String(50)  @mandatory;
    code         : String(200) @mandatory;
    description  : String(300);
    displayOrder : Integer default 0;
    isActive     : Boolean default true;
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
