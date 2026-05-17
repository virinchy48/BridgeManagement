using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  BridgeRestrictions — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeRestrictions with {
  ID    @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',      LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  createdAt @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  // Auto-generated (BR-NNNN); never user-entered
  restrictionRef        @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Reference (auto-generated)';
  // Mandatory classification fields
  restrictionCategory @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionCategories', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionCategory, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Category';
  restrictionType @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Restriction Type';
  restrictionValue      @Common.FieldControl: #Mandatory  @title: 'Value';
  restrictionUnit @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionUnits', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionUnit, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Unit';
  // Status — auto-defaulted to Active on create; managed by Deactivate / Reactivate actions thereafter
  restrictionStatus @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Status';
  // Active flag — read-only; controlled by Deactivate / Reactivate actions only
  active                @Common.FieldControl: #ReadOnly  @title: 'Active';
  // temporary boolean auto-derived from category — not shown in form
  temporary             @UI.Hidden;
  appliesToVehicleClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'VehicleClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: appliesToVehicleClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Applies to Vehicle Class';
  direction @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'RestrictionDirections', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: direction, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Direction';
  effectiveFrom         @Common.FieldControl: #Mandatory  @title: 'Effective From';
  effectiveTo           @title: 'Effective To';
  grossMassLimit        @title: 'Gross Mass Limit (t)';
  axleMassLimit         @title: 'Axle Mass Limit (t)';
  heightLimit           @title: 'Height Limit (m)';
  widthLimit            @title: 'Width Limit (m)';
  lengthLimit           @title: 'Length Limit (m)';
  speedLimit            @title: 'Speed Limit (km/h)';
  permitRequired        @title: 'Permit Required';
  escortRequired        @title: 'Escort Required';
  approvedBy            @title: 'Approved By';
  approvalReference     @title: 'Approval Reference';
  legalReference        @title: 'Gazette / Legal Reference';
  issuingAuthority      @title: 'Issuing Authority';
  enforcementAuthority  @title: 'Enforcement Authority';
  temporaryFrom         @title: 'Temporary From';
  temporaryTo           @title: 'Temporary To';
  temporaryReason       @title: 'Temporary Reason'  @UI.MultiLineText;
  remarks               @title: 'Remarks'  @UI.MultiLineText;
  name                  @UI.Hidden;
  descr                 @UI.Hidden;
  // ── AS 1742.10 Sign Management ────────────────────────────────────────────
  postingSignId         @title: 'Posting Sign ID'       @Common.QuickInfo: 'AS 1742.10 sign reference number';
  // ── Gazette & Load Limit Order (Roads Act 1993 NSW §§121–124) ────────────
  gazetteNumber         @title: 'Gazette Number'        @Common.QuickInfo: 'NSW Gazette order number (Roads Act 1993 §122)';
  gazettePublicationDate @title: 'Gazette Published';
  gazetteExpiryDate     @title: 'Gazette Expiry'        @Common.QuickInfo: 'Alert generated 90/60/30 days before expiry';
  loadLimitOrderRef     @title: 'Load Limit Order Ref'  @Common.QuickInfo: 'Roads Act 1993 LLO reference (e.g. LLO-2024-001)';
  loadLimitOrderDate    @title: 'LLO Issued Date';
  loadLimitOrderExpiry  @title: 'LLO Expiry Date';
  // ── NHVR Escort requirements ──────────────────────────────────────────────
  pilotVehicleCount     @title: 'Pilot Vehicle Count';
};

annotate AdminService.BridgeRestrictions with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  // Deletable kept true so draft-mode rows can be removed; server blocks delete on committed records
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Bridge Restriction',
      TypeNamePlural: 'Bridge Restrictions',
      Title         : { $Type: 'UI.DataField', Value: restrictionType },
      Description   : { $Type: 'UI.DataField', Value: restrictionRef }
    },
    // ── Inline table actions — deactivate / reactivate committed restriction rows ──
    Identification: [
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.deactivate',
        Label       : 'Retire (Soft-Delete)',
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
    ],
    LineItem: [
      {Value: bridge.bridgeId,       Label: 'Bridge ID'},
      {Value: bridge.bridgeName,     Label: 'Bridge'},
      {Value: restrictionRef,        Label: 'Reference'},
      {Value: restrictionCategory,   Label: 'Category'},
      {Value: restrictionType,       Label: 'Type'},
      {Value: restrictionValue,      Label: 'Value'},
      {Value: restrictionUnit,       Label: 'Unit'},
      {Value: restrictionStatus,     Label: 'Status'},
      {Value: appliesToVehicleClass, Label: 'Vehicle Class'},
      {Value: permitRequired,        Label: 'Permit Req.'},
      {Value: effectiveFrom,         Label: 'From'},
      {Value: effectiveTo,           Label: 'To'},
      {Value: active,                Label: 'Active'},
      // Inline Retire / Reactivate action buttons per row
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.BridgeRestrictions/AdminService.deactivate',
        Label       : 'Retire',
        Criticality : #Negative,
        Inline      : true,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Eq: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.BridgeRestrictions/AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        Inline      : true,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Ne: [{ $Path: 'active' }, false] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Classification',
        ID    : 'BRClassification',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Restriction Details', Target: '@UI.FieldGroup#BRDetails'},
          {$Type: 'UI.ReferenceFacet', Label: 'Applicability',       Target: '@UI.FieldGroup#BRApplicability'},
        ]
      },
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Physical Limits',
        ID    : 'BRPhysicalLimits',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits (t)',    Target: '@UI.FieldGroup#BRMassLimits'},
          {$Type: 'UI.ReferenceFacet', Label: 'Dimensional Limits', Target: '@UI.FieldGroup#BRDimLimits'},
        ]
      },
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Validity & Approval',
        ID    : 'BRValidity',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Effective Period',    Target: '@UI.FieldGroup#BREffective'},
          {$Type: 'UI.ReferenceFacet', Label: 'Temporary Condition', Target: '@UI.FieldGroup#BRTemporary'},
          {$Type: 'UI.ReferenceFacet', Label: 'Approval & Legal',    Target: '@UI.FieldGroup#BRApproval'},
          {$Type: 'UI.ReferenceFacet', Label: 'Gazette & LLO',       Target: '@UI.FieldGroup#BRGazette'},
          {$Type: 'UI.ReferenceFacet', Label: 'Signage (AS 1742.10)', Target: '@UI.FieldGroup#BRSignage'},
          {$Type: 'UI.ReferenceFacet', Label: 'Enforcement',         Target: '@UI.FieldGroup#BREnforcement'},
        ]
      },
      { $Type: 'UI.ReferenceFacet', Label: 'Permit Provisions', Target: 'provisions/@UI.LineItem' },
    ],
    FieldGroup#BRDetails: {
      Data: [
        {Value: bridge_ID,          Label: 'Bridge'},
        {Value: restrictionRef},    // auto-generated BR-NNNN
        {Value: restrictionCategory},
        {Value: restrictionType},
        {Value: restrictionValue},
        {Value: restrictionUnit},
        {Value: restrictionStatus},
        {Value: active},            // read-only — use Retire / Reactivate buttons
      ]
    },
    FieldGroup#BRApplicability: {
      Data: [
        {Value: appliesToVehicleClass},
        {Value: direction},
        {Value: permitRequired},
        {Value: escortRequired},
        // 'temporary' boolean auto-derived from restrictionCategory — not shown in form
      ]
    },
    FieldGroup#BRMassLimits: {
      Data: [
        {Value: grossMassLimit},
        {Value: axleMassLimit},
      ]
    },
    FieldGroup#BRDimLimits: {
      Data: [
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
      ]
    },
    FieldGroup#BREffective: {
      Data: [
        {Value: effectiveFrom},   // mandatory — see field annotation
        {Value: effectiveTo},
      ]
    },
    // Temporary-only fields — hidden when restrictionCategory != 'Temporary'
    FieldGroup#BRTemporary: {
      Data: [
        {
          $Type : 'UI.DataField',
          Value : temporaryFrom,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
        {
          $Type : 'UI.DataField',
          Value : temporaryTo,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
        {
          $Type : 'UI.DataField',
          Value : temporaryReason,
          ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'restrictionCategory' }, 'Temporary'] } }
        },
      ]
    },
    FieldGroup#BRApproval: {
      Data: [
        {Value: approvedBy},
        {Value: approvalReference},
        {Value: legalReference},
        {Value: issuingAuthority},
        {Value: pilotVehicleCount},
      ]
    },
    // Gazette & Load Limit Order — Roads Act 1993 NSW §§121–124
    FieldGroup#BRGazette: {
      Data: [
        {Value: gazetteNumber},
        {Value: gazettePublicationDate},
        {Value: gazetteExpiryDate},
        {Value: loadLimitOrderRef},
        {Value: loadLimitOrderDate},
        {Value: loadLimitOrderExpiry},
      ]
    },
    // Signage — AS 1742.10
    FieldGroup#BRSignage: {
      Data: [
        {Value: postingSignId},
      ]
    },
    FieldGroup#BREnforcement: {
      Data: [
        {Value: enforcementAuthority},
        {Value: remarks},
      ]
    },
  }
);


annotate AdminService.BridgeRestrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};
