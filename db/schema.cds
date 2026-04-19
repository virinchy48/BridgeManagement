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
      latitude     : Decimal(9,6) @mandatory @assert.range: [-90,90];
      longitude    : Decimal(9,6) @mandatory @assert.range: [-180,180];
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
      conditionRating : Integer @assert.range: [1,10];
      structuralAdequacyRating : Integer @assert.range: [1,10];
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
      importanceLevel : Integer @assert.range: [1,4];
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

/** Hierarchically organized Code List for Restrictions */
entity Restrictions : cuid, sap.common.CodeList {
  restrictionRef      : String(40);
  bridgeRef           : String(40);
  bridge              : Association to Bridges;
  restrictionCategory : String(20) default 'Permanent';
  restrictionType     : String(40);
  restrictionValue    : String(60);
  restrictionUnit     : String(20);
  restrictionStatus   : String(20);
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
  restrictionStatus   : String(20);
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
  bridge              : Association to Bridges;
  capacityType        : String(40);
  vehicleClass        : String(40);
  grossMassLimit      : Decimal(9,2);
  axleMassLimit       : Decimal(9,2);
  heightLimit         : Decimal(9,2);
  widthLimit          : Decimal(9,2);
  lengthLimit         : Decimal(9,2);
  speedLimit          : Integer;
  pbsLevel            : String(40);
  effectiveFrom       : Date;
  effectiveTo         : Date;
  status              : String(40);
  sourceReference     : String(111);
  remarks             : LargeString;
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

// --------------------------------------------------------------------------------
// Temporary workaround for this situation:
// - Fiori apps annotate Bridges with @fiori.draft.enabled.
// - Because of that .csv data has to eagerly fill in ID_texts column.
annotate Bridges with @fiori.draft.enabled;
