namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity BridgeScourAssessments : cuid, managed {
  bridge                      : Association to Bridges;
  assessmentDate              : Date;
  assessmentType              : String(60);
  scourRisk                   : String(20);
  measuredDepth               : Decimal(9,2);
  floodImmunityAriYears       : Integer;
  mitigationStatus            : String(60);
  assessor                    : String(111);
  inspectorAccreditationLevel : String(20);
  nextReviewDate              : Date;
  reportReference             : String(111);
  waterwayType                : String(40);
  foundationType              : String(40);
  scourCountermeasureType     : String(50);
  scourCountermeasureCondition : String(20);
  criticalScourDepthM         : Decimal(9,2);    // AP-G71.8 §5.1 — depth at which structural failure risk becomes critical
  postFloodInspectionRequired : Boolean default false;  // AP-G71.8 §4.2 — mandatory post-flood inspection flag
  remarks                     : LargeString;
}
