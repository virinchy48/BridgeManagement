using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── LoadRatingCertificates — standalone + Bridge Details ────────────────
// PURPOSE: Formal certification document (legal instrument). An accredited engineer
// signs off on load-carrying capacity. References the per-vehicle-class assessment
// values recorded in the Load Ratings tile (BridgeLoadRatings).
// WHEN TO USE: After completing per-class assessments in Load Ratings tile, create
// a Certificate here to record the formal approval and expiry.
annotate AdminService.LoadRatingCertificates with {
  ratingBasis          @title: 'Rating Basis'
    @Common.QuickInfo: 'Engineering standard used (AS 5100, NAASRA, Load Testing). Record the per-vehicle-class assessment values in the Load Ratings tile; this certificate formalises the overall result.';
  jurisdictionApproval @title: 'Jurisdiction Approval Reference';
  approvalDate         @title: 'Approval Date';
  status               @title: 'Status';
  ratingStandard       @title: 'Rating Standard';
  certificateIssueDate @title: 'Issue Date';
  certificateExpiryDate @title: 'Expiry Date';
};

annotate AdminService.LoadRatingCertificates with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
};

annotate AdminService.LoadRatingCertificates with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, status, ratingStandard, certificateIssueDate],
  UI.LineItem: [
    {Value: bridge.bridgeId,       Label: 'Bridge ID'},
    {Value: bridge.bridgeName,     Label: 'Bridge'},
    {Value: certificateNumber,     Label: 'Certificate #'},
    {Value: status,                Label: 'Status'},
    {Value: ratingStandard,        Label: 'Standard'},
    {Value: ratingLevel,           Label: 'Rating Level'},
    {Value: certifyingEngineer,    Label: 'Engineer'},
    {Value: engineerOrganisation,  Label: 'Organisation'},
    {Value: certificateIssueDate,  Label: 'Issued'},
    {Value: certificateExpiryDate, Label: 'Expires'},
    {Value: rfT44,                  Label: 'RF (T44)'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Load Rating Certificate',
    TypeNamePlural: 'Load Rating Certificates',
    Title         : {Value: certificateNumber},
    Description   : {Value: status},
  },
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Certificate Details',
      ID    : 'LRCDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Certificate',    Target: '@UI.FieldGroup#LRCCertificate'},
        {$Type: 'UI.ReferenceFacet', Label: 'Load Factors',  Target: '@UI.FieldGroup#LRCLoadFactors'},
        {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life',  Target: '@UI.FieldGroup#LRCFatigue'},
        {$Type: 'UI.ReferenceFacet', Label: 'Supersession & Notes', Target: '@UI.FieldGroup#LRCSupersession'},
      ]
    },
  ],
  UI.FieldGroup#LRCCertificate: {
    Label: 'Certificate',
    Data: [
      {Value: bridge_ID,             Label: 'Bridge'},
      {Value: certificateNumber,     Label: 'Certificate Number'},
      {Value: certificateVersion,    Label: 'Version'},
      {Value: status,                Label: 'Status'},
      {Value: ratingStandard,        Label: 'Rating Standard'},
      {Value: ratingLevel,           Label: 'Rating Level'},
      {Value: certifyingEngineer,    Label: 'Certifying Engineer'},
      {Value: engineerQualification, Label: 'Qualification'},
      {Value: engineerLicenseNumber, Label: 'License Number'},
      {Value: engineerOrganisation,  Label: 'Organisation'},
      {Value: certificateIssueDate,  Label: 'Issue Date'},
      {Value: certificateExpiryDate, Label: 'Expiry Date'},
      {Value: nextReviewDate,        Label: 'Next Review Date'},
      {Value: governingMember,       Label: 'Governing Member'},
      {Value: governingFailureMode,  Label: 'Governing Failure Mode'},
    ]
  },
  UI.FieldGroup#LRCLoadFactors: {
    Label: 'Load Rating Factors (AS 5100.7)',
    Data: [
      {Value: rfT44,    Label: 'T44'},
      {Value: rfSM1600, Label: 'SM1600'},
      {Value: rfHLP400, Label: 'HLP400'},
      {Value: rfW80,    Label: 'W80'},
      {Value: rfA160,   Label: 'A160'},
      {Value: rfPBS1,   Label: 'PBS 1'},
      {Value: rfPBS2,   Label: 'PBS 2'},
      {Value: rfPBS3,   Label: 'PBS 3'},
      {Value: rfPBS4,   Label: 'PBS 4'},
      {Value: rfPBS5,   Label: 'PBS 5'},
      {Value: rfHML,    Label: 'HML'},
      {Value: rfCML,    Label: 'CML'},
      {Value: dynamicLoadAllowance, Label: 'DLA'},
    ]
  },
  UI.FieldGroup#LRCFatigue: {
    Label: 'Fatigue Life (AS 5100.6 §13.5)',
    Data: [
      {Value: fatigueSensitive,     Label: 'Fatigue Sensitive'},
      {Value: consumedLifePercent,  Label: 'Consumed Life (%)'},
      {Value: remainingLifeYears,   Label: 'Remaining Life (years)'},
      {Value: detailCategory,       Label: 'Detail Category'},
      {Value: trafficSpectrumRef,   Label: 'Traffic Spectrum Reference'},
    ]
  },
  UI.FieldGroup#LRCSupersession: {
    Label: 'Supersession & Notes',
    Data: [
      {Value: governingCapacityType,  Label: 'Governing Capacity Type'},
      {Value: expiryWarningDays,      Label: 'Expiry Warning (days)'},
      {Value: previousCertId,         Label: 'Previous Certificate ID'},
      {Value: supersessionReason,     Label: 'Supersession Reason'},
      {Value: conditions,             Label: 'Conditions of Rating'},
      {Value: ratingBasis,            Label: 'Rating Basis'},
      {Value: jurisdictionApproval,   Label: 'Jurisdiction Approval Reference'},
      {Value: approvalDate,           Label: 'Approval Date'},
      {Value: reportStorageRef,       Label: 'Report Storage Reference'},
      {Value: notes,                  Label: 'Notes'},
    ]
  },
);


annotate AdminService.BridgeLoadRatings with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Load Rating',
    TypeNamePlural: 'Load Ratings',
    Title         : { Value: ratingRef },
    Description   : { Value: vehicleClass }
  },
  UI.SelectionFields: [ bridgeRef, ratingRef, vehicleClass, ratingMethod, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: ratingRef,       Label: 'Rating Ref' },
    { Value: vehicleClass,    Label: 'Vehicle Class' },
    { Value: ratingMethod,    Label: 'Method' },
    { Value: ratingFactor,    Label: 'Rating Factor' },
    { Value: grossMassLimit,  Label: 'Mass Limit (t)' },
    { Value: assessedBy,      Label: 'Assessed By' },
    { Value: assessmentDate,  Label: 'Assessment Date' },
    { Value: validTo,         Label: 'Valid To' },
    { Value: status,          Label: 'Status' },
    { Value: active,          Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Rating Details', ID: 'RatingDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Classification', Target: '@UI.FieldGroup#LrtClass' },
      { $Type: 'UI.ReferenceFacet', Label: 'Limits',         Target: '@UI.FieldGroup#LrtLimits' },
      { $Type: 'UI.ReferenceFacet', Label: 'Assessment',     Target: '@UI.FieldGroup#LrtAssessment' },
    ]},
  ],
  UI.FieldGroup#LrtClass: {
    Label: 'Classification',
    Data: [
      { Value: bridgeRef,    Label: 'Bridge' },
      { Value: ratingRef,    Label: 'Rating Ref' },
      { Value: vehicleClass, Label: 'Vehicle Class' },
      { Value: ratingMethod, Label: 'Rating Method' },
      { Value: status,       Label: 'Status' },
      { Value: active,       Label: 'Active' },
    ]
  },
  UI.FieldGroup#LrtLimits: {
    Label: 'Limits',
    Data: [
      { Value: ratingFactor,   Label: 'Rating Factor' },
      { Value: grossMassLimit, Label: 'Gross Mass Limit (t)' },
    ]
  },
  UI.FieldGroup#LrtAssessment: {
    Label: 'Assessment',
    Data: [
      { Value: assessedBy,     Label: 'Assessed By' },
      { Value: assessmentDate, Label: 'Assessment Date' },
      { Value: validTo,        Label: 'Valid To' },
      { Value: remarks,        Label: 'Remarks' },
    ]
  },
  UI.Identification: [
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

// PURPOSE: Per-vehicle-class engineering assessment values (T44, SM1600, HML, PBS etc).
// Records the rating factor and mass limit for EACH vehicle class separately.
// WHEN TO USE: After a load rating inspection. Once all classes are assessed, create
// a formal Load Rating Certificate in the Certificates tile to capture the approved result.
annotate AdminService.BridgeLoadRatings with {
  ID            @Core.Computed;
  createdBy     @UI.Hidden;  createdAt     @UI.Hidden;
  modifiedBy    @UI.Hidden;  modifiedAt    @UI.Hidden;
  bridge        @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  ratingRef     @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Rating Ref (auto-generated)';
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
  vehicleClass  @Common.FieldControl: #Mandatory  @title: 'Vehicle Class';
  ratingMethod  @title: 'Rating Method';
  ratingFactor  @title: 'Rating Factor'  @Common.QuickInfo: 'Valid range: 0.0 – 2.0';
  grossMassLimit @title: 'Gross Mass Limit (t)'  @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  assessedBy    @title: 'Assessed By';
  assessmentDate @title: 'Assessment Date';
  validTo       @title: 'Valid To';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
  ratingEngineerNer    @title: 'Rating Engineer NER/CPEng No.';
  governingMember      @title: 'Governing Structural Member';
  governingFailureMode @title: 'Governing Failure Mode';
  dynamicLoadAllowance @title: 'Dynamic Load Allowance (DLA)';
  reportRef            @title: 'Structural Report Reference';
};

annotate AdminService.BridgeLoadRatings with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active', 'status'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active', 'status'] };
};

////////////////////////////////////////////////////////////////////////////
//  BridgePermits (PRM tile) — permit applications and approvals
////////////////////////////////////////////////////////////////////////////
