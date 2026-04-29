using { BridgeManagementService as srv } from '../../../srv/service';

annotate srv.Restrictions with @(
    UI.SelectionFields: [ restrictionStatus, restrictionType, bridgeRef ],
    UI.LineItem: [
        { Value: bridgeId,        Label: 'Bridge ID' },
        { Value: bridgeName,      Label: 'Bridge Name' },
        { Value: restrictionType, Label: 'Type' },
        { Value: restrictionValue, Label: 'Value' },
        { Value: restrictionUnit,  Label: 'Unit' },
        { Value: restrictionStatus, Label: 'Status' },
        { Value: effectiveFrom,   Label: 'Valid From' },
        { Value: effectiveTo,     Label: 'Valid To' },
        { Value: temporary,       Label: 'Temporary' }
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
        { Value: bridge }, { Value: bridgeId }, { Value: bridgeName },
        { Value: restrictionType }, { Value: restrictionValue }, { Value: restrictionUnit },
        { Value: restrictionStatus }, { Value: permitRequired }, { Value: direction },
        { Value: legalReference }, { Value: remarks }
    ]},
    UI.FieldGroup#Validity: { Data: [
        { Value: effectiveFrom }, { Value: effectiveTo },
        { Value: approvedBy }, { Value: approvalReference }, { Value: issuingAuthority }
    ]},
    UI.FieldGroup#Temporary: { Data: [
        { Value: temporary }, { Value: temporaryFrom },
        { Value: temporaryTo }, { Value: temporaryReason }
    ]},
    UI.FieldGroup#Admin: { Data: [
        { Value: createdBy }, { Value: createdAt }, { Value: modifiedBy }, { Value: modifiedAt }
    ]}
);
