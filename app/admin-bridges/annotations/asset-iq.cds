using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  AssetIQScores — system-generated bridge health & risk intelligence
//  Scores are created by the AssetIQ engine; users can only challenge (override).
////////////////////////////////////////////////////////////////////////////

annotate AdminService.AssetIQScores with @(
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : false,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.HeaderInfo: {
    TypeName      : 'Risk Score',
    TypeNamePlural: 'Risk Scores',
    Title         : { Value: overallScore },
    Description   : { Value: ragStatus }
  },
  UI.SelectionFields: [ bridge_ID, ragStatus, modelVersion ],
  UI.LineItem: [
    { Value: bridge.bridgeName,  Label: 'Bridge' },
    { Value: bridge.bridgeId,    Label: 'Bridge ID' },
    { Value: overallScore,       Label: 'AssetIQ Score',
      Criticality: { $edmJson: { $If: [
        { $Ge: [{ $Path: 'overallScore' }, 60] }, 1,
        { $If: [{ $Ge: [{ $Path: 'overallScore' }, 35] }, 2, 3] }
      ] } }
    },
    { Value: ragStatus,          Label: 'RAG Status' },
    { Value: bciFactor,          Label: 'BCI Factor' },
    { Value: defectFactor,       Label: 'Defect Factor' },
    { Value: modelVersion,       Label: 'Model' },
    { Value: scoredAt,           Label: 'Scored At' },
    { $Type: 'UI.DataFieldForAction', Action: 'AdminService.override', Label: 'Challenge Score' },
  ],
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Score Breakdown', ID: 'ScoreBreakdown', Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Score',          Target: '@UI.FieldGroup#AiqScore' },
      { $Type: 'UI.ReferenceFacet', Label: 'Factor Weights', Target: '@UI.FieldGroup#AiqFactors' },
      { $Type: 'UI.ReferenceFacet', Label: 'Override',       Target: '@UI.FieldGroup#AiqOverride' },
    ]}
  ],
  UI.FieldGroup#AiqScore: {
    Label: 'AssetIQ Score',
    Data: [
      { Value: overallScore,  Label: 'Overall Score (0–100)' },
      { Value: ragStatus,     Label: 'RAG Status' },
      { Value: modelVersion,  Label: 'Model Version' },
      { Value: scoredAt,      Label: 'Scored At' },
    ]
  },
  UI.FieldGroup#AiqFactors: {
    Label: 'Factor Breakdown',
    Data: [
      { Value: bciFactor,      Label: 'BCI Factor (35%)' },
      { Value: ageFactor,      Label: 'Age Factor (15%)' },
      { Value: trafficFactor,  Label: 'Traffic Factor (20%)' },
      { Value: defectFactor,   Label: 'Defect Factor (20%)' },
      { Value: loadFactor,     Label: 'Load Factor (10%)' },
    ]
  },
  UI.FieldGroup#AiqOverride: {
    Label: 'Score Challenge / Override',
    Data: [
      { Value: overrideFlag,    Label: 'Override Active' },
      { Value: overrideBy,      Label: 'Overridden By' },
      { Value: overrideReason,  Label: 'Override Reason' },
      { Value: overrideAt,      Label: 'Override Timestamp' },
    ]
  }
);

annotate AdminService.AssetIQScores with {
  ID            @Core.Computed;
  createdBy     @UI.Hidden;  createdAt     @UI.Hidden;
  modifiedBy    @UI.Hidden;  modifiedAt    @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         ValueListProperty: 'ID',         LocalDataProperty: bridge_ID },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' }
      ]
    }
  ) @title: 'Bridge';
  overallScore   @title: 'AssetIQ Score (0–100)'  @Common.QuickInfo: 'Composite score: BCI 35% + Age 15% + Traffic 20% + Defect 20% + Load 10%';
  ragStatus      @title: 'RAG Status'              @Common.QuickInfo: 'Red ≥60, Amber 35–59, Green <35 — lower score = better condition';
  bciFactor      @title: 'BCI Factor'              @Common.QuickInfo: 'Bridge Condition Index contribution — 35% of overall score';
  ageFactor      @title: 'Age Factor'              @Common.QuickInfo: 'Asset age contribution — 15% of overall score';
  trafficFactor  @title: 'Traffic Factor'          @Common.QuickInfo: 'Traffic loading contribution — 20% of overall score';
  defectFactor   @title: 'Defect Factor'           @Common.QuickInfo: 'Active defect severity contribution — 20% of overall score';
  loadFactor     @title: 'Load Factor'             @Common.QuickInfo: 'Load rating utilisation contribution — 10% of overall score';
  modelVersion   @title: 'Model Version'           @Common.FieldControl: #ReadOnly;
  scoredAt       @title: 'Scored At';
  overrideFlag   @title: 'Override Active';
  overrideBy     @title: 'Overridden By'    @Common.FieldControl: #ReadOnly;
  overrideReason @title: 'Override Reason'  @Common.FieldControl: #ReadOnly  @UI.MultiLineText;
  overrideAt     @title: 'Override At'      @Common.FieldControl: #ReadOnly;
};
