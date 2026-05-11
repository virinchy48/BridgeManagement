using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {

    @restrict: [{ grant: ['READ'],            to: ['view','manage','admin'] },
                { grant: ['CREATE','UPDATE'], to: ['manage','admin'] }]
    @Capabilities.DeleteRestrictions.Deletable: false
    entity BridgeRiskAssessments as projection on bridge.management.BridgeRiskAssessments
        actions {
            action deactivate() returns BridgeRiskAssessments;
            action reactivate() returns BridgeRiskAssessments;
        };

    function getNetworkRiskSummary(state: String, region: String) returns array of {
        riskType: String; riskLevel: String; count: Integer
    };

    function getHighRiskBridges(minResidualScore: Integer) returns array of {
        bridgeId: String; bridgeName: String; riskType: String;
        residualRiskScore: Integer; residualRiskLevel: String;
        treatmentDeadline: Date; assessor: String
    };
}
