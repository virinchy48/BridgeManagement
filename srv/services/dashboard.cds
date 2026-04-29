using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    function getNetworkKPIs() returns {
        totalBridges:       Integer;
        restrictedBridges:  Integer;
        closedBridges:      Integer;
        criticalCondition:  Integer;
        highPriority:       Integer;
        activeRestrictions: Integer
    };
    function getConditionDistribution(state: String, region: String) returns array of {
        condition: String; count: Integer
    };
    function getRestrictionSummary(state: String, region: String) returns array of {
        restrictionType: String; count: Integer
    };
    function me() returns { id: String; name: String; roles: String };
}
