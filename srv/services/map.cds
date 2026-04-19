using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @readonly
    @restrict: [{ grant: ['READ'], to: 'authenticated-user' }]
    entity BridgeLocations as select from nhvr.Bridge {
        key ID, bridgeId, name, latitude, longitude,
        condition, postingStatus, state, region, isActive
    } where latitude is not null and longitude is not null;

    action geocodeAddress(address: String)
           returns { latitude: Decimal; longitude: Decimal; formattedAddress: String };
    action reverseGeocode(latitude: Decimal, longitude: Decimal)
           returns { address: String; suburb: String; state: String; postcode: String };
    function getMapApiConfig() returns { provider: String; apiKey: String; defaultZoom: Integer };
}
