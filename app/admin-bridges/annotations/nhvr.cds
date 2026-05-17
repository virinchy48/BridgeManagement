using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── NhvrRouteAssessments — standalone + Bridge Details ──────────────────
annotate AdminService.NhvrRouteAssessments with {
  assessmentId               @Core.Computed @Common.FieldControl: #ReadOnly  @title: 'Assessment ID';
  iapConditions              @title: 'IAP Conditions';
  structuralAnalysisRequired @title: 'Structural Analysis Required';
  concessionalMass           @title: 'Concessional Mass Scheme';
  lastReviewDate             @title: 'Last Review Date';
  reviewFrequencyMonths      @title: 'Review Frequency (months)';
  // ── HIGH priority addition (NHVR RA Scheme §3) ────────────────────────────
  assessmentMethodology      @title: 'Assessment Methodology'  @Common.QuickInfo: 'NHVR Route Assessment Scheme §3 — required for NHVR submission: Desktop / Field / Load Testing / Combined';
};

annotate AdminService.NhvrRouteAssessments with {
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

annotate AdminService.NhvrRouteAssessments with {
  assessmentStatus @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      CollectionPath: 'NhvrRouteAssessments',
      Parameters: [{ $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'assessmentStatus' }]
    }
  ) @title: 'Assessment Status';
};

annotate AdminService.NhvrRouteAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, assessmentStatus, validFrom, validTo],
  UI.LineItem: [
    {Value: bridge.bridgeId,   Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: assessmentId,      Label: 'Assessment ID'},
    {Value: assessmentDate,    Label: 'Date'},
    {Value: assessmentStatus,  Label: 'Status'},
    {Value: assessorName,      Label: 'Assessor'},
    {Value: assessmentVersion, Label: 'Version'},
    {Value: validFrom,         Label: 'Valid From'},
    {Value: validTo,           Label: 'Valid To'},
    {Value: nhvrApprovalDate,  Label: 'NHVR Approval'},
    {Value: nextReviewDate,    Label: 'Next Review'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'NHVR Route Assessment',
    TypeNamePlural: 'NHVR Route Assessments',
    Title         : {Value: assessmentId},
    Description   : {Value: bridge.bridgeName},
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: 'Assessment Details',    Target: '@UI.FieldGroup#NhvrDetails' },
    { $Type: 'UI.ReferenceFacet', Label: 'NHVR Submission',       Target: '@UI.FieldGroup#NhvrSubmission' },
    { $Type: 'UI.ReferenceFacet', Label: 'Approval Conditions',   Target: '@UI.FieldGroup#NhvrConditions' },
    { $Type: 'UI.ReferenceFacet', Label: 'Approved Vehicle Classes', Target: 'approvedClasses/@UI.LineItem' },
  ],
  UI.FieldGroup#NhvrDetails: {
    Label: 'Assessment',
    Data: [
      { Value: bridge_ID,              Label: 'Bridge' },
      { Value: assessmentId,           Label: 'Assessment ID' },
      { Value: assessmentDate,         Label: 'Assessment Date' },
      { Value: assessmentStatus,       Label: 'Status' },
      { Value: assessmentVersion,      Label: 'Version' },
      { Value: assessmentMethodology,  Label: 'Assessment Methodology' },
      { Value: assessorName,           Label: 'Assessor' },
      { Value: assessorAccreditationNo, Label: 'Assessor Accreditation No.' },
      { Value: validFrom,              Label: 'Valid From' },
      { Value: validTo,                Label: 'Valid To' },
      { Value: nhvrApprovalDate,       Label: 'NHVR Approval Date' },
      { Value: nextReviewDate,         Label: 'Next Review Date' },
    ]
  },
  UI.FieldGroup#NhvrSubmission: {
    Label: 'NHVR Submission',
    Data: [
      { Value: nhvrSubmissionRef,      Label: 'NHVR Submission Reference' },
      { Value: nhvrSubmissionDate,     Label: 'Submission Date' },
      { Value: iapRequired,            Label: 'IAP Required' },
      { Value: iapRouteId,             Label: 'IAP Route ID' },
    ]
  },
  UI.FieldGroup#NhvrConditions: {
    Label: 'Approved Vehicle Classes & Conditions',
    Data: [
      { Value: approvedVehicleClasses,   Label: 'Approved Vehicle Classes' },
      { Value: conditions,               Label: 'Conditions of Approval' },
      { Value: iapConditions,            Label: 'IAP Conditions' },
      { Value: structuralAnalysisRequired, Label: 'Structural Analysis Required' },
      { Value: concessionalMass,         Label: 'Concessional Mass Scheme' },
      { Value: lastReviewDate,           Label: 'Last Review Date' },
      { Value: reviewFrequencyMonths,    Label: 'Review Frequency (months)' },
      { Value: notes,                    Label: 'Notes' },
    ]
  },
);

// ── NhvrApprovedVehicleClasses — sub-table of NHVR Route Assessments ────────
annotate AdminService.NhvrApprovedVehicleClasses with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Approved Class',
    TypeNamePlural: 'Approved Vehicle Classes',
    Title         : {Value: vehicleClass},
    Description   : {Value: assessment.assessmentId},
  },
  UI.LineItem: [
    { Value: vehicleClass, Label: 'Vehicle Class' },
    { Value: maxGrossMass, Label: 'Max Gross Mass (t)' },
    { Value: conditions,   Label: 'Conditions' },
    { Value: active,       Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Vehicle Class Details', ID: 'NhvrClassDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Details', Target: '@UI.FieldGroup#NhvrClassData'}
      ]
    }
  ],
  UI.FieldGroup#NhvrClassData: {
    Label: 'Vehicle Class',
    Data: [
      {Value: vehicleClass,  Label: 'Vehicle Class'},
      {Value: maxGrossMass,  Label: 'Max Gross Mass (t)'},
      {Value: conditions,    Label: 'Conditions'},
      {Value: active,        Label: 'Active'},
    ]
  },
);

