using bridge from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    entity LoadRatingCertificates as projection on bridge.management.LoadRatingCertificates
        actions {
            action supersede(newCertificateNumber: String, reason: String)
                returns LoadRatingCertificates;
        };

    function getExpiringCertificates(daysAhead: Integer) returns array of {
        bridgeId: String; bridgeName: String; certificateNumber: String;
        certificateExpiryDate: Date; daysUntilExpiry: Integer; status: String
    };
}
