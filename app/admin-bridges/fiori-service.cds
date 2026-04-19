using { AdminService } from '../../srv/admin-service';
using from '../common'; // to help UI linter get the complete annotations



////////////////////////////////////////////////////////////////////////////
//
//	Bridge Object Page
//

annotate AdminService.Bridges with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    CreateHidden: false,
    UpdateHidden: false,
    DeleteHidden: false,
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Identity & Location', Target: '@UI.FieldGroup#IdentityLocation'},
      {$Type: 'UI.ReferenceFacet', Label: 'Asset Ownership', Target: '@UI.FieldGroup#AssetOwnership'},
      {$Type: 'UI.ReferenceFacet', Label: 'Physical Attributes', Target: '@UI.FieldGroup#PhysicalAttributes'},
      {$Type: 'UI.ReferenceFacet', Label: 'Condition & Status', Target: '@UI.FieldGroup#ConditionStatus'},
      {$Type: 'UI.ReferenceFacet', Label: 'NHVR & Traffic', Target: '@UI.FieldGroup#NHVRTraffic'},
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity', Target: 'capacities/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Restrictions', Target: 'restrictions/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Attributes', Target: 'attributes/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Scour Assessment', Target: 'scourAssessments/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Document', Target: 'documents/@UI.LineItem'},
      {$Type: 'UI.ReferenceFacet', Label: 'Data Provenance', Target: '@UI.FieldGroup#DataProvenance'},
      {$Type: 'UI.ReferenceFacet', Label: 'Bridge Geometry (GeoJSON)', Target: '@UI.FieldGroup#BridgeGeometry'},
    ],
    FieldGroup#IdentityLocation: {
      Data: [
        {Value: bridgeId},
        {Value: bridgeName},
        {Value: assetClass},
        {Value: state},
        {Value: region},
        {Value: lga},
        {Value: route},
        {Value: routeNumber},
        {Value: latitude},
        {Value: longitude},
        {Value: descr},
      ]
    },
    FieldGroup#AssetOwnership: {
      Data: [
        {Value: assetOwner},
        {Value: managingAuthority},
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
        {Value: scourRisk},
        {Value: lastInspectionDate},
        {Value: conditionStandard},
        {Value: seismicZone},
        {Value: asBuiltDrawingReference},
        {Value: scourDepthLastMeasured},
        {Value: floodImmunityAriYears},
        {Value: floodImpacted},
        {Value: highPriorityAsset},
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
        {Value: gazetteReference},
        {Value: nhvrReferenceUrl},
        {Value: nhvrAssessed},
        {Value: nhvrAssessmentDate},
        {Value: freightRoute},
        {Value: overMassRoute},
        {Value: hmlApproved},
        {Value: bDoubleApproved},
      ]
    },
    FieldGroup#DataProvenance: {
      Data: [
        {Value: dataSource},
        {Value: sourceReferenceUrl},
        {Value: openDataReference},
        {Value: sourceRecordId},
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
    }
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
    LineItem: [
      {Value: capacityType, Label: 'Capacity Type'},
      {Value: vehicleClass, Label: 'Vehicle Class'},
      {Value: grossMassLimit, Label: 'Gross Mass'},
      {Value: axleMassLimit, Label: 'Axle Mass'},
      {Value: heightLimit, Label: 'Height'},
      {Value: widthLimit, Label: 'Width'},
      {Value: lengthLimit, Label: 'Length'},
      {Value: status, Label: 'Status'}
    ],
    FieldGroup#CapacityDetails: {
      Data: [
        {Value: capacityType},
        {Value: vehicleClass},
        {Value: grossMassLimit},
        {Value: axleMassLimit},
        {Value: heightLimit},
        {Value: widthLimit},
        {Value: lengthLimit},
        {Value: speedLimit},
        {Value: pbsLevel},
        {Value: effectiveFrom},
        {Value: effectiveTo},
        {Value: status},
        {Value: sourceReference},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Capacity Details', Target: '@UI.FieldGroup#CapacityDetails'}
    ]
  }
);

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
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    LineItem: [
      {Value: documentType, Label: 'Document Type'},
      {Value: title, Label: 'Title'},
      {Value: fileName, Label: 'File Name'},
      {Value: referenceNumber, Label: 'Reference'},
      {Value: documentDate, Label: 'Document Date'},
      {Value: expiryDate, Label: 'Expiry Date'}
    ],
    FieldGroup#DocumentDetails: {
      Data: [
        {Value: documentType},
        {Value: title},
        {Value: documentUrl},
        {Value: fileName},
        {Value: referenceNumber},
        {Value: issuedBy},
        {Value: documentDate},
        {Value: expiryDate},
        {Value: remarks}
      ]
    },
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Document Details', Target: '@UI.FieldGroup#DocumentDetails'}
    ]
  }
);

annotate AdminService.BridgeCapacities with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
};

annotate AdminService.BridgeAttributes with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
};

annotate AdminService.BridgeScourAssessments with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
  scourRisk @(
    ValueList.entity:'ScourRiskLevels',
    Common.ValueListWithFixedValues
  );
};

annotate AdminService.BridgeDocuments with {
  ID @UI.Hidden;
  bridge @UI.Hidden;
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
  currency_code @UI.Hidden;
}
