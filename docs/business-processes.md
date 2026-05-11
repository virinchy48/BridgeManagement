# BMS Business Processes

Bridge Management System — NSW Roads and Transport Authority  
Version: May 2026 | System: SAP CAP + Fiori Elements on SAP BTP

---

## 1. Personas

### 1.1 Bridge Inspector

**Role**: Field Inspector / Bridge Engineering Officer  
**Organisational position**: Roads and Transport — Asset Management, state-based team

**Primary responsibilities**:
- Conduct routine Principal Inspections (annually) and Detailed Inspections (every 2 years) per TfNSW-BIM §3.1
- Record element-level condition ratings (CS1–CS4) using the SIMS methodology
- Document defects by element type, severity (1–4), and urgency
- Capture scour assessments and seismic risk observations
- Record weatherConditions, accessibilityIssues, and safety notes at each visit

**BMS Access Level**: `BMS_INSPECTOR` — scopes: `inspect`, `view`

**Key BMS screens**:
- Bridge Inspections (BridgeInspections) — create and edit inspection records
- Bridge Defects (BridgeDefects) — record individual element defects with severity and photos
- Inspection Elements (BridgeInspectionElements) — record CS1/CS2/CS3/CS4 quantities per element type
- Bridge Map — navigate to bridges by GPS coordinate
- Bridge Details (read-only) — review prior inspection history before commencing field work

---

### 1.2 Bridge Manager

**Role**: Senior Bridge Engineer / Bridge Asset Manager  
**Organisational position**: Roads and Transport — Asset Management, regional or state level

**Primary responsibilities**:
- Manage the bridge asset register (create, update, deactivate bridges)
- Review and approve condition surveys submitted by inspectors
- Approve or reject load rating certificates and heavy-vehicle permits
- Prioritise defect treatment plans and assign remediation budgets
- Review risk register and escalate Extreme-rated risks
- Commission load rating assessments when bridge data changes
- Coordinate NHVR route assessment submissions

**BMS Access Level**: `BMS_BRIDGE_MANAGER` — scopes: `manage`, `inspect`, `view`, `certify`

**Key BMS screens**:
- Bridge Asset Registry (admin-bridges) — full CRUD on all bridge entities
- Dashboard — KPI overview: BSI score, open defects, upcoming inspections, active restrictions
- Bridge Condition Surveys — review and approve submitted surveys
- Load Rating Certificates — approve and certify load rating assessments
- Bridge Permits — approve or reject heavy-vehicle permit applications
- Risk Assessments — review and assign treatment actions
- Network Reports — condition distribution, risk register summary, cost forecast
- BMS Admin — change documents, data quality, mass upload, mass edit

---

### 1.3 Operations Manager

**Role**: Network Operations Manager / Restriction Coordinator  
**Organisational position**: Roads and Transport — Network Operations, NSW-scoped

**Primary responsibilities**:
- Create and manage load restrictions on individual bridges in the NSW network
- Set restriction type (mass, height, width, speed, total closure), restriction value, valid period, and affected vehicle classes
- Notify carriers and freight operators of new or modified restrictions
- Monitor restriction expiry dates and renew or lift restrictions
- Record operational condition ratings during routine patrol inspections
- Coordinate emergency closures following flood, collision, or critical defect notifications

**BMS Access Level**: `BMS_OPERATOR` — scopes: `operate`, `inspect`, `view`

**Key BMS screens**:
- Restrictions tile (standalone ListReport) — create and manage active restrictions
- Bridge List (read-only) — check bridge capacity and current condition before placing a restriction
- Bridge Map — geo-visualise restricted bridges in their network context
- Change Documents — review restriction audit trail for compliance reporting

---

### 1.4 Executive Viewer

**Role**: Deputy Secretary / Executive Director, Infrastructure & Asset Management  
**Organisational position**: Roads and Transport — Senior Leadership

**Primary responsibilities**:
- Portfolio-level oversight of bridge asset condition across the state network
- Track total network BSI score trend and bridges entering Critical condition
- Monitor open defects, active restrictions, and unresolved risk assessments for ministerial reporting
- Review YTD treatment expenditure versus budget
- Commission quarterly and annual bridge condition reports for the Minister

**BMS Access Level**: `BMS_EXECUTIVE_VIEWER` — scopes: `executive_view`, `view`

**Key BMS screens**:
- Dashboard — executive KPI tiles: network BSI, condition distribution, risk register summary, cost YTD
- Network Reports — condition trend (12 months), state-by-state comparison, upcoming inspection schedule
- Bridge List (read-only) — drill into individual bridges flagged in executive KPIs

---

### 1.5 External Stakeholder

**Role**: Council Officer, Freight Operator, Carrier, or PBS Vehicle Operator  
**Organisational position**: External to Roads and Transport — councils, logistics companies, road transport associations

**Primary responsibilities**:
- Check whether a specific bridge is accessible to a given vehicle class or load
- View current active load restrictions on bridges on their planned route
- Confirm permit status for an approved heavy-vehicle movement
- Access the public bridge card showing dimensions, restrictions, and NHVR approval status

**BMS Access Level**: `BMS_EXTERNAL_VIEWER` — scope: `external_view` only (no standard `view` scope)

**Key BMS screens**:
- Public Bridge Card (`/public-bridge/:id`) — curated read-only view: bridge name, location, dimensions, active restrictions, permit status, NHVR assessed flag
- Bridge Map (public viewport if configured) — geo-locate bridges on a planned route

---

## 2. Core Business Processes

### Process 1: Bridge Inspection → Defect Recording → Risk Assessment

**Trigger**: Scheduled inspection due date reached (annual/biennial per TfNSW-BIM §3.1) or emergency notification from patrol.

1. [Bridge Manager] Reviews upcoming inspections on the Inspections tile; assigns inspector and sets inspection type (Principal / Detailed / Special / Load).
2. [Bridge Inspector] On the day, opens BMS on tablet; navigates to Inspections tile; locates today's bridge by bridge name or bridge ID (e.g. NSW-001).
3. [Bridge Inspector] Creates a new BridgeInspection record. BMS auto-generates `inspectionRef` (INS-NNNN). Records: `inspectionDate`, `inspectionType`, `inspectedBy`, `weatherConditions`, `accessibilityIssues`, `trafficControl`.
4. [Bridge Inspector] Walks the bridge by element (span, pier, abutment, deck, railing, bearing, drainage). For each element needing attention, creates a BridgeDefect record: `elementType`, `severity` (1=Low … 4=Critical), `urgencyLevel`, `locationDescription`, `defectNotes`, and photo reference. BMS auto-generates `defectId` (DEF-NNNN).
5. [Bridge Inspector] Records BridgeInspectionElements for each inspected element type: CS1/CS2/CS3/CS4 quantities and percentages. BMS computes `elementHealthRating` from weighted quantities.
6. [Bridge Inspector] Records overall `conditionRating` (1–10 scale) on the BridgeInspection record and saves. BMS `approveSurvey` flow updates the parent Bridge entity's `conditionRating` and `lastInspectionDate`.
7. [Bridge Inspector] Flags `criticalFindings: true` if any Severity 3 or 4 defect is present. BMS automatically opens an AlertsAndNotifications entry for the Bridge Manager.
8. [Bridge Manager] Receives alert, reviews the inspection and defect list. For Severity 3–4 defects, creates a BridgeRiskAssessment record: `likelihoodRating`, `consequenceRating` (BMS auto-computes `inherentRiskScore = likelihood × consequence`), `riskLevel` (Low/Medium/High/Extreme per TfNSW 5×5 matrix), `existingControls`.
9. [Bridge Manager] Sets `treatmentActions`, `treatmentCost`, `treatmentDeadline`, and assigns `responsibleOfficer`. Sets `residualRiskScore` based on engineering judgement after applying controls.
10. [Bridge Manager] Tracks remediation progress. When treatment is confirmed complete, updates `treatmentStatus` to `Completed` and `reviewDueDate` to the next scheduled review.

---

### Process 2: Condition Survey → Review → Approval

**Trigger**: Bridge Manager initiates a formal condition survey (separate from routine inspection) — typically following a flood event, collision report, or when bridge is approaching a major load rating review.

1. [Bridge Manager] Creates a BridgeConditionSurvey record. Records `bridgeRef`, `surveyDate`, `surveyType` (Visual / Structural / Underwater / Special). Status is `Draft`. BMS auto-generates `surveyRef` (CS-NNNN).
2. [Bridge Inspector] Opens the assigned survey. Records `conditionRating` (1–10), `structuralRating`, `overallGrade`, and `notes`. May also create associated BridgeDefects linked to the survey.
3. [Bridge Inspector] When satisfied with all field entries, triggers `submitForReview()` action. BMS validates status is `Draft`, transitions it to `Submitted`, and creates an alert for the assigned Bridge Manager.
4. [Bridge Manager] Opens the submitted survey. Reviews all condition ratings, defect links, and inspector notes. May add review comments.
5. [Bridge Manager] If satisfied, triggers `approveSurvey()` action. BMS validates status is `Submitted`, transitions to `Approved`. Under HVNL, this action requires the `certify` scope — the approving engineer must hold at least a Level 3 accreditation.
6. [BMS] On approval, BMS syncs the survey's `conditionRating` back to the parent Bridge entity's `conditionRating` field and updates `lastInspectionDate`. This triggers a recalculation of the Bridge Sufficiency Index (BSI) score.
7. [Bridge Manager] Reviews updated BSI on the Bridge Details Executive Summary tab. If BSI has fallen below 50 (High threshold), escalates to risk assessment process (see Process 1, step 8).

---

### Process 3: Load Rating → Certificate Issuance

**Trigger**: New bridge added to asset register, major structural repair completed, or an existing load rating certificate reaches its `validTo` date. BMS generates an expiry alert 90 days before `validTo`.

1. [Bridge Manager] Engages a qualified structural engineer to conduct a load rating assessment per AS 5100.7.
2. [Bridge Manager or Engineer] Creates a BridgeLoadRating record in BMS: `bridgeRef`, `vehicleClass` (e.g. SM1600, PBS Class 1–4), `ratingMethod` (AS5100 / Working Stress / Limit State), `ratingFactor`, `grossMassLimit`, `assessedBy`, `assessmentDate`, `validTo`. BMS auto-generates `ratingRef` (LR-NNNN).
3. [Bridge Manager] Creates a LoadRatingCertificate record linking to the new BridgeLoadRating. Records the certifying engineer details, assessment basis, and any conditions.
4. [Bridge Manager] Submits the LoadRatingCertificate for approval. The certifying engineer (holding `certify` scope) reviews the assessment calculations and supporting documentation.
5. [Bridge Manager / Certifier] Triggers certificate approval action. BMS sets `ratingLevel` to the approved standard (e.g. AS5100 / W21) and status to `Active`. Previous certificate for the same vehicle class is automatically set to `Superseded`.
6. [Bridge Manager] Links the approved LoadRatingCertificate to any pending NhvrRouteAssessment for the bridge. Sets `nhvrAssessed = true` and `nhvrAssessmentDate` on the parent Bridge entity.
7. [External Stakeholder] The updated load rating is immediately visible on the Public Bridge Card and via the NHVR integration. PBS vehicle operators can confirm allowable mass for their movement.

---

### Process 4: Permit Application → Approval

**Trigger**: A freight operator or PBS vehicle operator requires a one-time or period approval to cross a specific bridge with a vehicle exceeding standard network limits.

1. [External Stakeholder] Submits a permit application (phone/email/NHVR portal) specifying vehicle gross mass, height, width, length, vehicle class, and proposed route.
2. [Bridge Manager] Creates a BridgePermit record in BMS: `bridgeRef`, `permitType` (Single Trip / Period / Annual), `applicantName`, `vehicleClass`, `grossMass`, `height`, `width`, `length`, `appliedDate`, `validFrom/To`. BMS auto-generates `permitRef` (PM-NNNN). Status is `Pending`.
3. [Bridge Manager] Opens the Bridge Details for the subject bridge. Reviews the Executive Summary (condition rating, BSI score, active restrictions) and Physical Structure tab (designLoad, clearanceHeight, deckWidth, spanLength).
4. [Bridge Manager] Checks the LoadRatingCertificates tile — confirms an Active certificate exists for the applicant's vehicle class and the `grossMassLimit` is not exceeded.
5. [Bridge Manager] Checks active Restrictions — confirms no Total Closure or mass restriction that would prohibit the movement, or that the restriction allows an exemption via permit.
6. [Bridge Manager] If vehicle dimensions and mass are within approved parameters: triggers `approve()` action on the BridgePermit. BMS sets status to `Approved`, records `decisionBy`, `decisionDate`, and `conditionsOfApproval`. Requires `certify` scope.
7. [Bridge Manager] If the vehicle exceeds any approved limit: triggers `rejectPermit()` action. BMS sets status to `Rejected` with reason. Requires `certify` scope.
8. [Bridge Manager] Notifies the external stakeholder of the outcome (via email outside BMS). The permit status is also visible on the Public Bridge Card for the relevant bridge.
9. [BMS] When a permit reaches its `validTo` date, BMS auto-generates an alert. Bridge Manager reviews whether to renew (new permit application) or allow to expire.

---

### Process 5: Load Restriction → Management → Removal

**Trigger**: One of: (a) inspection returns condition rating ≤ 5, (b) a Severity 3–4 defect is recorded on a structural element, (c) emergency notification (flood, vehicle strike, seismic event), (d) scheduled restriction as part of approved treatment plan.

1. [Bridge Inspector or Bridge Manager] Identifies the trigger event. For emergency closures, the initial restriction may be applied by an Operations Manager on scene.
2. [Operations Manager] Opens the Restrictions tile. Creates a new Restriction record linked to the bridge via `bridgeRef`: sets `restrictionType` (Mass / Height / Width / Speed / Total Closure), `restrictionValue`, `restrictionUnit` (t / m / km/h), `appliesToVehicleClass`, `validFrom`, `validTo` (or open-ended), `approvedBy`.
3. [Operations Manager] Sets `active = true`. BMS immediately updates `activeRestrictionCount` on the parent Bridge entity, which is visible in the Bridge List and Dashboard KPI tiles.
4. [Operations Manager] Notifies stakeholders. For mass restrictions affecting PBS or NHVR routes: notifies the relevant state NHVR contact. For total closures: notifies all known carriers via standard Roads and Transport alert channels (outside BMS).
5. [Bridge Manager] Reviews the restriction in the context of the overall risk assessment. If the restriction is a temporary safety measure pending a structural repair, creates a linked BridgeRiskAssessment and sets `treatmentDeadline`.
6. [Operations Manager] Monitors the restriction. Reviews any scheduled `validTo` expiry alerts generated by BMS.
7. [Bridge Manager] When the defect or structural issue has been remediated: confirms the repair completion evidence (inspection report, engineering sign-off). Reviews the updated condition rating from any new BridgeInspection or BridgeConditionSurvey.
8. [Operations Manager] Updates the Restriction record: sets `active = false` and `validTo` to the current date. The `activeRestrictionCount` on the parent Bridge is decremented automatically.
9. [BMS / Audit] All changes to Restriction records — creation, modification, deactivation — are written to the ChangeLog by the audit handler. Change Documents are visible in BMS Admin for compliance audit purposes.

---

## 3. Day-in-the-Life Narratives

### 3.1 Sarah — Bridge Inspector

Sarah starts at 6:45 am at the TfNSW depot in Parramatta. She opens the BMS Inspections tile on her field tablet over 4G. She has three bridges scheduled today — two routine Principal Inspections and one Special Inspection flagged following a B-double collision reported by highway patrol yesterday.

At the first bridge, Sarah taps "Create" on the Inspections tile. BMS generates INS-0423 automatically. She fills in inspectionDate, sets inspectionType to "Principal", records her name as inspectedBy, and notes the weather as Clear and access as "Scaffolding required — riverbank slippery." She walks the full deck and substructure systematically, checking each element against the SIMS element condition guide on her phone.

On the eastern abutment she finds a significant crack in the wing wall. She creates a BridgeDefect record: elementType = Abutment, severity = 3 (High), urgencyLevel = Within 30 days, and types a concise description. She records CS1/CS2/CS3/CS4 quantities for the abutment in BridgeInspectionElements.

After completing all elements, she sets the overall conditionRating to 6 and saves the inspection. Because a Severity 3 defect was recorded, BMS auto-raises an alert for the regional Bridge Manager. Sarah moves on to the second bridge, a smaller culvert structure that scores 9 on condition. By 2:30 pm she is on-site at the collision bridge. She records the fresh impact damage to the parapet as a Severity 4 defect and flags criticalFindings = true. She calls the Bridge Manager while still on site.

---

### 3.2 Michael — Bridge Manager

Michael arrives at his Sydney office at 8:15 am. He opens the BMS Dashboard. The KPI tiles tell the story of the day before he opens a single email: three new open defects (one Severity 4), one condition survey awaiting his approval, two permits in Pending status, and one load rating certificate expiring in 18 days.

He starts with the Severity 4 defect — the collision Sarah flagged yesterday. He opens the Bridge Details for that bridge, reviews the Physical Structure tab (a 1967 pre-stressed concrete beam bridge, 42m span), and reads Sarah's defect notes. He creates a BridgeRiskAssessment: likelihood 4, consequence 5, inherentRiskScore auto-computes to 20 (Extreme). He sets treatmentActions to "Engage structural engineer for emergency assessment", treatmentDeadline to today + 5 days, and assigns to the structural team.

He then opens the pending condition survey for the Murrumbidgee Bridge. Reviews all section ratings, confirms the inspector's conditionRating of 7 matches the element-level data. Approves it — BMS updates the Bridge's conditionRating and BSI drops from 72 to 68 (still green, but trending).

He approves the PBS Class 2 permit for a wind turbine component crossing the Hawkesbury River bridge — mass is 142 t against a 160 t rating. He sets conditions of approval: escort vehicle required, 10 km/h maximum, off-peak hours only.

By 11 am he opens Network Reports to review the quarterly risk register for the Director's briefing at 2 pm.

---

### 3.3 Priya — Executive Viewer

It is the last Monday of the month. Priya, Deputy Secretary for Infrastructure Asset Management, opens BMS at 9 am on her laptop in preparation for the monthly portfolio review with the Secretary.

She opens the Dashboard. The network BSI score sits at 67.4, down 0.3 points from last month. The condition distribution tile shows 4 bridges in Critical (conditionRating 1–3), 19 in Poor (4–5). The open defects tile shows 38 open, 6 of which are Severity 4. The active restrictions tile shows 12, including 2 total closures.

She navigates to Network Reports and selects the 12-month condition trend tab. The chart shows a steady downward drift in bridges rated 8–10 — 12% fewer this year than last. She notes the three bridges that moved from Poor to Critical since the last report and opens each individually to review the Bridge Manager's latest risk assessment and treatment timeline.

On the Executive Summary tab for the most critical bridge — a 1954 timber beam structure on a rural freight route — she sees the BSI score of 23 (red), inherentRiskScore of 20 (Extreme), and the treatment deadline is 47 days away with no treatment cost recorded. She marks this for a direct conversation with the regional Bridge Manager.

She exports the Network Reports condition distribution chart as a PDF to attach to the Minister's portfolio update slide deck. The bridge portfolio — 1,200 structures across NSW — is visible to her as a living, data-driven picture, not a static spreadsheet from two months ago.

---

## 4. User Stories

### Process 1: Bridge Inspection → Defect Recording → Risk Assessment

**US-INS-01**: As a Bridge Inspector, I want to create a new inspection record with auto-generated INS-NNNN reference so that I can submit my field findings without manually managing unique identifiers.

**US-INS-02**: As a Bridge Inspector, I want to record element-level CS1/CS2/CS3/CS4 quantities for each inspected element type so that the element health rating can be computed automatically from my field measurements.

**US-INS-03**: As a Bridge Manager, I want to be automatically alerted when a Severity 3 or 4 defect is recorded so that I can create a risk assessment and initiate treatment without waiting for a weekly inspection summary.

---

### Process 2: Condition Survey → Review → Approval

**US-CS-01**: As a Bridge Inspector, I want to submit a completed condition survey for review using a single action button so that it moves to the Bridge Manager's queue without me needing to send a separate email.

**US-CS-02**: As a Bridge Manager, I want to approve a condition survey and have the bridge's condition rating updated automatically so that the Dashboard and Network Reports always reflect the latest approved assessment.

**US-CS-03**: As a Bridge Manager, I want the system to prevent approval of a condition survey that is still in Draft status so that only surveys that have been formally submitted by the inspector can be signed off.

---

### Process 3: Load Rating → Certificate Issuance

**US-LR-01**: As a Bridge Manager, I want to receive a BMS alert 90 days before a load rating certificate expires so that I can commission a new assessment well before the certificate lapses.

**US-LR-02**: As a Certifying Engineer (Bridge Manager with certify scope), I want to approve a load rating certificate so that the approved vehicle class and gross mass limit are formally recorded and visible to NHVR and permit applicants.

**US-LR-03**: As a Bridge Manager, I want the previous load rating certificate for the same vehicle class to be automatically superseded when I approve a new certificate so that only one Active certificate per vehicle class exists at any time.

---

### Process 4: Permit Application → Approval

**US-PRM-01**: As a Bridge Manager, I want to view the active load rating certificates and active restrictions for a bridge on the same screen where I am reviewing a permit application so that I can make an approval decision without switching between multiple tiles.

**US-PRM-02**: As a Bridge Manager, I want to record conditions of approval when approving a permit so that the carrier has a documented record of the speed, escort, and time-of-day constraints under which the movement is permitted.

**US-PRM-03**: As an External Stakeholder, I want to see the current permit status for a specific bridge on the Public Bridge Card so that I can confirm whether my approved permit is still active before dispatching my vehicle.

---

### Process 5: Load Restriction → Management → Removal

**US-RST-01**: As an Operations Manager, I want to create a load restriction on a bridge immediately after an emergency notification so that the restriction is in the system and visible to carriers before I leave the field.

**US-RST-02**: As a Bridge Manager, I want all restriction changes (creation, modification, deactivation) to be recorded in the Change Documents audit trail so that we have a defensible compliance record if a carrier disputes the applicability of a restriction.

**US-RST-03**: As an Operations Manager, I want to deactivate a restriction once the structural issue has been remediated so that the bridge restriction count on the Dashboard and the Public Bridge Card is updated immediately and carriers are not unnecessarily blocked from using the route.
