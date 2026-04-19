using { BridgeManagementService as srv } from '../../../srv/service';

annotate srv.Restrictions with @(
    UI.SelectionFields: [ status, restrictionType, bridge_ID ],
    UI.LineItem: [
        { Value: bridgeId,        Label: 'Bridge ID' },
        { Value: bridgeName,      Label: 'Bridge Name' },
        { Value: restrictionType, Label: 'Type' },
        { Value: value,           Label: 'Value' },
        { Value: unit,            Label: 'Unit' },
        { Value: status,          Label: 'Status' },
        { Value: validFromDate,   Label: 'Valid From' },
        { Value: validToDate,     Label: 'Valid To' },
        { Value: isTemporary,     Label: 'Temporary' }
    ],
    UI.HeaderInfo: {
        TypeName: 'Restriction', TypeNamePlural: 'Restrictions',
        Title: { Value: restrictionType }, Description: { Value: bridgeName }
    },
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'General',   Target: '@UI.FieldGroup#General' },
        { $Type: 'UI.ReferenceFacet', Label: 'Validity',  Target: '@UI.FieldGroup#Validity' },
        { $Type: 'UI.ReferenceFacet', Label: 'Temporary', Target: '@UI.FieldGroup#Temporary' },
        { $Type: 'UI.ReferenceFacet', Label: 'Admin',     Target: '@UI.FieldGroup#Admin' }
    ],
    UI.FieldGroup#General: { Data: [
        { Value: bridge_ID }, { Value: bridgeId }, { Value: bridgeName },
        { Value: restrictionType }, { Value: value }, { Value: unit },
        { Value: status }, { Value: permitRequired }, { Value: directionApplied },
        { Value: gazetteRef }, { Value: notes }
    ]},
    UI.FieldGroup#Validity: { Data: [
        { Value: validFromDate }, { Value: validToDate },
        { Value: approvedBy }, { Value: approvalDate }, { Value: reviewDueDate }
    ]},
    UI.FieldGroup#Temporary: { Data: [
        { Value: isTemporary }, { Value: temporaryFromDate },
        { Value: temporaryToDate }, { Value: temporaryReason }
    ]},
    UI.FieldGroup#Admin: { Data: [
        { Value: createdBy }, { Value: createdAt }, { Value: modifiedBy }, { Value: modifiedAt }
    ]}
);
