using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// Hide the ID on the Restrictions VH so it doesn't appear as a column
annotate AdminService.Restrictions with {
  ID                    @UI.Hidden;
  bridge                @UI.Hidden;
  parent                @UI.Hidden;
  children              @UI.Hidden;
  createdAt @UI.Hidden; createdBy @UI.Hidden; modifiedAt @UI.Hidden; modifiedBy @UI.Hidden;
  // Auto-generated ref — read-only
  restrictionRef        @Core.Computed @Common.FieldControl: #ReadOnly @title: 'Restriction Ref';
  bridgeRef             @title: 'Bridge ID'
    @Common.Text: bridge.bridgeName
    @Common.TextArrangement: #TextSeparate
    @Common.ValueList: {
      CollectionPath: 'Bridges',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: bridgeRef,         ValueListProperty: 'bridgeId' },
        { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: bridge_ID,         ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: bridge.bridgeName, ValueListProperty: 'bridgeName' },
      ]
    };
  restrictionCategory @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RestrictionCategories', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionCategory, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Category';
  restrictionType @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RestrictionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Restriction Type';
  restrictionValue      @Common.FieldControl: #Mandatory @title: 'Value';
  restrictionUnit @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RestrictionUnits', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionUnit, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Unit';
  restrictionStatus @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RestrictionStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: restrictionStatus, ValueListProperty: 'code' },
    ]}
  ) @title: 'Status';
  active                @Common.FieldControl: #ReadOnly @title: 'Active';
  temporary             @UI.Hidden;
  appliesToVehicleClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'VehicleClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: appliesToVehicleClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Applies to Vehicle Class';
  direction @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RestrictionDirections', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: direction, ValueListProperty: 'code' },
    ]}
  ) @title: 'Direction';
  effectiveFrom         @Common.FieldControl: #Mandatory @title: 'Effective From';
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
  legalEffectiveDate    @title: 'Legal Effective Date';
  issuingAuthority      @title: 'Issuing Authority';
  enforcementAuthority  @title: 'Enforcement Authority';
  reviewDueDate         @title: 'Review Due Date';
  temporaryFrom         @title: 'Temporary From';
  temporaryTo           @title: 'Temporary To';
  temporaryReason       @title: 'Temporary Reason' @UI.MultiLineText;
  remarks               @title: 'Remarks' @UI.MultiLineText;
  postingSignId         @title: 'Posting Sign ID'       @Common.QuickInfo: 'AS 1742.10 sign reference number';
  signRequirements      @title: 'Sign Requirements';
  gazetteNumber         @title: 'Gazette Number'        @Common.QuickInfo: 'NSW Gazette order number (Roads Act 1993 §122)';
  gazettePublicationDate @title: 'Gazette Published';
  gazetteExpiryDate     @title: 'Gazette Expiry'        @Common.QuickInfo: 'Alert generated 90/60/30 days before expiry';
  loadLimitOrderRef     @title: 'Load Limit Order Ref'  @Common.QuickInfo: 'Roads Act 1993 LLO reference';
  loadLimitOrderDate    @title: 'LLO Issued Date';
  loadLimitOrderExpiry  @title: 'LLO Expiry Date';
  pilotVehicleCount     @title: 'Pilot Vehicle Count';
  dateCorrected         @title: 'Date Corrected';
  // ── Posted Limits & Detour ───────────────────────────────────────────────
  postedLoadLimitRigid  @title: 'Posted Load Limit — Rigid (t)'  @Common.QuickInfo: 'Max load for rigid trucks (NHVR HVNL)';
  postedLoadLimitSemi   @title: 'Posted Load Limit — Semi (t)'   @Common.QuickInfo: 'Max load for semitrailers (NHVR HVNL)';
  detourLengthKm        @title: 'Detour Length (km)';
  detourCapable42t      @title: 'Detour Capable >42.5t';
  detourMaxAxleLoad     @title: 'Detour Max Axle Load (t)';
  detourRouteDetails    @title: 'Detour Route Details' @UI.MultiLineText;
  // ── Repairs Programme ────────────────────────────────────────────────────
  repairsProposal @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { CollectionPath: 'RepairsProposalTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: repairsProposal, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' }
    ]}
  ) @title: 'Repairs Proposal';
  estimatedRepairCost   @title: 'Estimated Repair Cost (AUD)';
  programmeYear         @title: 'Programme Year';
  restrictionComments   @title: 'Comments' @UI.MultiLineText;
  reviewCriticality     @UI.Hidden;
  name                  @UI.Hidden;
  descr                 @UI.Hidden;
};

annotate AdminService.Restrictions with @(
  Common.Label: 'Restrictions',
  Capabilities.InsertRestrictions.Insertable  : true,
  Capabilities.UpdateRestrictions.Updatable   : true,
  Capabilities.DeleteRestrictions.Deletable   : false,
  UI: {
    HeaderInfo: {
      TypeName      : 'Restriction',
      TypeNamePlural: 'Restrictions',
      Title         : { Value: restrictionRef },
      Description   : { Value: restrictionType }
    },
    SelectionFields: [ bridgeRef, restrictionCategory, restrictionType, restrictionStatus, appliesToVehicleClass, effectiveFrom ],
    LineItem: [
      { Value: bridgeRef,             Label: 'Bridge ID' },
      { Value: bridge.bridgeName,     Label: 'Bridge' },
      { Value: restrictionRef,        Label: 'Ref' },
      { Value: restrictionCategory,   Label: 'Category' },
      { Value: restrictionType,       Label: 'Type' },
      { Value: restrictionValue,      Label: 'Value' },
      { Value: restrictionUnit,       Label: 'Unit' },
      { Value: restrictionStatus,     Label: 'Status' },
      { Value: appliesToVehicleClass, Label: 'Vehicle Class' },
      { Value: effectiveFrom,         Label: 'From' },
      { Value: effectiveTo,           Label: 'To' },
      { Value: gazetteExpiryDate,     Label: 'Gazette Expiry',
        Criticality: { $edmJson: { $If: [
          { $Le: [{ $Path: 'reviewCriticality' }, 2] }, 2, 3
        ]}} },
    ],
    Facets: [
      { $Type: 'UI.CollectionFacet', Label: 'Restriction Details', ID: 'RestrDetails', Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Core Details',       Target: '@UI.FieldGroup#RestrCore' },
        { $Type: 'UI.ReferenceFacet', Label: 'Limits & Vehicle',   Target: '@UI.FieldGroup#RestrLimits' },
        { $Type: 'UI.ReferenceFacet', Label: 'Authority & Gazette', Target: '@UI.FieldGroup#RestrAuthority' },
      ]},
      { $Type: 'UI.CollectionFacet', Label: 'Posted Limits & Detour', ID: 'DetourDetails', Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Posted Limits',      Target: '@UI.FieldGroup#RestrPosted' },
        { $Type: 'UI.ReferenceFacet', Label: 'Detour Route',       Target: '@UI.FieldGroup#RestrDetour' },
      ]},
      { $Type: 'UI.ReferenceFacet',   Label: 'Provisions',         Target: 'restrProvisions/@UI.LineItem', ID: 'ProvisionsTab' },
      { $Type: 'UI.CollectionFacet', Label: 'Repairs Programme',   ID: 'RepairsProg', Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Repairs & Programme', Target: '@UI.FieldGroup#RestrRepairs' },
      ]},
    ],
    FieldGroup#RestrCore: { Data: [
      { Value: restrictionRef },
      { Value: bridgeRef },
      { Value: restrictionCategory },
      { Value: restrictionType },
      { Value: restrictionValue },
      { Value: restrictionUnit },
      { Value: restrictionStatus },
      { Value: active },
      { Value: effectiveFrom },
      { Value: effectiveTo },
      { Value: direction },
      { Value: temporaryFrom },
      { Value: temporaryTo },
      { Value: temporaryReason },
      { Value: reviewDueDate },
    ]},
    FieldGroup#RestrLimits: { Data: [
      { Value: appliesToVehicleClass },
      { Value: grossMassLimit },
      { Value: axleMassLimit },
      { Value: heightLimit },
      { Value: widthLimit },
      { Value: lengthLimit },
      { Value: speedLimit },
      { Value: permitRequired },
      { Value: escortRequired },
      { Value: pilotVehicleCount },
    ]},
    FieldGroup#RestrAuthority: { Data: [
      { Value: approvedBy },
      { Value: approvalReference },
      { Value: issuingAuthority },
      { Value: enforcementAuthority },
      { Value: legalReference },
      { Value: legalEffectiveDate },
      { Value: gazetteNumber },
      { Value: gazettePublicationDate },
      { Value: gazetteExpiryDate },
      { Value: loadLimitOrderRef },
      { Value: loadLimitOrderDate },
      { Value: loadLimitOrderExpiry },
      { Value: postingSignId },
      { Value: signRequirements },
      { Value: remarks },
    ]},
    FieldGroup#RestrPosted: { Data: [
      { Value: postedLoadLimitRigid },
      { Value: postedLoadLimitSemi },
      { Value: dateCorrected },
    ]},
    FieldGroup#RestrDetour: { Data: [
      { Value: detourLengthKm },
      { Value: detourCapable42t },
      { Value: detourMaxAxleLoad },
      { Value: detourRouteDetails },
    ]},
    FieldGroup#RestrRepairs: { Data: [
      { Value: repairsProposal },
      { Value: estimatedRepairCost },
      { Value: programmeYear },
      { Value: restrictionComments },
    ]},
    Identification: [
      { $Type: 'UI.DataFieldForAction', Action: 'AdminService.Restrictions/AdminService.deactivate',
        Label: 'Retire (Soft-Delete)', Criticality: #Negative,
        ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } } },
      { $Type: 'UI.DataFieldForAction', Action: 'AdminService.Restrictions/AdminService.reactivate',
        Label: 'Reactivate', Criticality: #Positive,
        ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } } },
    ],
  }
);


annotate AdminService.Restrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};
