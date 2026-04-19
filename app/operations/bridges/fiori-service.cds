using { BridgeManagementService as srv } from '../../../srv/service';

annotate srv.Bridges with @(
    UI.SelectionFields: [ state, region, condition, postingStatus, assetClass ],
    UI.LineItem: [
        { Value: bridgeId,        Label: 'Bridge ID' },
        { Value: name,            Label: 'Name' },
        { Value: state,           Label: 'State' },
        { Value: region,          Label: 'Region' },
        { Value: lga,             Label: 'LGA' },
        { Value: assetClass,      Label: 'Asset Class' },
        { Value: structureType,   Label: 'Structure Type' },
        { Value: condition,       Label: 'Condition' },
        { Value: conditionRating, Label: 'Rating' },
        { Value: postingStatus,   Label: 'Status' },
        { Value: yearBuilt,       Label: 'Year Built' },
        { Value: isActive,        Label: 'Active' }
    ],
    UI.HeaderInfo: {
        TypeName: 'Bridge', TypeNamePlural: 'Bridges',
        Title: { Value: name }, Description: { Value: bridgeId }
    },
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'General',     Target: '@UI.FieldGroup#General' },
        { $Type: 'UI.ReferenceFacet', Label: 'Location',    Target: '@UI.FieldGroup#Location' },
        { $Type: 'UI.ReferenceFacet', Label: 'Dimensions',  Target: '@UI.FieldGroup#Dimensions' },
        { $Type: 'UI.ReferenceFacet', Label: 'Engineering', Target: '@UI.FieldGroup#Engineering' },
        { $Type: 'UI.ReferenceFacet', Label: 'Restrictions',Target: 'restrictions/@UI.LineItem#sub' },
        { $Type: 'UI.ReferenceFacet', Label: 'Admin',       Target: '@UI.FieldGroup#Admin' }
    ],
    UI.FieldGroup#General: { Data: [
        { Value: bridgeId }, { Value: name }, { Value: assetClass },
        { Value: structureType }, { Value: material }, { Value: condition },
        { Value: conditionRating }, { Value: postingStatus },
        { Value: inspectionDate }, { Value: highPriorityAsset }
    ]},
    UI.FieldGroup#Location: { Data: [
        { Value: state }, { Value: region }, { Value: lga }, { Value: suburb },
        { Value: routeCode }, { Value: routeKm }, { Value: latitude }, { Value: longitude }
    ]},
    UI.FieldGroup#Dimensions: { Data: [
        { Value: yearBuilt }, { Value: spanLengthM }, { Value: totalLengthM },
        { Value: widthM }, { Value: deckWidthM }, { Value: clearanceHeightM },
        { Value: numberOfSpans }, { Value: numberOfLanes }
    ]},
    UI.FieldGroup#Engineering: { Data: [
        { Value: designLoad }, { Value: loadRating }, { Value: scourRisk },
        { Value: floodImpacted }, { Value: nhvrRouteAssessed },
        { Value: hmlApproved }, { Value: bdoubleApproved },
        { Value: freightRoute }, { Value: assetOwner }, { Value: maintenanceAuthority }
    ]},
    UI.FieldGroup#Admin: { Data: [
        { Value: createdBy }, { Value: createdAt }, { Value: modifiedBy }, { Value: modifiedAt }
    ]}
);

annotate srv.Restrictions with @(
    UI.LineItem #sub: [
        { Value: restrictionType, Label: 'Type' },
        { Value: value,           Label: 'Value' },
        { Value: unit,            Label: 'Unit' },
        { Value: status,          Label: 'Status' },
        { Value: validFromDate,   Label: 'Valid From' },
        { Value: validToDate,     Label: 'Valid To' }
    ]
);
