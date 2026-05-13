namespace bridge.management;

type LoadRatingVehicleClass : String enum {
  T44    = 'T44';    SM1600 = 'SM1600'; HLP400 = 'HLP400';
  W80    = 'W80';    A160   = 'A160';
  PBS1   = 'PBS1';   PBS2   = 'PBS2';   PBS3   = 'PBS3';   PBS4   = 'PBS4';   PBS5 = 'PBS5';
  HML    = 'HML';    CML    = 'CML';
}

type LoadRatingMethod : String enum {
  AS5100      = 'AS 5100';
  NAASRA      = 'NAASRA';
  LoadTesting = 'Load Testing';
}

type InspectionStandard : String enum {
  AS5100    = 'AS 5100-7:2017';
  NAASRA    = 'NAASRA 1992';
  AGAM      = 'AGAM:2013';
  TfNSW_BIM = 'TfNSW-BIM';
  Other     = 'Other';
}

type RatingLevel : String enum {
  T44    = 'T44';
  SM1600 = 'SM1600';
  HLP400 = 'HLP400';
  PBS    = 'PBS';
  HML    = 'HML';
  Custom = 'Custom';
}

type InspectionMethodology : String enum {
  Visual          = 'Visual';
  UnderBridgeUnit = 'Under-Bridge Unit';
  RopeAccess      = 'Rope Access';
  Underwater      = 'Underwater';
  Drone           = 'Drone';
}

type StructuralAdequacyVerdict : String enum {
  Adequate   = 'Adequate';
  Marginal   = 'Marginal';
  Inadequate = 'Inadequate';
}

type RepairMethod : String enum {
  Patching           = 'Patching';
  EpoxyInjection     = 'Epoxy Injection';
  SurfaceTreatment   = 'Surface Treatment / Coating';
  SectionReplacement = 'Full Section Replacement';
  MonitoringOnly     = 'Monitoring Only';
  Demolition         = 'Demolition';
  RockBolt           = 'Rock Bolt';
  Grouting           = 'Grouting';
  Other              = 'Other';
}

type MaintenancePriority : String enum {
  P1Emergency = 'P1 Emergency';
  P2Urgent    = 'P2 Urgent';
  P3Routine   = 'P3 Routine';
  P4Planned   = 'P4 Planned';
}

type RiskRegisterStatus : String enum {
  Open      = 'Open';
  Escalated = 'Escalated';
  Accepted  = 'Accepted';
  Treated   = 'Treated';
  Closed    = 'Closed';
}

type TreatmentStatus : String enum {
  NotStarted = 'Not Started';
  InProgress = 'In Progress';
  Completed  = 'Completed';
  Deferred   = 'Deferred';
  Cancelled  = 'Cancelled';
}

type NhvrAssessmentMethodology : String enum {
  DesktopAnalysis = 'Desktop Analysis';
  FieldInspection = 'Field Inspection';
  LoadTesting     = 'Load Testing';
  Combined        = 'Combined';
}

type MaintenanceActionType : String enum {
  Repair          = 'Repair';
  Preventive      = 'Preventive';
  Emergency       = 'Emergency';
  Inspection      = 'Inspection';
  Rehabilitation  = 'Rehabilitation';
  Replacement     = 'Replacement';
}

type MaintenanceStatus : String enum {
  Planned    = 'Planned';
  Scheduled  = 'Scheduled';
  InProgress = 'InProgress';
  Completed  = 'Completed';
  Deferred   = 'Deferred';
  Cancelled  = 'Cancelled';
}
