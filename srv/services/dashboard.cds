using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    function getNetworkKPIs() returns {
        totalBridges: Integer; activeBridges: Integer;
        restrictedBridges: Integer; closedBridges: Integer;
        criticalCondition: Integer; highPriority: Integer;
        overdueInspections: Integer; activeRestrictions: Integer
    };
    function getConditionDistribution(state: String, region: String) returns array of {
        condition: String; count: Integer
    };
    function getRestrictionSummary(state: String, region: String) returns array of {
        restrictionType: String; count: Integer
    };
    function getConditionTrend(months: Integer, state: String) returns array of {
        snapshotDate: Date; avgConditionRating: Decimal; criticalCondition: Integer
    };
    function getGazetteExpiryTimeline(daysAhead: Integer, state: String) returns array of {
        bridgeId: String; bridgeName: String; gazetteExpiryDate: Date;
        daysUntilExpiry: Integer; postingStatus: String
    };
    function captureKPISnapshot(snapshotType: String) returns {
        recorded: Integer; snapshotDate: Date
    };
    function me() returns { id: String; name: String; roles: String };
}
