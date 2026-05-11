using { BridgeManagementService as srv } from '../../../srv/service';
annotate srv.Lookups with @(
    UI.SelectionFields: [ category, isActive ],
    UI.LineItem: [
        { Value: category }, { Value: code }, { Value: description },
        { Value: displayOrder }, { Value: isActive }
    ],
    UI.HeaderInfo: { TypeName: 'Lookup', TypeNamePlural: 'Lookups',
        Title: { Value: code }, Description: { Value: category } }
);
annotate srv.RoleConfigs with @(
    UI.LineItem: [
        { Value: role }, { Value: featureKey }, { Value: featureType },
        { Value: label }, { Value: visible }, { Value: editable }
    ]
);
