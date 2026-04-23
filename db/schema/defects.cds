namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

// Inspection capture record — S/4 EAM owns scheduling; this captures the event data
entity BridgeInspections : cuid, managed {
    bridge                       : Association to Bridges @mandatory;
    inspectionDate               : Date        @mandatory;
    inspectionType               : String(40)  @mandatory;

    inspector                    : String(111) @mandatory;
    inspectorAccreditationNumber : String(40);
    inspectorAccreditationLevel  : String(20);
    inspectorCompany             : String(111);
    qualificationExpiry          : Date;

    inspectionScope              : String(500);
    inspectionStandard           : String(60);
    weatherConditions            : String(200);
    accessibilityIssues          : String(500);

    // EAM references — populated when integration is active (nullable)
    s4InspectionOrderRef         : String(40);
    s4NotificationRef            : String(40);

    reportStorageRef             : String(500);
    inspectionNotes              : LargeString;
    defects                      : Composition of many BridgeDefects
                                   on defects.inspection = $self;
}

// Defect capture — links optionally to S/4 notification when EAM is connected
entity BridgeDefects : cuid, managed {
    bridge       : Association to Bridges      @mandatory;
    inspection   : Association to BridgeInspections @mandatory;
    defectId     : String(30)  @mandatory;

    defectType   : String(40)  @mandatory;
    defectDescription : String(500) @mandatory;

    bridgeElement : String(40) @mandatory;
    spanNumber    : Integer;
    pierNumber    : Integer;
    face          : String(60);
    position      : String(100);

    severity      : Integer @assert.range: [1, 4] @mandatory;
    urgency       : Integer @assert.range: [1, 4] @mandatory;

    dimensionLengthMm : Decimal(8,2);
    dimensionWidthMm  : Decimal(8,2);
    dimensionDepthMm  : Decimal(8,2);
    photoReferences   : String(1000);

    remediationStatus      : String(20) default 'Open';
    estimatedRepairCost    : Decimal(12,2);
    plannedRemediationDate : Date;
    actualRemediationDate  : Date;
    remediationNotes       : String(500);

    // EAM references (nullable — used when eamConnected = true)
    s4NotificationId : String(40);
    s4OrderId        : String(40);
    s4SyncStatus     : String(20) default 'NOT_SYNCED';

    notes : LargeString;
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

extend entity Bridges with {
    inspections : Composition of many BridgeInspections on inspections.bridge = $self;
}
