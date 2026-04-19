// HANA-specific extensions for BMS
using from '../../db/schema';

using { bridge.management as my } from '..';

// HANA-only spatial column — populated from latitude/longitude via server hook
extend my.Bridges with {
  geoLocation : hana.ST_POINT(4326);
}
