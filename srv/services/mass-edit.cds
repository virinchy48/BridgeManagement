using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @cds.query.limit: { max: 5000, default: 500 }
    @restrict: [
        { grant: ['READ'],   to: 'authenticated-user' },
        { grant: ['UPDATE'], to: ['BridgeManager','Admin'] }
    ]
    entity BridgeGrid as projection on nhvr.Bridge {
        key ID, bridgeId, name, state, region, lga,
        condition, conditionRating, postingStatus,
        loadRating, hmlApproved, bdoubleApproved,
        freightRoute, isActive, version
    };

    @requires: ['BridgeManager', 'Admin']
    action massEditBridges(rows: array of {
        ID: UUID; condition: String; conditionRating: Integer;
        postingStatus: String; loadRating: Decimal;
        hmlApproved: Boolean; bdoubleApproved: Boolean;
        freightRoute: Boolean; isActive: Boolean; version: Integer
    }) returns { updated: Integer; failed: Integer; errors: String };
}
