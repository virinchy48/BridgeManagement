using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity BridgeRiskAssessments as projection on bridge.management.BridgeRiskAssessments;

    function getNetworkRiskSummary(state: String, region: String) returns array of {
        riskType: String; riskLevel: String; count: Integer
    };

    function getHighRiskBridges(minResidualScore: Integer) returns array of {
        bridgeId: String; bridgeName: String; riskType: String;
        residualRiskScore: Integer; residualRiskLevel: String;
        treatmentDeadline: Date; assessor: String
    };
}
