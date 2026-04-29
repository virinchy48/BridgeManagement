using { bridge.management as bms } from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @readonly
    @restrict: [{ grant: ['READ'], to: ['view','manage','admin'] }]
    entity BridgeLocations as select from bms.Bridges {
        key ID, bridgeId, bridgeName, latitude, longitude,
        condition, postingStatus, state, region
    } where latitude is not null and longitude is not null;

    action geocodeAddress(address: String)
           returns { latitude: Decimal; longitude: Decimal; formattedAddress: String };
    action reverseGeocode(latitude: Decimal, longitude: Decimal)
           returns { address: String; suburb: String; state: String; postcode: String };
    function getMapApiConfig() returns { provider: String; apiKey: String; defaultZoom: Integer };
}
