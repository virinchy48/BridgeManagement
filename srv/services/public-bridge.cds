using {bridge.management as my} from '../../db/schema';

/**
 * PublicBridgeService — Unauthenticated read-only surface for external stakeholders.
 *
 * Accessible at /public-bridge/ with authenticationMethod: none in xs-app.json.
 * Only curated fields are projected — no condition scores, structural assessments,
 * cost data, audit fields, or data lineage that could expose sensitive information.
 *
 * Rate limiting is enforced at the AppRouter route level (xs-app.json).
 * CAP enforces @readonly — no write operations are possible on this service.
 */
@requires: 'any'
@path: '/public-bridge'
service PublicBridgeService {

  /**
   * PublicBridges — safe projection of the Bridges master.
   * Omits: conditionRating, structuralAdequacyRating, scourRisk, scourDepth,
   *        loadRating, riskAssessments, cost fields, all audit fields (createdBy etc.),
   *        sourceRecordId, dataSource, closureReason, geoJson, isDeleted.
   */
  @readonly
  entity PublicBridges as select from my.Bridges {
    ID,
    bridgeId,
    bridgeName,
    descr,
    assetClass,
    structureType,
    material,
    yearBuilt,
    state,
    region,
    lga,
    route,
    routeNumber,
    location,
    latitude,
    longitude,
    totalLength,
    deckWidth,
    numberOfLanes,
    clearanceHeight,
    postingStatus,
    lastInspectionDate,
    nextInspectionDue,
    inspectionFrequencyYears,
    hmlApproved,
    bDoubleApproved,
    pbsApprovalClass,
    nhvrAssessed,
    freightRoute,
    overMassRoute,
    status
  } where isDeleted = false and isActive = true;

  /**
   * PublicRestrictions — active restrictions for the external card view.
   * Omits permit officer, enforcement details, internal references.
   */
  @readonly
  entity PublicRestrictions as select from my.BridgeRestrictions {
    ID,
    bridge.bridgeId  as bridgeId,
    bridge.bridgeName as bridgeName,
    restrictionCategory,
    restrictionType,
    restrictionValue,
    restrictionUnit,
    appliesToVehicleClass,
    permitRequired,
    effectiveFrom,
    effectiveTo,
    active
  } where active = true;
}
