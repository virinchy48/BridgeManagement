using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  BridgeScourAssessments — Scour Assessment tile (standalone CRUD)
//
//  PURPOSE: Hydraulic/scour-specific assessment per Austroads AP-G71.8 / AGBT10 §5.
//  WHEN TO USE: Record the outcome of a formal scour assessment (measured scour depth,
//  flood immunity ARI, countermeasure details). NOT for general water-related risk.
//  Key distinction:
//    • Scour Assessments  — HYDRAULIC engineering: waterway type, foundation type,
//                           measured scour depth, countermeasures (AP-G71.8 §4/5).
//    • Risk Assessments   — RISK MANAGEMENT: 5×5 likelihood × consequence matrix,
//                           covers ANY risk type including hydraulic — use riskType='Hydraulic'
//                           for the risk management view of the same bridge waterway.
//  A bridge can have BOTH: a Scour Assessment (engineering measurement) AND a Risk
//  Assessment with riskType=Hydraulic (risk management register entry). They complement
//  each other — they do not duplicate.
//
// ── BridgeScourAssessments — expert council redesign ─────────────────────
// Inspector priority: scour risk + measured depth first
// Manager priority: next review date prominent
// Data Steward: assessor accreditation, report reference mandatory
annotate AdminService.BridgeScourAssessments with {
  ID            @UI.Hidden;
  createdAt     @UI.Hidden;  createdBy  @UI.Hidden;
  modifiedAt    @UI.Hidden;  modifiedBy @UI.Hidden;
  assessmentRef @Core.Computed @Common.FieldControl: #ReadOnly  @title: 'Assessment Ref';
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
  assessmentDate        @Common.FieldControl: #Mandatory  @title: 'Assessment Date';
  assessmentType        @Common.FieldControl: #Mandatory  @title: 'Assessment Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — Routine, Detailed, or Special';
  scourRisk @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ScourRiskLevels', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: scourRisk, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Scour Risk Level';
  measuredDepth         @title: 'Measured Scour Depth (m)'    @Common.QuickInfo: 'Depth of scour measured at bridge foundations (m). Valid range: 0 – 500 m';
  floodImmunityAriYears @title: 'Flood Immunity (ARI years)'  @Common.QuickInfo: 'Average Recurrence Interval — used for design verification. Valid range: 1 – 10,000 years';
  mitigationStatus      @title: 'Mitigation Status';
  assessor              @Common.FieldControl: #Mandatory  @title: 'Assessor Name';
  inspectorAccreditationLevel @title: 'Assessor Accreditation Level'  @Common.QuickInfo: 'TfNSW-BIM §3.1 — Level 1 (visual) to Level 4 (principal)';
  nextReviewDate        @title: 'Next Review Date';
  reportReference       @title: 'Report Reference';
  waterwayType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'WaterwayTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: waterwayType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Waterway Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — determines scour risk methodology';
  foundationType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FoundationTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: foundationType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Foundation Type'  @Common.QuickInfo: 'AS 5100.7 §6.2.5 — critical for scour vulnerability';
  scourCountermeasureType      @title: 'Countermeasure Type'         @Common.QuickInfo: 'Austroads AP-G71.8 §7.3 — e.g. rock riprap, concrete apron';
  scourCountermeasureCondition @title: 'Countermeasure Condition'    @Common.QuickInfo: 'Good / Fair / Poor / Failed';
  // ── HIGH priority additions (AP-G71.8 §4.2, §5.1) ────────────────────────
  criticalScourDepthM          @title: 'Critical Scour Depth (m)'    @Common.QuickInfo: 'AP-G71.8 §5.1 — depth at which structural failure risk becomes critical; safety margin = critical - measured';
  postFloodInspectionRequired  @title: 'Post-Flood Inspection Required' @Common.QuickInfo: 'AP-G71.8 §4.2 — when true, mandatory inspection is required after each flood event exceeding the trigger level';
  remarks                      @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeScourAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, scourRisk, assessmentType, nextReviewDate, mitigationStatus],
  UI: {
    HeaderInfo: {
      TypeName      : 'Scour Assessment',
      TypeNamePlural: 'Scour Assessments',
      Title         : { Value: assessmentRef },
      Description   : { Value: assessmentType }
    },
    LineItem: [
      {Value: bridge.bridgeId,              Label: 'Bridge ID'},
      {Value: bridge.bridgeName,            Label: 'Bridge'},
      {Value: assessmentRef,                Label: 'Assessment Ref'},
      {Value: assessmentDate,               Label: 'Date'},
      {Value: assessmentType,               Label: 'Type'},
      {Value: scourRisk,                    Label: 'Scour Risk'},
      {Value: measuredDepth,                Label: 'Depth (m)'},
      {Value: waterwayType,                 Label: 'Waterway'},
      {Value: foundationType,               Label: 'Foundation'},
      {Value: scourCountermeasureType,      Label: 'Countermeasure'},
      {Value: scourCountermeasureCondition, Label: 'CM Condition'},
      {Value: mitigationStatus,             Label: 'Mitigation'},
      {Value: nextReviewDate,               Label: 'Next Review'},
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet', Label: 'Scour Assessment', ID: 'ScourDetails',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Assessment',      Target: '@UI.FieldGroup#ScourAssessment'},
          {$Type: 'UI.ReferenceFacet', Label: 'Measurements',    Target: '@UI.FieldGroup#ScourMeasurements'},
          {$Type: 'UI.ReferenceFacet', Label: 'Countermeasures', Target: '@UI.FieldGroup#ScourCountermeasures'},
          {$Type: 'UI.ReferenceFacet', Label: 'Personnel',       Target: '@UI.FieldGroup#ScourPersonnel'},
        ]
      },
      { $Type: 'UI.ReferenceFacet', Label: 'Hydraulic Details (AP-G71.8)', Target: 'hydraulicDetails/@UI.LineItem' },
    ],
    FieldGroup#ScourAssessment: {
      Label: 'Assessment',
      Data: [
        {Value: bridge_ID,            Label: 'Bridge'},
        {Value: assessmentRef,        Label: 'Assessment Ref'},
        {Value: assessmentDate,       Label: 'Assessment Date'},
        {Value: assessmentType,       Label: 'Assessment Type'},
        {Value: scourRisk,            Label: 'Scour Risk Level'},
        {Value: waterwayType,         Label: 'Waterway Type'},
        {Value: foundationType,       Label: 'Foundation Type'},
        {Value: nextReviewDate,       Label: 'Next Review Date'},
        {Value: reportReference,      Label: 'Report Reference'},
      ]
    },
    FieldGroup#ScourMeasurements: {
      Label: 'Measurements',
      Data: [
        {Value: measuredDepth,              Label: 'Measured Scour Depth (m)'},
        {Value: criticalScourDepthM,        Label: 'Critical Scour Depth (m)'},
        {Value: floodImmunityAriYears,      Label: 'Flood Immunity (ARI years)'},
        {Value: postFloodInspectionRequired, Label: 'Post-Flood Inspection Required'},
        {Value: mitigationStatus,           Label: 'Mitigation Status'},
      ]
    },
    FieldGroup#ScourCountermeasures: {
      Label: 'Countermeasures (Austroads AP-G71.8)',
      Data: [
        {Value: scourCountermeasureType,      Label: 'Countermeasure Type'},
        {Value: scourCountermeasureCondition, Label: 'Countermeasure Condition'},
        {Value: remarks,                      Label: 'Remarks'},
      ]
    },
    FieldGroup#ScourPersonnel: {
      Label: 'Personnel & Accreditation',
      Data: [
        {Value: assessor,                    Label: 'Assessor Name'},
        {Value: inspectorAccreditationLevel, Label: 'Accreditation Level (TfNSW-BIM §3.1)'},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeScourAssessmentDetail — hydraulic detail rows (AP-G71.8)
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeScourAssessmentDetail with {
  ID         @UI.Hidden;
  createdAt  @UI.Hidden;  createdBy  @UI.Hidden;
  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
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
  assessmentDate     @Common.FieldControl: #Mandatory  @title: 'Assessment Date';
  hydraulicModelRef  @title: 'Hydraulic Model Reference';
  hydraulicModelType @title: 'Hydraulic Model Type';
  velocityAtDesignFloodMs      @title: 'Velocity at Design Flood (m/s)';
  waterwayOpeningAreaM2        @title: 'Waterway Opening Area (m²)';
  scourType                    @title: 'Scour Type';
  ap71ScoreNumeric             @title: 'AP-G71.8 Score (1–5)'         @Common.QuickInfo: 'Austroads AP-G71.8 §4.2 — 1=Very Low to 5=Very High';
  scourRiskCategoryAp71        @title: 'Risk Category (AP-G71.8)';
  countermeasureEffectivenessRating @title: 'Countermeasure Effectiveness';
  recommendedAction            @title: 'Recommended Action';
  nextAssessmentDate           @title: 'Next Assessment Date';
  notes                        @title: 'Notes'  @UI.MultiLineText;
};

annotate AdminService.BridgeScourAssessmentDetail with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, scourRiskCategoryAp71, assessmentDate],
  UI.HeaderInfo: {
    TypeName      : 'Scour Detail',
    TypeNamePlural: 'Scour Details',
    Title         : {Value: ID},
    Description   : {Value: bridge.bridgeName},
  },
  UI.LineItem: [
    { Value: bridge.bridgeId,       Label: 'Bridge ID' },
    { Value: bridge.bridgeName,     Label: 'Bridge' },
    { Value: assessmentDate,        Label: 'Assessment Date' },
    { Value: hydraulicModelType,    Label: 'Model Type' },
    { Value: scourType,             Label: 'Scour Type' },
    { Value: ap71ScoreNumeric,      Label: 'AP-G71.8 Score (1-5)' },
    { Value: scourRiskCategoryAp71, Label: 'Risk Category' },
    { Value: recommendedAction,     Label: 'Recommended Action' },
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Scour Detail', ID: 'ScourDetailInfo',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Assessment',  Target: '@UI.FieldGroup#ScourDetailAssessment'},
        {$Type: 'UI.ReferenceFacet', Label: 'Risk',        Target: '@UI.FieldGroup#ScourDetailRisk'},
      ]
    }
  ],
  UI.FieldGroup#ScourDetailAssessment: {
    Label: 'Assessment',
    Data: [
      {Value: bridge_ID,             Label: 'Bridge'},
      {Value: assessmentDate,        Label: 'Assessment Date'},
      {Value: hydraulicModelRef,     Label: 'Hydraulic Model Reference'},
      {Value: hydraulicModelType,    Label: 'Hydraulic Model Type'},
      {Value: velocityAtDesignFloodMs, Label: 'Velocity at Design Flood (m/s)'},
      {Value: waterwayOpeningAreaM2, Label: 'Waterway Opening Area (m²)'},
      {Value: nextAssessmentDate,    Label: 'Next Assessment Date'},
      {Value: notes,                 Label: 'Notes'},
    ]
  },
  UI.FieldGroup#ScourDetailRisk: {
    Label: 'Risk (Austroads AP-G71.8)',
    Data: [
      {Value: scourType,                          Label: 'Scour Type'},
      {Value: ap71ScoreNumeric,                   Label: 'AP-G71.8 Score (1–5)'},
      {Value: scourRiskCategoryAp71,              Label: 'Risk Category'},
      {Value: countermeasureEffectivenessRating,  Label: 'Countermeasure Effectiveness'},
      {Value: recommendedAction,                  Label: 'Recommended Action'},
    ]
  },
);
