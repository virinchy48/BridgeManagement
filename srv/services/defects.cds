using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {

    @restrict: [{ grant: ['READ'],            to: ['view','inspect','manage','admin'] },
                { grant: ['CREATE','UPDATE'], to: ['inspect','manage','admin'] }]
    @Capabilities.DeleteRestrictions.Deletable: false
    entity BridgeInspections as projection on bridge.management.BridgeInspections
        actions {
            action deactivate() returns BridgeInspections;
            action reactivate() returns BridgeInspections;
        };

    @restrict: [{ grant: ['READ'],            to: ['view','inspect','manage','admin'] },
                { grant: ['CREATE','UPDATE'], to: ['inspect','manage','admin'] }]
    @Capabilities.DeleteRestrictions.Deletable: false
    entity BridgeDefects as projection on bridge.management.BridgeDefects
        actions {
            action deactivate() returns BridgeDefects;
            action reactivate() returns BridgeDefects;
        };

    function getDefectSummary(bridgeId: Integer) returns {
        totalDefects: Integer; criticalCount: Integer; highCount: Integer;
        openCount: Integer; completedCount: Integer
    };
}
