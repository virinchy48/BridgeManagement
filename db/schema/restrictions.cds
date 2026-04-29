namespace nhvr;
using { cuid, managed } from '@sap/cds/common';
using { nhvr.Bridge } from './core';

entity Restriction : cuid, managed {
    restrictionType     : String(30)    @mandatory;
    value               : Decimal(10,3) @mandatory;
    unit                : String(20)    @mandatory;
    bridge              : Association to Bridge;
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

    vehicleClassApplicable   : String(50);
    massLimitType            : String(20);
    grossMassLimit           : Decimal(8,2);
    axleMassLimit            : Decimal(8,2);
    tandemAxleLimit          : Decimal(8,2);
    triaxleLimit             : Decimal(8,2);
    dimensionLimitLength     : Decimal(8,2);
    dimensionLimitWidth      : Decimal(8,2);
    dimensionLimitHeight     : Decimal(8,2);
    speedLimitKmh            : Integer;
    pbsClassApplicable       : String(20);
    gazetteNumber            : String(30);
    gazettePublicationDate   : Date;
    gazetteExpiryDate        : Date;
    gazetteRenewalRef        : String(50);
    loadLimitOrderRef        : String(50);
    loadLimitOrderDate       : Date;
    loadLimitOrderExpiry     : Date;
    issuingAuthority         : String(100);
    nhvrPermitRequired       : Boolean default false;
    permitIssuingAuthority   : String(100);
    permitValidityPeriodDays : Integer;
    escortRequired           : Boolean default false;
    pilotVehicleCount        : Integer;
    triggerType              : String(30);
    seasonalStartMonth       : Integer;
    seasonalEndMonth         : Integer;
    floodLevelTriggerMahd    : Decimal(8,2);
    weatherConditionTrigger  : String(100);
}

annotate Restriction with @(cds.persistence.indexes: [
    { name: 'idx_restriction_bridge', columns: ['bridge_ID'] },
    { name: 'idx_restriction_status', columns: ['status'] },
    { name: 'idx_restriction_type',   columns: ['restrictionType'] }
]);

extend Bridge with {
    restrictions : Association to many Restriction on restrictions.bridge = $self;
}
