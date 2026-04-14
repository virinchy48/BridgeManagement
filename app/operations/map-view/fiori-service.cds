using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.BridgeLocations with @(
    UI.SelectionFields: [ state, region, condition ],
    UI.LineItem: [
        { Value: bridgeId }, { Value: name }, { Value: latitude },
        { Value: longitude }, { Value: condition }, { Value: postingStatus }
    ]
);
