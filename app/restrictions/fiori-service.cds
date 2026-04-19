using { bridge.management.Restrictions } from '../../db/schema';
using { AdminService } from '../../srv/admin-service';

annotate Restrictions with @cds.search: {
  restrictionRef,
  name,
  bridge.bridgeId,
  bridge.bridgeName,
  descr,
  legalReference,
  issuingAuthority
};

annotate Restrictions with {
  restrictionRef       @title: '{i18n>RestrictionRef}';
  bridgeRef           @title: '{i18n>Bridge}';
  bridge              @title: '{i18n>Bridge}';
  name                 @title: '{i18n>RestrictionName}';
  descr                @title: '{i18n>Description}';
  restrictionCategory  @title: '{i18n>RestrictionCategory}';
  restrictionType      @title: '{i18n>RestrictionType}';
  restrictionValue     @title: '{i18n>RestrictionValue}';
  restrictionUnit      @title: '{i18n>RestrictionUnit}';
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
  temporary            @title: '{i18n>Temporary}';
  active               @title: '{i18n>Active}';
  effectiveFrom        @title: '{i18n>EffectiveFrom}';
  effectiveTo          @title: '{i18n>EffectiveTo}';
  approvedBy           @title: '{i18n>ApprovedBy}';
  direction            @title: '{i18n>Direction}';
  enforcementAuthority @title: '{i18n>EnforcementAuthority}';
  temporaryFrom        @title: '{i18n>TemporaryFrom}';
  temporaryTo          @title: '{i18n>TemporaryTo}';
  temporaryReason      @title: '{i18n>TemporaryReason}' @UI.MultiLineText;
  approvalReference    @title: '{i18n>ApprovalReference}';
  issuingAuthority     @title: '{i18n>IssuingAuthority}';
  legalReference       @title: '{i18n>GazetteReference}';
  remarks              @title: '{i18n>Notes}' @UI.MultiLineText;
}

annotate Restrictions with @(
  Common.SemanticKey : [name],
  UI.SelectionFields : [
    name,
    restrictionStatus,
    restrictionType,
    permitRequired,
    temporary
  ],
  UI.LineItem : [
    { Value: restrictionRef, Label: '{i18n>RestrictionRef}' },
    { Value: bridge.bridgeId, Label: '{i18n>BridgeID}' },
    { Value: bridge.bridgeName, Label: '{i18n>Bridge}' },
    { Value: restrictionType, Label: '{i18n>RestrictionType}' },
    { Value: restrictionValue, Label: '{i18n>RestrictionValue}' },
    { Value: restrictionUnit, Label: '{i18n>RestrictionUnit}' },
    { Value: appliesToVehicleClass, Label: '{i18n>AppliesToVehicleClass}' },
    { Value: restrictionStatus, Label: '{i18n>RestrictionStatus}' },
    { Value: temporary, Label: '{i18n>Temp}' },
    { Value: permitRequired, Label: '{i18n>PermitRequired}' },
    { Value: effectiveFrom, Label: '{i18n>From}' },
    { Value: effectiveTo, Label: '{i18n>To}' },
    { Value: legalReference, Label: '{i18n>Gazette}' },
  ],
);

annotate Restrictions with @(UI : {
  Facets : [
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>RestrictionDetails}',
      Target : '@UI.FieldGroup#Details'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>ValidityAndApproval}',
      Target : '@UI.FieldGroup#ValidityApproval'
    }
  ],
  FieldGroup #Details : {
    Data : [
      { Value: restrictionCategory },
      { Value: bridgeRef },
      { Value: restrictionType },
      { Value: restrictionValue },
      { Value: restrictionUnit },
      { Value: appliesToVehicleClass },
      { Value: restrictionStatus }
    ]
  },
  FieldGroup #ValidityApproval : {
    Data : [
      { Value: effectiveFrom },
      { Value: effectiveTo },
      { Value: legalReference },
      { Value: approvedBy },
      { Value: direction },
      { Value: enforcementAuthority },
      { Value: permitRequired },
      { Value: remarks }
    ]
  },
  HeaderInfo : {
    TypeName       : '{i18n>Restriction}',
    TypeNamePlural : '{i18n>Restrictions}',
    Title          : { Value: restrictionRef },
    Description    : { Value: bridge.bridgeName }
  }
});

annotate AdminService.Restrictions with @odata.draft.enabled;
annotate bridge.management.Restrictions with @fiori.draft.enabled;
annotate AdminService.Restrictions with {
  ID @Core.Computed;
  name @UI.Hidden: false;
  restrictionRef @(
    UI.Hidden: false,
    Common.FieldControl : #Mandatory
  );
  bridgeRef @(
    Common.FieldControl : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters     : [
        {
          $Type            : 'Common.ValueListParameterInOut',
          ValueListProperty: 'bridgeId',
          LocalDataProperty: bridgeRef,
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'bridgeName',
        },
      ],
    }
  );
  restrictionCategory @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'RestrictionCategories',
    Common.ValueListWithFixedValues
  );
  restrictionType @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'RestrictionTypes',
    Common.ValueListWithFixedValues
  );
  restrictionValue @(
    Common.FieldControl : #Mandatory
  );
  restrictionUnit @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'RestrictionUnits',
    Common.ValueListWithFixedValues
  );
  restrictionStatus @(
    ValueList.entity:'RestrictionStatuses',
    Common.ValueListWithFixedValues
  );
  appliesToVehicleClass @(
    ValueList.entity:'VehicleClasses',
    Common.ValueListWithFixedValues
  );
  direction @(
    ValueList.entity:'RestrictionDirections',
    Common.ValueListWithFixedValues
  );
  parent @UI.Hidden;
  descr @UI.Hidden;
  grossMassLimit @UI.Hidden: false;
  axleMassLimit @UI.Hidden: false;
  heightLimit @UI.Hidden: false;
  widthLimit @UI.Hidden: false;
  lengthLimit @UI.Hidden: false;
  speedLimit @UI.Hidden: false;
  escortRequired @UI.Hidden: false;
  temporary @UI.Hidden: false;
  active @UI.Hidden: false;
  temporaryFrom;
  temporaryTo;
  temporaryReason @UI.Hidden;
  approvalReference;
  issuingAuthority @UI.Hidden: false;
  parent @Common: {
    Text: parent.name,
    TextArrangement: #TextOnly
  };
  bridgeRef @Common: {
    Text: bridge.bridgeName,
    TextArrangement: #TextOnly
  };
};

// Tree Views
using from './tree-view';
using from './value-help';
