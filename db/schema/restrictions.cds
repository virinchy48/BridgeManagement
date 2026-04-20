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

    // ── NHVR HVNL 2013 Vehicle Classification ─────────────────────────────
    vehicleClassApplicable   : String(50);   // All Vehicles | Heavy Vehicles | PBS Vehicles | Oversize/Overmass | B-Double | Road Train
    massLimitType            : String(20);   // GML (Gross Mass Limit) | CML (Concessional) | HML (Heavy Modular)
    grossMassLimit           : Decimal(8,2); // Maximum GVM in tonnes (e.g. 42.5)
    axleMassLimit            : Decimal(8,2); // Maximum per-axle mass in tonnes (e.g. 8.5)
    tandemAxleLimit          : Decimal(8,2); // Group axle limit in tonnes
    triaxleLimit             : Decimal(8,2); // Tri-axle group limit in tonnes

    // ── Dimension Limits ──────────────────────────────────────────────────
    dimensionLimitLength     : Decimal(8,2); // Max vehicle length (metres)
    dimensionLimitWidth      : Decimal(8,2); // Max vehicle width (metres)
    dimensionLimitHeight     : Decimal(8,2); // Max vehicle height (metres)

    // ── Speed Restriction ─────────────────────────────────────────────────
    speedLimitKmh            : Integer;      // Speed limit on/over bridge (km/h)

    // ── PBS (Performance Based Standards) ─────────────────────────────────
    pbsClassApplicable       : String(20);   // PBS class this restriction applies to: Level 1-5 or General Access

    // ── NSW Gazette Authority ─────────────────────────────────────────────
    gazetteNumber            : String(30);   // NSW Gazette order number
    gazettePublicationDate   : Date;         // Date gazette was published
    gazetteExpiryDate        : Date;         // When gazette authority expires (trigger alerts!)
    gazetteRenewalRef        : String(50);   // Reference for renewal process

    // ── Load Limit Order (Roads Act 1993 NSW) ─────────────────────────────
    loadLimitOrderRef        : String(50);   // LLO reference number e.g. LLO-2024-001
    loadLimitOrderDate       : Date;         // When LLO was issued
    loadLimitOrderExpiry     : Date;         // When LLO expires
    issuingAuthority         : String(100);  // TfNSW | Local Council | NHVR

    // ── Permit Requirements (NHVR HVNL) ──────────────────────────────────
    nhvrPermitRequired       : Boolean default false; // True if NHVR permit mandatory
    permitIssuingAuthority   : String(100);  // NHVR | TfNSW | State Authority | Local Council
    permitValidityPeriodDays : Integer;      // Days permit remains valid
    escortRequired           : Boolean default false; // True if pilot/escort vehicle needed
    pilotVehicleCount        : Integer;      // Number of pilot vehicles required

    // ── Direction ────────────────────────────────────────────────────────
    directionAppliedNhvr     : String(30);   // Both Directions | Northbound Only | Southbound Only | Eastbound | Westbound

    // ── Seasonal/Conditional Restrictions ────────────────────────────────
    triggerType              : String(30);   // Permanent | Seasonal | Flood | Weather | Time-based
    seasonalStartMonth       : Integer;      // Month restriction starts (1-12)
    seasonalEndMonth         : Integer;      // Month restriction ends (1-12)
    floodLevelTriggerMahd    : Decimal(8,2); // Water level (mAHD) triggering closure
    weatherConditionTrigger  : String(100);  // e.g. "Wind > 60 km/h"

    // ── Compositions ─────────────────────────────────────────────────────
    changeLogs               : Composition of many RestrictionChangeLog on changeLogs.restriction = $self;
    postingSigns             : Composition of many PostingSigns on postingSigns.restriction = $self;
}

annotate Restriction with @(cds.persistence.indexes: [
    { name: 'idx_restriction_bridge', columns: ['bridge_ID'] },
    { name: 'idx_restriction_status', columns: ['status'] },
    { name: 'idx_restriction_type',   columns: ['restrictionType'] }
]);

// ── Immutable audit trail — NSW Roads Act requirement ─────────────────────
entity RestrictionChangeLog : cuid, managed {
    restriction  : Association to Restriction @mandatory;
    changeType   : String(30) not null;  // CREATED | MODIFIED | ENABLED | DISABLED | EXPIRED | ARCHIVED | GAZETTE_RENEWED
    oldStatus    : String(20);           // Status before change
    newStatus    : String(20);           // Status after change
    oldValues    : LargeString;          // JSON snapshot of key fields before change
    newValues    : LargeString;          // JSON of what changed
    reason       : String(500);          // Why the change was made (mandatory for DISABLED/ARCHIVED)
    changedBy    : String(100);          // User who made the change (from JWT, not header)
    changedAt    : Timestamp;            // Exact timestamp (UTC)
    ipAddress    : String(50);           // Client IP for audit
    notes        : String(1000);         // Additional notes (preserved from original schema)
}

// ── AS 1742.10 Sign Management ────────────────────────────────────────────
entity PostingSigns : cuid, managed {
    restriction        : Association to Restriction;
    signType           : String(50) not null;  // Restricted Height | Weight Limit | Speed Limit | Closure Notice | Permit Required | Custom
    as1742Reference    : String(30);           // AS 1742.10 section reference
    location           : String(300);          // "North approach 200m before bridge deck"
    locationDirection  : String(30);           // Northbound | Southbound | Both Approaches
    installationDate   : Date;
    lastInspectionDate : Date;
    nextInspectionDate : Date;                 // Annual inspection per AS 1742.10
    condition          : String(20);           // Good | Fair | Poor | Missing | Damaged
    reflectorCompliant : Boolean;              // Meets AS 1742 reflectance requirements
    signCount          : Integer default 1;
    photosReference    : String(500);          // References to photos in Object Store
    notes              : String(500);
}

extend Bridge with {
    restrictions : Association to many Restriction on restrictions.bridge = $self;
}
