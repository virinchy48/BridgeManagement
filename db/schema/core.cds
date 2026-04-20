namespace nhvr;
using { cuid, managed } from '@sap/cds/common';

entity Route : cuid, managed {
    routeCode   : String(20)  @mandatory;
    description : String(200) @mandatory;
    region      : String(100);
    state       : String(50);
    isActive    : Boolean default true;
    bridges     : Association to many Bridge on bridges.route = $self;
}
annotate Route with { routeCode @assert.unique; };

entity Bridge : cuid, managed {
    bridgeId            : String(20)    @mandatory @assert.unique;
    name                : String(200)   @mandatory;
    region              : String(100);
    state               : String(50)    default 'NSW';
    lga                 : String(100);
    suburb              : String(100);
    route               : Association to Route;
    routeKm             : Decimal(8,3);
    latitude            : Decimal(11,8);
    longitude           : Decimal(11,8);
    assetClass          : String(30)    default 'BRIDGE';
    structureType       : String(100);
    material            : String(100);
    condition               : String(20)  default 'GOOD';
    conditionRating         : Integer;
    conditionScore          : Integer;
    postingStatus       : String(20)  default 'UNRESTRICTED';
    inspectionDate      : Date;
    nextInspectionDueDate: Date;
    inspectionFrequencyYrs: Integer;
    highPriorityAsset   : Boolean default false;
    overdueFlag         : Boolean default false;
    yearBuilt           : Integer;
    spanLengthM         : Decimal(8,2);
    totalLengthM        : Decimal(8,2);
    deckWidthM          : Decimal(6,2);
    widthM              : Decimal(6,2);
    clearanceHeightM    : Decimal(5,2);
    numberOfSpans       : Integer;
    numberOfLanes       : Integer;
    designLoad          : String(100);
    loadRating          : Decimal(8,3);
    scourRisk           : String(20);
    floodImpacted       : Boolean default false;
    nhvrRouteAssessed   : Boolean default false;
    freightRoute        : Boolean default false;
    overMassRoute       : Boolean default false;
    hmlApproved         : Boolean default false;
    bdoubleApproved     : Boolean default false;
    assetOwner          : String(100);
    maintenanceAuthority: String(100);
    gazetteRef          : String(100);
    nhvrRef             : String(100);
    aadtVehicles        : Integer;
    remarks             : LargeString;
    isActive            : Boolean default true;
    isDeleted           : Boolean default false;

    // ── TfNSW Condition Rating ──────────────────────────────────────────────────
    conditionRatingTfnsw    : Integer;              // TfNSW 1-5: 1=Good, 2=Fair, 3=Poor, 4=Very Poor, 5=Critical
    conditionRatingDate     : Date;                 // Date condition was assessed
    conditionRatingNotes    : String(500);          // Inspector notes on current condition
    conditionTrendCurrent   : String(20);           // IMPROVING | STABLE | DETERIORATING
    criticalDefectFlag      : Boolean default false; // Auto-set when conditionRatingTfnsw = 5

    // ── AS 5100.1 Structure Classification ────────────────────────────────────
    importanceLevel         : String(20);           // Critical | Essential | Important | Ordinary
    designLife              : Integer;              // Design life in years (50-100, AS 5100.1)
    yearRebuilt             : Integer;              // Year of major reconstruction (if applicable)

    // ── AS 5100.5 Material Properties ─────────────────────────────────────────
    concreteGrade           : String(10);           // C25 | C32 | C40 | C50 | C65 (MPa, AS 5100.5)
    concreteDurabilityClass : String(10);           // A0 | A1 | A2 | B1 | B2 (AS 5100.5 exposure severity)
    fatigueLoadSensitiveFlag: Boolean default false; // True for steel/composite bridges (AS 5100.3)

    // ── Inspection Scheduling ─────────────────────────────────────────────────
    lastInspectionDate      : Date;                 // Date of last recorded inspection
    lastInspectionType      : String(30);           // ROUTINE_VISUAL | PRINCIPAL | SPECIAL_SCOUR | UNDERWATER | LOAD_RATING
    nextInspectionDate      : Date;                 // Calculated: lastInspectionDate + inspectionFrequencyYears
    inspectionFrequencyYears: Integer default 2;    // Default 2yr (road), 5yr (rail) per TfNSW
    inspectionOverdueFlag   : Boolean default false @Core.Computed: true; // Auto-calculated: nextInspectionDate < today

    // ── NHVR HVNL Compliance ──────────────────────────────────────────────────
    pbsApprovalClass        : String(20);           // Not Assessed | General Access | Level 1-5
    pbsApprovalDate         : Date;                 // Date PBS assessment was performed
    pbsApprovalExpiry       : Date;                 // PBS approval expiry (alert 30/60/90 days before)
    hmlApprovalDate         : Date;
    hmlApprovalExpiry       : Date;                 // HML approval expiry
    bdoubleApprovalDate     : Date;
    networkClassification   : String(30);           // Notice | Permit | Conditional | HML (NHVR HVNL §38)

    // ── NSW Gazette Reference ──────────────────────────────────────────────────
    gazetteNumber           : String(30);           // NSW Gazette order number for restrictions
    gazetteEffectiveDate    : Date;                 // Date gazette order came into effect
    gazetteExpiryDate       : Date;                 // Date gazette order expires (alert 90/60/30 days before)
    gazetteLastReviewedDate : Date;                 // Date gazette was last reviewed by BMS admin
    gazetteExpiryUrgency    : String(10) @Core.Computed: true; // GREEN | AMBER | RED | EXPIRED

    // ── AS 5100.2 Design Loading ───────────────────────────────────────────────
    designLoadCode          : String(20);           // T44 | SM1600 | HLP400 | W80 | A160 | AS5100_GP | CooperE | UIC60
    aadt                    : Integer;              // Annual Average Daily Traffic (vehicles/day)
    aadtLastRecordedDate    : Date;
    heavyVehiclePercentage  : Decimal(5,2);         // % of traffic that is heavy vehicles

    // ── Austroads AP-G71 Scour Risk (5-point scale) ────────────────────────────
    scourRiskLevel          : String(20);           // VeryLow | Low | Medium | High | VeryHigh (AP-G71)
    scourRiskAssessmentDate : Date;
    scourDepthMeasured      : Decimal(8,2);         // Current scour depth (metres)
    scourDepthMeasuredDate  : Date;
    scourDepthCritical      : Decimal(8,2);         // Depth at which structural failure occurs
    scourCountermeasureType : String(50);           // None | Riprap | Sheet Pile | Caisson | Bed Grout | Combination
    scourCountermeasureCondition: String(20);       // Good | Fair | Poor | Failed

    // ── Flood Risk (NSW Flood Risk Manual) ────────────────────────────────────
    floodImmunityAri        : Integer;              // ARI years: 10 | 20 | 50 | 100 | 200 | 1000
    floodClosureLevel       : Decimal(8,2);         // Water level (mAHD) at which bridge closes

    // ── Seismic (AS 5100.1) ────────────────────────────────────────────────────
    seismicZone             : String(20);           // Zone 1 | Zone 2 | Zone 3 (AS 5100.1)

    // ── Rail-Specific (ARTC / AS 7613) — only when assetClass = 'Rail' ─────────
    railGauge               : String(20);           // Standard 1435mm | Narrow 1067mm | Dual | Broad 1600mm
    overheadClearanceM      : Decimal(5,2);         // Clearance above rail in metres (ARTC min 5.9m non-electrified)
    overheadClearanceElectrified: Boolean default false; // True if catenary present
    catenaryHeightM         : Decimal(5,2);         // Catenary wire height above rail (metres)
    horizontalClearanceM    : Decimal(5,2);         // Side clearance to track centre (metres)
    railLoadModel           : String(30);           // CooperE | UIC60 | AS7613AM
    assetOwnerRail          : String(100);          // ARTC | Sydney Trains | NSW TrainLink | Metro | Heritage Rail
    electrificationStatus   : String(30);           // Non-electrified | AC 25kV 50Hz | DC 1.5kV | DC 3kV
    speedLimitKmh           : Integer;              // Max permitted train speed (km/h)
    tonnageRatingPerAxle    : Decimal(8,2);         // Tonnes per axle rating

    // ── S/4 HANA Placeholders (no integration yet — future use) ───────────────
    s4FunctionalLocationId  : String(40);           // Future: S/4 FL TPLNR reference
    s4MaintenancePlant      : String(10);           // Future: S/4 maintenance plant
    s4AssetNumber           : String(18);           // Future: S/4 FI-AA asset number
    s4SyncStatus            : String(20) default 'NOT_LINKED'; // NOT_LINKED | SYNCED | ERROR

    // ── Data Quality ───────────────────────────────────────────────────────────
    dataQualityScore        : Decimal(5,2);         // Completeness % (0-100), calculated by DQ job
    dataQualityFlags        : LargeString;          // JSON array of DQ issues
    version                 : Integer default 1;    // Optimistic lock — increment on every update

    // ── Operational Status Extensions ─────────────────────────────────────────
    postingStatusReason     : String(200);          // Why bridge has current posting status
    closureDate             : Date;                 // Date bridge was closed (if postingStatus = CLOSED)
    closureEndDate          : Date;                 // Expected reopening date
    closureReason           : String(500);          // Reason for closure

    // backlinks added via extend in restrictions.cds and admin.cds
}

entity ConditionHistory : cuid, managed {
    bridge                   : Association to Bridge @mandatory;
    conditionRatingTfnsw     : Integer not null;    // TfNSW 1-5 scale at time of assessment
    assessmentDate           : Date not null;
    assessor                 : String(200);          // Name of person who assessed
    source                   : String(50) default 'bms_manual_entry'; // bms_manual_entry | import | admin_correction
    notes                    : LargeString;          // Detailed findings
    // Element-level condition ratings (TfNSW 1-5 per element)
    elementDeckRating        : Integer;              // TfNSW 1-5 for deck element
    elementSubstructureRating: Integer;              // TfNSW 1-5 for substructure (piers, abutments)
    elementBearingsRating    : Integer;              // TfNSW 1-5 for bearings/expansion joints
    elementDrainageRating    : Integer;              // TfNSW 1-5 for drainage systems
    elementApproachesRating  : Integer;              // TfNSW 1-5 for approach embankments
    // S/4 placeholder — populated when integration is enabled later
    s4InspectionOrderRef     : String(40);           // Future: S/4 inspection order reference
}

// TfNSW 1-5 Condition Scale reference data
entity TfNswConditionScale {
    key code            : Integer;      // 1-5
        label           : String(20);   // Good | Fair | Poor | Very Poor | Critical
        description     : String(500);
        requiredAction  : String(200);
        alertColor      : String(10);   // #16A34A | #22C55E | #F59E0B | #EA580C | #DC2626
        s4PriorityCode  : String(10);   // Future S/4 mapping: 4 | 3 | 2 | 1 | 0
}

extend Bridge with {
    conditionHistory : Association to many ConditionHistory on conditionHistory.bridge = $self;
}

annotate Bridge with @(cds.persistence.indexes: [
    { name: 'idx_bridge_bridgeId',      columns: ['bridgeId'] },
    { name: 'idx_bridge_state',         columns: ['state'] },
    { name: 'idx_bridge_condition',     columns: ['condition'] },
    { name: 'idx_bridge_isActive',      columns: ['isActive'] },
    { name: 'idx_bridge_postingStatus', columns: ['postingStatus'] }
]);
