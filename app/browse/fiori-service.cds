using CatalogService from '../../srv/cat-service';

////////////////////////////////////////////////////////////////////////////
//
//	Bridge Object Page
//
annotate CatalogService.Bridges with @(UI : {
  HeaderInfo        : {
    TypeName        : '{i18n>Bridge}',
    TypeNamePlural  : '{i18n>Bridges}',
    Title           : {Value : bridgeName},
    Description     : {Value : bridgeId}
  },
  HeaderFacets      : [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Description}',
    Target : '@UI.FieldGroup#Descr'
  }, {
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Restriction}',
    Target : '@UI.FieldGroup#Restriction'
  }, ],
  Facets            : [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Details}',
    Target : '@UI.FieldGroup#Bridge'
  }, ],
  FieldGroup #Descr : {Data : [{Value : descr}, ]},
  FieldGroup #Restriction : {Data : [
    {Value : restrictionName},
  ]},
  FieldGroup #Bridge : {Data : [
    {Value : route},
    {Value : state},
    {Value : condition},
    {Value : status},
    {Value : scourRisk},
    {Value : nhvrAssessed},
    {Value : freightRoute},
  ]},
});


////////////////////////////////////////////////////////////////////////////
//
//	Bridge List Page
//
annotate CatalogService.Bridges with @(UI : {
  SelectionFields : [
    bridgeId,
    state,
    condition,
    status,
    scourRisk,
    nhvrAssessed,
    freightRoute
  ],
  LineItem        : [
    {
      Value : bridgeId,
      Label : '{i18n>BridgeID}'
    },
    {
      Value : bridgeName,
      Label : '{i18n>BridgeName}'
    },
    {Value : route, Label : '{i18n>Route}'},
    {Value : state, Label : '{i18n>State}'},
    {Value : condition, Label : '{i18n>Condition}'},
    {Value : status, Label : '{i18n>Status}'},
    {Value : scourRisk, Label : '{i18n>ScourRisk}'},
    {Value : nhvrAssessed, Label : '{i18n>NHVRAssessed}'},
    {Value : freightRoute, Label : '{i18n>FreightRoute}'},
    {Value : restrictionName, Label : '{i18n>Restriction}'},
  ]
});
