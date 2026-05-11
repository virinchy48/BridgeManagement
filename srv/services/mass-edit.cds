using { bridge.management as my } from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {
    @cds.query.limit: { max: 5000, default: 500 }
    @restrict: [
        { grant: ['READ'],   to: 'authenticated-user' },
        { grant: ['UPDATE'], to: ['manage','admin'] }
    ]
    entity BridgeGrid as projection on my.Bridges {
        key ID, bridgeId, bridgeName, state, region, lga,
        condition, conditionRating, postingStatus,
        loadRating, hmlApproved, bDoubleApproved,
        freightRoute, isActive
    };

    @requires: ['manage', 'admin']
    action massEditBridges(rows: array of {
        ID: UUID; condition: String; conditionRating: Integer;
        postingStatus: String; loadRating: Decimal;
        hmlApproved: Boolean; bDoubleApproved: Boolean;
        freightRoute: Boolean; isActive: Boolean
    }) returns { updated: Integer; failed: Integer; errors: String };
}
