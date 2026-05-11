namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';
using { bridge.management.LoadRatingVehicleClass }      from './enum-types';
using { bridge.management.NhvrAssessmentMethodology }   from './enum-types';
using { bridge.management.BridgeScourAssessments } from './scour-assessments';

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
    iapConditions              : LargeString;         // Individual Access Permit conditions text
    structuralAnalysisRequired : Boolean default false; // Triggers mandatory engineering review
    concessionalMass           : Boolean default false; // NHVR Concessional Mass Limit scheme
    lastReviewDate             : Date;
    reviewFrequencyMonths      : Integer;              // How often the assessment must be reviewed

    assessmentMethodology      : NhvrAssessmentMethodology;  // NHVR RA Scheme §3 — Desktop / Field / Load Testing / Combined
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
    scourAssessment                 : Association to BridgeScourAssessments;
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
    { name: 'idx_scour_bridge',        columns: ['bridge_ID'] },
    { name: 'idx_scour_riskcat',       columns: ['scourRiskCategoryAp71'] },
    { name: 'idx_scour_detail_assess', columns: ['scourAssessment_ID'] }
]);

entity NhvrApprovedVehicleClasses : cuid, managed {
    assessment   : Association to NhvrRouteAssessments @mandatory;
    vehicleClass : LoadRatingVehicleClass @mandatory;
    maxGrossMass : Decimal(9,2);
    conditions   : String(500);
    active       : Boolean default true;
}
annotate NhvrApprovedVehicleClasses with @(cds.persistence.indexes: [
    { name: 'idx_nhvr_avc_assess', columns: ['assessment_ID'] }
]);

extend entity NhvrRouteAssessments with {
    approvedClasses : Composition of many NhvrApprovedVehicleClasses
                      on approvedClasses.assessment = $self;
}

extend entity BridgeScourAssessments with {
    hydraulicDetails : Association to many BridgeScourAssessmentDetail
                       on hydraulicDetails.scourAssessment = $self;
}

extend entity Bridges with {
    nhvrRouteAssessments      : Association to many NhvrRouteAssessments
                                on nhvrRouteAssessments.bridge = $self;
    scourAssessmentDetails    : Association to many BridgeScourAssessmentDetail
                                on scourAssessmentDetails.bridge = $self;
}
