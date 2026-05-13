// Bridge Management System — DB Schema Barrel
using { bridge.management.Bridges } from './schema/bridge-entity';
using { bridge.management.BridgeDocuments } from './schema/documents';
using { bridge.management.LoadRatingVehicleClass, bridge.management.LoadRatingMethod } from './schema/enum-types';
using { bridge.management.BridgeScourAssessmentDetail } from './schema/nhvr-compliance';
using { bridge.management.BridgeScourAssessments } from './schema/scour-assessments';
using from './schema/bridge-entity';
using from './schema/types';
using from './schema/enum-types';
using from './schema/scour-assessments';
using from './schema/core';
using from './schema/restrictions';
using from './schema/admin';
using from './schema/extensions';
using from './schema/load-ratings';
using from './schema/risk-assessments';
using from './schema/nhvr-compliance';
using from './schema/elements';
using from './schema/defects';
using from './schema/documents';
using from './schema/alerts';
using from './schema/maintenance';
using from './schema/gap-entities';
using {
  Currency,
  cuid,
  managed,
  sap
} from '@sap/cds/common';

using from './attributes-schema';

namespace bridge.management;
// entity Bridges is defined in ./schema/bridge-entity.cds

extend entity Bridges with {
      restriction  : Association to Restrictions;
      capacities   : Association to many BridgeCapacities
                       on capacities.bridge = $self;
      restrictions : Composition of many BridgeRestrictions
                       on restrictions.bridge = $self;
      attributes   : Composition of many BridgeAttributes
                       on attributes.bridge = $self;
      scourAssessments : Association to many BridgeScourAssessments
                       on scourAssessments.bridge = $self;
      documents    : Composition of many BridgeDocuments
                       on documents.bridge = $self;
      maintenanceClass     : String(20);         // TfNSW maintenance tier (A/B/C/D)
}

/** Hierarchically organized Restrictions */
entity Restrictions : cuid, managed {
  name                : String(255);
  descr               : LargeString;
  restrictionRef      : String(40);
  bridgeRef           : String(40);
  bridge              : Association to Bridges;
  restrictionCategory : String(20) default 'Permanent';
  restrictionType     : String(40);
  restrictionValue    : String(60);
  restrictionUnit     : String(20);
  restrictionStatus   : String(20) default 'Active';
  appliesToVehicleClass : String(40);
  grossMassLimit      : Decimal(9,2);
  axleMassLimit       : Decimal(9,2);
  heightLimit         : Decimal(9,2);
  widthLimit          : Decimal(9,2);
  lengthLimit         : Decimal(9,2);
  speedLimit          : Integer @assert.range: [0, 130];
  permitRequired      : Boolean;
  escortRequired      : Boolean;
  temporary           : Boolean;
  active              : Boolean default true;
  effectiveFrom       : Date;
  effectiveTo         : Date;
  approvedBy          : String(111);
  direction           : String(40);
  enforcementAuthority : String(111);
  temporaryFrom       : Date;
  temporaryTo         : Date;
  temporaryReason     : LargeString;
  approvalReference   : String(111);
  issuingAuthority    : String(111);
  legalReference      : String(111);
  remarks             : LargeString;
  // ── AS 1742.10 Sign Management ────────────────────────────────────────────
  postingSignId       : String(40);    // AS 1742.10 sign reference number
  // ── Gazette & Load Limit Order (Roads Act 1993 NSW §§121–124) ────────────
  gazetteNumber       : String(30);    // NSW Gazette order number (e.g. 2024-GOV-4521)
  gazettePublicationDate : Date;       // Date gazette was published
  gazetteExpiryDate   : Date;          // Expiry of gazette authority (drives alerts)
  loadLimitOrderRef   : String(50);    // Load Limit Order reference (e.g. LLO-2024-001)
  loadLimitOrderDate  : Date;          // Date LLO was issued
  loadLimitOrderExpiry : Date;         // Date LLO expires
  // ── NHVR Escort requirements ─────────────────────────────────────────────
  pilotVehicleCount   : Integer;       // Number of pilot/escort vehicles required (NHVR-HVNL)
  reviewDueDate        : Date;               // When the restriction must next be reviewed
  legalEffectiveDate   : Date;               // Date restriction has legal force (gazette effective date)
  signRequirements     : String(255);        // AS 1742.10 sign type and placement notes
  virtual reviewCriticality : Integer;       // 1=Overdue, 2=Due within 30d, 3=OK — computed in after READ
  // ── Provisions & Detour (legacy BIS Temporary Provision fields) ──────────
  dateCorrected          : Date;                  // Date Deficiency Corrected
  postedLoadLimitRigid   : Decimal(9,2);          // Posted Load Limit — Rigid Trucks (t)
  postedLoadLimitSemi    : Decimal(9,2);          // Posted Load Limit — Semitrailers (t)
  detourLengthKm         : Decimal(9,2);          // Detour Length (km)
  detourCapable42t       : Boolean default false; // Detour capable of carrying >42.5t gross
  detourMaxAxleLoad      : Decimal(9,2);          // Max axle load on detour for vehicles >42.5t
  detourRouteDetails     : LargeString;           // Details of route for vehicles >42.5t
  repairsProposal        : String(10);            // Repairs proposal code (e.g. REPR)
  estimatedRepairCost    : Decimal(15,2);         // Estimated repair cost (AUD)
  programmeYear          : String(10);            // Programme Year e.g. "2026/27"
  restrictionComments    : LargeString;           // Comments / additional notes
  restrProvisions : Composition of many RestrictionProvisions on restrProvisions.restriction = $self;
  parent   : Association to Restrictions;
  children : Composition of many Restrictions
               on children.parent = $self;
}

// Temporary Provisions attached to a standalone Restriction (legacy BIS "Temporary Provision" block)
entity RestrictionProvisions : cuid, managed {
  restriction    : Association to Restrictions;
  provisionCode  : String(10);  // e.g. CWRS, DETR, SUBB, CLTT, HMLL, RPBL
  description    : String(255); // Auto-resolved from ProvisionTypes lookup
  sortOrder      : Integer default 1;
  active         : Boolean default true;
}

// Lookup: Temporary Provision Types (CWRS, DETR, SUBB, etc.)
entity ProvisionTypes : sap.common.CodeList {
  key code        : String(10);
  description     : String(255);
  active          : Boolean default true;
}

// Lookup: Repairs Proposal Types (REPR, REPL, PATC, MNTN, etc.)
entity RepairsProposalTypes : sap.common.CodeList {
  key code        : String(10);
  description     : String(255);
  active          : Boolean default true;
}

entity BridgeRestrictions : cuid, managed {
  bridge              : Association to Bridges;
  restrictionRef      : String(40);
  name                : String(111);
  descr               : String(255);
  restrictionCategory : String(20) default 'Permanent';
  restrictionType     : String(40);
  restrictionValue    : String(60);
  restrictionUnit     : String(20);
  restrictionStatus   : String(20) default 'Active';
  appliesToVehicleClass : String(40);
  grossMassLimit      : Decimal(9,2);
  axleMassLimit       : Decimal(9,2);
  heightLimit         : Decimal(9,2);
  widthLimit          : Decimal(9,2);
  lengthLimit         : Decimal(9,2);
  speedLimit          : Integer @assert.range: [0, 130];
  permitRequired      : Boolean;
  escortRequired      : Boolean;
  temporary           : Boolean;
  active              : Boolean default true;
  effectiveFrom       : Date;
  effectiveTo         : Date;
  approvedBy          : String(111);
  direction           : String(40);
  enforcementAuthority : String(111);
  temporaryFrom       : Date;
  temporaryTo         : Date;
  temporaryReason     : LargeString;
  approvalReference   : String(111);
  issuingAuthority    : String(111);
  legalReference      : String(111);
  remarks             : LargeString;
  // ── AS 1742.10 Sign Management ────────────────────────────────────────────
  postingSignId       : String(40);    // AS 1742.10 sign reference number
  // ── Gazette & Load Limit Order (Roads Act 1993 NSW §§121–124) ────────────
  gazetteNumber       : String(30);    // NSW Gazette order number
  gazettePublicationDate : Date;
  gazetteExpiryDate   : Date;
  loadLimitOrderRef   : String(50);    // Load Limit Order reference (e.g. LLO-2024-001)
  loadLimitOrderDate  : Date;
  loadLimitOrderExpiry : Date;
  // ── NHVR Escort requirements ─────────────────────────────────────────────
  pilotVehicleCount   : Integer;       // Number of pilot/escort vehicles required (NHVR-HVNL)
  // ── Provisions (1:N — each restriction can carry multiple permit conditions)
  provisions          : Composition of many BridgeRestrictionProvisions
                          on provisions.restriction = $self;
}

// Permit/legal provisions attached to a bridge posting restriction (1 restriction : N provisions)
entity BridgeRestrictionProvisions : cuid, managed {
  restriction     : Association to BridgeRestrictions @mandatory;
  provisionNumber : Integer;         // Sequence number within the restriction (1, 2, 3…)
  provisionType   : String(50);      // Condition | Exclusion | Requirement | Schedule | Permit Condition | Time-Based
  provisionText   : LargeString @mandatory; // Full text of the provision clause
  vehicleClasses  : String(255);     // Comma-separated applicable vehicle classes (if clause-specific)
  timeOfDay       : String(100);     // e.g. "06:00–22:00 weekdays only"
  seasonalPeriod  : String(100);     // e.g. "October–April"
  effectiveFrom   : Date;
  effectiveTo     : Date;
  approvedBy      : String(111);
  legalReference  : String(111);     // Gazette or LLO clause reference
  active          : Boolean default true;
}

entity BridgeCapacities : cuid, managed {
  bridge                : Association to Bridges;

  // ── General ─────────────────────────────────────────────────────────────
  capacityType          : String(40);     // e.g. AS 5100.7, AS 1170

  // ── Mass Limits (tonnes) ─────────────────────────────────────────────────
  grossMassLimit        : Decimal(9,2);   // Gross Mass Limit / GVM (t)
  grossCombined         : Decimal(9,2);   // Gross Combined / GCM (t)
  steerAxleLimit        : Decimal(9,2);   // Steer Axle (t)
  singleAxleLimit       : Decimal(9,2);   // Single Axle (t)
  tandemGroupLimit      : Decimal(9,2);   // Tandem Axle Group (t)
  triAxleGroupLimit     : Decimal(9,2);   // Tri-Axle Group (t)
  axleSpacingMinimumM   : Decimal(6,2);   // NHVR HVNL §§94–95 — minimum axle spacing governs dynamic impact on thin decks

  // ── Vertical Clearance (metres) ──────────────────────────────────────────
  minClearancePosted    : Decimal(9,2);   // Min Clearance posted (m)
  lane1Clearance        : Decimal(9,2);   // Lane 1 Clearance (m)
  lane2Clearance        : Decimal(9,2);   // Lane 2 Clearance (m)
  clearanceSurveyDate   : Date;
  clearanceSurveyMethod : String(111);

  // ── Horizontal Geometry (metres) ─────────────────────────────────────────
  carriagewayWidth      : Decimal(9,2);   // Carriageway Width (m)
  trafficableWidth      : Decimal(9,2);   // Trafficable Width (m)
  laneWidth             : Decimal(9,2);   // Lane Width (m)

  // ── Load Rating (AS 5100.7) ──────────────────────────────────────────────
  ratingStandard        : String(40);     // e.g. AS 5100.7:2017
  ratingFactor          : Decimal(9,4);   // Rating Factor (RF)
  ratingEngineer        : String(111);    // NER/CPEng number
  ratingDate            : Date;           // Date rating completed
  nextReviewDue         : Date;
  reportReference       : String(111);

  // ── Scour & Environment ──────────────────────────────────────────────────
  scourCriticalDepth    : Decimal(9,2);   // Scour Critical Depth (m)
  currentScourDepth     : Decimal(9,2);   // Current Scour Depth (m)
  floodClosureLevel     : Decimal(9,2);   // Flood Closure Level (m AHD)

  // ── Fatigue Life Assessment (AS 5100.7 S11; AS 5100.6 §13.5) ────────────
  designLife            : Integer;        // Design Fatigue Life (years)
  consumedLife          : Decimal(9,2);   // Consumed Life (%)
  fatigueSensitive      : Boolean;        // Fatigue-Sensitive Structure
  criticalElement       : String(255);    // Critical fatigue element
  fatigueDetailCategory : String(10);     // AS 5100.6 §13.5 detail category (A|B|C|D|E|F|G)

  // ── Temporal validity (valid-time pattern) ───────────────────────────────
  effectiveFrom         : Date;           // Date rating came into regulatory force (gazette/order date)
  effectiveTo           : Date;           // Null = currently operative; set by handler on supersession

  // ── Capacity Status ───────────────────────────────────────────────────────
  capacityStatus        : String(40) default 'Current';  // Current | Superseded | Under Review | Revoked
  supersessionReason    : String(300);    // Why this record was superseded (deterioration, rehab, etc.)
  lastReviewedBy        : String(111);    // Engineer name + NER/CPEng
  statusReviewDue       : Date;           // Next review due date

  // ── Engineering Notes ─────────────────────────────────────────────────────
  engineeringNotes      : LargeString;    // Assessment notes, conditions, limitations
}

annotate BridgeCapacities with @(cds.persistence.indexes: [
  { name: 'idx_cap_bridge',  columns: ['bridge_ID'] },
  { name: 'idx_cap_status',  columns: ['capacityStatus'] },
  { name: 'idx_cap_current', columns: ['bridge_ID', 'capacityType', 'effectiveTo'] }
]);

entity BridgeAttributes : cuid, managed {
  bridge              : Association to Bridges;
  attributeGroup      : String(60);
  attributeName       : String(111);
  attributeValue      : String(255);
  unit                : String(40);
  source              : String(111);
  effectiveFrom       : Date;
  effectiveTo         : Date;
  remarks             : LargeString;
}

entity AssetClasses : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity States : sap.common.CodeList {
  key code : String(10);
  active   : Boolean default true;
}

entity Regions : sap.common.CodeList {
  key code : String(80);
  active   : Boolean default true;
}

entity StructureTypes : sap.common.CodeList {
  key code : String(60);
  active   : Boolean default true;
}

entity DesignLoads : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity DefectCodes : managed {
  key code            : String(10);
  description         : String(200);
  elementCategory     : String(40);
  active              : Boolean default true;
}

entity PostingStatuses : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity CapacityStatuses : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity ConditionStates : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity ScourRiskLevels : sap.common.CodeList {
  key code : String(20);
  active   : Boolean default true;
}

entity PbsApprovalClasses : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity ConditionSummaries : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity StructuralAdequacyTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity RestrictionTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity RestrictionStatuses : sap.common.CodeList {
  key code : String(20);
  active   : Boolean default true;
}

entity VehicleClasses : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity RestrictionCategories : sap.common.CodeList {
  key code : String(20);
  active   : Boolean default true;
}

entity RestrictionUnits : sap.common.CodeList {
  key code : String(20);
  active   : Boolean default true;
}

entity RestrictionDirections : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

// ── New lookup tables — standards compliance additions ────────────────────────

entity InspectionTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity ConditionTrends : sap.common.CodeList {
  key code : String(20);
  active   : Boolean default true;
}

entity SurfaceTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity SubstructureTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity FoundationTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity WaterwayTypes : sap.common.CodeList {
  key code : String(40);
  active   : Boolean default true;
}

entity FatigueDetailCategories : sap.common.CodeList {
  key code : String(10);
  active   : Boolean default true;
}

type Price : Decimal(9, 2);

// GIS configuration singleton — one record with id='default'
entity GISConfig {
  key id                      : String(40) default 'default';
  // Basemap
  defaultBasemap              : String(40) default 'osm';
  hereApiKey                  : String(255);
  // Reference layers
  showStateBoundaries         : Boolean default false;
  showLgaBoundaries           : Boolean default false;
  // Advanced feature toggles
  enableScaleBar              : Boolean default true;
  enableGps                   : Boolean default true;
  enableMinimap               : Boolean default true;
  enableHeatmap               : Boolean default false;
  enableTimeSlider            : Boolean default false;
  enableStatsPanel            : Boolean default true;
  enableProximity             : Boolean default true;
  enableMgaCoords             : Boolean default true;
  enableStreetView            : Boolean default true;
  enableConditionAlerts       : Boolean default true;
  enableCustomWms             : Boolean default false;
  enableServerClustering      : Boolean default false;
  // Thresholds / defaults
  conditionAlertThreshold     : Integer default 3;
  proximityDefaultRadiusKm    : Decimal(9, 2) default 10;
  heatmapRadius               : Integer default 20;
  heatmapBlur                 : Integer default 15;
  viewportLoadingZoom         : Integer default 8;
  // Custom WMS layers as JSON array string
  customWmsLayers             : LargeString;
}


// Change document — one row per field changed per save operation
entity ChangeLog {
  key ID           : UUID;
  changedAt        : Timestamp;
  changedBy        : String(111);
  objectType       : String(40);   // Bridge | Restriction | GISConfig | Lookup
  objectId         : String(111);
  objectName       : String(255);  // bridgeName / restrictionRef for display
  fieldName        : String(111);
  oldValue         : LargeString;
  newValue         : LargeString;
  changeSource     : String(40);   // OData | MassEdit | MassUpload
  batchId          : String(111);  // groups all fields changed in one save
}

annotate ChangeLog with @(cds.persistence.indexes: [
  { name: 'idx_cl_changedat',  columns: ['changedAt'] },
  { name: 'idx_cl_objecttype', columns: ['objectType'] },
  { name: 'idx_cl_objectid',   columns: ['objectId'] },
  { name: 'idx_cl_changedby',  columns: ['changedBy'] },
  { name: 'idx_cl_batchid',    columns: ['batchId'] },
  { name: 'idx_cl_composite',  columns: ['objectType', 'objectId', 'changedAt'] }
]);

entity UserActivity {
  key userId      : String(111);
  displayName     : String(255);
  lastSeenAt      : Timestamp;
  lastPath        : String(511);
  sessionCount    : Integer default 0;
  actionCount     : Integer default 0;
}

entity SystemConfig {
  key configKey     : String(80);
  category          : String(40);   // Export | Map | Quality | Upload | Display | Security
  label             : String(255);
  value             : String(1024);
  defaultValue      : String(1024);
  dataType          : String(20);   // string | integer | decimal | boolean
  description       : LargeString;
  isReadOnly        : Boolean default false;
  sortOrder         : Integer default 0;
  modifiedAt        : Timestamp;
  modifiedBy        : String(111);
}

entity BnacEnvironment {
  key environment  : String(20);    // DEV | PREPROD | PROD | TEST
  baseUrl          : String(511) @mandatory;
  description      : String(255);
  active           : Boolean default true;
  modifiedAt       : Timestamp;
  modifiedBy       : String(111);
}

entity BnacObjectIdMap {
  key bridgeId     : String(40);   // matches Bridges.bridgeId
  bnacObjectId     : String(111) @mandatory;
  bnacUrl          : String(511);  // computed: active env baseUrl + bnacObjectId
  loadedAt         : Timestamp;
  loadedBy         : String(111);
  loadBatchId      : String(111);
}

entity BnacLoadHistory {
  key ID           : UUID;
  loadedAt         : Timestamp;
  loadedBy         : String(111);
  fileName         : String(255);
  environment      : String(20);
  total            : Integer default 0;
  success          : Integer default 0;
  failed           : Integer default 0;
  errors           : LargeString;
  batchId          : String(111);
}

entity DataQualityRules {
  key id        : UUID;
      name      : String(120) not null;
      category  : String(60)  not null;
      severity  : String(10)  not null;  // critical | warning | info
      ruleType  : String(40)  not null;  // required_field | non_zero | not_older_than_days | condition_requires_restriction | freight_requires_nhvr
      field     : String(60);            // bridge field to check (null for compound rules)
      config    : LargeString;           // JSON: e.g. {"days": 730}
      message   : String(255) not null;  // violation message shown in dashboard
      enabled   : Boolean default true;
      sortOrder : Integer default 0;
      weight    : Integer default 10;    // contribution to weighted quality score (1-100)
}

// Configurable additional reference layers shown in the map Reference Layers panel
entity ReferenceLayerConfig : cuid, managed {
  name             : String(111) @mandatory;
  category         : String(40);   // Weather | Flood | Traffic | Geology | Infrastructure | Environment | Emergency | Administrative | Custom
  layerType        : String(20) default 'WMS';   // WMS | XYZ | ArcGISRest | GeoJSON
  url              : String(511) @mandatory;
  subLayers        : String(511);  // WMS: comma-separated layer names; ArcGIS: sublayer index
  attribution      : String(255);
  opacity          : Decimal(3,2) default 0.70;
  enabledByDefault : Boolean default false;
  active           : Boolean default true;   // show in the map panel
  sortOrder        : Integer default 0;
  description      : String(511);
  isPreset         : Boolean default false;  // system-shipped preset (non-deletable)
  wmsFormat        : String(40) default 'image/png';
  transparent      : Boolean default true;
  minZoom          : Integer default 0;
  maxZoom          : Integer default 19;
}

// ── Reusable aspect: active soft-delete flag + remarks ───────────────────────
aspect ChangeTracked {
  active  : Boolean default true;
  remarks : LargeString;
}

// ── CON tile — standalone condition survey records ───────────────────────────
entity BridgeConditionSurveys : cuid, managed, ChangeTracked {
  surveyRef        : String(40);                             // auto-generated CS-NNNN
  bridge           : Association to Bridges;
  bridgeRef        : String(40);
  surveyDate       : Date @mandatory;
  surveyType       : String(40);                             // Routine | Detailed | Principal | Special
  surveyedBy       : String(111);
  inspectorAccreditationLevel : String(20);  // Austroads Level 1 | Level 2 | Level 3
  accessMethod         : String(40);         // Visual | Under-bridge unit | Rope access | Diving
  nextSurveyRecommended: Date;
  estimatedRehabCost   : Decimal(12,2);      // AUD
  actionPlan           : LargeString;
  conditionRating  : Integer @assert.range: [1,10];
  structuralRating : Integer @assert.range: [1,10];
  overallGrade     : String(20);                             // Good | Satisfactory | Poor | Critical
  notes            : LargeString;
  status           : String(20) default 'Draft';             // Draft | Submitted | Approved
  linkedInspectionRef : String(40);                          // TfNSW-BIM §3.2 — ref to underpinning Principal inspection record
  programmeYear    : Integer;                                // AGAM §5.2 — maintenance programme year (e.g. 2026)
}

// ── LRT tile — per-vehicle-class load rating assessments ─────────────────────
entity BridgeLoadRatings : cuid, managed, ChangeTracked {
  ratingRef        : String(40);
  bridge           : Association to Bridges;
  bridgeRef        : String(40);
  vehicleClass     : LoadRatingVehicleClass;
  ratingMethod     : LoadRatingMethod;
  ratingFactor     : Decimal(9,4) @assert.range: [0, 5];    // 0.0–5.0 typical
  grossMassLimit   : Decimal(9,2) @assert.range: [0, 1000]; // tonnes
  assessedBy       : String(111);
  assessmentDate   : Date;
  validTo              : Date @mandatory;
  ratingEngineerNer    : String(20);
  governingMember      : String(100);
  governingFailureMode : String(60);
  dynamicLoadAllowance : Decimal(5,3);
  reportRef            : String(255);
  status           : String(20) default 'Active';            // Active | Superseded | Revoked
}

// ── PRM tile — permit applications and approvals ─────────────────────────────
entity BridgePermits : cuid, managed, ChangeTracked {
  permitRef        : String(40);                             // auto-generated PM-NNNN
  bridge           : Association to Bridges;
  bridgeRef        : String(40);
  permitType           : String(60);                         // Oversize | Overmass | PBS | HML | Special
  nhvrPermitNumber     : String(50);
  nhvrApplicationNumber: String(50);
  tripCount            : Integer default 1;
  axleConfiguration    : String(60);
  escortRequired       : Boolean default false;
  pilotVehicleCount    : Integer;
  applicantName    : String(255);
  vehicleClass     : String(60);
  grossMass        : Decimal(9,2) @assert.range: [0, 1000]; // tonnes
  height           : Decimal(9,2) @assert.range: [0, 8];    // metres
  width            : Decimal(9,2) @assert.range: [0, 8];    // metres
  length           : Decimal(9,2) @assert.range: [0, 60];   // metres
  appliedDate      : Date;
  validFrom        : Date;
  validTo          : Date;
  status           : String(20) default 'Pending';           // Pending | Approved | Rejected | Expired
  decisionBy       : String(111);
  decisionDate     : Date;
  conditionsOfApproval : LargeString;
  permitCategory       : String(30);         // B-Double | Road Train | PBS | HML | Mass Managed
  applicantABN         : String(11);         // Australian Business Number (11 digits)
  applicantEmail       : String(255);
  applicantPhone       : String(20);
  vehicleDescription   : LargeString;
  routeDescription     : LargeString;
  vehicleRegistration  : String(20);                          // HVNL §156 — permit is vehicle-specific, registration required
  rejectionReason      : String(300);                        // HVNL §162 — mandatory written reason for permit refusal
}

extend entity Bridges with {
  conditionSurveys : Association to many BridgeConditionSurveys on conditionSurveys.bridge = $self;
  loadRatings      : Association to many BridgeLoadRatings      on loadRatings.bridge = $self;
  permits          : Association to many BridgePermits          on permits.bridge = $self;
}

// ── AssetIQ Risk Scoring Engine ──────────────────────────────────────────────

entity AssetIQScores : cuid, managed {
  bridge          : Association to Bridges @mandatory;
  overallScore    : Decimal(5,2);
  ragStatus       : String(10);           // GREEN | AMBER | RED
  bciFactor       : Decimal(5,2);         // BCI component (35% weight)
  ageFactor       : Decimal(5,2);         // Age component (15% weight)
  trafficFactor   : Decimal(5,2);         // Traffic component (20% weight)
  defectFactor    : Decimal(5,2);         // Defect severity component (20% weight)
  loadFactor      : Decimal(5,2);         // Load exposure component (10% weight)
  modelVersion    : String(20) default '1.0.0';
  scoredAt        : Timestamp;
  overrideFlag    : Boolean default false;
  overrideBy      : String(111);
  overrideReason  : LargeString;
  overrideAt      : Timestamp;
}

annotate AssetIQScores with @(cds.persistence.indexes: [
  { name: 'idx_aiq_bridge', columns: ['bridge_ID'] },
  { name: 'idx_aiq_scored', columns: ['scoredAt'] }
]);

annotate bridge.management.Bridges with @(cds.persistence.indexes: [
  { elements: ['state', 'isActive'] },
  { elements: ['bridgeId'] },
  { elements: ['conditionRating', 'isActive'] }
]);

annotate bridge.management.BridgeDefects with @(cds.persistence.indexes: [
  { elements: ['bridge_ID', 'active'] },
  { elements: ['severity', 'active'] }
]);

annotate bridge.management.BridgeInspections with @(cds.persistence.indexes: [
  { elements: ['bridge_ID', 'active'] },
  { elements: ['inspectionDate'] }
]);

annotate bridge.management.AlertsAndNotifications with @(cds.persistence.indexes: [
  { elements: ['status', 'entityType'] },
  { elements: ['bridge_ID', 'status'] }
]);

entity AssetIQModels : cuid, managed {
  version         : String(20) @mandatory;
  isActive        : Boolean default false;
  bciWeight       : Decimal(4,3) default 0.350;
  ageWeight       : Decimal(4,3) default 0.150;
  trafficWeight   : Decimal(4,3) default 0.200;
  defectWeight    : Decimal(4,3) default 0.200;
  loadWeight      : Decimal(4,3) default 0.100;
  description     : String(500);
  activatedAt     : Timestamp;
  activatedBy     : String(111);
}

extend entity Bridges with {
  virtual ragStatus : String(10);
}

// Upload session history — one record per mass-upload execution
entity UploadSessions : cuid, managed {
  fileName        : String(255);
  datasetName     : String(100) default 'All';
  mode            : String(20)  default 'upsert';      // create | update | upsert
  status          : String(20)  default 'Completed';   // Completed | PartialSuccess | Failed
  totalRows       : Integer     default 0;
  insertedRows    : Integer     default 0;
  updatedRows     : Integer     default 0;
  deactivatedRows : Integer     default 0;
  warningCount    : Integer     default 0;
  errorCount      : Integer     default 0;
  summaryJson     : LargeString;   // JSON array of per-dataset summaries
  warningsJson    : LargeString;   // JSON array of warning strings (capped at 100)
}

// --------------------------------------------------------------------------------
// Temporary workaround for this situation:
// - Fiori apps annotate Bridges with @fiori.draft.enabled.
// - Because of that .csv data has to eagerly fill in ID_texts column.
annotate Bridges with @fiori.draft.enabled;
