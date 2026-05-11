# BMS Tile Attribute Design Document

**Version**: 1.0 — May 2026  
**Standards**: AS 5100, SIMS (NSW SIMS §4), AGAM:2013, TfNSW-BIM, NHVR HVNL  
**Scope**: 12 sub-domain tiles + Bridge Details (parent entity)

---

## Summary Table

| Tile | Entity | Current Fields | Gaps Identified | Priority Additions | Schema File |
|------|--------|---------------|-----------------|-------------------|-------------|
| Inspections | BridgeInspections | 19 | 6 | 4 HIGH | `db/schema/defects.cds` |
| Defects | BridgeDefects | 25 | 7 | 4 HIGH | `db/schema/defects.cds` |
| Bridge Capacities | BridgeCapacities | 31 | 2 | 1 HIGH | `db/schema/calculations.cds` |
| Condition Surveys | BridgeConditionSurveys | 14 | 3 | 2 HIGH | `db/schema.cds` |
| Load Ratings (LRT) | BridgeLoadRatings | 14 | 3 | 2 MEDIUM | `db/schema.cds` |
| Permits (PRM) | BridgePermits | 19 | 4 | 2 HIGH | `db/schema.cds` |
| Risk Assessments | BridgeRiskAssessments | 28 | 4 | 3 HIGH | `db/schema/risk-assessments.cds` |
| NHVR Route Assessments | NhvrRouteAssessments | 21 | 2 | 1 HIGH | `db/schema/nhvr-compliance.cds` |
| Load Rating Certificates | LoadRatingCertificates | 30 | 1 | 1 MEDIUM | `db/schema/load-ratings.cds` |
| Bridge Elements | BridgeElements | 22 | 3 | 2 HIGH | `db/schema/elements.cds` |
| Scour Assessments | BridgeScourAssessments | 14 | 3 | 2 HIGH | `db/schema/scour-assessments.cds` |
| Alerts & Notifications | AlertsAndNotifications | 22 | 1 | 0 HIGH | `db/schema/alerts.cds` |

---

## Per-Tile Analysis

---

### 1. BridgeInspections (Inspections Tile)

**Purpose**: Captures the full inspection event — who, when, what standard, what was found. The legal evidence record for bridge condition under AS 5100-7 and TfNSW-BIM §3.

**Standards**: AS 5100-7:2017, TfNSW-BIM §3.1–3.4, AGAM:2013 §4.2

**Current Fields**:
| Field | Type | Description |
|-------|------|-------------|
| bridge | Association | FK to Bridges |
| inspectionRef | String(40) | Auto-generated INS-NNNN |
| inspectionDate | Date | @mandatory |
| inspectionType | String(40) | @mandatory — Routine/Detailed/Principal/Special |
| inspector | String(111) | @mandatory |
| inspectorAccreditationNumber | String(40) | NER/CPEng number |
| inspectorAccreditationLevel | String(20) | Level 1–4 (TfNSW-BIM §3.1) |
| inspectorCompany | String(111) | Inspector's organisation |
| qualificationExpiry | Date | Licence/cert expiry |
| inspectionScope | String(500) | What was examined |
| inspectionStandard | InspectionStandard (enum) | AS 5100-7 / NAASRA / AGAM / TfNSW-BIM |
| weatherConditions | String(200) | Ambient conditions |
| accessibilityIssues | String(500) | Access constraints noted |
| s4InspectionOrderRef | String(40) | SAP PM order reference |
| s4NotificationRef | String(40) | SAP PM notification reference |
| reportStorageRef | String(500) | Location of inspection report |
| inspectionNotes | LargeString | Full narrative |
| overallConditionRating | Integer [1,10] | Composite bridge rating |
| criticalFindings | Boolean | True if any critical defects found |
| recommendedActions | LargeString | Recommendations for works |
| nextInspectionRecommended | Date | Inspector's recommended next date |
| active | Boolean | Soft-delete flag |

**Proposed Additions** (HIGH priority):

| Field | Type | Rationale | Allowed Values |
|-------|------|-----------|----------------|
| `bridgeComponentsInspected` | String(500) | AGAM §4.2 requires listing which major components were included in scope. Currently captured only in free-text `inspectionScope`. | Free text |
| `overallStructuralAdequacy` | String(20) | TfNSW-BIM §3.3 requires the inspection record to carry a structural adequacy verdict separate from condition rating | Adequate / Marginal / Inadequate |
| `loadCarryingCapacityConfirmed` | Boolean | AS 5100-7 §3.2 — inspector must confirm whether load carrying capacity is as-rated or reduced | Boolean |
| `inspectionMethodology` | String(40) | AGAM §4.2 distinguishes visual-only from under-bridge / specialist access methods. Currently missing as a structured field (buried in free text) | Visual / Under-Bridge Unit / Rope Access / Underwater / Drone |
| `reportIssueDate` | Date | TfNSW-BIM §3.4 — the date the inspection report was formally issued (differs from inspection date) | Date |
| `followUpRequired` | Boolean | Simple flag to drive workflow — if true, creates a task/alert for the bridge manager | Boolean |

**Fields to Review/Remove**: None — existing fields are all appropriate.

**Allowed Values**:
- `inspectionType` (via lookup `InspectionTypes`): Routine | Principal | Detailed | Special | Drive-By | Underwater | Aerial
- `inspectorAccreditationLevel`: Level 1 | Level 2 | Level 3 | Level 4 (TfNSW-BIM §3.1 — Level 3/4 for Principal/Detailed)
- `inspectionStandard` (enum): already has AS 5100-7:2017 | NAASRA 1992 | AGAM:2013 | TfNSW-BIM | Other
- `overallStructuralAdequacy` (new): Adequate | Marginal | Inadequate (TfNSW-BIM §3.3)
- `inspectionMethodology` (new): Visual | Under-Bridge Unit | Rope Access | Underwater | Drone

**Cross-Tile Linkages**:
- `BridgeDefects` are linked to an inspection via `inspection_ID` FK — defects without an inspection ref are standalone
- `BridgeInspectionElements` (CS1–CS4 condition states) linked via `inspection_ID`
- On approval of inspection, `BridgeConditionSurveys` status lifecycle is separate — surveys are NOT the same as inspections
- `BridgeRiskAssessments.linkedInspection` FK references this entity
- Bridge entity `conditionRating`, `lastInspectionDate`, `conditionAssessor` are synced from this tile via `admin-service.js` after handlers

---

### 2. BridgeDefects (Defects Tile)

**Purpose**: Records individual structural defects found during inspection or ad-hoc observation. The primary driver of remediation work orders and risk escalation.

**Standards**: SIMS §4.3 (element defect codes), TfNSW-BIM §4.3 (defect classification), AS 5100-7 §5

**Current Fields**:
| Field | Type | Description |
|-------|------|-------------|
| bridge | Association | FK to Bridges @mandatory |
| inspection | Association | FK to BridgeInspections (optional) |
| defectId | String(30) | Auto-generated DEF-NNNN |
| deteriorationMechanism | String(60) | Corrosion / Fatigue / Impact / Scour / etc. |
| defectCode | String(20) | SIMS element defect code (BS01, SW23, etc.) |
| defectType | String(40) | @mandatory |
| defectDescription | String(500) | @mandatory |
| bridgeElement | String(40) | Free-text element name |
| bridgeElementRef | Association to BridgeElements | Optional structured element link |
| spanNumber | Integer | Span location |
| pierNumber | Integer | Pier/abutment location |
| face | String(60) | Top / Bottom / Upstream face / Downstream face |
| position | String(100) | Specific location description |
| severity | Integer [1,4] | @mandatory 1=Low, 4=Critical |
| urgency | Integer [1,4] | @mandatory 1=Low, 4=Emergency |
| dimensionLengthMm | Decimal(8,2) | Defect extent |
| dimensionWidthMm | Decimal(8,2) | Defect extent |
| dimensionDepthMm | Decimal(8,2) | Defect extent |
| photoReferences | LargeString | List of photo IDs/URLs |
| remediationStatus | String(20) | Open / In Progress / Completed / Deferred / Monitored |
| estimatedRepairCost | Decimal(12,2) | AUD |
| plannedRemediationDate | Date | When work is scheduled |
| actualRemediationDate | Date | When work was done |
| remediationNotes | LargeString | Notes on remediation |
| s4NotificationId | String(40) | SAP PM notification |
| s4OrderId | String(40) | SAP PM maintenance order |
| s4SyncStatus | String(20) | NOT_SYNCED / SYNCED / ERROR |
| s4SyncDate | Timestamp | Last S/4 sync timestamp |
| s4SyncError | String(500) | Last S/4 sync error |
| notes | LargeString | General notes |
| active | Boolean | Soft-delete flag |

**Proposed Additions** (HIGH priority):

| Field | Type | Rationale | Allowed Values |
|-------|------|-----------|----------------|
| `repairMethod` | String(60) | SIMS §4.3 and TfNSW-BIM §4.3 require the remediation record to include the repair method used (not just cost/date). Required for work order generation and lessons-learned reporting. | Patching / Injection / Surface Treatment / Full Section Replacement / Monitoring Only / Demolition / Other |
| `defectQuantity` | Decimal(10,3) | When combined with `defectUnit`, gives the extent in measurable terms rather than just mm dimensions. Used in cost estimation and SIMS element health degradation modelling. | Decimal |
| `defectUnit` | String(20) | Unit for `defectQuantity` field. | m² / m / no. / kg |
| `requiresLoadRestriction` | Boolean | TfNSW-BIM §4.4 — if a defect reduces structural capacity, this flag triggers an alert and review of the BridgeCapacities/LoadRatingCertificates tile. Currently no programmatic link exists between defect severity and capacity records. | Boolean |
| `maintenancePriority` | String(20) | AGAM §5.3 classifies maintenance priority independently of urgency — P1 Emergency / P2 Urgent / P3 Routine / P4 Planned | P1 Emergency / P2 Urgent / P3 Routine / P4 Planned |
| `inspectionCycle` | String(20) | Which inspection cycle discovered the defect. Allows trend analysis across inspection cycles without needing to join back to the inspection record. | 2024-Principal / 2023-Routine / 2022-Routine / etc. |
| `verifiedBy` | String(111) | TfNSW-BIM §4.3 requires a second reviewer for severity-4 (Critical) defects before they can drive load restrictions. | Free text |

**Allowed Values**:
- `deteriorationMechanism` (existing): Corrosion | Fatigue | Impact | Scour | Overload | Chemical | Settlement | Aging | Collision | Thermal
- `remediationStatus` (via lookup or enum): Open | In Progress | Completed | Deferred | Monitoring | Closed — No Action
- `face` (existing): Top Surface | Soffit | Upstream Face | Downstream Face | Left Face | Right Face | Bearing Area
- `repairMethod` (new): Patching | Epoxy Injection | Surface Treatment / Coating | Full Section Replacement | Monitoring Only | Demolition | Rock Bolt | Grouting | Other

**Cross-Tile Linkages**:
- `BridgeRiskAssessments.linkedDefect` FK references this entity
- When `severity >= 3` (High/Critical), `admin-service.js` auto-opens an alert in `AlertsAndNotifications`
- When `requiresLoadRestriction = true` (new field), should trigger alert linked to `BridgeCapacities` and `LoadRatingCertificates`
- `BridgeElements.currentConditionRating` should be updated (or at least flagged) when a defect on that element reaches severity 3+
- `BridgeInspections.criticalFindings` is set to true if any child defect has `severity = 4`

---

### 3. BridgeCapacities (Bridge Capacity Tile)

**Purpose**: Records the structural capacity of the bridge at a point in time — mass limits, clearances, rating factors. Replaces and supplements the posted load limits that appear on restriction signs.

**Standards**: AS 5100-7:2017 (load rating), NHVR HVNL §94 (mass limits), AS 1742.2 (posted limits)

**Current Fields** (31 fields — well covered):
Bridge ID, capacityType, grossMassLimit, grossCombined, steerAxleLimit, singleAxleLimit, tandemGroupLimit, triAxleGroupLimit, minClearancePosted, lane1Clearance, lane2Clearance, clearanceSurveyDate, clearanceSurveyMethod, carriagewayWidth, trafficableWidth, laneWidth, ratingStandard, ratingFactor, ratingEngineer, ratingDate, nextReviewDue, reportReference, scourCriticalDepth, currentScourDepth, floodClosureLevel, designLife, consumedLife, fatigueSensitive, fatigueDetailCategory, criticalElement, effectiveFrom, effectiveTo, supersessionReason, capacityStatus, lastReviewedBy, statusReviewDue, engineeringNotes

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `axleSpacingMinimumM` | Decimal(6,2) | NHVR HVNL §§94–95 — minimum axle spacing governs dynamic impact on thin decks. Required for OSOM permit evaluation. | HIGH |
| `specialConditions` | LargeString | AS 5100-7 §3.1 — rating may be conditional on specific vehicle configurations, speeds, or escort requirements. Currently buried in `engineeringNotes`. | MEDIUM |

**Fields to Review/Remove**: `scourCriticalDepth` and `currentScourDepth` duplicate what is in `BridgeScourAssessments`. Consider removing from Capacities or making them read-only references pulled from the latest scour assessment.

**Allowed Values**:
- `capacityType` (via lookup): Legal Mass / Restricted Mass / Posted Mass / Structural Rating / OSOM / Emergency Rating
- `ratingStandard` (via lookup): AS 5100-7:2017 | Austroads Guide | NAASRA:1992 | Load Testing | Proof Loading
- `fatigueDetailCategory` (via lookup): A | B | C | D | E | F | G (AS 5100.6 §13.5)
- `capacityStatus` (via lookup): Current | Superseded | Under Review | Revoked

**Cross-Tile Linkages**:
- When a defect sets `requiresLoadRestriction = true`, this tile's `nextReviewDue` should be flagged
- `LoadRatingCertificates` provides the formal engineered certification; this tile provides the operational posted limits
- `BridgeRestrictions` holds the legally enforced restriction order; `BridgeCapacities` holds the engineering basis

---

### 4. BridgeConditionSurveys (CON Tile)

**Purpose**: A formal condition survey as distinct from an inspection — used for programmatic bridge preservation planning. In NSW, Principal inspections feed into condition survey grades for state-wide network analysis.

**Standards**: TfNSW-BIM §3.2 (Principal inspection = condition survey), AGAM:2013 §5.2, SIMS (overall grade terminology)

**Current Fields**:
surveyRef, bridge/bridgeRef, surveyDate, surveyType, surveyedBy, inspectorAccreditationLevel, accessMethod, nextSurveyRecommended, estimatedRehabCost, actionPlan, conditionRating, structuralRating, overallGrade, notes, remarks, status, active

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `linkedInspectionRef` | String(40) | Condition surveys should reference the underpinning Principal inspection record. A survey cannot be approved without an inspection. Currently there is no FK link. | HIGH |
| `programmeYear` | Integer | AGAM §5.2 — surveys are scheduled against a maintenance programme year (e.g. 2026). Required for network-level analysis and budget allocation. | HIGH |
| `recommendedTreatmentType` | String(60) | AGAM §5.3 — survey outcome must include a treatment category. Currently only `actionPlan` (free text) captures this. | MEDIUM |

**Allowed Values**:
- `surveyType`: Routine | Detailed | Principal | Special | Drive-By
- `overallGrade`: Good | Satisfactory | Poor | Critical (SIMS §4.3 terminology)
- `inspectorAccreditationLevel`: Level 1 | Level 2 | Level 3 | Level 4
- `accessMethod`: Visual | Under-Bridge Unit | Rope Access | Underwater | Drone
- `status` (lifecycle): Draft | Submitted | Approved
- `recommendedTreatmentType` (new): Routine Maintenance | Preventive Maintenance | Major Rehabilitation | Replacement | No Treatment Required | Monitor Only

**Cross-Tile Linkages**:
- When `approveSurvey()` action fires, `admin-service.js` syncs `conditionRating` back to `Bridges.conditionRating` and `lastInspectionDate`
- Should link to the underpinning `BridgeInspections` record via new `linkedInspectionRef` field
- `BridgeRiskAssessments` can reference a condition survey as evidence

---

### 5. BridgeLoadRatings (LRT Tile)

**Purpose**: Per-vehicle-class load rating assessments. More granular than the `LoadRatingCertificates` — one record per vehicle class / date combination, used for NHVR route permit evaluation.

**Standards**: AS 5100-7:2017 §3 (load rating method), NHVR HVNL §§94–99 (vehicle class rating requirements)

**Current Fields**:
ratingRef, bridge/bridgeRef, vehicleClass (enum), ratingMethod (enum), ratingFactor, grossMassLimit, assessedBy, assessmentDate, validTo, ratingEngineerNer, governingMember, governingFailureMode, dynamicLoadAllowance, reportRef, status, active, remarks

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `speedRestrictionKmh` | Integer | AS 5100-7 §5.3 — some load ratings are conditional on a reduced speed limit. Speed restriction is part of the rating conditions and should be a structured field, not buried in remarks. | HIGH |
| `conditionalApproval` | String(500) | AS 5100-7 §5.4 — rating may be conditional (e.g. no simultaneous crossing, specific lane position). Should be a dedicated field separate from general `remarks`. | MEDIUM |
| `linkedCertificateRef` | String(40) | Relates this LRT record back to the formal `LoadRatingCertificates.certificateNumber` that certifies this assessment. | MEDIUM |

**Allowed Values**:
- `vehicleClass` (enum): T44 | SM1600 | HLP400 | W80 | A160 | PBS1 | PBS2 | PBS3 | PBS4 | PBS5 | HML | CML
- `ratingMethod` (enum): AS 5100 | NAASRA | Load Testing
- `status`: Active | Superseded | Revoked
- `dynamicLoadAllowance`: typically 1.3–1.4 per AS 5100-2

**Cross-Tile Linkages**:
- `LoadRatingCertificates` is the formal certificate; `BridgeLoadRatings` contains the per-class assessment data that supports it
- NHVR permit evaluation (`BridgePermits`) checks these records for the vehicle class of the applicant
- When `validTo` is within 90 days, `admin-service.js` auto-creates an alert in `AlertsAndNotifications`

---

### 6. BridgePermits (PRM Tile)

**Purpose**: Manages oversize/overmass vehicle permit applications and approvals for individual bridge crossings. These are the short-term individual permits (not route assessments).

**Standards**: NHVR HVNL §§154–163 (Permit vehicle access), Roads Act 1993 NSW §97 (access licences)

**Current Fields**:
permitRef, bridge/bridgeRef, permitType, nhvrPermitNumber, nhvrApplicationNumber, tripCount, axleConfiguration, escortRequired, pilotVehicleCount, applicantName, vehicleClass, grossMass, height, width, length, appliedDate, validFrom, validTo, status, decisionBy, decisionDate, conditionsOfApproval, permitCategory, applicantABN, applicantEmail, applicantPhone, vehicleDescription, routeDescription, remarks, active

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `vehicleRegistration` | String(20) | NHVR HVNL §156 — permits are vehicle-specific and tied to registration number. Required for enforcement. | HIGH |
| `rejectionReason` | String(300) | HVNL §162 requires the permit authority to state the reason for refusal in writing. Currently only `remarks` captures this. | HIGH |
| `iapComplianceRequired` | Boolean | HVNL §§184–208 — some permits require IAP device as a condition. Should be a Boolean flag to drive alert/compliance logic. | MEDIUM |
| `linkedLoadRatingRef` | String(40) | References the `BridgeLoadRatings.ratingRef` that was used in the permit decision. Provides audit trail for the decision basis. | MEDIUM |

**Allowed Values**:
- `permitType` (existing): Oversize | Overmass | PBS | HML | Special Movement | Concessional Mass
- `permitCategory` (existing): B-Double | Road Train | PBS | HML | Mass Managed
- `status` (lifecycle): Pending | Approved | Rejected | Expired
- `vehicleClass` (existing free-text — should be enum): T44 | SM1600 | HLP400 | W80 | A160 | PBS1–PBS5 | HML | CML

**Cross-Tile Linkages**:
- `BridgeLoadRatings` provides the per-class capacity used in permit decision
- `NhvrRouteAssessments` is the blanket route approval; `BridgePermits` is individual trip permits
- Approved permits should not exceed the mass limits in the current `BridgeCapacities` record — server-side validation needed
- On expiry, `admin-service.js` should set `status = 'Expired'` and trigger alert

---

### 7. BridgeRiskAssessments (Risk Assessments Tile)

**Purpose**: Structured risk register for each bridge, using the TfNSW 5×5 risk matrix. Covers structural, scour, traffic, and operational risk categories.

**Standards**: ISO 31000:2018, TfNSW Risk Management Framework (5×5 matrix), AS 5100-7 §6.2.5 (scour risk)

**Current Fields** (28 fields — very comprehensive):
assessmentId, bridge, assessmentDate, assessmentCycle, riskCategory, riskType, riskDescription, potentialConsequence, likelihood [1,5], likelihoodJustification, consequence [1,5], consequenceJustification, inherentRiskScore (computed), inherentRiskLevel, existingControls, controlEffectiveness, residualRiskScore, residualRiskLevel, residualRiskAcceptable, riskTreatmentStrategy, treatmentActions, treatmentResponsible, treatmentDeadline, treatmentBudget, assessor, assessorTitle, reviewDueDate, lastReviewDate, riskOwner, monitoringFrequency, linkedInspection, linkedDefect, notes, active

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `riskRegisterStatus` | String(20) | ISO 31000 §6.7 — risk register entries need a lifecycle status. Currently no structured status. | HIGH |
| `treatmentStatus` | String(20) | Separate from `riskTreatmentStrategy` (the approach) — this is where the treatment programme currently stands. | HIGH |
| `residualLikelihood` | Integer [1,5] | AS 5100-7 §6.2 — after controls are applied, the residual likelihood should be scored separately from inherent. Currently only `residualRiskScore` and `residualRiskLevel` are stored without the constituent components. | HIGH |
| `residualConsequence` | Integer [1,5] | Same rationale as `residualLikelihood` above — both input components needed for transparency. | HIGH |

**Fields to Review/Remove**:
- `s4MaintenancePlan` and `s4FunctionalLocation` are hidden in UI (`@UI.Hidden`) — these belong in the bridge-level `extensions.cds` rather than the risk record. Consider removing from risk assessments.

**Allowed Values**:
- `riskCategory` (existing): Structural | Scour / Hydraulic | Geotechnical | Traffic | Environmental | Financial | Reputational | Operational
- `riskType` (existing): free text — consider converting to enum or lookup
- `controlEffectiveness` (existing): High | Medium | Low | Negligible
- `riskTreatmentStrategy` (existing): Avoid | Reduce | Transfer | Accept
- `monitoringFrequency` (existing): Monthly | Quarterly | Annual | Biennial
- `riskRegisterStatus` (new): Open | Escalated | Accepted | Treated | Closed
- `treatmentStatus` (new): Not Started | In Progress | Completed | Deferred | Cancelled
- TfNSW 5×5 thresholds: Score ≤4=Low, 5–9=Medium, 10–14=High, ≥15=Extreme

**Cross-Tile Linkages**:
- `linkedInspection` (Association to BridgeInspections) — links the risk to the inspection event that revealed it
- `linkedDefect` (Association to BridgeDefects) — links the risk to a specific defect
- When `residualRiskLevel = 'Extreme'`, alert should auto-open via `AlertsAndNotifications`
- `BridgeScourAssessments.scourRisk` should inform risks with `riskCategory = 'Scour / Hydraulic'`
- `reviewDueDate` drives alert generation in `AlertsAndNotifications` (overdue review alert)

---

### 8. NhvrRouteAssessments (NHVR Route Assessments Tile)

**Purpose**: Records NHVR-accredited engineer route assessments for heavy vehicle access. These are the blanket approvals (vs individual trip permits in `BridgePermits`).

**Standards**: NHVR HVNL §§84–104 (mass management), NHVR Route Assessment Scheme, PBS Guideline 3

**Current Fields** (21 fields):
assessmentId, bridge, assessorName, assessorAccreditationNo, assessmentDate, assessmentVersion, assessmentStatus, approvedVehicleClasses (LargeString), conditions, iapConditions, structuralAnalysisRequired, concessionalMass, lastReviewDate, reviewFrequencyMonths, iapRequired, iapRouteId, nhvrSubmissionRef, nhvrSubmissionDate, nhvrApprovalDate, validFrom, validTo, nextReviewDate, notes  
Plus: `NhvrApprovedVehicleClasses` sub-table (vehicleClass enum, maxGrossMass, conditions, active)

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `assessmentMethodology` | String(60) | NHVR Route Assessment Scheme §3 — must state whether the assessment used desktop analysis, field inspection, or load testing. Required for NHVR submission validation. | HIGH |
| `structuralReportRef` | String(255) | When `structuralAnalysisRequired = true`, the supporting structural report reference must be recorded. Currently only captured in `notes`. | MEDIUM |

**Allowed Values**:
- `assessmentStatus` (existing): Current | Superseded | Expired | Under Review
- `assessmentMethodology` (new): Desktop Analysis | Field Inspection | Load Testing | Combined
- `vehicleClass` (NhvrApprovedVehicleClasses sub-table, enum): T44 | SM1600 | HLP400 | W80 | A160 | PBS1–PBS5 | HML | CML

**Cross-Tile Linkages**:
- `approvedClasses` sub-table (NhvrApprovedVehicleClasses) with Composition of many — structured per-class approvals
- On status = 'Current', syncs `Bridges.nhvrAssessed = true` and `Bridges.nhvrAssessmentDate` via `admin-service.js`
- When `validTo` approaches, `AlertsAndNotifications` alert is generated
- `BridgePermits` for individual trip permits may reference the route assessment as the basis

---

### 9. LoadRatingCertificates (Load Rating Certificates Tile)

**Purpose**: The formal engineering certificate (signed by NER/CPEng) for the bridge's load carrying capacity. The legal document underpinning posting status and NHVR approvals.

**Standards**: AS 5100-7:2017 §3 (rating procedure), NER/CPEng registration requirements, jurisdictional approval requirements

**Current Fields** (30 fields — comprehensive):
certificateNumber, certificateVersion, status, ratingStandard, ratingLevel (enum), certifyingEngineer, engineerQualification, engineerLicenseNumber, engineerOrganisation, rfT44..rfCML (12 load rating factors), dynamicLoadAllowance, governingMember, governingFailureMode, governingCapacityType, fatigueSensitive, consumedLifePercent, remainingLifeYears, detailCategory, trafficSpectrumRef, certificateIssueDate, certificateExpiryDate, nextReviewDate, expiryWarningDays, conditions, reportStorageRef, previousCertId, supersessionReason, ratingBasis, jurisdictionApproval, approvalDate, notes

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `postingBasisConfirmed` | Boolean | AS 5100-7 §3.1 — the certifying engineer must explicitly confirm that posting signs are correct for the certified capacity. Tracks whether this confirmation was given in the certificate. | MEDIUM |

**Allowed Values**:
- `ratingLevel` (enum): T44 | SM1600 | HLP400 | PBS | HML | Custom
- `ratingBasis` (existing): Austroads Guide | AS 5100 | Load Testing | Proof Loading
- `status`: Current | Superseded | Revoked

**Cross-Tile Linkages**:
- `BridgeLoadRatings.linkedCertificateRef` should reference this certificate number
- When `certificateExpiryDate` is within `expiryWarningDays`, `AlertsAndNotifications` alert fires
- `BridgeCapacities` holds the operational posted limits; this holds the engineering certificate basis
- `NhvrRouteAssessments` may reference a certificate as evidence

---

### 10. BridgeElements (Bridge Elements Tile)

**Purpose**: The element register for the bridge — the structured asset hierarchy (deck, beams, abutments, piers, bearings, etc.) against which SIMS condition states are rated.

**Standards**: SIMS §3.2 (element codes and types), TfNSW-BIM §4.1 (element inspection), AS 5100-7 (element-level condition)

**Current Fields** (22 fields):
bridge, elementId, elementType, elementCode, elementQuantity, elementUnit, parentElement (self-association), elementName, spanNumber, pierNumber, position, currentConditionRating [1,5], conditionRatingDate, conditionRatingNotes, conditionTrend, lastRatedDate, nextDueDate, ratingFrequencyMonths, material, yearConstructed, yearLastRehabbed, maintenanceRequired, urgencyLevel, estimatedRepairCost, s4EquipmentNumber, notes, active

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `simsElementCode` | String(20) | SIMS §3.2 defines a national element code registry (e.g. DEK = Deck, ABT = Abutment, BRG = Bearing). `elementCode` is free text — should be a separate lookup-backed field for SIMS reporting. | HIGH |
| `designWorkingLifeYears` | Integer | AS 5100-7 §4.3 requires element-level design working life for fatigue-sensitive members. Currently no field captures this at element level. | HIGH |
| `criticalElement` | Boolean | AS 5100-7 §4.4 — certain elements are classified as critical (failure leads to collapse). Used to escalate monitoring frequency. Currently only at capacity level. | MEDIUM |

**Allowed Values**:
- `simsElementCode` (new, lookup): DEK (Deck) | ABT (Abutment) | PRM (Primary Member/Beam) | SEC (Secondary Member) | BRG (Bearing) | EXP (Expansion Joint) | DRN (Drainage) | GRD (Guardrail) | FON (Foundation) | PRA (Approach Pavement)
- `elementType` (existing, via lookup): Deck | Primary Member | Secondary Member | Abutment | Pier | Bearing | Expansion Joint | Drainage | Guardrail | Foundation | Approach Pavement | Retaining Wall
- `currentConditionRating` [1,5]: 1=Good/New | 2=Satisfactory | 3=Fair/Poor | 4=Very Poor | 5=Failed (SIMS §4.3)
- `conditionTrend` (existing): Improving | Stable | Deteriorating
- `urgencyLevel` (existing): Immediate | Short-term (0–3 months) | Planned (3–12 months) | Routine (>12 months)

**Cross-Tile Linkages**:
- `BridgeInspectionElements` links back to an element type (not the full element record) — the `BridgeInspectionElements.elementType` should ideally match a `BridgeElements.simsElementCode`
- `BridgeDefects.bridgeElementRef` is an Association to BridgeElements — the FK link
- When `maintenanceRequired = true` and `urgencyLevel = 'Immediate'`, should drive alert creation
- `BridgeElements.parentElement` (self-association) supports the structural hierarchy (e.g. a bearing is a child of a span)

---

### 11. BridgeScourAssessments (Scour Assessments Tile)

**Purpose**: Records hydraulic scour risk assessments for bridges over waterways. Critical for flood safety and geotechnical monitoring.

**Standards**: Austroads AP-G71.8 (scour risk management), AS 5100-7 §6.2.5 (scour vulnerability), AGAM §6.3

**Current Fields** (14 fields):
bridge, assessmentDate, assessmentType, scourRisk, measuredDepth, floodImmunityAriYears, mitigationStatus, assessor, inspectorAccreditationLevel, nextReviewDate, reportReference, waterwayType, foundationType, scourCountermeasureType, scourCountermeasureCondition, remarks  
Plus: `BridgeScourAssessmentDetail` sub-table (hydraulicModelRef, hydraulicModelType, velocityAtDesignFloodMs, waterwayOpeningAreaM2, scourType, ap71ScoreNumeric, scourRiskCategoryAp71, countermeasureEffectivenessRating, recommendedAction, nextAssessmentDate, notes)

**Proposed Additions**:

| Field | Type | Rationale | Priority |
|-------|------|-----------|----------|
| `criticalScourDepthM` | Decimal(9,2) | AP-G71.8 §5.1 — the critical scour depth at which structural failure becomes likely. The difference between `measuredDepth` and `criticalScourDepthM` is the safety margin. Currently only in `BridgeCapacities.scourCriticalDepth` but should also be on the scour assessment itself. | HIGH |
| `postFloodInspectionRequired` | Boolean | AP-G71.8 §4.2 — after a flood event, some bridges require mandatory post-flood inspection. This flag drives the alert/scheduling workflow. | HIGH |
| `floodEventTriggerLevel` | Decimal(9,2) | AP-G71.8 §4.2 — the flood level (m AHD) at which a post-flood inspection is mandatory. Operationalises the Boolean above. | MEDIUM |

**Allowed Values**:
- `scourRisk` (via lookup): Very Low | Low | Medium | High | Very High (AP-G71.8 §4.1)
- `assessmentType` (via lookup): Routine | Detailed | Post-Flood | Post-Event | Specialist
- `mitigationStatus` (via lookup): None Required | Monitoring | Countermeasure Installed | Countermeasure Needed | Urgent Action Required
- `scourCountermeasureType` (existing): Rock Riprap | Concrete Apron | Sheet Piling | Gabion Mattress | Grout Bag | Grade Control Structure
- `scourCountermeasureCondition` (existing): Good | Fair | Poor | Failed

**Cross-Tile Linkages**:
- `BridgeScourAssessmentDetail` sub-table (Composition through `hydraulicDetails` association in `nhvr-compliance.cds`)
- When `scourRisk = 'High'` or `'Very High'`, syncs `Bridges.scourRisk` via admin-service handler
- `BridgeRiskAssessments` with `riskCategory = 'Scour / Hydraulic'` should reference the scour assessment
- When `postFloodInspectionRequired = true` and a flood event occurs, `AlertsAndNotifications` should be triggered

---

### 12. AlertsAndNotifications (Alerts Tile)

**Purpose**: System-generated alerts for expiring certificates, overdue inspections, critical defects, risk review overdue. End users acknowledge and resolve — they never create.

**Standards**: ISO 55001 (Asset Management — information requirements), AS 5100-7 (inspection frequency compliance)

**Current Fields** (22 fields — comprehensive):
bridge, alertType, entityType, entityId, entityDescription, alertTitle, alertDescription, severity, priority [1,5], triggeredDate, dueDate, status, acknowledgedBy/Date/Note, resolvedBy/Date/Note, resolutionProof (URL), escalatedToRole/Date, suppressedUntil/Reason/By, emailNotificationSent/To/Date, notes

**Proposed Additions**: None required — field coverage is comprehensive.

**Allowed Values**:
- `severity` (existing): Critical | Warning | Info
- `alertType` (existing): Inspection Overdue | Certificate Expiring | Load Rating Expiring | NHVR Assessment Expiring | Risk Review Overdue | Critical Defect | Post-Flood Inspection Required | Gauge Reference Expiring | Gazette Expiry
- `status` (existing): Open | Acknowledged | Resolved | Suppressed | Escalated
- `priority` [1–5] (existing): 1=Immediate / 5=Low

**Cross-Tile Linkages** (generated by):
- `BridgeDefects` (severity >= 3 auto-opens alert)
- `LoadRatingCertificates` (expiry within `expiryWarningDays`)
- `BridgeLoadRatings` (validTo within 90 days — admin-service handler)
- `NhvrRouteAssessments` (validTo approaching)
- `BridgeRiskAssessments` (reviewDueDate overdue)
- `BridgeScourAssessments` (postFloodInspectionRequired = true — proposed new field)
- `BridgeRestrictions` (gazetteExpiryDate approaching)

---

## Gap Analysis Summary

### HIGH Priority Additions (implement immediately)

These gaps break compliance, block key business processes, or are required by regulations:

| # | Entity | Field | Standard | Reason |
|---|--------|-------|----------|--------|
| 1 | BridgeInspections | `overallStructuralAdequacy` | TfNSW-BIM §3.3 | Legal requirement — inspector must record structural adequacy verdict |
| 2 | BridgeInspections | `loadCarryingCapacityConfirmed` | AS 5100-7 §3.2 | Confirms whether posted capacity is still valid |
| 3 | BridgeInspections | `inspectionMethodology` | AGAM §4.2 | Required for Principal inspections — access method is not the same as inspection type |
| 4 | BridgeInspections | `followUpRequired` | TfNSW-BIM §4.4 | Drives manager workflow — currently has no structured alert flag |
| 5 | BridgeDefects | `repairMethod` | SIMS §4.3 | Required on remediation record — work order generation needs this |
| 6 | BridgeDefects | `requiresLoadRestriction` | TfNSW-BIM §4.4 | Links defect severity to capacity tile review |
| 7 | BridgeDefects | `maintenancePriority` | AGAM §5.3 | P1/P2/P3/P4 classification needed for budget allocation |
| 8 | BridgeRiskAssessments | `residualLikelihood` | ISO 31000 §6.6 | Risk matrix transparency — inputs to residual score must be stored |
| 9 | BridgeRiskAssessments | `residualConsequence` | ISO 31000 §6.6 | Same as above |
| 10 | BridgeRiskAssessments | `riskRegisterStatus` | ISO 31000 §6.7 | Status lifecycle for risk register entries |
| 11 | BridgeRiskAssessments | `treatmentStatus` | ISO 31000 §6.5 | Treatment programme progress tracking |
| 12 | BridgeScourAssessments | `criticalScourDepthM` | AP-G71.8 §5.1 | Safety margin = critical - measured; currently no field |
| 13 | BridgeScourAssessments | `postFloodInspectionRequired` | AP-G71.8 §4.2 | Drives mandatory post-flood inspection workflow |
| 14 | BridgeConditionSurveys | `linkedInspectionRef` | TfNSW-BIM §3.2 | Survey must reference underpinning Principal inspection |
| 15 | BridgeConditionSurveys | `programmeYear` | AGAM §5.2 | Network-level planning requires programme year |
| 16 | BridgePermits | `vehicleRegistration` | HVNL §156 | Permit is vehicle-specific — registration is legally required |
| 17 | BridgePermits | `rejectionReason` | HVNL §162 | Mandatory written reason for refusal |
| 18 | BridgeElements | `simsElementCode` | SIMS §3.2 | National element code for state-wide reporting |
| 19 | BridgeElements | `designWorkingLifeYears` | AS 5100-7 §4.3 | Element-level fatigue life tracking |
| 20 | NhvrRouteAssessments | `assessmentMethodology` | NHVR RA Scheme §3 | Required for NHVR submission validation |
| 21 | BridgeCapacities | `axleSpacingMinimumM` | NHVR HVNL §§94–95 | Governs dynamic impact — needed for OSOM permit eval |

### MEDIUM Priority (next sprint)
22. BridgeConditionSurveys — `recommendedTreatmentType`
23. BridgeLoadRatings — `speedRestrictionKmh`, `conditionalApproval`
24. BridgePermits — `iapComplianceRequired`, `linkedLoadRatingRef`
25. LoadRatingCertificates — `postingBasisConfirmed`
26. BridgeElements — `criticalElement`
27. BridgeScourAssessments — `floodEventTriggerLevel`
28. NhvrRouteAssessments — `structuralReportRef`
29. BridgeInspections — `reportIssueDate`, `bridgeComponentsInspected`

### LOW Priority / Future
30. BridgeDefects — `defectQuantity` + `defectUnit` (requires UI redesign for paired entry)
31. BridgeDefects — `inspectionCycle` (derived data — consider computed from inspection.inspectionDate)
32. BridgeDefects — `verifiedBy` (workflow feature — requires two-phase approval)

---

## Enum Types Needed

The following new enum types should be added to `db/schema/enum-types.cds`:

```cds
type InspectionMethodology : String enum {
  Visual          = 'Visual';
  UnderBridgeUnit = 'Under-Bridge Unit';
  RopeAccess      = 'Rope Access';
  Underwater      = 'Underwater';
  Drone           = 'Drone';
}

type StructuralAdequacyVerdict : String enum {
  Adequate    = 'Adequate';
  Marginal    = 'Marginal';
  Inadequate  = 'Inadequate';
}

type RepairMethod : String enum {
  Patching            = 'Patching';
  EpoxyInjection      = 'Epoxy Injection';
  SurfaceTreatment    = 'Surface Treatment / Coating';
  SectionReplacement  = 'Full Section Replacement';
  MonitoringOnly      = 'Monitoring Only';
  Demolition          = 'Demolition';
  RockBolt            = 'Rock Bolt';
  Grouting            = 'Grouting';
  Other               = 'Other';
}

type MaintenancePriority : String enum {
  P1Emergency = 'P1 Emergency';
  P2Urgent    = 'P2 Urgent';
  P3Routine   = 'P3 Routine';
  P4Planned   = 'P4 Planned';
}

type RiskRegisterStatus : String enum {
  Open      = 'Open';
  Escalated = 'Escalated';
  Accepted  = 'Accepted';
  Treated   = 'Treated';
  Closed    = 'Closed';
}

type TreatmentStatus : String enum {
  NotStarted  = 'Not Started';
  InProgress  = 'In Progress';
  Completed   = 'Completed';
  Deferred    = 'Deferred';
  Cancelled   = 'Cancelled';
}

type NhvrAssessmentMethodology : String enum {
  DesktopAnalysis = 'Desktop Analysis';
  FieldInspection = 'Field Inspection';
  LoadTesting     = 'Load Testing';
  Combined        = 'Combined';
}
```
