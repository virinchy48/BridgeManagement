using { AdminService } from '../../../srv/admin-service';
using from '../../common';

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
  grossMassLimit        @assert.range: [0, 2000]   @Common.QuickInfo: 'Structural/design capacity (static record). For per-vehicle-class assessed operational limits (T44, SM1600, HML, etc.), use the Load Ratings tile. These may differ: Capacities = design/physical limit; Load Ratings = assessed safe operational limit per class.';
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
  measuredDepth         @assert.range: [0, 500];
  floodImmunityAriYears @assert.range: [1, 10000];
};
