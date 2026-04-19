using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {

    @cds.redirection.target: true
    @cds.query.limit: { max: 5000, default: 200 }
    @odata.draft.enabled
    @restrict: [
        { grant: ['READ'],            to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE'], to: ['BridgeManager','Admin'] },
        { grant: ['DELETE'],          to: ['Admin'] }
    ]
    entity Bridges as projection on nhvr.Bridge {
        *,
        route.routeCode   as routeCode,
        route.description as routeDescription,
        attributes        : redirected to BridgeAttributes
    } actions {
        action changeCondition(conditionValue: String, score: Integer)
               returns { ID: UUID; bridgeId: String; name: String; condition: String; conditionScore: Integer };
        action closeForTraffic()
               returns { ID: UUID; bridgeId: String; name: String; postingStatus: String };
        action reopenForTraffic()
               returns { ID: UUID; bridgeId: String; name: String; postingStatus: String };
        action addRestriction(
            restrictionType: String, value: Decimal, unit: String,
            validFromDate: Date, validToDate: Date, status: String,
            permitRequired: Boolean, directionApplied: String,
            gazetteRef: String, notes: String
        ) returns { status: String; message: String; ID: UUID };
    };

    @readonly
    @restrict: [{ grant: ['READ'], to: 'authenticated-user' }]
    entity Routes as projection on nhvr.Route;

    @cds.redirection.target: true
    @restrict: [
        { grant: ['READ'],                    to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE','DELETE'], to: ['BridgeManager','Admin'] }
    ]
    entity BridgeAttributes as projection on nhvr.BridgeAttribute;
}
