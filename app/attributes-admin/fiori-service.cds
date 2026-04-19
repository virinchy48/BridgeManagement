using { AdminService } from '../../srv/admin-service';

// ── Attribute Groups ─────────────────────────────────────────────────────────

annotate AdminService.AttributeGroups with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Attribute Group',
      TypeNamePlural: 'Attribute Groups',
      Title: { Value: name },
      Description: { Value: objectType }
    },
    LineItem: [
      { Value: name,         Label: 'Group Name' },
      { Value: objectType,   Label: 'Object Type' },
      { Value: internalKey,  Label: 'Internal Key' },
      { Value: displayOrder, Label: 'Display Order' },
      { Value: status,       Label: 'Status' }
    ],
    SelectionFields: [ objectType, status ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Group Details',        Target: '@UI.FieldGroup#GroupDetails' },
      { $Type: 'UI.ReferenceFacet', Label: 'Attribute Definitions', Target: 'definitions/@UI.LineItem' }
    ],
    FieldGroup#GroupDetails: {
      Data: [
        { Value: name },
        { Value: objectType },
        { Value: internalKey },
        { Value: displayOrder },
        { Value: status }
      ]
    }
  }
);

// ── Attribute Definitions ────────────────────────────────────────────────────

annotate AdminService.AttributeDefinitions with @(
  UI: {
    HeaderInfo: {
      TypeName: 'Attribute Definition',
      TypeNamePlural: 'Attribute Definitions',
      Title: { Value: name },
      Description: { Value: internalKey }
    },
    LineItem: [
      { Value: name,         Label: 'Attribute Name' },
      { Value: internalKey,  Label: 'Internal Key' },
      { Value: dataType,     Label: 'Data Type' },
      { Value: unit,         Label: 'Unit' },
      { Value: displayOrder, Label: 'Order' },
      { Value: status,       Label: 'Status' }
    ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Attribute Details',    Target: '@UI.FieldGroup#AttrDetails' },
      { $Type: 'UI.ReferenceFacet', Label: 'Validation',           Target: '@UI.FieldGroup#Validation' },
      { $Type: 'UI.ReferenceFacet', Label: 'Allowed Values',       Target: 'allowedValues/@UI.LineItem' },
      { $Type: 'UI.ReferenceFacet', Label: 'Object Type Config',   Target: 'objectTypeConfigs/@UI.LineItem' }
    ],
    FieldGroup#AttrDetails: {
      Data: [
        { Value: name },
        { Value: internalKey },
        { Value: dataType },
        { Value: unit },
        { Value: helpText },
        { Value: displayOrder },
        { Value: status }
      ]
    },
    FieldGroup#Validation: {
      Data: [
        { Value: minValue },
        { Value: maxValue },
        { Value: regexPattern }
      ]
    }
  }
);

// ── Allowed Values ───────────────────────────────────────────────────────────

annotate AdminService.AttributeAllowedValues with @(
  UI: {
    LineItem: [
      { Value: value,        Label: 'Value' },
      { Value: label,        Label: 'Display Label' },
      { Value: displayOrder, Label: 'Order' },
      { Value: status,       Label: 'Status' }
    ]
  }
);

// ── Object Type Config ───────────────────────────────────────────────────────

annotate AdminService.AttributeObjectTypeConfig with @(
  UI: {
    LineItem: [
      { Value: objectType,   Label: 'Object Type' },
      { Value: enabled,      Label: 'Enabled' },
      { Value: required,     Label: 'Required' },
      { Value: displayOrder, Label: 'Display Order Override' }
    ]
  }
);
