using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @requires: 'admin'
    action massUploadBridges(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'admin'
    action massUploadRestrictions(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'admin'
    action massUploadRoutes(csvData: LargeString)
           returns { processed: Integer; succeeded: Integer; failed: Integer; errors: String };
    @requires: 'admin'
    action massDownloadBridges(region: String, state: String, routeCode: String)
           returns { csvData: LargeString; filename: String; recordCount: Integer };

    @readonly
    @restrict: [{ grant: ['READ'], to: ['admin','manage'] }]
    entity UploadLogs as projection on nhvr.UploadLog;
}
