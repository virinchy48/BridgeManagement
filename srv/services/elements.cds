using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity BridgeElements as projection on bridge.management.BridgeElements;

    function getElementConditionSummary(bridgeId: Integer) returns array of {
        elementType: String; elementName: String;
        currentConditionRating: Integer; conditionTrend: String;
        maintenanceRequired: Boolean; urgencyLevel: String
    };
}
