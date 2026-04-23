using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity BridgeInspections as projection on bridge.management.BridgeInspections;
    entity BridgeDefects     as projection on bridge.management.BridgeDefects;

    function getDefectSummary(bridgeId: Integer) returns {
        totalDefects: Integer; criticalCount: Integer; highCount: Integer;
        openCount: Integer; completedCount: Integer
    };
}
