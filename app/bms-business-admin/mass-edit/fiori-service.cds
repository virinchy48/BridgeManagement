using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.BridgeGrid with @(
    UI.SelectionFields: [ state, region, condition, postingStatus ],
    UI.LineItem: [
        { Value: bridgeId }, { Value: name }, { Value: state }, { Value: region },
        { Value: condition }, { Value: conditionRating }, { Value: postingStatus },
        { Value: hmlApproved }, { Value: bdoubleApproved }, { Value: isActive }
    ]
);
