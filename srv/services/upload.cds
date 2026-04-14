using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    action massUploadBridges(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    action massUploadRestrictions(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    action massUploadRoutes(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    action massDownloadBridges(region: String, state: String, routeCode: String)
           returns { csvData: LargeString; filename: String; recordCount: Integer };

    @readonly
    @restrict: [{ grant: ['READ'], to: ['Admin','BridgeManager'] }]
    entity UploadLogs as projection on nhvr.UploadLog;
}
