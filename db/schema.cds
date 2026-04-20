// Bridge Management System — DB Schema Barrel
using from './schema/types';
using from './schema/core';
using from './schema/restrictions';
using from './schema/admin';
using {
  Currency,
  cuid,
  managed,
  sap
} from '@sap/cds/common';

using from './attributes-schema';

namespace bridge.management;

entity Bridges : managed {
  key ID           : Integer;
      title        : localized String;
      descr        : localized String;
      bridgeId     : String(40);
      bridgeName   : String(111) @mandatory;
      assetClass   : String(40);
      route        : String(111);
      state        : String(40) @mandatory;
      region       : String(80);
      lga          : String(111);
      routeNumber  : String(40);
      latitude     : Decimal(15,6) @mandatory;
      longitude    : Decimal(15,6) @mandatory;
      location     : String(255);
      assetOwner   : String(111) @mandatory;
      managingAuthority : String(111);
      structureType : String(60);
      yearBuilt    : Integer;
      designLoad   : String(40);
      designStandard : String(111);
      clearanceHeight : Decimal(9,2);
      spanLength   : Decimal(9,2);
      material     : String(60);
      spanCount    : Integer;
      totalLength  : Decimal(9,2);
      deckWidth    : Decimal(9,2);
      numberOfLanes : Integer;
      condition    : String(40);
      conditionRating : Integer;
      structuralAdequacyRating : Integer;
      postingStatus : String(40);
      conditionStandard : String(111);
      seismicZone  : String(40);
      asBuiltDrawingReference : String(111);
      scourDepthLastMeasured : Decimal(9,2);
      floodImmunityAriYears : Integer;
      floodImpacted : Boolean;
      highPriorityAsset : Boolean;
      remarks      : LargeString;
      status       : String(40);
      scourRisk    : String(20);
      lastInspectionDate : Date;
      nhvrAssessed : Boolean;
      nhvrAssessmentDate : Date;
      loadRating   : Decimal(9,2);
      pbsApprovalClass : String(40);
      importanceLevel : Integer;
      averageDailyTraffic : Integer;
      heavyVehiclePercent : Decimal(5,2);
      gazetteReference : String(111);
      nhvrReferenceUrl : String(255);
      freightRoute : Boolean;
      overMassRoute : Boolean;
      hmlApproved  : Boolean;
      bDoubleApproved : Boolean;
      dataSource   : String(111);
      sourceReferenceUrl : String(255);
      openDataReference : String(255);
      sourceRecordId : String(111);
      restriction  : Association to Restrictions;
      capacities   : Composition of many BridgeCapacities
                       on capacities.bridge = $self;
      restrictions : Composition of many BridgeRestrictions
                       on restrictions.bridge = $self;
      attributes   : Composition of many BridgeAttributes
                       on attributes.bridge = $self;
      scourAssessments : Composition of many BridgeScourAssessments
                       on scourAssessments.bridge = $self;
      documents    : Composition of many BridgeDocuments
                       on documents.bridge = $self;
      geoJson      : LargeString;
      stock        : Integer;
      price        : Price;
      currency     : Currency;
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
  speedLimit          : Integer;
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
  parent   : Association to Restrictions;
  children : Composition of many Restrictions
               on children.parent = $self;
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
  speedLimit          : Integer;
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
}

entity BridgeCapacities : cuid, managed {
  bridge                : Association to Bridges;

  // ── General ─────────────────────────────────────────────────────────────
  capacityType          : String(40);     // e.g. AS 5100.7, AS 1170
  vehicleClass          : String(40);
  status                : String(40);     // e.g. NOT_RATED, CURRENT, SUPERSEDED
  effectiveFrom         : Date;
  effectiveTo           : Date;

  // ── Mass Limits (tonnes) ─────────────────────────────────────────────────
  grossMassLimit        : Decimal(9,2);   // Gross Mass Limit / GVM (t)
  grossCombined         : Decimal(9,2);   // Gross Combined / GCM (t)
  steerAxleLimit        : Decimal(9,2);   // Steer Axle (t)
  singleAxleLimit       : Decimal(9,2);   // Single Axle (t)
  tandemGroupLimit      : Decimal(9,2);   // Tandem Axle Group (t)
  triAxleGroupLimit     : Decimal(9,2);   // Tri-Axle Group (t)
  quadAxleGroupLimit    : Decimal(9,2);   // Quad-Axle Group (t)

  // ── Vertical Clearance (metres) ──────────────────────────────────────────
  minClearancePosted    : Decimal(9,2);   // Min Clearance posted (m)
  designClearanceHeight : Decimal(9,2);   // Design Clearance (m)
  lane1Clearance        : Decimal(9,2);   // Lane 1 Clearance (m)
  lane2Clearance        : Decimal(9,2);   // Lane 2 Clearance (m)
  clearanceSurveyDate   : Date;
  clearanceSurveyMethod : String(111);

  // ── Horizontal Geometry (metres) ─────────────────────────────────────────
  carriagewayWidth      : Decimal(9,2);   // Carriageway Width (m)
  trafficableWidth      : Decimal(9,2);   // Trafficable Width (m)
  laneWidth             : Decimal(9,2);   // Lane Width (m)
  leftShoulderWidth     : Decimal(9,2);   // Left Shoulder (m)
  rightShoulderWidth    : Decimal(9,2);   // Right Shoulder (m)

  // ── Load Rating (AS 5100.7) ──────────────────────────────────────────────
  ratingStandard        : String(40);     // e.g. AS 5100.7:2017
  ratingMethod          : String(111);    // Rating Method / approach
  ratingFactor          : Decimal(9,4);   // Rating Factor (RF)
  ratingStatus          : String(40);     // e.g. NOT_RATED, CURRENT, INTERIM
  ratingEngineer        : String(111);    // NER/CPEng number
  ratingDate            : Date;           // Date rating completed
  lastReviewedBy        : String(111);    // Last Reviewed By
  lastReviewedDate      : Date;           // Last Reviewed date
  nextReviewDue         : Date;
  reportReference       : String(111);

  // ── Scour & Environment ──────────────────────────────────────────────────
  scourCriticalDepth    : Decimal(9,2);   // Scour Critical Depth (m)
  currentScourDepth     : Decimal(9,2);   // Current Scour Depth (m)
  scourSafetyMargin     : Decimal(9,2);   // Safety Margin (m)
  floodClosureLevel     : Decimal(9,2);   // Flood Closure Level (m AHD)
  windClosureSpeed      : Decimal(9,2);   // Wind Closure Speed (km/h)

  // ── Fatigue Life Assessment (AS 5100.7 S11) ──────────────────────────────
  designLife            : Integer;        // Design Fatigue Life (years)
  consumedLife          : Decimal(9,2);   // Consumed Life (%)
  remainingLife         : Decimal(9,2);   // Remaining Life (%)
  fatigueSensitive      : Boolean;        // Fatigue-Sensitive Structure
  dynamicLoadAllowance  : Decimal(5,2);   // Dynamic Load Allowance (%)
  speedForAssessment    : Integer;        // Speed for Assessment (km/h)
  heavyVehiclesPerDay   : Integer;        // Heavy Vehicles/Day (HHVD)
  reducedSpeedCondition : String(255);    // Reduced Speed Condition
  criticalElement       : String(255);    // Critical fatigue element
  remarks               : LargeString;
}

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

entity BridgeScourAssessments : cuid, managed {
  bridge              : Association to Bridges;
  assessmentDate      : Date;
  assessmentType      : String(60);
  scourRisk           : String(20);
  measuredDepth       : Decimal(9,2);
  floodImmunityAriYears : Integer;
  mitigationStatus    : String(60);
  assessor            : String(111);
  nextReviewDate      : Date;
  reportReference     : String(111);
  remarks             : LargeString;
}

entity BridgeDocuments : cuid, managed {
  bridge              : Association to Bridges;
  documentType        : String(60);
  title               : String(111);
  documentUrl         : String(500);
  fileName            : String(255);
  mediaType           : String(100);
  fileSize            : Integer;
  @Core.MediaType: mediaType
  @Core.ContentDisposition.Filename: fileName
  @Core.ContentDisposition.Type: 'attachment'
  content             : LargeBinary;
  referenceNumber     : String(111);
  issuedBy            : String(111);
  documentDate        : Date;
  expiryDate          : Date;
  remarks             : LargeString;
}

entity AssetClasses : sap.common.CodeList {
  key code : String(40);
}

entity States : sap.common.CodeList {
  key code : String(10);
}

entity Regions : sap.common.CodeList {
  key code : String(80);
}

entity StructureTypes : sap.common.CodeList {
  key code : String(60);
}

entity DesignLoads : sap.common.CodeList {
  key code : String(40);
}

entity PostingStatuses : sap.common.CodeList {
  key code : String(40);
}

entity ConditionStates : sap.common.CodeList {
  key code : String(40);
}

entity ScourRiskLevels : sap.common.CodeList {
  key code : String(20);
}

entity PbsApprovalClasses : sap.common.CodeList {
  key code : String(40);
}

entity RestrictionTypes : sap.common.CodeList {
  key code : String(40);
}

entity RestrictionStatuses : sap.common.CodeList {
  key code : String(20);
}

entity VehicleClasses : sap.common.CodeList {
  key code : String(40);
}

entity RestrictionCategories : sap.common.CodeList {
  key code : String(20);
}

entity RestrictionUnits : sap.common.CodeList {
  key code : String(20);
}

entity RestrictionDirections : sap.common.CodeList {
  key code : String(40);
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

// --------------------------------------------------------------------------------
// Temporary workaround for this situation:
// - Fiori apps annotate Bridges with @fiori.draft.enabled.
// - Because of that .csv data has to eagerly fill in ID_texts column.
annotate Bridges with @fiori.draft.enabled;
