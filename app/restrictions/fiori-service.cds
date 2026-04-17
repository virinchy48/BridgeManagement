using { bridge.management.Restrictions } from '../../db/schema';
using { AdminService } from '../../srv/admin-service';

annotate Restrictions with @cds.search: {
  name,
  descr,
  legalReference,
  issuingAuthority
};

annotate Restrictions with {
  name                 @title: '{i18n>RestrictionName}';
  descr                @title: '{i18n>Description}';
  restrictionType      @title: '{i18n>RestrictionType}';
  restrictionStatus    @title: '{i18n>RestrictionStatus}';
  appliesToVehicleClass @title: '{i18n>AppliesToVehicleClass}';
  grossMassLimit       @title: '{i18n>GrossMassLimit}';
  axleMassLimit        @title: '{i18n>AxleMassLimit}';
  heightLimit          @title: '{i18n>HeightLimit}';
  widthLimit           @title: '{i18n>WidthLimit}';
  lengthLimit          @title: '{i18n>LengthLimit}';
  speedLimit           @title: '{i18n>SpeedLimit}';
  permitRequired       @title: '{i18n>PermitRequired}';
  escortRequired       @title: '{i18n>EscortRequired}';
  active               @title: '{i18n>Active}';
  effectiveFrom        @title: '{i18n>EffectiveFrom}';
  effectiveTo          @title: '{i18n>EffectiveTo}';
  issuingAuthority     @title: '{i18n>IssuingAuthority}';
  legalReference       @title: '{i18n>LegalReference}';
  remarks              @title: '{i18n>Remarks}' @UI.MultiLineText;
}

annotate Restrictions with @(
  Common.SemanticKey : [name],
  UI.SelectionFields : [
    name,
    restrictionType,
    restrictionStatus,
    active,
    permitRequired
  ],
  UI.LineItem : [
    { Value: name, Label: '{i18n>RestrictionName}' },
    { Value: restrictionType, Label: '{i18n>RestrictionType}' },
    { Value: restrictionStatus, Label: '{i18n>RestrictionStatus}' },
    { Value: appliesToVehicleClass, Label: '{i18n>AppliesToVehicleClass}' },
    { Value: active, Label: '{i18n>Active}' },
    { Value: permitRequired, Label: '{i18n>PermitRequired}' },
  ],
);

annotate Restrictions with @(UI : {
  Facets : [
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>RestrictionDefinition}',
      Target : '@UI.FieldGroup#Definition'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>RestrictionLimits}',
      Target : '@UI.FieldGroup#Limits'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>ApplicabilityAndDates}',
      Target : '@UI.FieldGroup#Applicability'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>Governance}',
      Target : '@UI.FieldGroup#Governance'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>Administrator}',
      Target : '@UI.FieldGroup#Admin'
    }
  ],
  FieldGroup #Definition : {
    Data : [
      { Value: name },
      { Value: descr },
      { Value: parent_ID },
      { Value: restrictionType },
      { Value: restrictionStatus },
      { Value: active }
    ]
  },
  FieldGroup #Limits : {
    Data : [
      { Value: grossMassLimit },
      { Value: axleMassLimit },
      { Value: heightLimit },
      { Value: widthLimit },
      { Value: lengthLimit },
      { Value: speedLimit }
    ]
  },
  FieldGroup #Applicability : {
    Data : [
      { Value: appliesToVehicleClass },
      { Value: permitRequired },
      { Value: escortRequired },
      { Value: effectiveFrom },
      { Value: effectiveTo }
    ]
  },
  FieldGroup #Governance : {
    Data : [
      { Value: issuingAuthority },
      { Value: legalReference },
      { Value: remarks }
    ]
  },
  FieldGroup #Admin : {
    Data : [
      { Value: createdBy },
      { Value: createdAt },
      { Value: modifiedBy },
      { Value: modifiedAt }
    ]
  },
  HeaderInfo : {
    TypeName       : '{i18n>Restriction}',
    TypeNamePlural : '{i18n>Restrictions}',
    Title          : { Value: name },
    Description    : { Value: restrictionType }
  }
});

annotate AdminService.Restrictions with @odata.draft.enabled;
annotate bridge.management.Restrictions with @fiori.draft.enabled;
annotate AdminService.Restrictions with {
  ID @Core.Computed;
  name @(
    Common.FieldControl : #Mandatory
  );
  restrictionType @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'RestrictionTypes',
    Common.ValueListWithFixedValues
  );
  restrictionStatus @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'RestrictionStatuses',
    Common.ValueListWithFixedValues
  );
  appliesToVehicleClass @(
    ValueList.entity:'VehicleClasses',
    Common.ValueListWithFixedValues
  );
  parent @Common: {
    Text: parent.name,
    TextArrangement: #TextOnly
  };
};

// Tree Views
using from './tree-view';
using from './value-help';
