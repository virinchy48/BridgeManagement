using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity AlertsAndNotifications as projection on bridge.management.AlertsAndNotifications
        actions {
            action acknowledge(note: String) returns AlertsAndNotifications;
            action resolveAlert(note: String, proofRef: String) returns AlertsAndNotifications;
            action suppress(reason: String, suppressUntil: Date) returns AlertsAndNotifications;
        };

    entity KPISnapshots as projection on bridge.management.KPISnapshots;

    function getAlertSummary(state: String) returns {
        totalOpen: Integer; critical: Integer; warning: Integer;
        info: Integer; overdueAcknowledgement: Integer
    };
}
