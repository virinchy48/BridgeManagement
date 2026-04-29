using { BridgeManagementService as srv } from '../srv/service';
using { AdminService } from '../srv/admin-service';

annotate srv.Bridges with @(
    Common.SemanticKey: [bridgeId]
);

annotate srv.Restrictions with @(
    Common.SemanticKey: [restrictionRef]
);

annotate srv.ActiveRestrictions with @(
    UI.HeaderInfo: {
        TypeName: 'Active Restriction',
        TypeNamePlural: 'Active Restrictions',
        Title: { Value: restrictionType },
        Description: { Value: bridgeName }
    },
    UI.LineItem: [
        { Value: bridgeId, Label: 'Bridge ID' },
        { Value: bridgeName, Label: 'Bridge Name' },
        { Value: restrictionType, Label: 'Type' },
        { Value: restrictionValue, Label: 'Value' },
        { Value: restrictionUnit, Label: 'Unit' },
        { Value: effectiveFrom, Label: 'Effective From' },
        { Value: effectiveTo, Label: 'Effective To' }
    ]
);

annotate srv.BridgeAttributes with @(
    UI.HeaderInfo: {
        TypeName: 'Bridge Attribute',
        TypeNamePlural: 'Bridge Attributes',
        Title: { Value: attributeName },
        Description: { Value: attributeValue }
    },
    UI.LineItem: [
        { Value: attributeGroup, Label: 'Group' },
        { Value: attributeName, Label: 'Attribute' },
        { Value: attributeValue, Label: 'Value' },
        { Value: unit, Label: 'Unit' },
        { Value: source, Label: 'Source' }
    ]
);

annotate AdminService.AssetClasses with @(
    UI.HeaderInfo: {
        TypeName: 'Asset Class',
        TypeNamePlural: 'Asset Classes',
        Title: { Value: name },
        Description: { Value: code }
    },
    UI.LineItem: [
        { Value: code, Label: 'Code' },
        { Value: name, Label: 'Name' },
        { Value: descr, Label: 'Description' }
    ]
);

annotate AdminService.States with @(
    UI.HeaderInfo: {
        TypeName: 'State',
        TypeNamePlural: 'States',
        Title: { Value: name },
        Description: { Value: code }
    },
    UI.LineItem: [
        { Value: code, Label: 'Code' },
        { Value: name, Label: 'Name' },
        { Value: descr, Label: 'Description' }
    ]
);
