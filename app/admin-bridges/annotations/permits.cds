using { AdminService } from '../../../srv/admin-service';
using from '../../common';

annotate AdminService.BridgePermits with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Permit',
    TypeNamePlural: 'Permits',
    Title         : { Value: permitRef },
    Description   : { Value: permitType }
  },
  UI.SelectionFields: [ bridgeRef, permitRef, permitType, vehicleClass, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: permitRef,      Label: 'Permit Ref' },
    { Value: permitType,     Label: 'Type' },
    { Value: applicantName,  Label: 'Applicant' },
    { Value: vehicleClass,   Label: 'Vehicle Class' },
    { Value: grossMass,      Label: 'Gross Mass (t)' },
    { Value: appliedDate,    Label: 'Applied' },
    { Value: validFrom,      Label: 'Valid From' },
    { Value: validTo,        Label: 'Valid To' },
    { Value: status,         Label: 'Status' },
    { Value: active,         Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Permit Details', ID: 'PermitDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Application',  Target: '@UI.FieldGroup#PrmApplication' },
      { $Type: 'UI.ReferenceFacet', Label: 'Vehicle',      Target: '@UI.FieldGroup#PrmVehicle' },
      { $Type: 'UI.ReferenceFacet', Label: 'Decision',     Target: '@UI.FieldGroup#PrmDecision' },
    ]},
  ],
  UI.FieldGroup#PrmApplication: {
    Label: 'Application',
    Data: [
      { Value: bridgeRef,         Label: 'Bridge' },
      { Value: permitRef,         Label: 'Permit Ref' },
      { Value: permitType,        Label: 'Permit Type' },
      { Value: permitCategory,    Label: 'Permit Category' },
      { Value: applicantName,     Label: 'Applicant Name' },
      { Value: applicantABN,      Label: 'Applicant ABN' },
      { Value: applicantEmail,    Label: 'Applicant Email' },
      { Value: applicantPhone,    Label: 'Applicant Phone' },
      { Value: appliedDate,       Label: 'Applied Date' },
      { Value: validFrom,         Label: 'Valid From' },
      { Value: validTo,           Label: 'Valid To' },
      { Value: status,            Label: 'Status' },
      { Value: active,            Label: 'Active' },
    ]
  },
  UI.FieldGroup#PrmVehicle: {
    Label: 'Vehicle Details',
    Data: [
      { Value: vehicleClass,       Label: 'Vehicle Class' },
      { Value: vehicleRegistration, Label: 'Vehicle Registration' },
      { Value: vehicleDescription, Label: 'Vehicle Description' },
      { Value: axleConfiguration,  Label: 'Axle Configuration' },
      { Value: grossMass,          Label: 'Gross Mass (t)' },
      { Value: height,             Label: 'Height (m)' },
      { Value: width,              Label: 'Width (m)' },
      { Value: length,             Label: 'Length (m)' },
      { Value: routeDescription,   Label: 'Route Description' },
    ]
  },
  UI.FieldGroup#PrmDecision: {
    Label: 'Decision',
    Data: [
      { Value: decisionBy,           Label: 'Decision By' },
      { Value: decisionDate,         Label: 'Decision Date' },
      { Value: conditionsOfApproval, Label: 'Conditions of Approval' },
      { Value: rejectionReason,      Label: 'Rejection Reason (HVNL §162)' },
      { Value: remarks,              Label: 'Remarks' },
    ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.approve',
      Label      : 'Approve',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Or: [
        { $Not: { $Path: 'IsActiveEntity' } },
        { $Ne: [{ $Path: 'status' }, 'Pending'] }
      ] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.rejectPermit',
      Label      : 'Reject',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Or: [
        { $Not: { $Path: 'IsActiveEntity' } },
        { $Ne: [{ $Path: 'status' }, 'Pending'] }
      ] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.deactivate',
      Label      : 'Deactivate',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.reactivate',
      Label      : 'Reactivate',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } }
    }
  ]
);

annotate AdminService.BridgePermits with {
  ID            @Core.Computed;
  createdBy     @UI.Hidden;  createdAt     @UI.Hidden;
  modifiedBy    @UI.Hidden;  modifiedAt    @UI.Hidden;
  bridge        @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  permitRef     @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Permit Ref (auto-generated)';
  bridgeRef @(
    Common.FieldControl    : #Mandatory,
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut',       ValueListProperty: 'bridgeId',   LocalDataProperty: bridgeRef },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' }
      ]
    }
  ) @title: 'Bridge';
  permitType    @Common.FieldControl: #Mandatory  @title: 'Permit Type';
  applicantName @Common.FieldControl: #Mandatory  @title: 'Applicant Name';
  vehicleClass  @title: 'Vehicle Class';
  grossMass     @title: 'Gross Mass (t)'   @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  height        @title: 'Height (m)'       @Common.QuickInfo: 'Valid range: 0 – 30 m';
  width         @title: 'Width (m)'        @Common.QuickInfo: 'Valid range: 0 – 100 m';
  length        @title: 'Length (m)'       @Common.QuickInfo: 'Valid range: 0 – 1,000 m';
  appliedDate   @title: 'Applied Date';
  validFrom     @title: 'Valid From';
  validTo       @title: 'Valid To';
  decisionBy    @title: 'Decision By'  @Common.FieldControl: #ReadOnly;
  decisionDate  @title: 'Decision Date' @Common.FieldControl: #ReadOnly;
  conditionsOfApproval @UI.MultiLineText  @title: 'Conditions of Approval';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
  nhvrPermitNumber      @title: 'NHVR Permit Number';
  nhvrApplicationNumber @title: 'NHVR Application Number';
  tripCount             @title: 'Trips Approved';
  axleConfiguration     @title: 'Axle Configuration';
  escortRequired        @title: 'Escort Required';
  pilotVehicleCount     @title: 'Pilot Vehicle Count';
  permitCategory        @title: 'Permit Category';
  applicantABN          @title: 'Applicant ABN';
  applicantEmail        @title: 'Applicant Email';
  applicantPhone        @title: 'Applicant Phone';
  vehicleDescription    @title: 'Vehicle Description'  @UI.MultiLineText;
  routeDescription      @title: 'Route Description'    @UI.MultiLineText;
  // ── HIGH priority additions (HVNL §156, HVNL §162) ───────────────────────
  vehicleRegistration   @title: 'Vehicle Registration'  @Common.QuickInfo: 'HVNL §156 — permit is vehicle-specific; registration number is legally required for enforcement';
  rejectionReason       @title: 'Rejection Reason'      @Common.QuickInfo: 'HVNL §162 — mandatory written statement of reason for permit refusal'  @UI.MultiLineText;
};

annotate AdminService.BridgePermits with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active'] };
  approve      @Common.SideEffects: { TargetProperties: ['status', 'decisionBy', 'decisionDate'] };
  rejectPermit @Common.SideEffects: { TargetProperties: ['status', 'decisionBy', 'decisionDate'] };
};

