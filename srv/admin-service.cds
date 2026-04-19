using {bridge.management as my} from '../db/schema';

service AdminService {
  entity Bridges as projection on my.Bridges;
  entity Restrictions as projection on my.Restrictions;
  entity BridgeRestrictions as projection on my.BridgeRestrictions;
  entity BridgeCapacities as projection on my.BridgeCapacities;
  entity BridgeAttributes as projection on my.BridgeAttributes;
  entity BridgeScourAssessments as projection on my.BridgeScourAssessments;
  entity BridgeDocuments as projection on my.BridgeDocuments;
  @readonly entity AssetClasses as projection on my.AssetClasses;
  @readonly entity States as projection on my.States;
  @readonly entity Regions as projection on my.Regions;
  @readonly entity StructureTypes as projection on my.StructureTypes;
  @readonly entity DesignLoads as projection on my.DesignLoads;
  @readonly entity PostingStatuses as projection on my.PostingStatuses;
  @readonly entity ConditionStates as projection on my.ConditionStates;
  @readonly entity ScourRiskLevels as projection on my.ScourRiskLevels;
  @readonly entity PbsApprovalClasses as projection on my.PbsApprovalClasses;
  @readonly entity RestrictionTypes as projection on my.RestrictionTypes;
  @readonly entity RestrictionStatuses as projection on my.RestrictionStatuses;
  @readonly entity VehicleClasses as projection on my.VehicleClasses;
  @readonly entity RestrictionCategories as projection on my.RestrictionCategories;
  @readonly entity RestrictionUnits as projection on my.RestrictionUnits;
  @readonly entity RestrictionDirections as projection on my.RestrictionDirections;
  entity GISConfig as projection on my.GISConfig;
  @readonly entity ChangeLog as projection on my.ChangeLog;

  // Configurable Attributes — admin-managed metadata
  entity AttributeGroups           as projection on my.AttributeGroups;
  entity AttributeDefinitions      as projection on my.AttributeDefinitions;
  entity AttributeAllowedValues    as projection on my.AttributeAllowedValues;
  entity AttributeObjectTypeConfig as projection on my.AttributeObjectTypeConfig;
  @readonly entity AttributeValues       as projection on my.AttributeValues;
  @readonly entity AttributeValueHistory as projection on my.AttributeValueHistory;
}
