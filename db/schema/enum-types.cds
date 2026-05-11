namespace bridge.management;

type LoadRatingVehicleClass : String enum {
  T44    = 'T44';    SM1600 = 'SM1600'; HLP400 = 'HLP400';
  W80    = 'W80';    A160   = 'A160';
  PBS1   = 'PBS1';   PBS2   = 'PBS2';   PBS3   = 'PBS3';   PBS4   = 'PBS4';   PBS5 = 'PBS5';
  HML    = 'HML';    CML    = 'CML';
}

type LoadRatingMethod : String enum {
  AS5100      = 'AS 5100';
  NAASRA      = 'NAASRA';
  LoadTesting = 'Load Testing';
}

type InspectionStandard : String enum {
  AS5100    = 'AS 5100-7:2017';
  NAASRA    = 'NAASRA 1992';
  AGAM      = 'AGAM:2013';
  TfNSW_BIM = 'TfNSW-BIM';
  Other     = 'Other';
}

type RatingLevel : String enum {
  T44    = 'T44';
  SM1600 = 'SM1600';
  HLP400 = 'HLP400';
  PBS    = 'PBS';
  HML    = 'HML';
  Custom = 'Custom';
}
