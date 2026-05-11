namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';
using { bridge.management.BridgeElements } from './elements';
using { bridge.management.InspectionStandard } from './enum-types';
using { bridge.management.BridgeInspectionElements } from './gap-entities';

// Inspection capture record — S/4 EAM owns scheduling; this captures the event data
entity BridgeInspections : cuid, managed {
    bridge                       : Association to Bridges @mandatory;
    inspectionRef                : String(40);
    inspectionDate               : Date        @mandatory;
    inspectionType               : String(40)  @mandatory;

    inspector                    : String(111) @mandatory;
    inspectorAccreditationNumber : String(40);
    inspectorAccreditationLevel  : String(20);
    inspectorCompany             : String(111);
    qualificationExpiry          : Date;

    inspectionScope              : String(500);
    inspectionStandard           : InspectionStandard;
    weatherConditions            : String(200);
    accessibilityIssues          : String(500);

    // EAM references — populated when integration is active (nullable)
    s4InspectionOrderRef         : String(40);
    s4NotificationRef            : String(40);

    reportStorageRef             : String(500);
    inspectionNotes              : LargeString;

    overallConditionRating       : Integer @assert.range: [1, 10];
    criticalFindings             : Boolean default false;
    recommendedActions           : LargeString;
    nextInspectionRecommended    : Date;

    active                       : Boolean default true;
    defects                      : Association to many BridgeDefects           on defects.inspection           = $self;
    inspectionElements           : Association to many BridgeInspectionElements on inspectionElements.inspection = $self;
}

// Defect capture — inspection link is optional (standalone defects allowed)
entity BridgeDefects : cuid, managed {
    bridge       : Association to Bridges      @mandatory;
    inspection   : Association to BridgeInspections;
    defectId     : String(30);
    deteriorationMechanism : String(60);     // Corrosion | Fatigue | Impact | Scour | Overload | Chemical | Settlement | Aging
    defectCode       : String(20);           // SIMS element defect code (e.g. BS01, SW23)

    defectType   : String(40)  @mandatory;
    defectDescription : String(500) @mandatory;

    bridgeElement : String(40);
    bridgeElementRef : Association to BridgeElements;  // optional VH-driven link to structured element
    spanNumber    : Integer;
    pierNumber    : Integer;
    face          : String(60);
    position      : String(100);

    severity      : Integer @assert.range: [1, 4] @mandatory;
    urgency       : Integer @assert.range: [1, 4] @mandatory;

    dimensionLengthMm : Decimal(8,2);
    dimensionWidthMm  : Decimal(8,2);
    dimensionDepthMm  : Decimal(8,2);
    photoReferences   : LargeString;

    remediationStatus      : String(20) default 'Open';
    estimatedRepairCost    : Decimal(12,2);
    plannedRemediationDate : Date;
    actualRemediationDate  : Date;
    remediationNotes       : String(500);

    // EAM references (nullable — used when eamConnected = true)
    s4NotificationId : String(40);
    s4OrderId        : String(40);
    s4SyncStatus     : String(20) default 'NOT_SYNCED';
    s4SyncDate       : Timestamp;            // Last successful sync to S/4 HANA
    s4SyncError      : String(500);          // Last sync error message

    notes   : LargeString;
    active  : Boolean default true;
}

annotate BridgeInspections with @(cds.persistence.indexes: [
    { name: 'idx_insp_bridge', columns: ['bridge_ID'] },
    { name: 'idx_insp_date',   columns: ['inspectionDate'] },
    { name: 'idx_insp_type',   columns: ['inspectionType'] }
]);

annotate BridgeDefects with @(cds.persistence.indexes: [
    { name: 'idx_defect_bridge',   columns: ['bridge_ID'] },
    { name: 'idx_defect_severity', columns: ['severity'] },
    { name: 'idx_defect_status',   columns: ['remediationStatus'] }
]);

// inspections: standalone draft entity — no longer a composition child of Bridges
extend entity Bridges with {
    inspections : Association to many BridgeInspections on inspections.bridge = $self;
}
