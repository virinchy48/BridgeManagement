using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [
        { grant: ['READ'],   to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE','DELETE'], to: ['BridgeManager','Admin'] }
    ]
    entity AlertsAndNotifications as projection on bridge.management.AlertsAndNotifications
        actions {
            @requires: ['BridgeManager','Admin']
            action acknowledge(note: String) returns AlertsAndNotifications;
            @requires: ['BridgeManager','Admin']
            action resolveAlert(note: String, proofRef: String) returns AlertsAndNotifications;
            @requires: ['BridgeManager','Admin']
            action suppress(reason: String, suppressUntil: Date) returns AlertsAndNotifications;
        };

    entity KPISnapshots as projection on bridge.management.KPISnapshots;

    function getAlertSummary(state: String) returns {
        totalOpen: Integer; critical: Integer; warning: Integer;
        info: Integer; overdueAcknowledgement: Integer
    };
}
