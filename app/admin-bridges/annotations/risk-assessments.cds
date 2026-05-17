using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── BridgeRiskAssessments — standalone + Bridge Details ─────────────────
annotate AdminService.BridgeRiskAssessments with {
  riskType             @title: 'Risk Type'              @Common.QuickInfo: 'TfNSW Risk Framework §3 — primary hazard category: Structural / Hydraulic / Geotechnical / Operational / Environmental / Compliance / Safety';
  riskCategory         @title: 'Risk Category'          @Common.QuickInfo: 'TfNSW Risk Framework §3 — asset risk grouping for portfolio reporting';
  riskOwner            @title: 'Risk Owner';
  s4MaintenancePlan    @title: 'S/4 Maintenance Plan'    @UI.Hidden;
  s4FunctionalLocation @title: 'S/4 Functional Location' @UI.Hidden;
  monitoringFrequency  @title: 'Monitoring Frequency';
  // ── HIGH priority additions (ISO 31000 §6.5–6.7) ─────────────────────────
  residualLikelihood   @title: 'Residual Likelihood (1–5)'   @Common.QuickInfo: 'ISO 31000 §6.6 — post-control likelihood score; used to compute residualRiskScore with transparency';
  residualConsequence  @title: 'Residual Consequence (1–5)'  @Common.QuickInfo: 'ISO 31000 §6.6 — post-control consequence score; input to residualRiskScore calculation';
  riskRegisterStatus   @title: 'Risk Register Status'        @Common.QuickInfo: 'ISO 31000 §6.7 — lifecycle status: Open / Escalated / Accepted / Treated / Closed';
  treatmentStatus      @title: 'Treatment Status'            @Common.QuickInfo: 'ISO 31000 §6.5 — progress of treatment programme: Not Started / In Progress / Completed / Deferred / Cancelled';
};

annotate AdminService.BridgeRiskAssessments with {
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
  assessmentId              @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Assessment ID (auto-generated)';
  assessmentDate            @title: 'Assessment Date';
  assessmentCycle           @title: 'Assessment Cycle';
  riskType                  @title: 'Risk Type';
  riskDescription           @title: 'Risk Description'                 @UI.MultiLineText;
  potentialConsequence      @title: 'Potential Consequence'            @UI.MultiLineText;
  likelihood                @title: 'Likelihood (1–5)';
  likelihoodJustification   @title: 'Likelihood Justification'         @UI.MultiLineText;
  consequence               @title: 'Consequence (1–5)';
  consequenceJustification  @title: 'Consequence Justification'        @UI.MultiLineText;
  inherentRiskScore         @Core.Computed  @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Auto-calculated: Likelihood × Consequence'  @title: 'Inherent Risk Score';
  inherentRiskLevel         @Core.Computed  @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Auto-calculated: Likelihood × Consequence'  @title: 'Inherent Risk Level';
  existingControls          @title: 'Existing Controls'                @UI.MultiLineText;
  controlEffectiveness      @title: 'Control Effectiveness';
  residualRiskScore         @title: 'Residual Risk Score';
  residualRiskLevel         @title: 'Residual Risk Level';
  residualRiskAcceptable    @title: 'Residual Risk Acceptable';
  riskTreatmentStrategy     @title: 'Treatment Strategy';
  treatmentActions          @title: 'Treatment Actions'                @UI.MultiLineText;
  treatmentResponsible      @title: 'Responsible Officer';
  treatmentDeadline         @title: 'Treatment Deadline';
  treatmentBudget           @title: 'Treatment Budget ($)';
  assessor                  @title: 'Assessor';
  assessorTitle             @title: 'Assessor Title';
  reviewDueDate             @title: 'Review Due Date';
  lastReviewDate            @title: 'Last Review Date';
  linkedInspection          @title: 'Linked Inspection'
    @Common.Text: linkedInspection.inspectionRef  @Common.TextArrangement: #TextOnly;
  linkedDefect              @title: 'Linked Defect'
    @Common.Text: linkedDefect.defectId  @Common.TextArrangement: #TextOnly;
  notes                     @title: 'Notes'                            @UI.MultiLineText;
  riskCategory              @title: 'Risk Category';
  active                    @title: 'Active'                           @UI.Hidden;
};

annotate AdminService.BridgeRiskAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, riskType, riskCategory, residualRiskLevel, treatmentDeadline],
  UI.LineItem: [
    {Value: bridge.bridgeId,    Label: 'Bridge ID'},
    {Value: bridge.bridgeName,  Label: 'Bridge'},
    {Value: assessmentDate,      Label: 'Date'},
    {Value: riskType,            Label: 'Risk Type'},
    {Value: riskCategory,        Label: 'Category'},
    {Value: riskDescription,     Label: 'Description'},
    {Value: inherentRiskLevel,   Label: 'Inherent Level'},
    {Value: residualRiskLevel,   Label: 'Residual Level'},
    {Value: residualRiskScore,   Label: 'Score'},
    {Value: treatmentDeadline,   Label: 'Treatment Due'},
    {Value: assessor,            Label: 'Assessor'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Risk Assessment',
    TypeNamePlural: 'Risk Assessments',
    Title         : {Value: riskType},
    Description   : {Value: residualRiskLevel},
  },
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Risk Assessment', ID: 'RiskDetails', Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Risk Overview',      Target: '@UI.FieldGroup#RiskOverview'},
      {$Type: 'UI.ReferenceFacet', Label: 'Risk Matrix',        Target: '@UI.FieldGroup#RiskMatrix'},
      {$Type: 'UI.ReferenceFacet', Label: 'Treatment',          Target: '@UI.FieldGroup#RiskTreatment'},
    ]},
  ],
  UI.FieldGroup#RiskOverview: {
    Label: 'Risk Overview',
    Data: [
      {Value: bridge_ID,        Label: 'Bridge'},
      {Value: assessmentId,     Label: 'Assessment ID'},
      {Value: assessmentDate,   Label: 'Assessment Date'},
      {Value: assessmentCycle,  Label: 'Assessment Cycle'},
      {Value: riskType,         Label: 'Risk Type'},
      {Value: riskCategory,     Label: 'Risk Category'},
      {Value: assessor,         Label: 'Assessor'},
      {Value: assessorTitle,    Label: 'Assessor Title / Qualification'},
      {Value: lastReviewDate,   Label: 'Last Reviewed'},
      {Value: reviewDueDate,    Label: 'Next Review Due'},
    ]
  },
  UI.FieldGroup#RiskMatrix: {
    Label: 'Risk Quantification (TfNSW 5×5 Risk Matrix)',
    Data: [
      {Value: riskDescription,          Label: 'Risk Description'},
      {Value: potentialConsequence,     Label: 'Potential Consequence'},
      {Value: likelihood,               Label: 'Likelihood (1=Rare – 5=Almost Certain)'},
      {Value: likelihoodJustification,  Label: 'Likelihood Justification'},
      {Value: consequence,              Label: 'Consequence (1=Negligible – 5=Catastrophic)'},
      {Value: consequenceJustification, Label: 'Consequence Justification'},
      {Value: inherentRiskScore,        Label: 'Inherent Risk Score (L × C)'},
      {Value: inherentRiskLevel,        Label: 'Inherent Risk Level'},
      {Value: existingControls,         Label: 'Existing Controls'},
      {Value: controlEffectiveness,     Label: 'Control Effectiveness'},
      {Value: residualLikelihood,       Label: 'Residual Likelihood (1–5)'},
      {Value: residualConsequence,      Label: 'Residual Consequence (1–5)'},
      {Value: residualRiskScore,        Label: 'Residual Risk Score'},
      {Value: residualRiskLevel,        Label: 'Residual Risk Level'},
      {Value: residualRiskAcceptable,   Label: 'Residual Risk Acceptable'},
    ]
  },
  UI.FieldGroup#RiskTreatment: {
    Label: 'Treatment Plan',
    Data: [
      {Value: riskRegisterStatus,     Label: 'Risk Register Status'},
      {Value: riskTreatmentStrategy,  Label: 'Treatment Strategy'},
      {Value: treatmentStatus,        Label: 'Treatment Status'},
      {Value: treatmentActions,       Label: 'Treatment Actions'},
      {Value: treatmentResponsible,   Label: 'Responsible Officer'},
      {Value: riskOwner,              Label: 'Risk Owner'},
      {Value: monitoringFrequency,    Label: 'Monitoring Frequency'},
      {Value: treatmentDeadline,      Label: 'Treatment Deadline'},
      {Value: treatmentBudget,        Label: 'Treatment Budget ($)'},
      {Value: linkedInspection.inspectionRef, Label: 'Linked Inspection'},
      {Value: linkedDefect.defectId,          Label: 'Linked Defect'},
      {Value: notes,                  Label: 'Notes'},
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
  ],
);

annotate AdminService.BridgeRiskAssessments with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active', 'riskLevel'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active'] };
};

