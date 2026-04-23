namespace bridge.management;
using { bridge.management.Bridges } from './bridge-entity';

// ── P0: TfNSW Reference Fields ─────────────────────────────────────────────
extend entity Bridges with {
    tfnswBridgeNumber    : String(20);
    snNumber             : String(50);
    bimsRecordStatus     : String(30);

    // ── LRS (TfNSW SDAM / LAMS) ────────────────────────────────────────────
    roadId               : String(20);
    startSlk             : Decimal(10,3);
    endSlk               : Decimal(10,3);
    carriageway          : String(20);

    // ── Spatial Metadata (GDA2020) ────────────────────────────────────────
    coordinateDatum      : String(20) default 'GDA2020';
    mgaEasting           : Decimal(12,2);
    mgaNorthing          : Decimal(12,2);
    mgaZone              : String(5);
    spatialAccuracyMetres: Decimal(5,2);
    spatialCaptureMethod : String(40);

    // ── Road & Network Classification ─────────────────────────────────────
    roadClassification   : String(30);
    networkClassification: String(30);

    // ── CML Approval (HVNL §§96–99, separate from HML) ───────────────────
    cmlApproved          : Boolean default false;
    cmlApprovalDate      : Date;
    cmlApprovalExpiry    : Date;

    // ── Asset Lifecycle Stage ──────────────────────────────────────────────
    lifecycleStage       : String(30) default 'Operation';

    // ── Financial (whole-of-life; read from EAM when connected) ──────────
    replacementCostEstimate       : Decimal(14,2);
    annualMaintenanceCostEstimate : Decimal(12,2);
    maintenancePriority           : String(20);

    // ── EAM References (SAP S/4HANA — nullable; standalone mode ignores) ─
    s4FunctionalLocation : String(40);
    s4EquipmentNumber    : String(18);
    s4CostCenter         : String(10);
    s4Plant              : String(4);
    s4MaintenancePlant   : String(4);
    s4WorkCenter         : String(8);
    s4EamSyncStatus      : String(20) default 'NOT_LINKED';
    s4EamSyncedAt        : Timestamp;
    s4EamSyncError       : String(500);

    // ── Physical Detail — Bearings (AS 5100.4 §4.4) ───────────────────────
    bearingType              : String(50);
    bearingCondition         : String(20);
    bearingLastInspectedDate : Date;

    // ── Expansion Joints ─────────────────────────────────────────────────
    expansionJointType      : String(50);
    expansionJointCondition : String(20);

    // ── Vertical Clearance (surveyed vs posted, AS 1742.2) ────────────────
    clearanceHeightSurveyed : Decimal(5,2);
    clearanceHeightPosted   : Decimal(5,2);

    // ── Abutment & Pier Geometry ─────────────────────────────────────────
    abutmentType       : String(50);
    skewAngleDegrees   : Decimal(5,2);
    pierNoseType       : String(40);

    // ── Seismic Detail (AS 1170.4) ────────────────────────────────────────
    seismicSiteSoilClass : String(5);
    seismicHazardFactorZ : Decimal(4,3);
    seismicEdc           : String(10);

    // ── OSOM Dimension Envelope (HVNL Part 4.7) ──────────────────────────
    dimensionLimitOverhangFront : Decimal(6,2);
    dimensionLimitOverhangRear  : Decimal(6,2);
    combinedMassLimit           : Decimal(8,2);
    axleSpacingMinimum          : Decimal(6,2);

    // ── B-Double Assessment (NHVR HVNL §§154–157) ────────────────────────
    bDoubleSweptPathWidth      : Decimal(6,2);
    bDoubleAssessmentRef       : String(50);
    bDoubleSpeedRestrictionKmh : Integer;
    roadTrainApproved          : Boolean default false;
    roadTrainAssessmentRef     : String(50);

    // ── IAP (Intelligent Access Program, HVNL §§184–208) ─────────────────
    iapRequired        : Boolean default false;
    iapRouteId         : String(50);
    iapConditionSetRef : String(100);

    // ── iRAP (International Road Assessment Programme) ───────────────────
    irapRoadRating     : String(10);
    irapAssessmentYear : Integer;
}
