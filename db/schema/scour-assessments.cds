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
  remarks                     : LargeString;
}
