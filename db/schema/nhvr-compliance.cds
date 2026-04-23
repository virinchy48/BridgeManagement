namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity NhvrRouteAssessments : cuid, managed {
    bridge                     : Association to Bridges @mandatory;
    assessmentId               : String(50)  @mandatory;

    assessorName               : String(100) @mandatory;
    assessorAccreditationNo    : String(50)  @mandatory;

    assessmentDate             : Date        @mandatory;
    assessmentVersion          : String(20);
    assessmentStatus           : String(20)  default 'Current';

    approvedVehicleClasses     : LargeString;
    conditions                 : LargeString;

    iapRequired                : Boolean default false;
    iapRouteId                 : String(50);

    nhvrSubmissionRef          : String(50);
    nhvrSubmissionDate         : Date;
    nhvrApprovalDate           : Date;

    validFrom                  : Date @mandatory;
    validTo                    : Date;
    nextReviewDate             : Date;
    notes                      : LargeString;
}

annotate NhvrRouteAssessments with @(cds.persistence.indexes: [
    { name: 'idx_nhra_bridge',   columns: ['bridge_ID'] },
    { name: 'idx_nhra_status',   columns: ['assessmentStatus'] },
    { name: 'idx_nhra_validTo',  columns: ['validTo'] }
]);

entity BridgeScourAssessmentDetail : cuid, managed {
    bridge                          : Association to Bridges @mandatory;
    assessmentDate                  : Date @mandatory;

    hydraulicModelRef               : String(50);
    hydraulicModelType              : String(30);

    velocityAtDesignFloodMs         : Decimal(6,2);
    waterwayOpeningAreaM2           : Decimal(12,2);

    scourType                       : String(30);
    ap71ScoreNumeric                : Integer @assert.range: [1, 5];
    scourRiskCategoryAp71           : String(20);

    countermeasureEffectivenessRating : String(20);
    recommendedAction               : String(500);
    nextAssessmentDate              : Date;
    notes                           : LargeString;
}

annotate BridgeScourAssessmentDetail with @(cds.persistence.indexes: [
    { name: 'idx_scour_bridge',   columns: ['bridge_ID'] },
    { name: 'idx_scour_riskcat',  columns: ['scourRiskCategoryAp71'] }
]);

extend entity Bridges with {
    nhvrRouteAssessments      : Composition of many NhvrRouteAssessments
                                on nhvrRouteAssessments.bridge = $self;
    scourAssessmentDetails    : Composition of many BridgeScourAssessmentDetail
                                on scourAssessmentDetails.bridge = $self;
}
