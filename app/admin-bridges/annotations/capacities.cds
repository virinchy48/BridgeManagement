using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  BridgeCapacities — sub-entity on Bridge ObjectPage
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeCapacities with {
  ID         @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',      LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  createdAt  @UI.Hidden;  createdBy  @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  capacityType          @Common.FieldControl: #Mandatory  @title: 'Capacity Type';
  grossMassLimit        @Common.FieldControl: #Mandatory  @title: 'Gross Mass Limit (t)';
  grossCombined         @title: 'Gross Combined (t)';
  steerAxleLimit        @title: 'Steer Axle (t)';
  singleAxleLimit       @title: 'Single Axle (t)';
  tandemGroupLimit      @title: 'Tandem Axle Group (t)';
  triAxleGroupLimit     @title: 'Tri-Axle Group (t)';
  // ── HIGH priority addition (NHVR HVNL §§94–95) ───────────────────────────
  axleSpacingMinimumM   @title: 'Minimum Axle Spacing (m)'  @Common.QuickInfo: 'NHVR HVNL §§94–95 — minimum axle spacing governing dynamic impact; required for OSOM permit evaluation';
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
  effectiveFrom    @title: 'Effective From'
                   @Common.QuickInfo: 'Date this rating came into regulatory force (gazette/order date)'
                   @Common.FieldControl: #Mandatory;
  effectiveTo      @title: 'Effective To'
                   @Common.QuickInfo: 'Date this rating was superseded — blank means currently operative'
                   @Common.FieldControl: #ReadOnly;
  supersessionReason @title: 'Supersession Reason'
                   @Common.FieldControl: #ReadOnly;
  capacityStatus @(
    Common.FieldControl: #ReadOnly,
    Common.ValueListWithFixedValues,
    Common.ValueList: { SearchSupported: true, CollectionPath: 'CapacityStatuses', Parameters: [
      { $Type: 'Common.ValueListParameterOut', LocalDataProperty: capacityStatus, ValueListProperty: 'code' },
      { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
    ]}
  ) @title: 'Status';
  lastReviewedBy   @title: 'Last Reviewed By';
  statusReviewDue  @title: 'Next Review Due';
  engineeringNotes @UI.MultiLineText  @title: 'Engineering Notes';
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
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, capacityType, capacityStatus, effectiveFrom, nextReviewDue],
  UI: {
    HeaderInfo: {
      TypeName      : 'Bridge Capacity',
      TypeNamePlural: 'Bridge Capacities',
      Title         : { $Type: 'UI.DataField', Value: capacityType },
      Description   : { $Type: 'UI.DataField', Value: effectiveFrom }
    },
    LineItem: [
      {Value: bridge.bridgeId,    Label: 'Bridge ID'},
      {Value: bridge.bridgeName,  Label: 'Bridge'},
      {Value: capacityType,       Label: 'Capacity Type'},
      {Value: effectiveFrom,      Label: 'Effective From'},
      {Value: effectiveTo,        Label: 'Effective To'},
      {Value: grossMassLimit,     Label: 'GVM (t)'},
      {Value: grossCombined,      Label: 'GCM (t)'},
      {Value: minClearancePosted, Label: 'Min Clearance (m)'},
      {Value: ratingFactor,       Label: 'RF'},
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
      {$Type: 'UI.ReferenceFacet', Label: 'Validity Period', Target: '@UI.FieldGroup#CapacityValidity'},
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity Status', Target: '@UI.FieldGroup#CapacityStatus'},
      {$Type: 'UI.ReferenceFacet', Label: 'Engineering Notes', Target: '@UI.FieldGroup#CapacityEngineeringNotes'},
    ],
    FieldGroup#CapacityGeneral: {
      Data: [
        {Value: bridge_ID,   Label: 'Bridge'},
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
        {Value: axleSpacingMinimumM, Label: 'Minimum Axle Spacing (m)'},
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
    FieldGroup#CapacityValidity: {
      Label: 'Validity Period',
      Data: [
        {Value: effectiveFrom,      Label: 'Effective From'},
        {Value: effectiveTo,        Label: 'Effective To'},
        {Value: nextReviewDue,      Label: 'Next Review Due'},
        {Value: supersessionReason, Label: 'Supersession Reason'},
      ]
    },
    FieldGroup#CapacityStatus: {
      Data: [
        {Value: capacityStatus,  Label: 'Status'},
        {Value: lastReviewedBy,  Label: 'Reviewed By'},
        {Value: statusReviewDue, Label: 'Status Review Due'},
      ]
    },
    FieldGroup#CapacityEngineeringNotes: {
      Data: [
        {Value: engineeringNotes},
      ]
    },
  }
);
