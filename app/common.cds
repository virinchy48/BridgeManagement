/*
 Common Annotations shared by all apps
*/

using { bridge.management as my } from '../db/schema';
using { sap.common } from '@sap/cds/common';
using { sap.common.Currencies } from '../db/currencies';

////////////////////////////////////////////////////////////////////////////
//
//	Bridge Lists
//
annotate my.Bridges with @cds.search: {
  bridgeId,
  bridgeName,
  route,
  descr
};

annotate my.Bridges with @(
  Common.SemanticKey : [bridgeId],
  UI                 : {
    SelectionFields : [
      bridgeId,
      state,
      condition,
      postingStatus,
      scourRisk,
      nhvrAssessed,
      freightRoute
    ],
    LineItem        : [
      { Value: bridgeId, Label: '{i18n>BridgeID}' },
      { Value: bridgeName, Label: '{i18n>BridgeName}' },
      { Value: route, Label: '{i18n>Route}' },
      { Value: state, Label: '{i18n>State}' },
      { Value: condition, Label: '{i18n>Condition}' },
      { Value: postingStatus, Label: '{i18n>PostingStatus}' },
      { Value: scourRisk, Label: '{i18n>ScourRisk}' },
      { Value: nhvrAssessed, Label: '{i18n>NHVRAssessed}' },
      { Value: freightRoute, Label: '{i18n>FreightRoute}' },
      { Value: restriction.name, Label: '{i18n>Restriction}' },
    ]
  }
) {
  ID  @Common: {
    SemanticObject : 'Bridges',
    Text: bridgeName,
    TextArrangement : #TextOnly
  };
  restriction @Common: { Text: restriction.name, TextArrangement: #TextOnly };
};

annotate common.Currencies with {
  symbol @Common.Label : '{i18n>Currency}';
}

////////////////////////////////////////////////////////////////////////////
//
//	Bridge Details
//
annotate my.Bridges with @(UI : {HeaderInfo : {
  TypeName       : '{i18n>Bridge}',
  TypeNamePlural : '{i18n>Bridges}',
  Title          : { Value: bridgeName },
  Description    : { Value: bridgeId }
}, });


////////////////////////////////////////////////////////////////////////////
//
//	Bridge Elements
//
annotate my.Bridges with {
  ID           @title: '{i18n>ID}';
  bridgeId     @title: '{i18n>BridgeID}';
  bridgeName   @title: '{i18n>BridgeName}';
  assetClass   @title: '{i18n>AssetClass}';
  route        @title: '{i18n>RoadRoute}';
  routeNumber  @title: '{i18n>RouteNumber}';
  state        @title: '{i18n>State}';
  region       @title: '{i18n>Region}';
  lga          @title: '{i18n>LGA}';
  latitude     @title: '{i18n>Latitude}';
  longitude    @title: '{i18n>Longitude}';
  location     @title: '{i18n>Location}';
  assetOwner   @title: '{i18n>AssetOwner}';
  managingAuthority @title: '{i18n>ManagingAuthority}';
  structureType @title: '{i18n>StructureType}';
  yearBuilt    @title: '{i18n>YearBuilt}';
  designLoad   @title: '{i18n>DesignLoad}';
  designStandard @title: '{i18n>DesignStandard}';
  clearanceHeight @title: '{i18n>ClearanceHeight}';
  spanLength   @title: '{i18n>SpanLength}';
  material     @title: '{i18n>Material}';
  spanCount    @title: '{i18n>SpanCount}';
  totalLength  @title: '{i18n>TotalLength}';
  deckWidth    @title: '{i18n>DeckWidth}';
  numberOfLanes @title: '{i18n>NumberOfLanes}';
  condition    @title: '{i18n>Condition}';
  conditionRating @title: '{i18n>ConditionRating}';
  structuralAdequacyRating @title: '{i18n>StructuralAdequacyRating}';
  postingStatus @title: '{i18n>PostingStatus}';
  conditionStandard @title: '{i18n>ConditionStandard}';
  seismicZone  @title: '{i18n>SeismicZone}';
  asBuiltDrawingReference @title: '{i18n>AsBuiltDrawingReference}';
  scourDepthLastMeasured @title: '{i18n>ScourDepthLastMeasured}';
  floodImmunityAriYears @title: '{i18n>FloodImmunityAriYears}';
  floodImpacted @title: '{i18n>FloodImpacted}';
  highPriorityAsset @title: '{i18n>HighPriorityAsset}';
  remarks      @title: '{i18n>Remarks}' @UI.MultiLineText;
  status       @title: '{i18n>Status}';
  scourRisk    @title: '{i18n>ScourRisk}';
  lastInspectionDate @title: '{i18n>LastInspectionDate}';
  nhvrAssessed @title: '{i18n>NHVRAssessed}';
  nhvrAssessmentDate @title: '{i18n>NHVRAssessmentDate}';
  loadRating   @title: '{i18n>LoadRating}';
  pbsApprovalClass @title: '{i18n>NHVRPBSApprovalClass}';
  importanceLevel @title: '{i18n>ImportanceLevel}';
  freightRoute @title: '{i18n>FreightRoute}';
  averageDailyTraffic @title: '{i18n>AverageDailyTraffic}';
  heavyVehiclePercent @title: '{i18n>HeavyVehiclePercent}';
  gazetteReference @title: '{i18n>GazetteReference}';
  nhvrReferenceUrl @title: '{i18n>NHVRReferenceURL}' @Core.IsURL;
  overMassRoute @title: '{i18n>OverMassRoute}';
  hmlApproved  @title: '{i18n>HMLApproved}';
  bDoubleApproved @title: '{i18n>BDoubleApproved}';
  dataSource   @title: '{i18n>DataSource}';
  sourceReferenceUrl @title: '{i18n>SourceReferenceURL}' @Core.IsURL;
  openDataReference @title: '{i18n>OpenDataReference}' @Core.IsURL;
  sourceRecordId @title: '{i18n>SourceRecordID}';
  restriction  @title: '{i18n>Restriction}' @Common: { Text: restriction.name, TextArrangement: #TextOnly };
  geoJson      @title: '{i18n>GeoJSON}' @UI.MultiLineText;
  descr        @title: '{i18n>Description}'  @UI.MultiLineText;
}

////////////////////////////////////////////////////////////////////////////
//
//	Languages List
//
annotate common.Languages with @(
  Common.SemanticKey : [code],
  Identification     : [{ Value: code}],
  UI                 : {
    SelectionFields : [
      name,
      descr
    ],
    LineItem        : [
      { Value: code },
      { Value: name },
    ],
  }
);

////////////////////////////////////////////////////////////////////////////
//
//	Language Details
//
annotate common.Languages with @(UI : {
  HeaderInfo          : {
    TypeName       : '{i18n>Language}',
    TypeNamePlural : '{i18n>Languages}',
    Title          : { Value: name },
    Description    : { Value: descr }
  },
  Facets              : [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Details}',
    Target : '@UI.FieldGroup#Details'
  }, ],
  FieldGroup #Details : {Data : [
    { Value: code },
    { Value: name },
    { Value: descr }
  ]},
});

////////////////////////////////////////////////////////////////////////////
//
//	Currencies List
//
annotate common.Currencies with @(
  Common.SemanticKey : [code],
  Identification     : [{ Value: code}],
  UI                 : {
    SelectionFields : [
      name,
      descr
    ],
    LineItem        : [
      { Value: descr },
      { Value: symbol },
      { Value: code },
    ],
  }
);

////////////////////////////////////////////////////////////////////////////
//
//	Currency Details
//
annotate common.Currencies with @(UI : {
  HeaderInfo           : {
    TypeName       : '{i18n>Currency}',
    TypeNamePlural : '{i18n>Currencies}',
    Title          : { Value: descr },
    Description    : { Value: code }
  },
  Facets               : [
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>Details}',
      Target : '@UI.FieldGroup#Details'
    },
    {
      $Type  : 'UI.ReferenceFacet',
      Label  : '{i18n>Extended}',
      Target : '@UI.FieldGroup#Extended'
    },
  ],
  FieldGroup #Details  : {Data : [
    { Value: name },
    { Value: symbol },
    { Value: code },
    { Value: descr }
  ]},
  FieldGroup #Extended : {Data : [
    { Value: numcode },
    { Value: minor },
    { Value: exponent }
  ]},
});

////////////////////////////////////////////////////////////////////////////
//
//	Currencies Elements
//
annotate sap.common.Currencies with {
  numcode  @title: '{i18n>NumCode}';
  minor    @title: '{i18n>MinorUnit}';
  exponent @title: '{i18n>Exponent}';
}
