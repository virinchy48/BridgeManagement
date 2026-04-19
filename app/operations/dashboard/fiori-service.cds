using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.Bridges with @(
    UI.LineItem #dashboard: [
        { Value: bridgeId }, { Value: name }, { Value: state }, { Value: region },
        { Value: condition }, { Value: conditionRating }, { Value: postingStatus },
        { Value: highPriorityAsset }, { Value: overdueFlag }
    ]
);
