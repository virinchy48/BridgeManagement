using { AdminService } from '../../srv/admin-service';
using from '../common';

////////////////////////////////////////////////////////////////////////////
//  List Report — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with @(
  UI.HeaderInfo: {
    TypeName      : 'Bridge',
    TypeNamePlural: 'Bridges',
    Title         : { $Type: 'UI.DataField', Value: bridgeName },
    Description   : { $Type: 'UI.DataField', Value: bridgeId }
  },
  UI.SelectionFields: [
    bridgeId, bridgeName, state, region,
    condition, postingStatus, status,
    highPriorityAsset, assetClass
  ],
  UI.LineItem: [
    { Value: bridgeId,           Label: 'Bridge ID' },
    { Value: bridgeName,         Label: 'Bridge Name' },
    { Value: state,              Label: 'State' },
    { Value: region,             Label: 'Region' },
    { Value: condition,          Label: 'Condition' },
    { $Type: 'UI.DataFieldForAnnotation', Target: '@UI.DataPoint#ConditionRating', Label: 'Condition Rating' },
    { Value: postingStatus,      Label: 'Posting Status' },
    { Value: status,             Label: 'Status' },
    { Value: lastInspectionDate, Label: 'Last Inspected' },
    { Value: highPriorityAsset,  Label: 'High Priority' }
  ]
);

////////////////////////////////////////////////////////////////////////////
//  Object Page — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with @(
  Capabilities.InsertRestrictions.Insertable  : true,
  Capabilities.UpdateRestrictions.Updatable   : true,
  Capabilities.DeleteRestrictions.Deletable   : false,
  UI: {
    CreateHidden: false,
    UpdateHidden: false,
    DeleteHidden: true,

    // ── ObjectPage Dynamic Header — KPI chips ───────────────────────────────
    DataPoint#ConditionRating: {
      Value: conditionRating,
      Title: 'Condition Rating',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  8,
        DeviationRangeLowValue:  5
      }
    },
    DataPoint#BSI: {
      Value: bsiScore,
      Title: 'Bridge Sufficiency Index',
      CriticalityCalculation: {
        ImprovementDirection: #Maximize,
        ToleranceRangeLowValue:  50,
        DeviationRangeLowValue:  25
      }
    },
    DataPoint#PostingStatus: {
      Value: postingStatus,
      Title: 'Posting Status',
      Criticality: postingStatusCriticality
    },
    DataPoint#LastInspection: {
      Value: lastInspectionDate,
      Title: 'Last Inspected'
    },
    DataPoint#ActiveRestrictions: {
      Value: activeRestrictionCount,
      Title: 'Active Restrictions',
      Criticality: { $edmJson: { $If: [{ $Gt: [{ $Path: 'activeRestrictionCount' }, 0] }, 2, 3] } }
    },
    HeaderFacets: [
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#ConditionRating',   Label: 'Condition' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#BSI', Label: 'BSI Score' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#PostingStatus',      Label: 'Status' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#ActiveRestrictions', Label: 'Restrictions' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.DataPoint#LastInspection',     Label: 'Last Inspected' },
      { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#HeaderAssessor',    Label: 'Assessor' },
    ],
    FieldGroup#HeaderAssessor: {
      Data: [
        { $Type: 'UI.DataField', Value: conditionAssessor, Label: 'Last Inspector' },
        { $Type: 'UI.DataField', Value: conditionTrend,    Label: 'Trend' }
      ]
    },

    Facets: [
      // ── S1: Overview & Identity ──────────────────────────────────────────
      // Personas: All (read-only for Inspector/External)
      // S/4HANA: Equipment master (EQUI) + Functional Location (IFLOT)
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Overview & Identity',
        ID    : 'OverviewIdentity',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Asset Identity',      Target: '@UI.FieldGroup#AssetIdentity'},
          {$Type: 'UI.ReferenceFacet', Label: 'Geographic Location',  Target: '@UI.FieldGroup#GeoLocation'},
          {$Type: 'UI.ReferenceFacet', Label: 'Ownership',            Target: '@UI.FieldGroup#Ownership'},
        ]
      },
      // ── S2: Physical & Structural ────────────────────────────────────────
      // Personas: Manager (RW), Inspector (R), Executive/External (hidden)
      // S/4HANA: Equipment characteristics (CABN/CAWN), classification (KLAH)
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Physical & Structural',
        ID    : 'PhysicalStructural',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Structure',         Target: '@UI.FieldGroup#Structure'},
          {$Type: 'UI.ReferenceFacet', Label: 'Dimensions',        Target: '@UI.FieldGroup#Dimensions'},
          {$Type: 'UI.ReferenceFacet', Label: 'Site Context',      Target: '@UI.FieldGroup#SiteContext'},
          {$Type: 'UI.ReferenceFacet', Label: 'Bridge Elements',   Target: 'elements/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'Capacity Ratings',  Target: 'capacities/@UI.LineItem'},
        ]
      },
      // ── S3: Condition & Inspections ──────────────────────────────────────
      // Personas: Inspector (RW — P0 section), Manager (R), Executive (summary only)
      // S/4HANA: PM Notifications (QMEL), Measuring Points (PMCO)
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Condition & Inspections',
        ID    : 'ConditionInspections',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Condition Assessment',  Target: '@UI.FieldGroup#ConditionAssessment'},
          {$Type: 'UI.ReferenceFacet', Label: 'Inspection Schedule',   Target: '@UI.FieldGroup#InspectionScheduling'},
          {$Type: 'UI.ReferenceFacet', Label: 'Inspection Records',    Target: 'inspections/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'Field Notes',           Target: '@UI.FieldGroup#FieldNotes'},
        ]
      },
      // ── S4: Restrictions & Permits ───────────────────────────────────────
      // Personas: All (External — cards only); Operator (RW on restrictions)
      // S/4HANA: PM Functional Location + BIS-owned permit objects
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Restrictions & Permits',
        ID    : 'RestrictionsPermits',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Traffic Data',             Target: '@UI.FieldGroup#TrafficData'},
          {$Type: 'UI.ReferenceFacet', Label: 'Route Classification',      Target: '@UI.FieldGroup#RouteClass'},
          {$Type: 'UI.ReferenceFacet', Label: 'NHVR Approvals',            Target: '@UI.FieldGroup#NHVRApprovals'},
          {$Type: 'UI.ReferenceFacet', Label: 'Gazette & Legal',           Target: '@UI.FieldGroup#GazetteLegal'},
          {$Type: 'UI.ReferenceFacet', Label: 'Active Restrictions',       Target: 'restrictions/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'NHVR Route Assessments',    Target: 'nhvrRouteAssessments/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'Load Rating Certificates',  Target: 'loadRatingCertificates/@UI.LineItem'},
        ]
      },
      // ── S5: Documents & Map ──────────────────────────────────────────────
      // Personas: Manager (RW), Inspector (RW — upload rights for photos)
      // The custom Attachments fragment (anchored here via manifest.json) is the single
      // entry point for file uploads. The OData documents table has been removed to
      // eliminate the duplicate "Attachments" panel that appeared above this section.
      // The Map fragment (GisMapTab) is also anchored here via manifest.json.
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Documents & Map',
        ID    : 'DocumentsMap',
        Facets: []
      },
      // ── S6: Risk, Compliance & Alerts ───────────────────────────────────
      // Personas: Manager (RW), Admin; hidden from Inspector, External, Executive
      // S/4HANA: PM Risk Assessment + BIS-owned compliance data
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Risk, Compliance & Alerts',
        ID    : 'RiskComplianceAlerts',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Risk & Resilience',    Target: '@UI.FieldGroup#RiskResilience'},
          {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessments',    Target: 'scourAssessments/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'Risk Assessments',     Target: 'riskAssessments/@UI.LineItem'},
          {$Type: 'UI.ReferenceFacet', Label: 'Active Alerts',        Target: 'alerts/@UI.LineItem'},
        ]
      },
      // ── S7: Administration ───────────────────────────────────────────────
      // Personas: Admin (RW), Manager (R); hidden from Inspector, External, Executive
      // Contains: data quality, audit trail, system metadata
      {
        $Type : 'UI.CollectionFacet',
        Label : 'Administration',
        ID    : 'Administration',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Source Information', Target: '@UI.FieldGroup#SourceInfo'},
          {$Type: 'UI.ReferenceFacet', Label: 'Audit Trail',        Target: '@UI.FieldGroup#AuditTrail'},
          {$Type: 'UI.ReferenceFacet', Label: 'Bridge Geometry',    Target: '@UI.FieldGroup#BridgeGeometry'},
        ]
      },
    ],

    // ── FieldGroups ─────────────────────────────────────────────────────────

    // Tab 1 — Core Identity & Location
    FieldGroup#AssetIdentity: {
      Data: [
        {Value: bridgeId},      // server-generated and read-only
        {Value: bridgeName},
        {Value: assetClass},
        {Value: status},        // @Common.FieldControl #ReadOnly — lifecycle managed by actions
      ]
    },
    FieldGroup#GeoLocation: {
      Data: [
        {Value: state},
        {Value: region},
        {Value: lga},
        {Value: route},
        {Value: routeNumber},
        {Value: latitude},
        {Value: longitude},
        {Value: location},
      ]
    },
    FieldGroup#Ownership: {
      Data: [
        {Value: assetOwner},
        {Value: managingAuthority},
        {Value: descr},
      ]
    },

    // Tab 2 — Physical Characteristics
    FieldGroup#Structure: {
      Data: [
        {Value: structureType},
        {Value: material},
        {Value: yearBuilt},
        {Value: designLoad},
        {Value: designStandard},
      ]
    },
    FieldGroup#Dimensions: {
      Data: [
        {Value: spanCount},
        {Value: spanLength},
        {Value: totalLength},
        {Value: deckWidth},
        {Value: clearanceHeight},
        {Value: numberOfLanes},
      ]
    },
    // Tab 5 — Site Context (AS 5100.7 §6.2; AP-G71.8 §3.1)
    FieldGroup#SiteContext: {
      Data: [
        {Value: surfaceType},
        {Value: substructureType},
        {Value: foundationType},
        {Value: waterwayType},
        {Value: seismicZone},
        {Value: asBuiltDrawingReference},
      ]
    },

    // Tab 3 — Condition & Inspection
    FieldGroup#ConditionAssessment: {
      Data: [
        {Value: conditionRating},
        {Value: conditionSummary},
        {Value: structuralAdequacy},
        {Value: structuralAdequacyRating},
        {Value: conditionStandard},
        {Value: highPriorityAsset},
        {Value: conditionNotes},
      ]
    },
    FieldGroup#RiskResilience: {
      Data: [
        {Value: scourRisk},
        {Value: scourDepthLastMeasured},
        {Value: seismicZone},
        {Value: floodImmunityAriYears},
        {Value: floodImpacted},
      ]
    },
    FieldGroup#FieldNotes: {
      Data: [
        {Value: remarks},
      ]
    },

    // Tab 3 — Inspection Scheduling (TfNSW-BIM §4.1–4.2)
    FieldGroup#InspectionScheduling: {
      Data: [
        {Value: inspectionType},
        {Value: lastInspectionDate},
        {Value: nextInspectionDue},
        {Value: inspectionFrequencyYears},
        {Value: conditionTrend},
        {Value: conditionAssessor},
        {Value: conditionReportRef},
      ]
    },

    // Tab 4 — NHVR & Traffic Approvals
    FieldGroup#TrafficData: {
      Data: [
        {Value: averageDailyTraffic},
        {Value: heavyVehiclePercent},
        {Value: importanceLevel},
      ]
    },
    FieldGroup#RouteClass: {
      Data: [
        {Value: loadRating},
        {Value: pbsApprovalClass},
        {Value: freightRoute},
        {Value: overMassRoute},
        {Value: hmlApproved},
        {Value: bDoubleApproved},
      ]
    },
    FieldGroup#NHVRApprovals: {
      Data: [
        {Value: nhvrAssessed},
        {Value: nhvrAssessmentDate},
        {Value: pbsApprovalClass},
        {Value: pbsApprovalDate},
        {Value: pbsApprovalExpiry},
        {Value: hmlApproved},
        {Value: hmlApprovalDate},
        {Value: hmlApprovalExpiry},
        {Value: bDoubleApproved},
        {Value: nhvrReferenceUrl},
      ]
    },

    // Tab 4 — Gazette & Legal (Roads Act 1993 NSW §§121–124)
    FieldGroup#GazetteLegal: {
      Data: [
        {Value: gazetteReference},
        {Value: gazetteEffectiveDate},
        {Value: gazetteExpiryDate},
        {Value: postingStatus},
        {Value: postingStatusReason},
        {Value: closureDate},
        {Value: closureEndDate},
        {Value: closureReason},
      ]
    },

    // Tab 8 — Data Provenance
    FieldGroup#SourceInfo: {
      Data: [
        {Value: dataSource},
        {Value: sourceReferenceUrl},
        {Value: openDataReference},
        {Value: sourceRecordId},
      ]
    },
    FieldGroup#AuditTrail: {
      Data: [
        {Value: createdBy},
        {Value: createdAt},
        {Value: modifiedBy},
        {Value: modifiedAt},
      ]
    },

    // Tab 9 — Bridge Geometry
    FieldGroup#BridgeGeometry: {
      Data: [
        {Value: geoJson},
      ]
    },

    // ── ObjectPage Header Actions ─────────────────────────────────────────
    Identification: [
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.deactivate',
        Label       : 'Deactivate',
        Criticality : #Negative,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Eq: [{ $Path: 'status' }, 'Inactive'] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        ![@UI.Hidden]: { $edmJson: { $Or: [
          { $Ne: [{ $Path: 'status' }, 'Inactive'] },
          { $Not: { $Path: 'IsActiveEntity' } }
        ] } }
      }
    ]
  }
);

////////////////////////////////////////////////////////////////////////////
//  Field-level annotations — Bridges
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with {
  // System-managed — never editable
  ID         @Core.Computed;
  createdBy  @Core.Computed  @title: 'Created By';
  createdAt  @Core.Computed  @title: 'Created At';
  modifiedBy @Core.Computed  @title: 'Last Modified By';
  modifiedAt @Core.Computed  @title: 'Last Modified At';
  // Bridge status is managed exclusively by Deactivate / Reactivate actions
  status     @Common.FieldControl: #ReadOnly  @title: 'Bridge Status';
  // GeoJSON is maintained on the object page, not in the create dialog
  geoJson    @Common.FieldControl: #Optional  @UI.MultiLineText  @title: 'Bridge Geometry (GeoJSON)';
  // Bridge ID auto-generated on create; never user-entered
  bridgeId   @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Bridge ID (auto-generated)';
};

annotate AdminService.Bridges with {
  // Mandatory fields
  bridgeName   @Common.FieldControl: #Mandatory  @title: 'Bridge Name';
  state @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'States', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: state, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'State';
  assetOwner   @Common.FieldControl: #Mandatory  @title: 'Asset Owner';
  latitude     @Common.FieldControl: #Mandatory  @title: 'Latitude (°)'  @Common.QuickInfo: 'Valid range: -90 to 90';
  longitude    @Common.FieldControl: #Mandatory  @title: 'Longitude (°)'  @Common.QuickInfo: 'Valid range: -180 to 180';
  postingStatus @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'PostingStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: postingStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Posting Status';
  conditionRating @Common.FieldControl: #Mandatory  @title: 'Condition Rating (1–10)';

  // Value lists
  assetClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'AssetClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: assetClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Asset Class';
  region @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'Regions', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: region, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Region';
  structureType @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'StructureTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: structureType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Structure Type';
  designLoad @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'DesignLoads', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: designLoad, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Design Load';
  condition @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionStates', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: condition, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition State';
  scourRisk @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ScourRiskLevels', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: scourRisk, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Scour Risk Level';
  pbsApprovalClass @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'PbsApprovalClasses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: pbsApprovalClass, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'PBS Approval Class';

  // Restriction value help
  restriction @(Common: {
    Label    : 'Linked Restriction',
    ValueList: {
      CollectionPath: 'Restrictions',
      Parameters    : [
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: restriction_ID, ValueListProperty: 'ID' }
      ],
    }
  });

  // All remaining field labels
  managingAuthority      @title: 'Managing Authority';
  lga                    @title: 'Local Government Area (LGA)';
  location               @title: 'Location Description';
  route                  @title: 'Route';
  routeNumber            @title: 'Route Number';
  descr                  @title: 'Description'  @UI.MultiLineText;
  material               @title: 'Material';
  yearBuilt              @title: 'Year Built';
  designStandard         @title: 'Design Standard';
  clearanceHeight        @title: 'Clearance Height (m)';
  spanLength             @title: 'Span Length (m)';
  totalLength            @title: 'Total Length (m)';
  deckWidth              @title: 'Deck Width (m)';
  spanCount              @title: 'Number of Spans';
  numberOfLanes          @title: 'Number of Lanes';
  conditionStandard      @title: 'Condition Rating Standard';
  structuralAdequacyRating @title: 'Structural Adequacy Rating (1–10)';
  lastInspectionDate     @Common.FieldControl: #Mandatory  @title: 'Last Inspection Date';
  highPriorityAsset      @title: 'High Priority Asset';
  asBuiltDrawingReference @title: 'As-Built Drawing Reference';
  seismicZone            @title: 'Seismic Zone';
  scourDepthLastMeasured @title: 'Scour Depth Last Measured (m)';
  floodImmunityAriYears  @title: 'Flood Immunity (ARI years)';
  floodImpacted          @title: 'Flood Impacted';
  remarks                @title: 'Remarks'  @UI.MultiLineText;
  loadRating             @title: 'Load Rating (t)';
  importanceLevel        @title: 'Importance Level (1–4)';
  averageDailyTraffic    @title: 'Average Daily Traffic (ADT)';
  heavyVehiclePercent    @title: 'Heavy Vehicle Percentage (%)';
  freightRoute           @title: 'Freight Route';
  overMassRoute          @title: 'Over Mass Route';
  hmlApproved            @title: 'HML Approved';
  bDoubleApproved        @title: 'B-Double Approved';
  nhvrAssessed           @title: 'NHVR Assessed';
  nhvrAssessmentDate     @title: 'NHVR Assessment Date';
  gazetteReference       @title: 'Gazette Reference';
  nhvrReferenceUrl       @title: 'NHVR Reference URL';
  dataSource             @title: 'Data Source';
  sourceReferenceUrl     @title: 'Source Reference URL';
  openDataReference      @title: 'Open Data Reference';
  sourceRecordId         @title: 'Source Record ID';
  conditionSummary @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionSummaries', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: conditionSummary, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition Summary';
  conditionAssessor      @title: 'Assessed By';
  conditionReportRef     @title: 'Report Reference';
  structuralAdequacy @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'StructuralAdequacyTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: structuralAdequacy, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Structural Adequacy';
  conditionNotes         @title: 'Condition Notes'  @UI.MultiLineText;

  // ── Inspection Scheduling (TfNSW-BIM §4.1–4.2) ──────────────────────────
  inspectionType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'InspectionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: inspectionType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Inspection Type';
  inspectionFrequencyYears @title: 'Inspection Frequency (years)';
  nextInspectionDue        @title: 'Next Inspection Due'           @Common.QuickInfo: 'TfNSW-BIM §4.2 — maximum 5-year interval';
  conditionTrend @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ConditionTrends', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: conditionTrend, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Condition Trend';

  // ── Physical Characteristics — Site Context ──────────────────────────────
  surfaceType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'SurfaceTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: surfaceType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Deck Surface Type';
  substructureType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'SubstructureTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: substructureType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Substructure Type';
  foundationType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FoundationTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: foundationType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Foundation Type'  @Common.QuickInfo: 'AS 5100.7 §6.2.5 — critical for scour risk assessment';
  waterwayType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'WaterwayTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: waterwayType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Waterway Type'  @Common.QuickInfo: 'Austroads AP-G71.8 §3.1 — determines scour risk methodology';

  // ── NHVR Approval Dates (NHVR-HVNL §§100–104) ───────────────────────────
  pbsApprovalDate    @title: 'PBS Approval Date';
  pbsApprovalExpiry  @title: 'PBS Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry';
  hmlApprovalDate    @title: 'HML Approval Date';
  hmlApprovalExpiry  @title: 'HML Approval Expiry'  @Common.QuickInfo: 'Alert generated 30/60/90 days before expiry';

  // ── Gazette & Legal (Roads Act 1993 NSW §§121–124) ───────────────────────
  gazetteEffectiveDate  @title: 'Gazette Effective Date'  @Common.QuickInfo: 'Date gazette order came into effect — Roads Act 1993 §122';
  gazetteExpiryDate     @title: 'Gazette Expiry Date'     @Common.QuickInfo: 'Drives renewal alerts 90/60/30 days before expiry';
  postingStatusReason   @title: 'Posting Status Reason';
  closureDate           @title: 'Closure Date';
  closureEndDate        @title: 'Expected Reopening Date';
  closureReason         @title: 'Closure Reason'  @UI.MultiLineText;
};

// Hide the ID on the Restrictions VH so it doesn't appear as a column
annotate AdminService.Restrictions with {
  ID @UI.Hidden;
};

////////////////////////////////////////////////////////////////////////////
//  BridgeRestrictions — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeRestrictions with {
  ID    @UI.Hidden;
  bridge @UI.Hidden;
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
    ],
    FieldGroup#BRDetails: {
      Data: [
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

////////////////////////////////////////////////////////////////////////////
//  BridgeCapacities — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeCapacities with {
  ID         @UI.Hidden;
  bridge     @UI.Hidden;
  createdAt  @UI.Hidden;  createdBy  @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  capacityType          @Common.FieldControl: #Mandatory  @title: 'Capacity Type';
  grossMassLimit        @Common.FieldControl: #Mandatory  @title: 'Gross Mass Limit (t)';
  grossCombined         @title: 'Gross Combined (t)';
  steerAxleLimit        @title: 'Steer Axle (t)';
  singleAxleLimit       @title: 'Single Axle (t)';
  tandemGroupLimit      @title: 'Tandem Axle Group (t)';
  triAxleGroupLimit     @title: 'Tri-Axle Group (t)';
  minClearancePosted    @Common.FieldControl: #Mandatory  @title: 'Min Clearance (posted)';
  lane1Clearance        @title: 'Lane 1 Clearance (m)';
  lane2Clearance        @title: 'Lane 2 Clearance (m)';
  clearanceSurveyDate   @title: 'Survey Date';
  clearanceSurveyMethod @title: 'Survey Method';
  carriagewayWidth      @title: 'Carriageway Width (m)';
  trafficableWidth      @title: 'Trafficable Width (m)';
  laneWidth             @title: 'Lane Width (m)';
  ratingStandard        @title: 'Standard';
  ratingFactor          @title: 'Rating Factor (RF)';
  ratingEngineer        @title: 'Rating Engineer (NER/CPEng)';
  ratingDate            @title: 'Rating Date';
  nextReviewDue         @title: 'Next Review Due';
  reportReference       @title: 'Report Reference';
  scourCriticalDepth    @title: 'Scour Critical Depth (m)';
  currentScourDepth     @title: 'Current Scour Depth (m)';
  floodClosureLevel     @title: 'Flood Closure Level (m AHD)';
  designLife            @title: 'Design Life (years)';
  consumedLife          @title: 'Consumed Life (%)';
  fatigueSensitive      @title: 'Fatigue-Sensitive';
  criticalElement       @title: 'Critical Element';
  capacityStatus @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'CapacityStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: capacityStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Status';
  lastReviewedBy   @title: 'Last Reviewed By';
  statusReviewDue  @title: 'Next Review Due';
  engineeringNotes      @UI.MultiLineText  @title: 'Engineering Notes';
  fatigueDetailCategory @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FatigueDetailCategories', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: fatigueDetailCategory, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Fatigue Detail Category'  @Common.QuickInfo: 'AS 5100.6 §13.5 — A (best) to G (worst)';
};

annotate AdminService.BridgeCapacities with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Bridge Capacity',
      TypeNamePlural: 'Bridge Capacities',
      Title         : { $Type: 'UI.DataField', Value: capacityType },
      Description   : { $Type: 'UI.DataField', Value: capacityStatus }
    },
    LineItem: [
      {Value: capacityType,       Label: 'Capacity Type'},
      {Value: grossMassLimit,     Label: 'GVM (t)'},
      {Value: grossCombined,      Label: 'GCM (t)'},
      {Value: minClearancePosted, Label: 'Min Clearance (m)'},
      {Value: ratingFactor,       Label: 'RF'},
      {Value: nextReviewDue,      Label: 'Next Review'},
      {Value: capacityStatus,     Label: 'Status'},
    ],
    Facets: [
      {
        $Type : 'UI.CollectionFacet',
        Label : 'General',
        ID    : 'CapGeneral',
        Facets: [
          {$Type: 'UI.ReferenceFacet', Label: 'Capacity Type', Target: '@UI.FieldGroup#CapacityGeneral'},
        ]
      },
      {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits (tonnes)', Target: '@UI.FieldGroup#CapacityMassLimits'},
      {$Type: 'UI.ReferenceFacet', Label: 'Vertical Clearance (metres)', Target: '@UI.FieldGroup#CapacityVerticalClearance'},
      {$Type: 'UI.ReferenceFacet', Label: 'Horizontal Geometry (metres)', Target: '@UI.FieldGroup#CapacityHorizontalGeometry'},
      {$Type: 'UI.ReferenceFacet', Label: 'Load Rating (AS 5100.7)', Target: '@UI.FieldGroup#CapacityLoadRating'},
      {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessment', Target: '@UI.FieldGroup#CapacityScour'},
      {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life', Target: '@UI.FieldGroup#CapacityFatigue'},
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity Status', Target: '@UI.FieldGroup#CapacityStatus'},
      {$Type: 'UI.ReferenceFacet', Label: 'Engineering Notes', Target: '@UI.FieldGroup#CapacityEngineeringNotes'},
    ],
    FieldGroup#CapacityGeneral: {
      Data: [
        {Value: capacityType},
      ]
    },
    FieldGroup#CapacityMassLimits: {
      Data: [
        {Value: grossMassLimit},
        {Value: grossCombined},
        {Value: steerAxleLimit},
        {Value: singleAxleLimit},
        {Value: tandemGroupLimit},
        {Value: triAxleGroupLimit},
      ]
    },
    FieldGroup#CapacityVerticalClearance: {
      Data: [
        {Value: minClearancePosted},
        {Value: lane1Clearance},
        {Value: lane2Clearance},
        {Value: clearanceSurveyDate},
        {Value: clearanceSurveyMethod},
      ]
    },
    FieldGroup#CapacityHorizontalGeometry: {
      Data: [
        {Value: carriagewayWidth},
        {Value: trafficableWidth},
        {Value: laneWidth},
      ]
    },
    FieldGroup#CapacityLoadRating: {
      Data: [
        {Value: ratingStandard},
        {Value: ratingFactor},
        {Value: ratingEngineer},
        {Value: ratingDate},
        {Value: nextReviewDue},
        {Value: reportReference},
      ]
    },
    FieldGroup#CapacityScour: {
      Data: [
        {Value: scourCriticalDepth},
        {Value: currentScourDepth},
        {Value: floodClosureLevel},
      ]
    },
    FieldGroup#CapacityFatigue: {
      Data: [
        {Value: designLife},
        {Value: consumedLife},
        {Value: fatigueSensitive},
        {Value: fatigueDetailCategory},
        {Value: criticalElement},
      ]
    },
    FieldGroup#CapacityStatus: {
      Data: [
        {Value: capacityStatus},
        {Value: lastReviewedBy},
        {Value: statusReviewDue},
      ]
    },
    FieldGroup#CapacityEngineeringNotes: {
      Data: [
        {Value: engineeringNotes},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeScourAssessments — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeScourAssessments with {
  ID     @UI.Hidden;
  bridge @UI.Hidden;
  createdAt @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  assessmentDate        @Common.FieldControl: #Mandatory  @title: 'Assessment Date';
  assessmentType        @Common.FieldControl: #Mandatory  @title: 'Assessment Type';
  scourRisk @(
    Common.FieldControl: #Mandatory,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'ScourRiskLevels', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: scourRisk, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Scour Risk Level';
  measuredDepth         @title: 'Measured Scour Depth (m)';
  floodImmunityAriYears @title: 'Flood Immunity (ARI years)';
  mitigationStatus      @title: 'Mitigation Status';
  assessor              @Common.FieldControl: #Mandatory  @title: 'Assessor';
  inspectorAccreditationLevel @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: false, CollectionPath: 'InspectionTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: inspectorAccreditationLevel, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Inspector Accreditation Level'  @Common.QuickInfo: 'TfNSW-BIM §3.1 — Level 1 to Level 4';
  nextReviewDate        @title: 'Next Review Date';
  reportReference       @title: 'Report Reference';
  waterwayType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'WaterwayTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: waterwayType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Waterway Type';
  foundationType @(
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'FoundationTypes', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: foundationType, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Foundation Type';
  scourCountermeasureType      @title: 'Countermeasure Type'       @Common.QuickInfo: 'Austroads AP-G71.8 §7.3';
  scourCountermeasureCondition @title: 'Countermeasure Condition';
  remarks               @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeScourAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Scour Assessment',
      TypeNamePlural: 'Scour Assessments',
      Title         : { $Type: 'UI.DataField', Value: assessmentType },
      Description   : { $Type: 'UI.DataField', Value: assessmentDate }
    },
    LineItem: [
      {Value: assessmentDate,              Label: 'Date'},
      {Value: assessmentType,              Label: 'Type'},
      {Value: scourRisk,                   Label: 'Scour Risk'},
      {Value: measuredDepth,               Label: 'Measured Depth (m)'},
      {Value: waterwayType,                Label: 'Waterway'},
      {Value: foundationType,              Label: 'Foundation'},
      {Value: scourCountermeasureType,     Label: 'Countermeasure'},
      {Value: scourCountermeasureCondition, Label: 'CM Condition'},
      {Value: mitigationStatus,            Label: 'Mitigation'},
      {Value: nextReviewDate,              Label: 'Next Review'},
    ],
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Assessment Details', Target: '@UI.FieldGroup#ScourAssessmentDetails'},
    ],
    FieldGroup#ScourAssessmentDetails: {
      Data: [
        {Value: assessmentDate},
        {Value: assessmentType},
        {Value: scourRisk},
        {Value: measuredDepth},
        {Value: floodImmunityAriYears},
        {Value: waterwayType},
        {Value: foundationType},
        {Value: mitigationStatus},
        {Value: scourCountermeasureType},
        {Value: scourCountermeasureCondition},
        {Value: assessor},
        {Value: inspectorAccreditationLevel},
        {Value: nextReviewDate},
        {Value: reportReference},
        {Value: remarks},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeDocuments — managed via custom Attachments section (read-only OData)
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeDocuments with {
  ID         @UI.Hidden;
  bridge     @UI.Hidden;
  content    @UI.Hidden;  // blob served via /admin-bridges/api — never via OData
  createdAt  @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  title        @title: 'Title';
  documentType @title: 'Attachment Type';
  documentUrl  @title: 'External URL';
  documentDate @title: 'Attachment Date';
  fileName     @title: 'File Name';
  mediaType    @title: 'Media Type';
  fileSize     @title: 'File Size (bytes)';
  referenceNumber @title: 'Reference Number';
  issuedBy     @title: 'Issued By';
  expiryDate   @title: 'Expiry Date';
  remarks      @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeDocuments with @(
  Common.Label : 'Attachments',
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : false,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Attachment',
      TypeNamePlural: 'Attachments',
      Title         : { Value: title },
      Description   : { Value: fileName }
    },
    LineItem: [
      {Value: title,           Label: 'Title'},
      {Value: fileName,        Label: 'File Name'},
      {Value: documentType,    Label: 'Type'},
      {Value: mediaType,       Label: 'Media Type'},
      {Value: fileSize,        Label: 'Size'},
      {Value: referenceNumber, Label: 'Reference'},
      {Value: documentDate,    Label: 'Date'},
      {Value: expiryDate,      Label: 'Expiry'},
    ],
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Attachment Details', Target: '@UI.FieldGroup#AttachmentDetails'}
    ],
    FieldGroup#AttachmentDetails: {
      Data: [
        {Value: documentType},
        {Value: title},
        {Value: fileName},
        {Value: mediaType},
        {Value: fileSize},
        {Value: documentUrl},
        {Value: referenceNumber},
        {Value: issuedBy},
        {Value: documentDate},
        {Value: expiryDate},
        {Value: remarks},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeAttributes — hidden from Bridge ObjectPage (superseded by Custom
//  Attributes EAV pattern). Annotations kept for OData navigability only.
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeAttributes with {
  ID     @UI.Hidden;
  bridge @UI.Hidden;
  createdAt @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
};

////////////////////////////////////////////////////////////////////////////
//  Validation constraints — numeric range & positive-value rules
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with {
  inspectionFrequencyYears @assert.range: [1, 10]    @Common.QuickInfo: 'Valid range: 1 – 10 years';
  spanCount              @assert.range: [1, 500]     @Common.QuickInfo: 'Valid range: 1 – 500';
  numberOfLanes          @assert.range: [1, 20]      @Common.QuickInfo: 'Valid range: 1 – 20';
  spanLength             @assert.range: [0.1, 5000]  @Common.QuickInfo: 'Valid range: 0.1 – 5,000 m';
  totalLength            @assert.range: [0.1, 50000] @Common.QuickInfo: 'Valid range: 0.1 – 50,000 m';
  deckWidth              @assert.range: [0.5, 200]   @Common.QuickInfo: 'Valid range: 0.5 – 200 m';
  clearanceHeight        @assert.range: [0, 100]     @Common.QuickInfo: 'Valid range: 0 – 100 m';
  loadRating             @assert.range: [0, 10000]   @Common.QuickInfo: 'Valid range: 0 – 10,000 t';
  floodImmunityAriYears  @assert.range: [1, 10000]   @Common.QuickInfo: 'Valid range: 1 – 10,000 years';
  averageDailyTraffic    @assert.range: [0, 9999999] @Common.QuickInfo: 'Valid range: 0 – 9,999,999 vehicles/day';
  scourDepthLastMeasured @assert.range: [0, 500]     @Common.QuickInfo: 'Valid range: 0 – 500 m';
};

annotate AdminService.BridgeRestrictions with {
  pilotVehicleCount @assert.range: [0, 10] @Common.QuickInfo: 'Valid range: 0 – 10 escort vehicles';
  speedLimit     @assert.range: [0, 130]  @Common.QuickInfo: 'Valid range: 0 – 130 km/h';
  grossMassLimit @assert.range: [0, 1000] @Common.QuickInfo: 'Valid range: 0 – 1,000 t';
  axleMassLimit  @assert.range: [0, 500]  @Common.QuickInfo: 'Valid range: 0 – 500 t';
  heightLimit    @assert.range: [0, 30]   @Common.QuickInfo: 'Valid range: 0 – 30 m';
  widthLimit     @assert.range: [0, 100]  @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lengthLimit    @assert.range: [0, 1000] @Common.QuickInfo: 'Valid range: 0 – 1,000 m';
};

annotate AdminService.BridgeCapacities with {
  grossMassLimit        @assert.range: [0, 2000]   @Common.QuickInfo: 'Valid range: 0 – 2,000 t';
  grossCombined         @assert.range: [0, 3000]   @Common.QuickInfo: 'Valid range: 0 – 3,000 t';
  steerAxleLimit        @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  singleAxleLimit       @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  tandemGroupLimit      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  triAxleGroupLimit     @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 t';
  minClearancePosted    @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lane1Clearance        @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  lane2Clearance        @assert.range: [0, 100]    @Common.QuickInfo: 'Valid range: 0 – 100 m';
  carriagewayWidth      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m';
  trafficableWidth      @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m';
  laneWidth             @assert.range: [0, 50]     @Common.QuickInfo: 'Valid range: 0 – 50 m';
  ratingFactor          @assert.range: [0, 10]     @Common.QuickInfo: 'Valid range: 0 – 10';
  consumedLife          @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200%';
  designLife            @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 years';
  floodClosureLevel     @assert.range: [0, 200]    @Common.QuickInfo: 'Valid range: 0 – 200 m AHD';
  scourCriticalDepth    @assert.range: [0, 500]    @Common.QuickInfo: 'Valid range: 0 – 500 m';
  currentScourDepth     @assert.range: [0, 500]    @Common.QuickInfo: 'Valid range: 0 – 500 m';
};

annotate AdminService.BridgeScourAssessments with {
  measuredDepth         @assert.range: [0, 500]   @Common.QuickInfo: 'Valid range: 0 – 500 m';
  floodImmunityAriYears @assert.range: [1, 10000] @Common.QuickInfo: 'Valid range: 1 – 10,000 years';
};

////////////////////////////////////////////////////////////////////////////
//  Draft — Bridges
////////////////////////////////////////////////////////////////////////////

annotate bridge.management.Bridges with @fiori.draft.enabled;
annotate AdminService.Bridges with @odata.draft.enabled;

// Virtual fields are internal — hide from all form layouts
annotate AdminService.Bridges with {
  postingStatusCriticality @UI.Hidden;
  activeRestrictionCount   @UI.Hidden;
};

annotate AdminService.Bridges with {
  bsiScore         @UI.Hidden;
  bsiWidthRating   @UI.Hidden;
  bsiBarrierRating @UI.Hidden;
  bsiRouteAltRating @UI.Hidden;
};

////////////////////////////////////////////////////////////////////////////
//  Bridge Detail Redesign — New Entity UI Annotations (7-Section Architecture)
////////////////////////////////////////////////////////////////////////////

// ── BridgeInspections — Section 3: Condition & Inspections ──────────────
annotate AdminService.BridgeInspections with @(
  UI.LineItem: [
    {Value: inspectionDate,         Label: 'Date'},
    {Value: inspectionType,         Label: 'Type'},
    {Value: inspector,              Label: 'Inspector'},
    {Value: inspectionStandard,     Label: 'Standard'},
    {Value: inspectionScope,        Label: 'Scope'},
    {Value: s4InspectionOrderRef,   Label: 'S/4 Order'},
    {Value: s4NotificationRef,      Label: 'S/4 Notification'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Inspection',
    TypeNamePlural: 'Inspections',
    Title         : {Value: inspectionDate},
    Description   : {Value: inspector},
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
    {$Type: 'UI.ReferenceFacet', Label: 'Defects', Target: 'defects/@UI.LineItem'},
  ],
  UI.FieldGroup#InspGeneral: {
    Label: 'General',
    Data: [
      {Value: inspectionDate},
      {Value: inspectionType},
      {Value: inspectionStandard},
      {Value: inspectionScope},
      {Value: weatherConditions},
      {Value: accessibilityIssues},
      {Value: inspectionNotes},
    ]
  },
  UI.FieldGroup#InspInspector: {
    Label: 'Inspector',
    Data: [
      {Value: inspector},
      {Value: inspectorAccreditationNumber},
      {Value: inspectorAccreditationLevel},
      {Value: inspectorCompany},
      {Value: qualificationExpiry},
    ]
  },
  UI.FieldGroup#InspS4Links: {
    Label: 'S/4HANA Links',
    Data: [
      {Value: s4InspectionOrderRef},
      {Value: s4NotificationRef},
      {Value: reportStorageRef},
    ]
  },
);

// ── BridgeDefects — shown inside BridgeInspections ObjectPage ───────────
annotate AdminService.BridgeDefects with @(
  UI.LineItem: [
    {Value: defectId,              Label: 'Defect ID'},
    {Value: defectType,            Label: 'Type'},
    {Value: bridgeElement,         Label: 'Element'},
    {Value: severity,              Label: 'Severity (1–4)'},
    {Value: urgency,               Label: 'Urgency (1–4)'},
    {Value: remediationStatus,     Label: 'Status'},
    {Value: estimatedRepairCost,   Label: 'Est. Cost ($)'},
    {Value: s4SyncStatus,          Label: 'S/4 Sync'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Defect',
    TypeNamePlural: 'Defects',
    Title         : {Value: defectId},
    Description   : {Value: defectType},
  },
);

// ── BridgeElements — Section 2: Physical & Structural ───────────────────
annotate AdminService.BridgeElements with @(
  UI.LineItem: [
    {Value: elementId,              Label: 'Element ID'},
    {Value: elementType,            Label: 'Type'},
    {Value: elementName,            Label: 'Name'},
    {Value: currentConditionRating, Label: 'Condition (1–5)'},
    {Value: conditionTrend,         Label: 'Trend'},
    {Value: maintenanceRequired,    Label: 'Maint. Req.'},
    {Value: urgencyLevel,           Label: 'Urgency'},
    {Value: nextDueDate,            Label: 'Next Rating Due'},
    {Value: s4EquipmentNumber,      Label: 'S/4 Equipment'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Bridge Element',
    TypeNamePlural: 'Bridge Elements',
    Title         : {Value: elementName},
    Description   : {Value: elementType},
  },
);

// ── BridgeRiskAssessments — Section 6: Risk, Compliance & Alerts ────────
annotate AdminService.BridgeRiskAssessments with @(
  UI.LineItem: [
    {Value: assessmentDate,      Label: 'Date'},
    {Value: riskType,            Label: 'Risk Type'},
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
);

// ── LoadRatingCertificates — Section 4: Restrictions & Permits ──────────
annotate AdminService.LoadRatingCertificates with @(
  UI.LineItem: [
    {Value: certificateNumber,     Label: 'Certificate #'},
    {Value: status,                Label: 'Status'},
    {Value: ratingStandard,        Label: 'Standard'},
    {Value: ratingLevel,           Label: 'Rating Level'},
    {Value: certifyingEngineer,    Label: 'Engineer'},
    {Value: engineerOrganisation,  Label: 'Organisation'},
    {Value: certificateIssueDate,  Label: 'Issued'},
    {Value: certificateExpiryDate, Label: 'Expires'},
    {Value: ratingFactor,          Label: 'RF (T44)'},
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
        {$Type: 'UI.ReferenceFacet', Label: 'Certificate',  Target: '@UI.FieldGroup#LRCCertificate'},
        {$Type: 'UI.ReferenceFacet', Label: 'Load Factors', Target: '@UI.FieldGroup#LRCLoadFactors'},
        {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life', Target: '@UI.FieldGroup#LRCFatigue'},
      ]
    },
  ],
  UI.FieldGroup#LRCCertificate: {
    Label: 'Certificate',
    Data: [
      {Value: certificateNumber},
      {Value: certificateVersion},
      {Value: status},
      {Value: ratingStandard},
      {Value: ratingLevel},
      {Value: certifyingEngineer},
      {Value: engineerQualification},
      {Value: engineerLicenseNumber},
      {Value: engineerOrganisation},
      {Value: certificateIssueDate},
      {Value: certificateExpiryDate},
      {Value: nextReviewDate},
      {Value: governingMember},
      {Value: governingFailureMode},
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
      {Value: fatigueSensitive},
      {Value: consumedLifePercent,  Label: 'Consumed Life (%)'},
      {Value: remainingLifeYears,   Label: 'Remaining Life (years)'},
      {Value: detailCategory},
      {Value: trafficSpectrumRef},
    ]
  },
);

// ── NhvrRouteAssessments — Section 4: Restrictions & Permits ────────────
annotate AdminService.NhvrRouteAssessments with @(
  UI.LineItem: [
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
    Description   : {Value: assessmentStatus},
  },
);

// ── AlertsAndNotifications — Section 6: Risk, Compliance & Alerts ───────
annotate AdminService.AlertsAndNotifications with @(
  UI.LineItem: [
    {Value: alertTitle,     Label: 'Alert'},
    {Value: alertType,      Label: 'Type'},
    {Value: severity,       Label: 'Severity'},
    {Value: priority,       Label: 'Priority'},
    {Value: status,         Label: 'Status'},
    {Value: triggeredDate,  Label: 'Triggered'},
    {Value: dueDate,        Label: 'Due'},
    {Value: entityType,     Label: 'Related To'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Alert',
    TypeNamePlural: 'Alerts',
    Title         : {Value: alertTitle},
    Description   : {Value: alertType},
  },
);

// ── BridgeInspectionElements ──────────────────────────────────────────────
annotate AdminService.BridgeInspectionElements with @(
  UI.LineItem: [
    { Value: elementType,         Label: 'Element' },
    { Value: elementHealthRating, Label: 'Health Rating' },
    { Value: conditionState1Pct,  Label: 'CS1 %' },
    { Value: conditionState2Pct,  Label: 'CS2 %' },
    { Value: conditionState3Pct,  Label: 'CS3 %' },
    { Value: conditionState4Pct,  Label: 'CS4 %' },
    { Value: unit,                Label: 'Unit' }
  ],
  UI.FieldGroup#General: {
    Data: [
      { Value: elementType },
      { Value: unit },
      { Value: elementHealthRating, Label: 'Health Rating' },
      { Value: conditionState1Qty, Label: 'CS1 Qty' },
      { Value: conditionState2Qty, Label: 'CS2 Qty' },
      { Value: conditionState3Qty, Label: 'CS3 Qty' },
      { Value: conditionState4Qty, Label: 'CS4 Qty' },
      { Value: conditionState1Pct, Label: 'CS1 %' },
      { Value: conditionState2Pct, Label: 'CS2 %' },
      { Value: conditionState3Pct, Label: 'CS3 %' },
      { Value: conditionState4Pct, Label: 'CS4 %' },
      { Value: comments }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Element Detail' }
  ]
);

// ── BridgeCarriageways ────────────────────────────────────────────────────
annotate AdminService.BridgeCarriageways with @(
  UI.LineItem: [
    { Value: roadNumber },
    { Value: carriageCode,        Label: 'Carriage Code' },
    { Value: laneCount,           Label: 'Lanes' },
    { Value: minWidthM,           Label: 'Min Width (m)' },
    { Value: maxWidthM,           Label: 'Max Width (m)' },
    { Value: verticalClearanceM,  Label: 'Vert. Clearance (m)' }
  ],
  UI.FieldGroup#General: {
    Data: [
      { Value: roadNumber }, { Value: roadRankCode }, { Value: roadClassCode },
      { Value: carriageCode }, { Value: laneCount },
      { Value: minWidthM }, { Value: maxWidthM }, { Value: verticalClearanceM },
      { Value: prescribedDirFrom }, { Value: prescribedDirTo },
      { Value: distanceFromStartKm }, { Value: linkForInspection }, { Value: comments }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Carriageway Detail' }
  ]
);

// ── BridgeContacts ────────────────────────────────────────────────────────
annotate AdminService.BridgeContacts with @(
  UI.LineItem: [
    { Value: contactGroup },
    { Value: primaryContact },
    { Value: organisation },
    { Value: position },
    { Value: phone },
    { Value: email }
  ],
  UI.FieldGroup#General: {
    Data: [
      { Value: contactGroup }, { Value: primaryContact }, { Value: organisation },
      { Value: position }, { Value: phone }, { Value: mobile },
      { Value: address }, { Value: email }, { Value: comments }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Contact Detail' }
  ]
);

// ── BridgeMehComponents ───────────────────────────────────────────────────
annotate AdminService.BridgeMehComponents with @(
  UI.LineItem: [
    { Value: componentType },
    { Value: name },
    { Value: make },
    { Value: model },
    { Value: isElectrical },
    { Value: isMechanical },
    { Value: isHydraulic },
    { Value: inspFrequency }
  ],
  UI.FieldGroup#General: {
    Data: [
      { Value: componentType }, { Value: name }, { Value: make }, { Value: model },
      { Value: serialNumber }, { Value: isElectrical }, { Value: isMechanical }, { Value: isHydraulic },
      { Value: inspFrequency }, { Value: locationStored }, { Value: shelfLifeYears }, { Value: comments }
    ]
  },
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Target: '@UI.FieldGroup#General', Label: 'Component Detail' }
  ]
);

////////////////////////////////////////////////////////////////////////////
//  Action side-effects — force FE to re-read fields after deactivate/reactivate
//  so button visibility toggling (@UI.Hidden based on status) updates immediately
////////////////////////////////////////////////////////////////////////////

annotate AdminService.Bridges with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['status'] };
  reactivate @Common.SideEffects: { TargetProperties: ['status'] };
};

annotate AdminService.Restrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};

annotate AdminService.BridgeRestrictions with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['restrictionStatus', 'active'] };
};
