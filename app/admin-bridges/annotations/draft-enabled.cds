using { AdminService } from '../../../srv/admin-service';
using bridge.management from '../../../db/schema';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  Draft — Bridges
////////////////////////////////////////////////////////////////////////////

annotate bridge.management.Bridges with @fiori.draft.enabled;
annotate AdminService.Bridges with @odata.draft.enabled;

// Standalone draft entities — each has its own draft root (not composition children of Bridges)
annotate bridge.management.BridgeInspections     with @fiori.draft.enabled;
annotate AdminService.BridgeInspections          with @odata.draft.enabled;
annotate bridge.management.BridgeCapacities      with @fiori.draft.enabled;
annotate AdminService.BridgeCapacities           with @odata.draft.enabled;
annotate bridge.management.BridgeRiskAssessments with @fiori.draft.enabled;
annotate AdminService.BridgeRiskAssessments      with @odata.draft.enabled;
annotate bridge.management.LoadRatingCertificates with @fiori.draft.enabled;
annotate AdminService.LoadRatingCertificates     with @odata.draft.enabled;
annotate bridge.management.NhvrRouteAssessments  with @fiori.draft.enabled;
annotate AdminService.NhvrRouteAssessments       with @odata.draft.enabled;
annotate bridge.management.BridgeConditionSurveys with @fiori.draft.enabled;
annotate AdminService.BridgeConditionSurveys     with @odata.draft.enabled;
annotate bridge.management.BridgeLoadRatings     with @fiori.draft.enabled;
annotate AdminService.BridgeLoadRatings          with @odata.draft.enabled;
annotate bridge.management.BridgePermits         with @fiori.draft.enabled;
annotate AdminService.BridgePermits              with @odata.draft.enabled;
annotate bridge.management.BridgeDefects              with @fiori.draft.enabled;
annotate AdminService.BridgeDefects                   with @odata.draft.enabled;
annotate bridge.management.BridgeScourAssessments     with @fiori.draft.enabled;
annotate AdminService.BridgeScourAssessments          with @odata.draft.enabled;
annotate bridge.management.BridgeMaintenanceActions   with @fiori.draft.enabled;
annotate AdminService.BridgeMaintenanceActions        with @odata.draft.enabled;
