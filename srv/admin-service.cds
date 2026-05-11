using {bridge.management as my} from '../db/schema';

service AdminService {
  entity Bridges      as projection on my.Bridges      actions {
    action deactivate()   returns Bridges;
    action reactivate()   returns Bridges;
  };
  entity Restrictions as projection on my.Restrictions actions {
    action deactivate() returns Restrictions;
    action reactivate() returns Restrictions;
  };
  @deprecated
  entity BridgeRestrictions as projection on my.BridgeRestrictions actions {
    action deactivate() returns BridgeRestrictions;
    action reactivate() returns BridgeRestrictions;
  };
  entity BridgeRestrictionProvisions as projection on my.BridgeRestrictionProvisions;
  entity BridgeCapacities as projection on my.BridgeCapacities;
  entity BridgeAttributes as projection on my.BridgeAttributes;
  entity BridgeScourAssessments as projection on my.BridgeScourAssessments;
  entity BridgeScourAssessmentDetail as projection on my.BridgeScourAssessmentDetail;
  entity BridgeDocuments as projection on my.BridgeDocuments;

  // ── Bridge Detail Sections — schema entities surfaced for ObjectPage ──────────
  // Inspections + Defects: Inspector+Manager+Admin can write; all authenticated can read
  entity BridgeInspections as projection on my.BridgeInspections actions {
    action deactivate() returns BridgeInspections;
    action reactivate() returns BridgeInspections;
  };
  entity BridgeDefects as projection on my.BridgeDefects actions {
    action deactivate() returns BridgeDefects;
    action reactivate() returns BridgeDefects;
  };
  // Structural elements: Manager+Admin write; all read
  entity BridgeElements        as projection on my.BridgeElements;
  // Risk + compliance: Manager+Admin write; all read
  entity BridgeRiskAssessments as projection on my.BridgeRiskAssessments actions {
    action deactivate() returns BridgeRiskAssessments;
    action reactivate() returns BridgeRiskAssessments;
  };
  entity LoadRatingCertificates as projection on my.LoadRatingCertificates actions {
    action deactivate() returns LoadRatingCertificates;
    action reactivate() returns LoadRatingCertificates;
  };
  entity NhvrRouteAssessments  as projection on my.NhvrRouteAssessments actions {
    action deactivate() returns NhvrRouteAssessments;
    action reactivate() returns NhvrRouteAssessments;
  };
  entity NhvrApprovedVehicleClasses as projection on my.NhvrApprovedVehicleClasses;
  // Alerts: Manager+Admin write; all read
  entity AlertsAndNotifications as projection on my.AlertsAndNotifications;
  entity BridgeInspectionElements as projection on my.BridgeInspectionElements;
  entity BridgeCarriageways        as projection on my.BridgeCarriageways;
  entity BridgeContacts            as projection on my.BridgeContacts;
  entity BridgeMehComponents       as projection on my.BridgeMehComponents;

  // ── Hub tiles — Phase A new entities ─────────────────────────────────────
  @restrict: [
    { grant: ['READ'],            to: ['view','inspect','manage','admin'] },
    { grant: ['CREATE','UPDATE'], to: ['manage','admin'] },
    { grant: ['DELETE'],          to: [] },
    { grant: ['approveSurvey','rejectSurvey'], to: ['certify','admin'] }
  ]
  entity BridgeConditionSurveys as projection on my.BridgeConditionSurveys actions {
    action deactivate()       returns BridgeConditionSurveys;
    action reactivate()       returns BridgeConditionSurveys;
    action submitForReview()  returns BridgeConditionSurveys;
    action approveSurvey()    returns BridgeConditionSurveys;
    action rejectSurvey()     returns BridgeConditionSurveys;
  };

  @restrict: [
    { grant: ['READ'],            to: ['view','inspect','manage','admin'] },
    { grant: ['CREATE','UPDATE'], to: ['manage','admin'] },
    { grant: ['DELETE'],          to: [] }
  ]
  entity BridgeLoadRatings as projection on my.BridgeLoadRatings actions {
    action deactivate() returns BridgeLoadRatings;
    action reactivate() returns BridgeLoadRatings;
  };

  @restrict: [
    { grant: ['READ'],            to: ['view','inspect','manage','admin'] },
    { grant: ['CREATE','UPDATE'], to: ['manage','admin'] },
    { grant: ['DELETE'],          to: [] },
    { grant: ['approve','rejectPermit'], to: ['certify','admin'] }
  ]
  entity BridgePermits as projection on my.BridgePermits actions {
    action deactivate() returns BridgePermits;
    action reactivate() returns BridgePermits;
    action approve() returns BridgePermits;
    action rejectPermit() returns BridgePermits;
  };
  entity AssetClasses as projection on my.AssetClasses;
  entity States as projection on my.States;
  entity Regions as projection on my.Regions;
  entity StructureTypes as projection on my.StructureTypes;
  entity DesignLoads as projection on my.DesignLoads;
  entity PostingStatuses    as projection on my.PostingStatuses;
  entity CapacityStatuses   as projection on my.CapacityStatuses;
  entity ConditionStates as projection on my.ConditionStates;
  entity ScourRiskLevels as projection on my.ScourRiskLevels;
  entity PbsApprovalClasses as projection on my.PbsApprovalClasses;
  entity ConditionSummaries as projection on my.ConditionSummaries;
  entity StructuralAdequacyTypes as projection on my.StructuralAdequacyTypes;
  entity RestrictionTypes as projection on my.RestrictionTypes;
  entity RestrictionStatuses as projection on my.RestrictionStatuses;
  entity VehicleClasses as projection on my.VehicleClasses;
  entity RestrictionCategories as projection on my.RestrictionCategories;
  entity RestrictionUnits as projection on my.RestrictionUnits;
  entity RestrictionDirections as projection on my.RestrictionDirections;
  entity InspectionTypes as projection on my.InspectionTypes;
  entity ConditionTrends as projection on my.ConditionTrends;
  entity SurfaceTypes as projection on my.SurfaceTypes;
  entity SubstructureTypes as projection on my.SubstructureTypes;
  entity FoundationTypes as projection on my.FoundationTypes;
  entity WaterwayTypes as projection on my.WaterwayTypes;
  entity FatigueDetailCategories as projection on my.FatigueDetailCategories;
  @readonly entity DefectCodes as projection on my.DefectCodes;
  entity GISConfig as projection on my.GISConfig excluding { hereApiKey };
  entity ReferenceLayerConfig as projection on my.ReferenceLayerConfig;
  @readonly entity ChangeLog as projection on my.ChangeLog;

  // Configurable Attributes — admin-managed metadata
  entity AttributeGroups           as projection on my.AttributeGroups;
  entity AttributeDefinitions      as projection on my.AttributeDefinitions;
  entity AttributeAllowedValues    as projection on my.AttributeAllowedValues;
  entity AttributeObjectTypeConfig as projection on my.AttributeObjectTypeConfig;
  entity AttributeValues       as projection on my.AttributeValues;
  @readonly entity AttributeValueHistory as projection on my.AttributeValueHistory;
  @readonly entity UserActivity          as projection on my.UserActivity;
  entity SystemConfig as projection on my.SystemConfig;
  entity BnacEnvironment   as projection on my.BnacEnvironment;
  entity BnacObjectIdMap   as projection on my.BnacObjectIdMap;
  @readonly entity BnacLoadHistory as projection on my.BnacLoadHistory;
  entity DataQualityRules as projection on my.DataQualityRules;

  // ── Demo Mode ────────────────────────────────────────────────────────────────
  action loadDemoData()  returns String;
  action clearDemoData() returns String;

  @requires: ['admin', 'manage']
  action refreshKPISnapshots() returns { snapshotDate: Date; statesProcessed: Integer; message: String };
}
