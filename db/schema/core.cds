namespace nhvr;
using { cuid, managed } from '@sap/cds/common';

entity Route : cuid, managed {
    routeCode   : String(20)  @mandatory;
    description : String(200) @mandatory;
    region      : String(100);
    state       : String(50);
    isActive    : Boolean default true;
    bridges     : Association to many Bridge on bridges.route = $self;
}
annotate Route with { routeCode @assert.unique; };

entity Bridge : cuid, managed {
    bridgeId            : String(20)    @mandatory @assert.unique;
    name                : String(200)   @mandatory;
    region              : String(100);
    state               : String(50);
    lga                 : String(100);
    suburb              : String(100);
    route               : Association to Route;
    routeKm             : Decimal(8,3);
    latitude            : Decimal(11,8);
    longitude           : Decimal(11,8);
    assetClass          : String(30)  default 'BRIDGE';
    structureType       : String(100);
    material            : String(100);
    condition           : String(20)  default 'GOOD';
    conditionRating     : Integer;
    conditionScore      : Integer;
    postingStatus       : String(20)  default 'UNRESTRICTED';
    inspectionDate      : Date;
    nextInspectionDueDate: Date;
    inspectionFrequencyYrs: Integer;
    highPriorityAsset   : Boolean default false;
    overdueFlag         : Boolean default false;
    yearBuilt           : Integer;
    designLife          : Integer;
    spanLengthM         : Decimal(8,2);
    totalLengthM        : Decimal(8,2);
    deckWidthM          : Decimal(6,2);
    widthM              : Decimal(6,2);
    clearanceHeightM    : Decimal(5,2);
    numberOfSpans       : Integer;
    numberOfLanes       : Integer;
    designLoad          : String(100);
    loadRating          : Decimal(8,3);
    scourRisk           : String(20);
    floodImpacted       : Boolean default false;
    nhvrRouteAssessed   : Boolean default false;
    freightRoute        : Boolean default false;
    overMassRoute       : Boolean default false;
    hmlApproved         : Boolean default false;
    bdoubleApproved     : Boolean default false;
    assetOwner          : String(100);
    maintenanceAuthority: String(100);
    gazetteRef          : String(100);
    nhvrRef             : String(100);
    aadtVehicles        : Integer;
    remarks             : LargeString;
    isActive            : Boolean default true;
    version             : Integer default 1;
    isDeleted           : Boolean default false;
    // backlinks added via extend in restrictions.cds and admin.cds
}

annotate Bridge with @(cds.persistence.indexes: [
    { name: 'idx_bridge_bridgeId',      columns: ['bridgeId'] },
    { name: 'idx_bridge_state',         columns: ['state'] },
    { name: 'idx_bridge_condition',     columns: ['condition'] },
    { name: 'idx_bridge_isActive',      columns: ['isActive'] },
    { name: 'idx_bridge_postingStatus', columns: ['postingStatus'] }
]);
