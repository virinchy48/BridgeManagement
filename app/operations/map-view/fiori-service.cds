using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.BridgeLocations with @(
    UI.HeaderInfo: {
        TypeName: 'Bridge Location',
        TypeNamePlural: 'Bridge Locations',
        Title: { Value: name },
        Description: { Value: bridgeId }
    },
    UI.SelectionFields: [ state, region, condition ],
    UI.LineItem: [
        { Value: bridgeId }, { Value: name }, { Value: latitude },
        { Value: longitude }, { Value: condition }, { Value: postingStatus }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'General',
            Target: '@UI.FieldGroup#General'
        }
    ],
    UI.FieldGroup#General: {
        Data: [
            { Value: bridgeId },
            { Value: name },
            { Value: latitude },
            { Value: longitude },
            { Value: condition },
            { Value: postingStatus },
            { Value: state },
            { Value: region }
        ]
    }
);
