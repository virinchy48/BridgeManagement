using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @restrict: [
        { grant: ['READ'],   to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE','DELETE'], to: ['BridgeManager','Admin'] }
    ]
    entity LoadRatingCertificates as projection on bridge.management.LoadRatingCertificates
        actions {
            @requires: ['BridgeManager','Admin']
            action supersede(newCertificateNumber: String, reason: String)
                returns LoadRatingCertificates;
        };

    function getExpiringCertificates(daysAhead: Integer) returns array of {
        bridgeId: String; bridgeName: String; certificateNumber: String;
        certificateExpiryDate: Date; daysUntilExpiry: Integer; status: String
    };
}
