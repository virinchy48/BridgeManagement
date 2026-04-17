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
