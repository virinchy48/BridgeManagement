namespace nhvr;
using { cuid, managed } from '@sap/cds/common';
using { nhvr.Bridge, nhvr.Route } from './core';

entity Restriction : cuid, managed {
    restrictionType     : String(30)    @mandatory;
    value               : Decimal(10,3) @mandatory;
    unit                : String(20)    @mandatory;
    bridge              : Association to Bridge;
    route               : Association to Route;
    validFromDate       : Date;
    validToDate         : Date;
    dayOfWeek           : String(50);
    direction           : String(20);
    status              : String(20) default 'ACTIVE';
    permitRequired      : Boolean default false;
    nhvrPermitClass     : String(50);
    isTemporary         : Boolean default false;
    temporaryFromDate   : Date;
    temporaryToDate     : Date;
    temporaryReason     : String(500);
    temporaryApprovedBy : String(200);
    disabledAt          : DateTime;
    disabledBy          : String(100);
    disableReason       : String(500);
    notes               : String(1000);
    gazetteRef          : String(100);
    enforcementAuthority: String(100);
    signageRequired     : Boolean default false;
    directionApplied    : String(20) default 'BOTH';
    approvedBy          : String(200);
    approvalDate        : Date;
    reviewDueDate       : Date;
    vehicleClassLabel   : String(100);
    bridgeName          : String(200);
    version             : Integer default 1;
    isActive            : Boolean default true;
    isDeleted           : Boolean default false;
    changeHistory       : Association to many RestrictionChangeLog on changeHistory.restriction = $self;
}

annotate Restriction with @(cds.persistence.indexes: [
    { name: 'idx_restriction_bridge', columns: ['bridge_ID'] },
    { name: 'idx_restriction_status', columns: ['status'] },
    { name: 'idx_restriction_type',   columns: ['restrictionType'] }
]);

entity RestrictionChangeLog : cuid {
    restriction : Association to Restriction @mandatory;
    changedAt   : DateTime @cds.on.insert: $now;
    changedBy   : String(100);
    changeType  : String(50);
    oldStatus   : String(20);
    newStatus   : String(20);
    reason      : String(500);
    notes       : String(1000);
}

extend Bridge with {
    restrictions : Association to many Restriction on restrictions.bridge = $self;
}
