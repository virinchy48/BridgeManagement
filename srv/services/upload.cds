using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @requires: 'Admin'
    action massUploadBridges(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'Admin'
    action massUploadRestrictions(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'Admin'
    action massUploadRoutes(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'Admin'
    action massDownloadBridges(region: String, state: String, routeCode: String)
           returns { csvData: LargeString; filename: String; recordCount: Integer };

    @readonly
    @restrict: [{ grant: ['READ'], to: ['Admin','BridgeManager'] }]
    entity UploadLogs as projection on nhvr.UploadLog;
}
