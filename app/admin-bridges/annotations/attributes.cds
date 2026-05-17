using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeAttributes with {
  ID            @UI.Hidden;
  bridge        @UI.Hidden;
  createdAt     @UI.Hidden;  createdBy @UI.Hidden;
  modifiedAt    @UI.Hidden;  modifiedBy @UI.Hidden;
  attributeGroup @title: 'Group';
  attributeName  @title: 'Attribute Name';
  attributeValue @title: 'Value';
  unit           @title: 'Unit';
  source         @title: 'Source';
  effectiveFrom  @title: 'Effective From';
  effectiveTo    @title: 'Effective To';
  remarks        @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeAttributes with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI.HeaderInfo: {
    TypeName      : 'Custom Attribute',
    TypeNamePlural: 'Custom Attributes',
    Title         : {Value: attributeName},
    Description   : {Value: attributeGroup},
  },
  UI.LineItem: [
    {Value: attributeGroup, Label: 'Group'},
    {Value: attributeName,  Label: 'Attribute'},
    {Value: attributeValue, Label: 'Value'},
    {Value: unit,           Label: 'Unit'},
    {Value: source,         Label: 'Source'},
    {Value: effectiveFrom,  Label: 'From'},
    {Value: effectiveTo,    Label: 'To'},
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Attribute Detail', ID: 'AttrDetail', Facets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#AttrGeneral' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#AttrValidity' },
    ]}
  ],
  UI.FieldGroup#AttrGeneral: {
    Label: 'Attribute',
    Data: [
      {Value: attributeGroup, Label: 'Group'},
      {Value: attributeName,  Label: 'Attribute Name'},
      {Value: attributeValue, Label: 'Value'},
      {Value: unit,           Label: 'Unit'},
      {Value: source,         Label: 'Source'},
      {Value: remarks,        Label: 'Remarks'},
    ]
  },
  UI.FieldGroup#AttrValidity: {
    Label: 'Validity',
    Data: [
      {Value: effectiveFrom, Label: 'Effective From'},
      {Value: effectiveTo,   Label: 'Effective To'},
    ]
  },
);
