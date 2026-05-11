namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity BridgeRiskAssessments : cuid, managed {
    bridge               : Association to Bridges @mandatory;
    assessmentId         : String(40)  @mandatory;
    assessmentDate       : Date        @mandatory;
    assessmentCycle      : String(20);

    riskType             : String(40)  @mandatory;
    riskDescription      : String(500) @mandatory;
    potentialConsequence : String(500);

    likelihood           : Integer     @assert.range: [1, 5] @mandatory;
    likelihoodJustification : String(300);
    consequence          : Integer     @assert.range: [1, 5] @mandatory;
    consequenceJustification : String(300);

    inherentRiskScore    : Integer;
    inherentRiskLevel    : String(20);

    existingControls     : LargeString;
    controlEffectiveness : String(30);
    residualRiskScore    : Integer;
    residualRiskLevel    : String(20);
    residualRiskAcceptable : Boolean;

    riskTreatmentStrategy : String(30);
    treatmentActions      : LargeString;
    treatmentResponsible  : String(111);
    treatmentDeadline     : Date;
    treatmentBudget       : Decimal(12,2);

    assessor             : String(111) @mandatory;
    assessorTitle        : String(60);
    reviewDueDate        : Date;
    lastReviewDate       : Date;

    linkedInspectionId   : String(40);
    linkedDefectId       : String(40);
    notes                : LargeString;
}

annotate BridgeRiskAssessments with @(cds.persistence.indexes: [
    { name: 'idx_risk_bridge',    columns: ['bridge_ID'] },
    { name: 'idx_risk_type',      columns: ['riskType'] },
    { name: 'idx_risk_residual',  columns: ['residualRiskLevel'] },
    { name: 'idx_risk_review',    columns: ['reviewDueDate'] }
]);

extend entity Bridges with {
    riskAssessments : Association to many BridgeRiskAssessments
                      on riskAssessments.bridge = $self;
}
