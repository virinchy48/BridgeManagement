# Asset Model Dictionary

Bridge Management System (BMS) — v1.7.2 | Updated: 2026-05-14

This document provides crosswalk tables between BMS data entities and three external frameworks: ISO 55000 asset management concepts, SAP EAM (Plant Maintenance) object types, and AS 5100 / AP-G71.8 bridge inspection standards. The TfNSW 5×5 risk matrix is included as a reference.

---

## 1. Entity-to-ISO 55000 Mapping

ISO 55000 defines asset management in terms of asset portfolio, lifecycle, risk, and performance. This table maps BMS entities to ISO 55000 concepts.

| ISO 55000 Concept | ISO Clause | BMS Entity | BMS Field(s) | Coverage |
|---|---|---|---|---|
| Asset | §3.2.1 | `bridge.management.Bridges` | `ID`, `bridgeId`, `bridgeName` | Full |
| Asset system | §3.2.2 | `bridge.management.Bridges` + `bridge.management.BridgeElements` | `structureType`, `elementType` | Partial |
| Asset portfolio | §3.2.3 | `AnalyticsService.BridgePortfolio` (CDS view) | All bridge fields | Partial |
| Asset lifecycle stage | §6.2 | `bridge.management.Bridges` | `lifecycleStage` (extensions.cds) | Partial |
| Asset condition | §6.3 | `bridge.management.Bridges` + `BridgeConditionSurveys` | `conditionRating` [1–10], `conditionRatingTfnsw` [1–5], `overallGrade` | Full |
| Asset risk | §6.4 | `bridge.management.BridgeRiskAssessments` | `inherentRiskScore`, `residualRiskScore`, `riskRegisterStatus` | Full |
| Risk treatment | §6.5 | `bridge.management.BridgeRiskAssessments` + `BridgeMaintenanceActions` | `treatmentActions`, `treatmentStatus`, `treatmentDeadline` | Full |
| Performance monitoring | §6.6 | `bridge.management.KPISnapshots` + `AnalyticsService.NetworkKPIs` | Per-state daily snapshot; network KPI API | Partial |
| Stakeholder requirements | §6.8 | `bridge.management.BridgeContacts` | `contactGroup`, `primaryContact`, `email`, `phone` | Partial |
| Asset information | §6.9 | `bridge.management.BridgeDocuments` + `AttributeValues` (EAV) | Document store + extensible attributes | Partial |
| Replacement cost | §6.2 | `bridge.management.Bridges` | `replacementCostEstimate` (extensions.cds) | Partial |
| Remaining life | §6.2 | `bridge.management.LoadRatingCertificates` | `remainingLifeYears` | Partial |
| Lifecycle cost model | §6.2 | — | Not implemented | Gap |
| Degradation curve | §6.2 | — | Not implemented | Gap |

---

## 2. SAP EAM (Plant Maintenance) Crosswalk

SAP PM uses Equipment (`EQUI`), Functional Location (`IFLOT`), Notification (`QMEL`), Order (`AUFK`), and Measurement Document (`IMRG`) as core objects.

| SAP PM Object | SAP Table | BMS Entity | BMS Field | Notes |
|---|---|---|---|---|
| Functional Location | IFLOT | `bridge.management.Bridges` | `s4FunctionalLocationId` | Stub — not integrated |
| Equipment | EQUI | `bridge.management.Bridges` | `s4AssetNumber` | Stub — not integrated |
| Maintenance Plant | T001W | `bridge.management.Bridges` | `s4MaintenancePlant` | Stub — not integrated |
| Notification (defect) | QMEL | `bridge.management.BridgeDefects` | `s4InspectionOrderRef` | Stub — `notifyDefectEscalation()` in notification-service.js exists but no PM IW21 call |
| Order (work order) | AUFK | `bridge.management.BridgeMaintenanceActions` | — | No S/4 order reference field; `notifyWorkOrderComplete()` is a stub |
| Measurement Document | IMRG | `bridge.management.BridgeInspectionElements` | `conditionState1Qty/2/3/4Qty`, `elementHealthRating` | AP-G71.8 CS1–CS4 quantities; no MeasDoc linkage |
| Inspection Lot | QALS | `bridge.management.BridgeInspections` | `inspectionRef` (INS-NNNN) | No SAP QM inspection lot linkage |
| Asset Master (AM) | ANLZ | `bridge.management.Bridges` | `s4AssetNumber`, `replacementCostEstimate` | Stub — SAP AM integration not implemented |
| Sync status | — | `bridge.management.Bridges` | `s4SyncStatus` | Default `NOT_LINKED`; no sync job implemented |

**Note:** All S/4 HANA fields are stubs. A future integration via SAP Integration Suite iFlow or API Management is required for live EAM linkage.

---

## 3. AS 5100 / AP-G71.8 Field Crosswalk

| Standard Reference | Standard Field Name | BMS Entity | BMS Field | Field Type |
|---|---|---|---|---|
| AS 5100.1 §1.6 | Importance level | `bridge.management.Bridges` | `importanceLevel` | `Integer @assert.range:[1,4]` |
| AS 5100.1 §2 | Design load | `bridge.management.Bridges` | `designLoad` | String (lookup: DesignLoads) |
| AS 5100.1 §2 | Design standard | `bridge.management.Bridges` | `designStandard` | String |
| AS 5100.2 | Inspection standard | `bridge.management.BridgeInspections` | `inspectionStandard` | CDS enum type (enum-types.cds) |
| AS 5100.2 | Inspection methodology | `bridge.management.BridgeInspections` | `inspectionMethodology` | String |
| AS 5100.2 §3.1 | Inspector accreditation | `bridge.management.BridgeInspections` | `inspectionAccreditationLevel` | Integer; server guard for Principal/Detailed |
| AS 5100.4 | Fatigue detail category | `bridge.management.BridgeCapacities` | `fatigueDetailCategory` | String (lookup: FatigueDetailCategories) |
| AS 5100.4 | Fatigue life (years) | `bridge.management.BridgeCapacities` | `fatigueLifeYears` | Decimal |
| AS 5100.5 | Concrete grade | `nhvr.Bridge` (legacy) | `concreteGrade` | String |
| AS 5100.5 | Concrete durability class | `nhvr.Bridge` (legacy) | `concreteDurabilityClass` | String |
| AS 5100.6 | Seismic zone | `bridge.management.Bridges` | `seismicZone` | String |
| AS 5100.7 | Rating method | `bridge.management.LoadRatingCertificates` | `ratingLevel` | CDS enum: `LoadRatingMethod` |
| AS 5100.7 | Rating factor (T44) | `bridge.management.LoadRatingCertificates` | `rfT44` | Decimal |
| AS 5100.7 | Rating factor (SM1600) | `bridge.management.LoadRatingCertificates` | `rfSM1600` | Decimal |
| AS 5100.7 | Rating factor (HLP400) | `bridge.management.LoadRatingCertificates` | `rfHLP400` | Decimal |
| AS 5100.7 | Rating standard | `bridge.management.BridgeCapacities` | `ratingStandard` | String |
| AP-G71.8 | Condition state 1 (Good/New) quantity | `bridge.management.BridgeInspectionElements` | `conditionState1Qty` | Decimal |
| AP-G71.8 | Condition state 2 (Satisfactory) quantity | `bridge.management.BridgeInspectionElements` | `conditionState2Qty` | Decimal |
| AP-G71.8 | Condition state 3 (Poor) quantity | `bridge.management.BridgeInspectionElements` | `conditionState3Qty` | Decimal |
| AP-G71.8 | Condition state 4 (Failed) quantity | `bridge.management.BridgeInspectionElements` | `conditionState4Qty` | Decimal |
| AP-G71.8 | Element health rating | `bridge.management.BridgeInspectionElements` | `elementHealthRating` | Decimal (computed) |
| AP-G71.8 | SIMS element code | `bridge.management.BridgeDefects` | `simsElementCode` | String |
| AP-G71.8 | Defect severity scale 1–4 | `bridge.management.BridgeDefects` | `severity` | Integer; 1=Low, 4=Critical; severity≥3 auto-creates alert |
| AGAM | Maintenance priority P1–P4 | `bridge.management.BridgeDefects` | `maintenancePriority` | String (P1–P4 TfNSW framework) |
| TfNSW TS01501 | Condition rating 1–10 | `bridge.management.Bridges` | `conditionRating` | Integer @assert.range:[1,10] |
| TfNSW TS01501 | Condition rating 1–5 | `bridge.management.Bridges` | `conditionRatingTfnsw` | Integer @assert.range:[1,5] |

---

## 4. TfNSW 5×5 Risk Matrix

The `scoreToLevel()` function in `srv/handlers/risk-assessments.js` uses the following thresholds. This matrix is used for both inherent and residual risk scoring.

| Score Range | Risk Level | Colour | `riskLevel` Value |
|---|---|---|---|
| ≤ 4 | Low | Green | `"Low"` |
| 5–9 | Medium | Amber | `"Medium"` |
| 10–14 | High | Orange | `"High"` |
| ≥ 15 | Extreme | Red | `"Extreme"` |

`inherentRiskScore = inherentLikelihood × inherentConsequence` — always auto-computed in `before(['CREATE','UPDATE'])`. `residualRiskScore` is never auto-defaulted to the inherent score — it is an explicit engineering input.

### Likelihood scale (1–5)

| Value | Label |
|---|---|
| 1 | Rare |
| 2 | Unlikely |
| 3 | Possible |
| 4 | Likely |
| 5 | Almost Certain |

### Consequence scale (1–5)

| Value | Label |
|---|---|
| 1 | Insignificant |
| 2 | Minor |
| 3 | Moderate |
| 4 | Major |
| 5 | Catastrophic |
