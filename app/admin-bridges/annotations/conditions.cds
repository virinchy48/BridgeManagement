using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  BridgeConditionSurveys (CON tile) — standalone condition survey records
//
//  PURPOSE: Holistic bridge condition assessment per AGAM §5.2 / AS 5100-7 Table 4.
//  WHEN TO USE: A Condition Survey is a formal engineering assessment that produces an
//  overall condition rating and grade — typically done annually or post-event. It is
//  MORE FORMAL than a routine inspection. Key distinction:
//    • Inspections tile   — WHAT was observed: element-level defect recording, accreditation-
//                           gated, raw field notes, links to defects.
//    • Condition Surveys  — WHAT is the verdict: holistic 1-10 rating + overall grade,
//                           workflow (Draft → Submitted → Approved), syncs back to Bridge
//                           conditionRating on approval.
//  Routine inspections feed the Inspections register; engineering judgement assessments
//  that produce a formal grade go here.
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeConditionSurveys with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Condition Survey',
    TypeNamePlural: 'Condition Surveys',
    Title         : { Value: surveyRef },
    Description   : { Value: surveyDate }
  },
  UI.SelectionFields: [ bridgeRef, surveyRef, surveyType, overallGrade, status, active ],
  UI.LineItem: [
    { Value: bridge.bridgeId,  Label: 'Bridge ID' },
    { Value: bridge.bridgeName, Label: 'Bridge' },
    { Value: surveyRef,        Label: 'Survey Ref' },
    { Value: surveyDate,       Label: 'Survey Date' },
    { Value: surveyType,       Label: 'Type' },
    { Value: surveyedBy,       Label: 'Surveyed By' },
    { Value: conditionRating,  Label: 'Condition Rating' },
    { Value: overallGrade,     Label: 'Grade' },
    { Value: status,           Label: 'Status' },
    { Value: active,           Label: 'Active' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Survey Details', ID: 'SurveyDetails', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'General',     Target: '@UI.FieldGroup#ConSurveyGeneral' },
      { $Type: 'UI.ReferenceFacet', Label: 'Ratings',     Target: '@UI.FieldGroup#ConSurveyRatings' },
      { $Type: 'UI.ReferenceFacet', Label: 'Notes',       Target: '@UI.FieldGroup#ConSurveyNotes' },
    ]},
  ],
  UI.FieldGroup#ConSurveyGeneral: {
    Label: 'General',
    Data: [
      { Value: bridgeRef,                  Label: 'Bridge' },
      { Value: surveyRef,                  Label: 'Survey Ref' },
      { Value: surveyDate,                 Label: 'Survey Date' },
      { Value: programmeYear,              Label: 'Programme Year' },
      { Value: surveyType,                 Label: 'Survey Type' },
      { Value: surveyedBy,                 Label: 'Surveyed By' },
      { Value: inspectorAccreditationLevel, Label: 'Inspector Accreditation Level' },
      { Value: accessMethod,               Label: 'Access Method' },
      { Value: linkedInspectionRef,        Label: 'Linked Inspection Ref' },
      { Value: nextSurveyRecommended,      Label: 'Next Survey Recommended' },
      { Value: estimatedRehabCost,         Label: 'Estimated Rehab Cost (AUD)' },
      { Value: actionPlan,                 Label: 'Action Plan' },
      { Value: status,                     Label: 'Status' },
      { Value: active,                     Label: 'Active' },
    ]
  },
  UI.FieldGroup#ConSurveyRatings: {
    Label: 'Ratings',
    Data: [
      { Value: conditionRating,  Label: 'Condition Rating (1–10)' },
      { Value: structuralRating, Label: 'Structural Rating (1–10)' },
      { Value: overallGrade,     Label: 'Overall Grade' },
    ]
  },
  UI.FieldGroup#ConSurveyNotes: {
    Label: 'Notes',
    Data: [ { Value: notes, Label: 'Notes' }, { Value: remarks, Label: 'Remarks' } ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.submitForReview',
      Label      : 'Submit for Review',
      Criticality: #Warning,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Draft'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.approveSurvey',
      Label      : 'Approve',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Submitted'] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.rejectSurvey',
      Label      : 'Reject Survey',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Submitted'] } }
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

annotate AdminService.BridgeConditionSurveys with {
  ID         @Core.Computed;
  createdBy  @UI.Hidden;  createdAt  @UI.Hidden;
  modifiedBy @UI.Hidden;  modifiedAt @UI.Hidden;
  bridge     @UI.Hidden;   // FK resolved via bridgeRef; navigation used for display text only
  surveyRef  @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Survey Ref (auto-generated)';
  // ── HIGH priority additions (TfNSW-BIM §3.2, AGAM §5.2) ─────────────────
  linkedInspectionRef @title: 'Linked Inspection Ref'  @Common.QuickInfo: 'TfNSW-BIM §3.2 — reference to the Principal inspection record that underpins this survey';
  programmeYear       @title: 'Programme Year'         @Common.QuickInfo: 'AGAM §5.2 — maintenance programme year this survey is scheduled against (e.g. 2026)';
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
  surveyDate @Common.FieldControl: #Mandatory  @title: 'Survey Date';
  inspectorAccreditationLevel @title: 'Inspector Accreditation Level';
  accessMethod                @title: 'Access Method';
  nextSurveyRecommended       @title: 'Next Survey Recommended';
  estimatedRehabCost          @title: 'Estimated Rehab Cost (AUD)';
  actionPlan                  @title: 'Action Plan'  @UI.MultiLineText;
  surveyType @title: 'Survey Type';
  surveyedBy @title: 'Surveyed By';
  conditionRating @title: 'Condition Rating (1–10)'  @Common.QuickInfo: 'Overall bridge condition 1 (failed) – 10 (new). Distinct from individual inspection element ratings — this is the surveyors holistic judgement per AGAM §5.2. Feeds back to the Bridge master conditionRating field on survey approval.';
  structuralRating @title: 'Structural Rating (1–10)' @Common.QuickInfo: 'Structural adequacy component 1 – 10. Separate from conditionRating — a bridge can have good overall condition but a lower structural rating due to design deficiencies.';
  overallGrade @title: 'Overall Grade';
  notes    @UI.MultiLineText  @title: 'Notes';
  remarks  @UI.MultiLineText  @title: 'Remarks';
  status   @title: 'Status'  @Common.FieldControl: #ReadOnly;
  active   @Common.FieldControl: #ReadOnly  @title: 'Active';
};

annotate AdminService.BridgeConditionSurveys with actions {
  deactivate      @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate      @Common.SideEffects: { TargetProperties: ['active'] };
  submitForReview @Common.SideEffects: { TargetProperties: ['status'] };
  approveSurvey   @Common.SideEffects: { TargetProperties: ['status'] };
  rejectSurvey    @Common.SideEffects: { TargetProperties: ['status'] };
};

////////////////////////////////////////////////////////////////////////////
//  BridgeLoadRatings (LRT tile) — per-vehicle-class load rating assessments
////////////////////////////////////////////////////////////////////////////

