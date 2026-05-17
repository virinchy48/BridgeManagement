using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  Bridge Detail Redesign — New Entity UI Annotations (7-Section Architecture)
////////////////////////////////////////////////////////////////////////////

// ── BridgeInspections — standalone + Bridge Details Inspections tab ─────
annotate AdminService.BridgeInspections with {
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
  inspectionRef                @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Inspection Ref';
  inspectionDate               @title: 'Inspection Date';
  inspectionType @(
    title: 'Inspection Type',
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'InspectionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: inspectionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  );
  inspector                    @title: 'Inspector';
  inspectorAccreditationNumber @title: 'Accreditation Number';
  inspectorAccreditationLevel  @title: 'Accreditation Level';
  inspectorCompany             @title: 'Inspector Company';
  qualificationExpiry          @title: 'Qualification Expiry';
  inspectionScope              @title: 'Inspection Scope';
  inspectionStandard           @title: 'Inspection Standard';
  weatherConditions            @title: 'Weather Conditions';
  accessibilityIssues          @title: 'Accessibility Issues';
  s4InspectionOrderRef         @title: 'S/4 Inspection Order';
  s4NotificationRef            @title: 'S/4 Notification';
  reportStorageRef             @title: 'Report Storage Reference';
  inspectionNotes              @title: 'Inspection Notes'  @UI.MultiLineText;
  overallConditionRating       @title: 'Overall Condition Rating (1-10)';
  criticalFindings             @title: 'Critical Findings';
  recommendedActions           @title: 'Recommended Actions'            @UI.MultiLineText;
  nextInspectionRecommended    @title: 'Next Inspection (Recommended)';
  active                       @title: 'Active'                         @UI.Hidden;
  // ── HIGH priority additions (AS 5100-7, TfNSW-BIM §3.3, AGAM §4.2) ──────
  inspectionMethodology        @title: 'Inspection Methodology'         @Common.QuickInfo: 'AGAM §4.2 — how the bridge was accessed for inspection';
  overallStructuralAdequacy    @title: 'Structural Adequacy Verdict'    @Common.QuickInfo: 'TfNSW-BIM §3.3 — inspector verdict on structural adequacy';
  loadCarryingCapacityConfirmed @title: 'Load Capacity Confirmed'       @Common.QuickInfo: 'AS 5100-7 §3.2 — confirm posted capacity is still valid';
  followUpRequired             @title: 'Follow-Up Required'             @Common.QuickInfo: 'Set to true to create a manager follow-up task/alert';
  reportIssueDate              @title: 'Report Issue Date'              @Common.QuickInfo: 'TfNSW-BIM §3.4 — formal date report was issued (may differ from inspection date)';
};

annotate AdminService.BridgeInspections with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, inspectionType, inspectionDate, inspectionRef, criticalFindings],
  UI.LineItem: [
    {Value: inspectionRef,          Label: 'Ref'},
    {Value: bridge.bridgeId,        Label: 'Bridge ID'},
    {Value: bridge.bridgeName,      Label: 'Bridge'},
    {Value: inspectionDate,         Label: 'Date'},
    {Value: inspectionType,         Label: 'Type'},
    {Value: inspector,              Label: 'Inspector'},
    {Value: overallConditionRating, Label: 'Condition Rating'},
    { Value: criticalFindings, Label: 'Critical Findings',
      Criticality: { $edmJson: { $If: [{ $Path: 'criticalFindings' }, 1, 3] } } },
    {Value: inspectionStandard,     Label: 'Standard'},
    {Value: inspectionScope,        Label: 'Scope'},
    {Value: s4InspectionOrderRef,   Label: 'S/4 Order'},
    {Value: s4NotificationRef,      Label: 'S/4 Notification'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Inspection',
    TypeNamePlural: 'Inspections',
    Title         : {Value: inspectionRef},
    Description   : {Value: bridge.bridgeName},
  },
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Inspection Details',
      ID    : 'InspectionDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'General',    Target: '@UI.FieldGroup#InspGeneral'},
        {$Type: 'UI.ReferenceFacet', Label: 'Inspector',  Target: '@UI.FieldGroup#InspInspector'},
        {$Type: 'UI.ReferenceFacet', Label: 'S/4HANA',    Target: '@UI.FieldGroup#InspS4Links'},
      ]
    },
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Defects Found',
      ID    : 'InspDefects',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Defects', Target: 'defects/@UI.LineItem'},
      ]
    },
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Element Conditions',
      ID    : 'InspElements',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Element Conditions (CS1–CS4)', Target: 'inspectionElements/@UI.LineItem'},
      ]
    },
    {
      $Type : 'UI.CollectionFacet',
      Label : 'Documents',
      ID    : 'InspDocuments',
      Facets: [
        {$Type: 'UI.ReferenceFacet', ID: 'InspDocumentsList', Label: 'Documents', Target: 'documents/@UI.LineItem'},
      ]
    },
  ],
  UI.FieldGroup#InspGeneral: {
    Label: 'General',
    Data: [
      {Value: bridge_ID,                  Label: 'Bridge'},
      {Value: inspectionRef,              Label: 'Inspection Ref'},
      {Value: inspectionDate,             Label: 'Inspection Date'},
      {Value: reportIssueDate,            Label: 'Report Issue Date'},
      {Value: inspectionType,             Label: 'Inspection Type'},
      {Value: inspectionMethodology,      Label: 'Inspection Methodology'},
      {Value: overallConditionRating,     Label: 'Overall Condition Rating (1-10)'},
      {Value: overallStructuralAdequacy,  Label: 'Structural Adequacy Verdict'},
      {Value: loadCarryingCapacityConfirmed, Label: 'Load Capacity Confirmed'},
      {Value: criticalFindings,           Label: 'Critical Findings'},
      {Value: followUpRequired,           Label: 'Follow-Up Required'},
      {Value: recommendedActions,         Label: 'Recommended Actions'},
      {Value: nextInspectionRecommended,  Label: 'Next Inspection (Recommended)'},
      {Value: inspectionStandard,         Label: 'Inspection Standard'},
      {Value: inspectionScope,            Label: 'Scope'},
      {Value: weatherConditions,          Label: 'Weather Conditions'},
      {Value: accessibilityIssues,        Label: 'Accessibility Issues'},
      {Value: inspectionNotes,            Label: 'Inspection Notes'},
    ]
  },
  UI.FieldGroup#InspInspector: {
    Label: 'Inspector',
    Data: [
      {Value: inspector,                    Label: 'Inspector'},
      {Value: inspectorAccreditationNumber, Label: 'Accreditation Number'},
      {Value: inspectorAccreditationLevel,  Label: 'Accreditation Level'},
      {Value: inspectorCompany,             Label: 'Inspector Company'},
      {Value: qualificationExpiry,          Label: 'Qualification Expiry'},
    ]
  },
  UI.FieldGroup#InspS4Links: {
    Label: 'S/4HANA Links',
    Data: [
      {Value: s4InspectionOrderRef, Label: 'S/4 Inspection Order'},
      {Value: s4NotificationRef,    Label: 'S/4 Notification'},
      {Value: reportStorageRef,     Label: 'Report Storage Reference'},
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

annotate AdminService.BridgeInspections with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active'] };
};


// ── BridgeInspectionElements — expert council full treatment ──────────────
// Inspector priority: condition states prominently displayed; health rating calculated
// End User: elementType mandatory, qty before % for natural entry flow
annotate AdminService.BridgeInspectionElements with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  inspection @(
    Common.Text            : inspection.inspectionRef,
    Common.TextArrangement : #TextOnly,
    title                  : 'Inspection',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'BridgeInspections',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: inspection_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionRef' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionDate' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionType' }
      ]
    }
  );
  bridge              @UI.Hidden;  // accessed via inspection.bridge
  elementType         @Common.FieldControl: #Mandatory  @title: 'Element Type'          @Common.QuickInfo: 'SIMS element type code — e.g. DEK (Deck), ABT (Abutment), BRG (Bearing)';
  unit                @title: 'Unit of Measure'         @Common.QuickInfo: 'm², m, no.';
  elementHealthRating @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Element Health Rating'  @Common.QuickInfo: 'Weighted composite of condition state quantities — lower is worse; auto-calculated';
  conditionState1Qty  @title: 'CS1 Quantity (Good/New)';
  conditionState2Qty  @title: 'CS2 Quantity (Satisfactory)';
  conditionState3Qty  @title: 'CS3 Quantity (Poor)';
  conditionState4Qty  @title: 'CS4 Quantity (Failed)';
  conditionState1Pct  @title: 'CS1 % (Good/New)';
  conditionState2Pct  @title: 'CS2 % (Satisfactory)';
  conditionState3Pct  @title: 'CS3 % (Poor)';
  conditionState4Pct  @title: 'CS4 % (Failed)';
  comments            @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeInspectionElements with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [inspection_ID, elementType, elementHealthRating],
  UI.HeaderInfo: {
    TypeName      : 'Inspection Element',
    TypeNamePlural: 'Inspection Elements',
    Title         : {Value: elementType},
    Description   : {Value: inspection.inspectionRef},
  },
  UI.LineItem: [
    {Value: inspection.inspectionRef, Label: 'Inspection'},
    {Value: elementType,              Label: 'Element Type'},
    {Value: unit,                     Label: 'Unit'},
    {Value: elementHealthRating,      Label: 'Health Rating'},
    {Value: conditionState1Pct,       Label: 'CS1 % (Good)'},
    {Value: conditionState2Pct,       Label: 'CS2 % (Satisfactory)'},
    {Value: conditionState3Pct,       Label: 'CS3 % (Poor)'},
    {Value: conditionState4Pct,       Label: 'CS4 % (Failed)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Inspection Element', ID: 'InspElemDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Element',           Target: '@UI.FieldGroup#InspElemGeneral'},
        {$Type: 'UI.ReferenceFacet', Label: 'Condition States',  Target: '@UI.FieldGroup#InspElemCondition'},
      ]
    },
  ],
  UI.FieldGroup#InspElemGeneral: {
    Label: 'Element',
    Data: [
      {Value: inspection_ID,      Label: 'Inspection'},
      {Value: elementType,        Label: 'Element Type'},
      {Value: unit,               Label: 'Unit of Measure'},
      {Value: elementHealthRating, Label: 'Element Health Rating'},
      {Value: comments,           Label: 'Comments'},
    ]
  },
  UI.FieldGroup#InspElemCondition: {
    Label: 'Condition States (SIMS)',
    Data: [
      {Value: conditionState1Qty, Label: 'CS1 Quantity (Good/New)'},
      {Value: conditionState1Pct, Label: 'CS1 % (Good/New)'},
      {Value: conditionState2Qty, Label: 'CS2 Quantity (Satisfactory)'},
      {Value: conditionState2Pct, Label: 'CS2 % (Satisfactory)'},
      {Value: conditionState3Qty, Label: 'CS3 Quantity (Poor)'},
      {Value: conditionState3Pct, Label: 'CS3 % (Poor)'},
      {Value: conditionState4Qty, Label: 'CS4 Quantity (Failed)'},
      {Value: conditionState4Pct, Label: 'CS4 % (Failed)'},
    ]
  },
);

