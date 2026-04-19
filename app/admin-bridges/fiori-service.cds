using { AdminService } from '../../srv/admin-service';
using from '../common'; // to help UI linter get the complete annotations



////////////////////////////////////////////////////////////////////////////
//
//	Bridge Object Page
//

annotate AdminService.Bridges with @(
  UI.HeaderInfo: {
    TypeName      : 'Bridge',
    TypeNamePlural: 'Bridges',
    Title         : { Value: bridgeName },
    Description   : { Value: bridgeId }
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
    { Value: conditionRating,    Label: 'Rating' },
    { Value: postingStatus,      Label: 'Posting Status' },
    { Value: status,             Label: 'Status' },
    { Value: lastInspectionDate, Label: 'Last Inspected' },
    { Value: highPriorityAsset,  Label: 'High Priority' }
  ]
);

annotate AdminService.Bridges with @(
  Capabilities.InsertRestrictions.Insertable  : true,
  Capabilities.UpdateRestrictions.Updatable   : true,
  Capabilities.DeleteRestrictions.Deletable   : false,
  UI: {
    CreateHidden: false,
    UpdateHidden: false,
    DeleteHidden: true,
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Identity & Location',       Target: '@UI.FieldGroup#IdentityLocation'},
      {$Type: 'UI.ReferenceFacet', Label: 'Physical Attributes',       Target: '@UI.FieldGroup#PhysicalAttributes'},
      {$Type: 'UI.ReferenceFacet', Label: 'Condition & Inspection',    Target: '@UI.FieldGroup#ConditionStatus'},
      {$Type: 'UI.ReferenceFacet', Label: 'NHVR & Traffic Approvals',  Target: '@UI.FieldGroup#NHVRTraffic'},
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity',                  Target: 'capacities/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Restrictions',              Target: 'restrictions/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessment',          Target: 'scourAssessments/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Data Provenance',           Target: '@UI.FieldGroup#DataProvenance'},
      {$Type: 'UI.ReferenceFacet', Label: 'Audit Information',         Target: '@UI.FieldGroup#AuditInfo'},
      {$Type: 'UI.ReferenceFacet', Label: 'Bridge Geometry',           Target: '@UI.FieldGroup#BridgeGeometry'},
    ],
    FieldGroup#IdentityLocation: {
      Data: [
        {Value: bridgeId},
        {Value: bridgeName},
        {Value: assetClass},
        {Value: state},
        {Value: region},
        {Value: lga},
        {Value: location},
        {Value: route},
        {Value: routeNumber},
        {Value: latitude},
        {Value: longitude},
        {Value: assetOwner},
        {Value: managingAuthority},
        {Value: descr},
      ]
    },
    FieldGroup#PhysicalAttributes: {
      Data: [
        {Value: structureType},
        {Value: material},
        {Value: yearBuilt},
        {Value: designLoad},
        {Value: designStandard},
        {Value: clearanceHeight},
        {Value: spanLength},
        {Value: totalLength},
        {Value: deckWidth},
        {Value: spanCount},
        {Value: numberOfLanes},
      ]
    },
    FieldGroup#ConditionStatus: {
      Data: [
        {Value: condition},
        {Value: conditionRating},
        {Value: structuralAdequacyRating},
        {Value: postingStatus},
        {Value: highPriorityAsset},
        {Value: lastInspectionDate},
        {Value: conditionStandard},
        {Value: seismicZone},
        {Value: asBuiltDrawingReference},
        {Value: scourRisk},
        {Value: scourDepthLastMeasured},
        {Value: floodImmunityAriYears},
        {Value: floodImpacted},
        {Value: remarks},
      ]
    },
    FieldGroup#NHVRTraffic: {
      Data: [
        {Value: loadRating},
        {Value: pbsApprovalClass},
        {Value: importanceLevel},
        {Value: averageDailyTraffic},
        {Value: heavyVehiclePercent},
        {Value: freightRoute},
        {Value: overMassRoute},
        {Value: hmlApproved},
        {Value: bDoubleApproved},
        {Value: nhvrAssessed},
        {Value: nhvrAssessmentDate},
        {Value: gazetteReference},
        {Value: nhvrReferenceUrl},
      ]
    },
    FieldGroup#DataProvenance: {
      Data: [
        {Value: dataSource},
        {Value: sourceReferenceUrl},
        {Value: openDataReference},
        {Value: sourceRecordId},
      ]
    },
    FieldGroup#AuditInfo: {
      Data: [
        {Value: createdBy},
        {Value: createdAt},
        {Value: modifiedBy},
        {Value: modifiedAt}
      ]
    },
    FieldGroup#BridgeGeometry: {
      Data: [
        {Value: geoJson},
      ]
    },
    Identification: [
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.deactivate',
        Label       : 'Deactivate',
        Criticality : #Negative,
        ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'status' }, 'Inactive'] } }
      },
      {
        $Type       : 'UI.DataFieldForAction',
        Action      : 'AdminService.reactivate',
        Label       : 'Reactivate',
        Criticality : #Positive,
        ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'status' }, 'Inactive'] } }
      }
    ]
  }
);

////////////////////////////////////////////////////////////////////////////
//
//	Value Help for Tree Table
//
annotate AdminService.Bridges with {
  bridgeId @(
    Common.FieldControl : #Mandatory
  );
  bridgeName @(
    Common.FieldControl : #Mandatory
  );
  state @(
    Common.FieldControl : #Mandatory,
    ValueList.entity:'States',
    Common.ValueListWithFixedValues
  );
  assetOwner @(
    Common.FieldControl : #Mandatory
  );
  condition @(
    ValueList.entity:'ConditionStates',
    Common.ValueListWithFixedValues
  );
  conditionRating @(
    Common.FieldControl : #Mandatory
  );
  postingStatus @(
    Common.FieldControl : #Mandatory
  );
  latitude @(
    Common.FieldControl : #Mandatory
  );
  longitude @(
    Common.FieldControl : #Mandatory
  );
  assetClass @(
    ValueList.entity:'AssetClasses',
    Common.ValueListWithFixedValues
  );
  region @(
    ValueList.entity:'Regions',
    Common.ValueListWithFixedValues
  );
  structureType @(
    ValueList.entity:'StructureTypes',
    Common.ValueListWithFixedValues
  );
  designLoad @(
    ValueList.entity:'DesignLoads',
    Common.ValueListWithFixedValues
  );
  postingStatus @(
    ValueList.entity:'PostingStatuses',
    Common.ValueListWithFixedValues
  );
  scourRisk @(
    ValueList.entity:'ScourRiskLevels',
    Common.ValueListWithFixedValues
  );
  pbsApprovalClass @(
    ValueList.entity:'PbsApprovalClasses',
    Common.ValueListWithFixedValues
  );
  restriction @(Common: {
    Label    : '{i18n>Restriction}',
    ValueList: {
      CollectionPath                : 'Restrictions',
        Parameters                  : [
        {
            $Type            : 'Common.ValueListParameterDisplayOnly',
            ValueListProperty: 'name',
        },
        {
            $Type            : 'Common.ValueListParameterInOut',
            LocalDataProperty: restriction_ID,
            ValueListProperty: 'ID',
        }
      ],
    }
  });
}

// Hide ID because of the ValueHelp
annotate AdminService.Restrictions with {
  ID @UI.Hidden;
};

annotate AdminService.BridgeRestrictions with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
  restrictionRef      @title: 'Restriction Reference';
  name                @title: 'Name';
  descr               @title: 'Description';
  restrictionCategory @title: 'Category';
  restrictionType     @title: 'Restriction Type';
  restrictionValue    @title: 'Value';
  restrictionUnit     @title: 'Unit';
  restrictionStatus   @title: 'Status';
  appliesToVehicleClass @title: 'Applies to Vehicle Class';
  grossMassLimit      @title: 'Gross Mass Limit (t)';
  axleMassLimit       @title: 'Axle Mass Limit (t)';
  heightLimit         @title: 'Height Limit (m)';
  widthLimit          @title: 'Width Limit (m)';
  lengthLimit         @title: 'Length Limit (m)';
  speedLimit          @title: 'Speed Limit (km/h)';
  permitRequired      @title: 'Permit Required';
  escortRequired      @title: 'Escort Required';
  temporary           @title: 'Temporary';
  active              @title: 'Active';
  effectiveFrom       @title: 'Effective From';
  effectiveTo         @title: 'Effective To';
  approvedBy          @title: 'Approved By';
  direction           @title: 'Direction';
  enforcementAuthority @title: 'Enforcement Authority';
  remarks             @title: 'Remarks';
};

annotate AdminService.BridgeRestrictions with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    LineItem: [
      {Value: restrictionRef, Label: 'Reference'},
      {Value: restrictionCategory, Label: 'Category'},
      {Value: restrictionType, Label: 'Type'},
      {Value: restrictionValue, Label: 'Value'},
      {Value: restrictionUnit, Label: 'Unit'},
      {Value: restrictionStatus, Label: 'Status'},
      {Value: appliesToVehicleClass, Label: 'Vehicle Class'},
      {Value: active, Label: 'Active'}
    ],
    FieldGroup#RestrictionDetails: {
      Data: [
        {Value: restrictionRef},
        {Value: name},
        {Value: descr},
        {Value: restrictionCategory},
        {Value: restrictionType},
        {Value: restrictionValue},
        {Value: restrictionUnit},
        {Value: restrictionStatus},
        {Value: appliesToVehicleClass},
        {Value: grossMassLimit},
        {Value: axleMassLimit},
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
        {Value: permitRequired},
        {Value: escortRequired},
        {Value: temporary},
        {Value: active},
        {Value: effectiveFrom},
        {Value: effectiveTo},
        {Value: approvedBy},
        {Value: direction},
        {Value: enforcementAuthority},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Restriction Details', Target: '@UI.FieldGroup#RestrictionDetails'}
    ]
  }
);

annotate AdminService.BridgeCapacities with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {

    // ── Summary columns shown in the Bridge object page Capacity tab ─────────
    LineItem: [
      {Value: capacityType,       Label: 'Capacity Type'},
      {Value: vehicleClass,       Label: 'Vehicle Class'},
      {Value: ratingStatus,       Label: 'Rating Status'},
      {Value: grossMassLimit,     Label: 'GVM (t)'},
      {Value: grossCombined,      Label: 'GCM (t)'},
      {Value: minClearancePosted, Label: 'Min Clearance (m)'},
      {Value: ratingFactor,       Label: 'RF'},
      {Value: nextReviewDue,      Label: 'Next Review'},
      {Value: effectiveFrom,      Label: 'Effective From'},
      {Value: effectiveTo,        Label: 'Effective To'},
      {Value: status,             Label: 'Status'}
    ],

    // ── General ──────────────────────────────────────────────────────────────
    FieldGroup#CapacityGeneral: {
      Label: 'General',
      Data: [
        {Value: capacityType},
        {Value: vehicleClass},
        {Value: grossMassLimit},
        {Value: axleMassLimit},
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
        {Value: effectiveFrom},
        {Value: effectiveTo},
        {Value: status},
        {Value: reportReference},
        {Value: remarks}
      ]
    },

    // ── Mass Limits (tonnes) ─────────────────────────────────────────────────
    FieldGroup#CapacityMassLimits: {
      Label: 'Mass Limits (tonnes)',
      Data: [
        {Value: grossMassLimit,     Label: 'Gross Mass Limit / GVM (t)'},
        {Value: grossCombined,      Label: 'Gross Combined / GCM (t)'},
        {Value: steerAxleLimit,     Label: 'Steer Axle (t)'},
        {Value: singleAxleLimit,    Label: 'Single Axle (t)'},
        {Value: tandemGroupLimit,   Label: 'Tandem Axle Group (t)'},
        {Value: triAxleGroupLimit,  Label: 'Tri-Axle Group (t)'},
        {Value: quadAxleGroupLimit, Label: 'Quad-Axle Group (t)'}
      ]
    },

    // ── Vertical Clearance (metres) ──────────────────────────────────────────
    FieldGroup#CapacityVerticalClearance: {
      Label: 'Vertical Clearance (metres)',
      Data: [
        {Value: minClearancePosted,    Label: 'Min Clearance Posted (m)'},
        {Value: designClearanceHeight, Label: 'Design Clearance (m)'},
        {Value: lane1Clearance,        Label: 'Lane 1 Clearance (m)'},
        {Value: lane2Clearance,        Label: 'Lane 2 Clearance (m)'},
        {Value: clearanceSurveyDate,   Label: 'Survey Date'},
        {Value: clearanceSurveyMethod, Label: 'Survey Method'}
      ]
    },

    // ── Horizontal Geometry (metres) ─────────────────────────────────────────
    FieldGroup#CapacityHorizontalGeometry: {
      Label: 'Horizontal Geometry (metres)',
      Data: [
        {Value: carriagewayWidth,   Label: 'Carriageway Width (m)'},
        {Value: trafficableWidth,   Label: 'Trafficable Width (m)'},
        {Value: laneWidth,          Label: 'Lane Width (m)'},
        {Value: leftShoulderWidth,  Label: 'Left Shoulder (m)'},
        {Value: rightShoulderWidth, Label: 'Right Shoulder (m)'}
      ]
    },

    // ── AS 5100.7 Load Rating ────────────────────────────────────────────────
    FieldGroup#CapacityLoadRating: {
      Label: 'AS 5100.7 Load Rating',
      Data: [
        {Value: ratingStandard,   Label: 'Standard'},
        {Value: ratingMethod,     Label: 'Method'},
        {Value: ratingFactor,     Label: 'Rating Factor (RF)'},
        {Value: ratingStatus,     Label: 'Rated'},
        {Value: ratingEngineer,   Label: 'Rating Engineer (NER/CPEng)'},
        {Value: ratingDate,       Label: 'Rating Date'},
        {Value: lastReviewedBy,   Label: 'Last Reviewed By'},
        {Value: lastReviewedDate, Label: 'Last Reviewed'},
        {Value: nextReviewDue,    Label: 'Next Review Due'},
        {Value: reportReference,  Label: 'Report Reference'}
      ]
    },

    // ── Scour & Environment ──────────────────────────────────────────────────
    FieldGroup#CapacityScour: {
      Label: 'Scour & Environment',
      Data: [
        {Value: scourCriticalDepth, Label: 'Scour Critical Depth (m)'},
        {Value: currentScourDepth,  Label: 'Current Scour Depth (m)'},
        {Value: scourSafetyMargin,  Label: 'Safety Margin (m)'},
        {Value: floodClosureLevel,  Label: 'Flood Closure Level (m AHD)'},
        {Value: windClosureSpeed,   Label: 'Wind Closure Speed (km/h)'}
      ]
    },

    // ── Fatigue Life Assessment (AS 5100.7 S11) ──────────────────────────────
    FieldGroup#CapacityFatigue: {
      Label: 'Fatigue Life Assessment (AS 5100.7 S11)',
      Data: [
        {Value: designLife,            Label: 'Design Fatigue Life (years)'},
        {Value: consumedLife,          Label: 'Consumed Life (%)'},
        {Value: remainingLife,         Label: 'Remaining Life (%)'},
        {Value: fatigueSensitive,      Label: 'Fatigue-Sensitive Structure'},
        {Value: dynamicLoadAllowance,  Label: 'Dynamic Load Allowance (%)'},
        {Value: speedForAssessment,    Label: 'Speed for Assessment (km/h)'},
        {Value: heavyVehiclesPerDay,   Label: 'Heavy Vehicles/Day (HHVD)'},
        {Value: reducedSpeedCondition, Label: 'Reduced Speed Condition'},
        {Value: criticalElement,       Label: 'Critical Element'},
        {Value: remarks,               Label: 'Remarks'}
      ]
    },

    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'General',                                 Target: '@UI.FieldGroup#CapacityGeneral'},
      {$Type: 'UI.ReferenceFacet', Label: 'Mass Limits',                             Target: '@UI.FieldGroup#CapacityMassLimits'},
      {$Type: 'UI.ReferenceFacet', Label: 'Vertical Clearance',                      Target: '@UI.FieldGroup#CapacityVerticalClearance'},
      {$Type: 'UI.ReferenceFacet', Label: 'Horizontal Geometry',                     Target: '@UI.FieldGroup#CapacityHorizontalGeometry'},
      {$Type: 'UI.ReferenceFacet', Label: 'AS 5100.7 Load Rating',                   Target: '@UI.FieldGroup#CapacityLoadRating'},
      {$Type: 'UI.ReferenceFacet', Label: 'Scour & Environment',                     Target: '@UI.FieldGroup#CapacityScour'},
      {$Type: 'UI.ReferenceFacet', Label: 'Fatigue Life Assessment (AS 5100.7 S11)', Target: '@UI.FieldGroup#CapacityFatigue'}
    ]
  }
);

// Hide managed audit fields on BridgeCapacities (they come from cuid+managed mixin)
annotate AdminService.BridgeCapacities with {
  createdAt  @UI.Hidden;
  createdBy  @UI.Hidden;
  modifiedAt @UI.Hidden;
  modifiedBy @UI.Hidden;
}

annotate AdminService.BridgeAttributes with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    LineItem: [
      {Value: attributeGroup, Label: 'Group'},
      {Value: attributeName, Label: 'Name'},
      {Value: attributeValue, Label: 'Value'},
      {Value: unit, Label: 'Unit'},
      {Value: source, Label: 'Source'}
    ],
    FieldGroup#AttributeDetails: {
      Data: [
        {Value: attributeGroup},
        {Value: attributeName},
        {Value: attributeValue},
        {Value: unit},
        {Value: source},
        {Value: effectiveFrom},
        {Value: effectiveTo},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Attribute Details', Target: '@UI.FieldGroup#AttributeDetails'}
    ]
  }
);

annotate AdminService.BridgeScourAssessments with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    LineItem: [
      {Value: assessmentDate, Label: 'Assessment Date'},
      {Value: assessmentType, Label: 'Assessment Type'},
      {Value: scourRisk, Label: 'Scour Risk'},
      {Value: measuredDepth, Label: 'Measured Depth'},
      {Value: mitigationStatus, Label: 'Mitigation Status'},
      {Value: nextReviewDate, Label: 'Next Review'}
    ],
    FieldGroup#ScourAssessmentDetails: {
      Data: [
        {Value: assessmentDate},
        {Value: assessmentType},
        {Value: scourRisk},
        {Value: measuredDepth},
        {Value: floodImmunityAriYears},
        {Value: mitigationStatus},
        {Value: assessor},
        {Value: nextReviewDate},
        {Value: reportReference},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessment Details', Target: '@UI.FieldGroup#ScourAssessmentDetails'}
    ]
  }
);

annotate AdminService.BridgeDocuments with @(
  Common.Label : 'Attachments',
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : false,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName: 'Attachment',
      TypeNamePlural: 'Attachments',
      Title: {Value: title},
      Description: {Value: fileName}
    },
    LineItem: [
      {Value: title, Label: 'Title'},
      {Value: fileName, Label: 'File Name'},
      {Value: documentType, Label: 'Attachment Type'},
      {Value: mediaType, Label: 'Media Type'},
      {Value: fileSize, Label: 'File Size'},
      {Value: referenceNumber, Label: 'Reference'},
      {Value: documentDate, Label: 'Attachment Date'},
      {Value: expiryDate, Label: 'Expiry Date'}
    ],
    FieldGroup#AttachmentDetails: {
      Data: [
        {Value: documentType},
        {Value: title},
        {Value: fileName},
        {Value: mediaType},
        {Value: fileSize},
        {Value: content},
        {Value: documentUrl},
        {Value: referenceNumber},
        {Value: issuedBy},
        {Value: documentDate},
        {Value: expiryDate},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Attachment Details', Target: '@UI.FieldGroup#AttachmentDetails'}
    ]
  }
);

annotate AdminService.BridgeCapacities with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
  capacityType     @title: 'Capacity Type';
  vehicleClass     @title: 'Vehicle Class';
  grossMassLimit        @title: 'Gross Mass Limit (t)';
  grossCombined         @title: 'Gross Combined Mass (t)';
  steerAxleLimit        @title: 'Steer Axle Limit (t)';
  singleAxleLimit       @title: 'Single Axle Limit (t)';
  tandemGroupLimit      @title: 'Tandem Group Limit (t)';
  triAxleGroupLimit     @title: 'Tri-Axle Group Limit (t)';
  quadAxleGroupLimit    @title: 'Quad-Axle Group Limit (t)';
  minClearancePosted    @title: 'Min Clearance Posted (m)';
  designClearanceHeight @title: 'Design Clearance Height (m)';
  lane1Clearance        @title: 'Lane 1 Clearance (m)';
  lane2Clearance        @title: 'Lane 2 Clearance (m)';
  clearanceSurveyDate   @title: 'Clearance Survey Date';
  clearanceSurveyMethod @title: 'Clearance Survey Method';
  carriagewayWidth      @title: 'Carriageway Width (m)';
  trafficableWidth      @title: 'Trafficable Width (m)';
  laneWidth             @title: 'Lane Width (m)';
  leftShoulderWidth     @title: 'Left Shoulder Width (m)';
  rightShoulderWidth    @title: 'Right Shoulder Width (m)';
  ratingStandard        @title: 'Rating Standard';
  ratingMethod          @title: 'Rating Method';
  ratingFactor          @title: 'Rating Factor';
  ratingStatus          @title: 'Rating Status';
  ratingEngineer        @title: 'Rating Engineer';
  ratingDate            @title: 'Rating Date';
  lastReviewedBy        @title: 'Last Reviewed By';
  lastReviewedDate      @title: 'Last Reviewed Date';
  nextReviewDue         @title: 'Next Review Due';
  reportReference       @title: 'Report Reference';
  scourCriticalDepth    @title: 'Scour Critical Depth (m)';
  currentScourDepth     @title: 'Current Scour Depth (m)';
  scourSafetyMargin     @title: 'Scour Safety Margin (m)';
  floodClosureLevel     @title: 'Flood Closure Level (m AHD)';
  windClosureSpeed      @title: 'Wind Closure Speed (km/h)';
  designLife            @title: 'Design Fatigue Life (years)';
  consumedLife          @title: 'Consumed Life (%)';
  remainingLife         @title: 'Remaining Life (%)';
  fatigueSensitive      @title: 'Fatigue-Sensitive Structure';
  dynamicLoadAllowance  @title: 'Dynamic Load Allowance (%)';
  speedForAssessment    @title: 'Speed for Assessment (km/h)';
  heavyVehiclesPerDay   @title: 'Heavy Vehicles/Day';
  effectiveFrom         @title: 'Effective From';
  effectiveTo           @title: 'Effective To';
  status                @title: 'Status';
};

annotate AdminService.BridgeAttributes with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
};

annotate AdminService.BridgeScourAssessments with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
  assessmentDate    @title: 'Assessment Date';
  assessmentType    @title: 'Assessment Type';
  scourRisk @(
    title: 'Scour Risk Level',
    ValueList.entity:'ScourRiskLevels',
    Common.ValueListWithFixedValues
  );
  measuredDepth       @title: 'Measured Scour Depth (m)';
  floodImmunityAriYears @title: 'Flood Immunity (ARI years)';
  mitigationStatus    @title: 'Mitigation Status';
  assessor            @title: 'Assessor';
  nextReviewDate      @title: 'Next Review Date';
  reportReference     @title: 'Report Reference';
  remarks             @title: 'Remarks';
};

annotate AdminService.BridgeDocuments with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
  content @Common.Label: 'Attachment';
  documentType @Common.Label: 'Attachment Type';
  documentUrl @Common.Label: 'External URL';
  documentDate @Common.Label: 'Attachment Date';
  fileName @Common.Label: 'File Name';
  mediaType @Common.Label: 'Media Type';
  fileSize @Common.Label: 'File Size';
};

////////////////////////////////////////////////////////////
//
//  Draft for Localized Data
//

annotate bridge.management.Bridges with @fiori.draft.enabled;
annotate AdminService.Bridges with @odata.draft.enabled;

annotate AdminService.Bridges.texts with @(
  UI: {
    Identification: [{Value:title}],
    SelectionFields: [ locale, title ],
    LineItem: [
      {Value: locale, Label: 'Locale'},
      {Value: title, Label: 'Title'},
      {Value: descr, Label: 'Description'},
    ]
  }
);

annotate AdminService.Bridges.texts with {
    ID       @UI.Hidden;
    ID_texts @UI.Hidden;
};

// Add Value Help for Locales
annotate AdminService.Bridges.texts {
  locale @(
    ValueList.entity:'Languages', Common.ValueListWithFixedValues, //show as drop down, not a dialog
  )
}
// In addition we need to expose Languages through AdminService as a target for ValueList
using { sap } from '@sap/cds/common';
extend service AdminService {
  @readonly entity Languages as projection on sap.common.Languages;
}

// Workaround for Fiori popup for asking user to enter a new UUID on Create
annotate AdminService.Bridges with {
  ID @Core.Computed;
  status @UI.Hidden;
  title @UI.Hidden;
  stock @UI.Hidden;
  price @UI.Hidden;
  currency @UI.Hidden;
}

////////////////////////////////////////////////////////////
//
//  Field Labels — all Bridges fields
//
annotate AdminService.Bridges with {
  bridgeId               @title: 'Bridge ID';
  bridgeName             @title: 'Bridge Name';
  assetClass             @title: 'Asset Class';
  state                  @title: 'State';
  region                 @title: 'Region';
  lga                    @title: 'Local Government Area (LGA)';
  location               @title: 'Location Description';
  route                  @title: 'Route';
  routeNumber            @title: 'Route Number';
  latitude               @title: 'Latitude';
  longitude              @title: 'Longitude';
  descr                  @title: 'Description';
  assetOwner             @title: 'Asset Owner';
  managingAuthority      @title: 'Managing Authority';

  structureType          @title: 'Structure Type';
  material               @title: 'Material';
  yearBuilt              @title: 'Year Built';
  designLoad             @title: 'Design Load';
  designStandard         @title: 'Design Standard';
  clearanceHeight        @title: 'Clearance Height (m)';
  spanLength             @title: 'Span Length (m)';
  totalLength            @title: 'Total Length (m)';
  deckWidth              @title: 'Deck Width (m)';
  spanCount              @title: 'Number of Spans';
  numberOfLanes          @title: 'Number of Lanes';

  condition              @title: 'Condition State';
  conditionRating        @title: 'Condition Rating (1–10)';
  structuralAdequacyRating @title: 'Structural Adequacy Rating (1–10)';
  postingStatus          @title: 'Posting Status';
  highPriorityAsset      @title: 'High Priority Asset';
  lastInspectionDate     @title: 'Last Inspection Date';
  conditionStandard      @title: 'Condition Rating Standard';
  seismicZone            @title: 'Seismic Zone';
  asBuiltDrawingReference @title: 'As-Built Drawing Reference';
  scourRisk              @title: 'Scour Risk Level';
  scourDepthLastMeasured @title: 'Scour Depth Last Measured (m)';
  floodImmunityAriYears  @title: 'Flood Immunity (ARI years)';
  floodImpacted          @title: 'Flood Impacted';
  remarks                @title: 'Remarks';

  loadRating             @title: 'Load Rating (t)';
  pbsApprovalClass       @title: 'PBS Approval Class';
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

  createdBy              @title: 'Created By';
  createdAt              @title: 'Created At';
  modifiedBy             @title: 'Last Modified By';
  modifiedAt             @title: 'Last Modified At';

  geoJson                @title: 'Bridge Geometry (GeoJSON)';
}
