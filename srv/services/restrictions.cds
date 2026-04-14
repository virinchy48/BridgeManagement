using nhvr from '../../db/schema';
using { BridgeManagementService } from '../service';

extend service BridgeManagementService with {

    @cds.redirection.target: true
    @cds.query.limit: { max: 5000, default: 200 }
    @restrict: [
        { grant: ['READ'],            to: 'authenticated-user' },
        { grant: ['CREATE','UPDATE'], to: ['BridgeManager','Admin'] },
        { grant: ['DELETE'],          to: ['Admin'] }
    ]
    entity Restrictions as projection on nhvr.Restriction {
        *,
        bridge.bridgeId as bridgeId @readonly,
        bridge.name     as bridgeName @readonly,
        route.routeCode as routeCode @readonly,
        changeHistory   : redirected to RestrictionChangeLogs
    } actions {
        action disableRestriction(reason: String) returns { status: String; message: String };
        action enableRestriction(reason: String)  returns { status: String; message: String };
        action createTemporaryRestriction(fromDate: Date, toDate: Date, reason: String)
               returns { status: String; message: String; ID: UUID };
    };

    @readonly
    @restrict: [{ grant: ['READ'], to: 'authenticated-user' }]
    entity ActiveRestrictions as select from nhvr.Restriction {
        key ID, restrictionType, value, unit,
        bridge.bridgeId as bridgeId, bridge.name as bridgeName,
        bridge.region, route.routeCode, validFromDate, validToDate,
        permitRequired, vehicleClassLabel, directionApplied
    } where status = 'ACTIVE' and isActive = true;

    @cds.redirection.target: true
    @readonly
    @restrict: [{ grant: ['READ'], to: 'authenticated-user' }]
    entity RestrictionChangeLogs as projection on nhvr.RestrictionChangeLog;
}

extend projection BridgeManagementService.Bridges {
    restrictions : redirected to BridgeManagementService.Restrictions
}
