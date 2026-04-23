using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity NhvrRouteAssessments as projection on bridge.management.NhvrRouteAssessments;
    entity BridgeScourAssessmentDetail as projection on bridge.management.BridgeScourAssessmentDetail;

    function getNhvrComplianceRate(state: String) returns {
        totalBridges: Integer;
        assessedBridges: Integer;
        currentAssessments: Integer;
        compliancePercent: Decimal;
        expiringSoon: Integer
    };

    function exportNhvrPortalJson(bridgeId: Integer) returns {
        bridgeId: Integer;
        conditions: LargeString;
        generatedAt: Timestamp
    };
}
