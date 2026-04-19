using { bridge.management.Restrictions } from '../../db/schema';
using { AdminService } from '../../srv/admin-service';

////////////////////////////////////////////////////////////////////////////
//  Search configuration (service-agnostic — applies to all services)
////////////////////////////////////////////////////////////////////////////

annotate Restrictions with @cds.search: {
  restrictionRef,
  name,
  bridge.bridgeId,
  bridge.bridgeName,
  legalReference,
  issuingAuthority
};

////////////////////////////////////////////////////////////////////////////
//  List Report — AdminService.Restrictions
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Restrictions with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Restriction',
    TypeNamePlural: 'Restrictions',
    Title         : { Value: restrictionRef },
    Description   : { Value: bridge.bridgeName }
  },
  UI.SelectionFields: [
    restrictionRef, bridgeRef, restrictionType,
    restrictionStatus, restrictionCategory,
    permitRequired, temporary, active
  ],
  UI.LineItem: [
    { Value: restrictionRef,          Label: 'Restriction Ref' },
    { Value: bridge.bridgeId,         Label: 'Bridge ID' },
    { Value: bridge.bridgeName,       Label: 'Bridge' },
    { Value: restrictionCategory,     Label: 'Category' },
    { Value: restrictionType,         Label: 'Type' },
    { Value: restrictionValue,        Label: 'Value' },
    { Value: restrictionUnit,         Label: 'Unit' },
    { Value: appliesToVehicleClass,   Label: 'Vehicle Class' },
    { Value: restrictionStatus,       Label: 'Status' },
    { Value: temporary,               Label: 'Temp' },
    { Value: permitRequired,          Label: 'Permit Req.' },
    { Value: effectiveFrom,           Label: 'From' },
    { Value: effectiveTo,             Label: 'To' },
    { Value: active,                  Label: 'Active' },
  ],
  UI.Identification: [
    {
      $Type       : 'UI.DataFieldForAction',
      Action      : 'AdminService.deactivate',
      Label       : 'Deactivate',
      Criticality : #Negative,
      ![@UI.Hidden]: { $edmJson: { $Or: [
        { $Eq: [{ $Path: 'active' }, false] },
        { $Not: { $Path: 'IsActiveEntity' } }
      ] } }
    },
    {
      $Type       : 'UI.DataFieldForAction',
      Action      : 'AdminService.reactivate',
      Label       : 'Reactivate',
      Criticality : #Positive,
      ![@UI.Hidden]: { $edmJson: { $Or: [
        { $Ne: [{ $Path: 'active' }, false] },
        { $Not: { $Path: 'IsActiveEntity' } }
      ] } }
    }
  ]
);

////////////////////////////////////////////////////////////////////////////
//  Object Page — AdminService.Restrictions
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Restrictions with @(
  UI: {
    Facets: [
      // ── Tab 1: Restriction Classification (3 sub-sections) ───────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Restriction Classification',
        ID    : 'RstClassification',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Identification', Target: '@UI.FieldGroup#RstIdentification'},
          {$Type: 'UI.ReferenceFacet', Label: 'Applicability',  Target: '@UI.FieldGroup#RstApplicability'},
          {$Type: 'UI.ReferenceFacet', Label: 'Value',          Target: '@UI.FieldGroup#RstValue'},
        ]
      },
      // ── Tab 2: Physical Limits (2 sub-sections) ──────────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Physical Limits',
        ID    : 'RstPhysicalLimits',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits (t)',    Target: '@UI.FieldGroup#RstMassLimits'},
          {$Type: 'UI.ReferenceFacet', Label: 'Dimensional Limits', Target: '@UI.FieldGroup#RstDimLimits'},
        ]
      },
      // ── Tab 3: Validity & Approval (4 sub-sections) ──────────────────────
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Validity & Approval',
        ID    : 'RstValidity',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Effective Period',    Target: '@UI.FieldGroup#RstEffective'},
          {$Type: 'UI.ReferenceFacet', Label: 'Temporary Condition', Target: '@UI.FieldGroup#RstTemporary'},
          {$Type: 'UI.ReferenceFacet', Label: 'Approval & Legal',    Target: '@UI.FieldGroup#RstApproval'},
          {$Type: 'UI.ReferenceFacet', Label: 'Enforcement',         Target: '@UI.FieldGroup#RstEnforcement'},
        ]
      },
      // ── Tab 4: Notes ─────────────────────────────────────────────────────
      {$Type: 'UI.ReferenceFacet', Label: 'Notes', Target: '@UI.FieldGroup#RstNotes'},
    ],

    // ── FieldGroups ─────────────────────────────────────────────────────────

    // Tab 1 — Classification
    FieldGroup#RstIdentification: {
      Data: [
        {Value: restrictionRef},   // @Core.Immutable — auto-generated, locked after creation
        {Value: bridgeRef},
        {Value: restrictionCategory},
        {Value: restrictionType},
        {Value: restrictionStatus},
        {Value: active},           // @Common.FieldControl #ReadOnly — managed by actions
      ]
    },
    FieldGroup#RstApplicability: {
      Data: [
        {Value: appliesToVehicleClass},
        {Value: direction},
        {Value: permitRequired},
        {Value: escortRequired},
        {Value: temporary},
      ]
    },
    FieldGroup#RstValue: {
      Data: [
        {Value: restrictionValue},
        {Value: restrictionUnit},
      ]
    },

    // Tab 2 — Physical Limits
    FieldGroup#RstMassLimits: {
      Data: [
        {Value: grossMassLimit},
        {Value: axleMassLimit},
      ]
    },
    FieldGroup#RstDimLimits: {
      Data: [
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
      ]
    },

    // Tab 3 — Validity & Approval
    FieldGroup#RstEffective: {
      Data: [
        {Value: effectiveFrom},
        {Value: effectiveTo},
      ]
    },
    FieldGroup#RstTemporary: {
      Data: [
        {Value: temporaryFrom},
        {Value: temporaryTo},
        {Value: temporaryReason},
      ]
    },
    FieldGroup#RstApproval: {
      Data: [
        {Value: approvedBy},
        {Value: approvalReference},
        {Value: legalReference},
        {Value: issuingAuthority},
      ]
    },
    FieldGroup#RstEnforcement: {
      Data: [
        {Value: enforcementAuthority},
      ]
    },

    // Tab 4 — Notes
    FieldGroup#RstNotes: {
      Data: [
        {Value: remarks},
        {Value: descr},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  Field-level annotations — AdminService.Restrictions
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Restrictions with {
  // System-managed
  ID             @Core.Computed;
  createdBy      @UI.Hidden;
  createdAt      @UI.Hidden;
  modifiedBy     @UI.Hidden;
  modifiedAt     @UI.Hidden;
  // Auto-generated on create; locked thereafter
  restrictionRef @Core.Immutable  @Common.FieldControl: #Mandatory  @title: 'Restriction Reference';
  // Lifecycle managed exclusively by Deactivate / Reactivate actions
  active         @Common.FieldControl: #ReadOnly  @title: 'Active';
  // name is auto-set by server handler from restrictionRef; not user-facing
  name           @UI.Hidden;
  // parent/children — managed by tree view, not editable in flat form
  parent         @UI.Hidden;
  // descr — free-text, multiline
  descr          @title: 'Description'  @UI.MultiLineText;
};

annotate AdminService.Restrictions with {
  // Mandatory fields
  bridgeRef @(
    Common.FieldControl: #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters     : [
        { $Type: 'Common.ValueListParameterInOut',      ValueListProperty: 'bridgeId',   LocalDataProperty: bridgeRef },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
      ],
    },
    Common.Text: bridge.bridgeName,
    Common.TextArrangement: #TextOnly
  )  @title: 'Bridge';
  restrictionCategory @(
    Common.FieldControl: #Mandatory,
    ValueList.entity:'RestrictionCategories',
    Common.ValueListWithFixedValues
  )  @title: 'Category';
  restrictionType @(
    Common.FieldControl: #Mandatory,
    ValueList.entity:'RestrictionTypes',
    Common.ValueListWithFixedValues
  )  @title: 'Restriction Type';
  restrictionValue @(
    Common.FieldControl: #Mandatory
  )  @title: 'Value';
  restrictionUnit @(
    Common.FieldControl: #Mandatory,
    ValueList.entity:'RestrictionUnits',
    Common.ValueListWithFixedValues
  )  @title: 'Unit';

  // Value lists
  restrictionStatus @(
    ValueList.entity:'RestrictionStatuses',
    Common.ValueListWithFixedValues
  )  @title: 'Status';
  appliesToVehicleClass @(
    ValueList.entity:'VehicleClasses',
    Common.ValueListWithFixedValues
  )  @title: 'Applies to Vehicle Class';
  direction @(
    ValueList.entity:'RestrictionDirections',
    Common.ValueListWithFixedValues
  )  @title: 'Direction';

  // Labels
  restrictionCategory  @title: 'Category';
  temporary            @title: 'Temporary';
  permitRequired       @title: 'Permit Required';
  escortRequired       @title: 'Escort Required';
  grossMassLimit       @title: 'Gross Mass Limit (t)';
  axleMassLimit        @title: 'Axle Mass Limit (t)';
  heightLimit          @title: 'Height Limit (m)';
  widthLimit           @title: 'Width Limit (m)';
  lengthLimit          @title: 'Length Limit (m)';
  speedLimit           @title: 'Speed Limit (km/h)';
  effectiveFrom        @title: 'Effective From';
  effectiveTo          @title: 'Effective To';
  temporaryFrom        @title: 'Temporary From';
  temporaryTo          @title: 'Temporary To';
  temporaryReason      @title: 'Temporary Reason'  @UI.MultiLineText;
  approvedBy           @title: 'Approved By';
  approvalReference    @title: 'Approval Reference';
  legalReference       @title: 'Gazette / Legal Reference';
  issuingAuthority     @title: 'Issuing Authority';
  enforcementAuthority @title: 'Enforcement Authority';
  remarks              @title: 'Notes'  @UI.MultiLineText;
};

////////////////////////////////////////////////////////////////////////////
//  Draft
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Restrictions with @odata.draft.enabled;
annotate bridge.management.Restrictions with @fiori.draft.enabled;

////////////////////////////////////////////////////////////////////////////
//  Tree Views and Value Helps (defined in separate files)
////////////////////////////////////////////////////////////////////////////

using from './tree-view';
using from './value-help';
