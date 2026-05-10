using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [
        { grant: ['READ'],   to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE','DELETE'], to: ['manage','admin'] }
    ]
    entity LoadRatingCertificates as projection on bridge.management.LoadRatingCertificates
        actions {
            @requires: ['manage','admin']
            action supersede(newCertificateNumber: String, reason: String)
                returns LoadRatingCertificates;
        };

    function getExpiringCertificates(daysAhead: Integer) returns array of {
        bridgeId: String; bridgeName: String; certificateNumber: String;
        certificateExpiryDate: Date; daysUntilExpiry: Integer; status: String
    };
}
