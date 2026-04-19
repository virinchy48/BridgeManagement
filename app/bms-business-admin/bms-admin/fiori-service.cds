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
annotate srv.AttributeDefinitions with @(
    UI.SelectionFields: [ dataType, isActive ],
    UI.LineItem: [
        { Value: name }, { Value: label }, { Value: dataType },
        { Value: isRequired }, { Value: isActive }, { Value: displayOrder }
    ],
    UI.HeaderInfo: { TypeName: 'Attribute', TypeNamePlural: 'Attributes',
        Title: { Value: name }, Description: { Value: label } }
);
annotate srv.RoleConfigs with @(
    UI.LineItem: [
        { Value: role }, { Value: featureKey }, { Value: featureType },
        { Value: label }, { Value: visible }, { Value: editable }
    ]
);
