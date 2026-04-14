using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.UploadLogs with @(
    UI.SelectionFields: [ uploadType, status ],
    UI.LineItem: [
        { Value: fileName }, { Value: uploadType }, { Value: status },
        { Value: totalRecords }, { Value: successCount }, { Value: failureCount },
        { Value: createdAt }
    ]
);
