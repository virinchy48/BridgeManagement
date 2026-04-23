'use strict';
const XLSX = require('xlsx');
const path = require('path');

const OUT = path.join(__dirname, '../db/data/BMS-Attribute-Catalogue.xlsx');

// ── Helpers ──────────────────────────────────────────────────────────────────
function hdr(ws, cols) {
  XLSX.utils.sheet_add_aoa(ws, [cols], { origin: 'A1' });
}

function style(wb) { return wb; } // xlsx-style not available; plain styling only

function buildSheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // column widths
  ws['!cols'] = [
    { wch: 32 }, // Field Name
    { wch: 28 }, // Display Name
    { wch: 14 }, // Data Type
    { wch: 10 }, // Length/Precision
    { wch: 10 }, // Mandatory
    { wch: 60 }, // Business Purpose
    { wch: 45 }, // Standards Reference
    { wch: 22 }, // Source System
  ];
  return ws;
}

const H = ['Field Name', 'Display Name', 'Data Type', 'Length / Precision', 'Mandatory', 'Business Purpose', 'Standards / Regulatory Reference', 'Source System'];

// ── Entity data ──────────────────────────────────────────────────────────────

// Columns: fieldName, displayName, type, lengthPrecision, mandatory, purpose, standard, source
const BRIDGES_CORE = [
  H,
  ['ID','Asset ID','Integer','','Yes','Surrogate integer primary key — auto-assigned on import','Internal / Mass Upload','BMS'],
  ['bridgeId','Bridge ID','String','40','Yes','Unique alphanumeric asset identifier — matches TfNSW bridge number or agency register code','TfNSW BIMS / Agency Register','BMS / Agency'],
  ['bridgeName','Bridge Name','String','111','Yes','Official gazetted or registered name of the bridge structure','TfNSW Bridge Register','BMS / Agency'],
  ['assetClass','Asset Class','String','40','','Classifies the primary use of the structure (Road, Rail, Pedestrian, Shared Path, Culvert, Viaduct)','Austroads AGBT; TfNSW Bridge Register','BMS Lookup'],
  ['route','Route / Road Name','String','111','','Name of the road, highway or rail corridor the bridge carries or spans','TfNSW SDAM / LRS; ARTC Network Register','TfNSW SDAM'],
  ['routeNumber','Route Number','String','40','','Road or rail route number (e.g. A1, M1, SH7) for network linkage and LRS chainage referencing','TfNSW SDAM; Austroads Route Numbering','TfNSW SDAM'],
  ['state','State / Territory','String','40','Yes','Australian state or territory where the structure is located','ISO 3166-2:AU; ABS State Standard','BMS Lookup'],
  ['region','Region','String','80','','TfNSW or agency administrative region for routing of work and reporting','TfNSW Regional Delivery Plan','BMS Lookup'],
  ['lga','Local Government Area','String','111','','LGA jurisdiction — relevant for planning approvals, ESL contributions and road transfers','ABS Statistical Geography; NSW LG Act 1993','ABS / Agency'],
  ['latitude','Latitude (GDA2020)','Decimal','15,6','Yes','WGS84/GDA2020 latitude in decimal degrees — used for map display and proximity analysis','GDA2020; AS/NZS ISO 19111','GPS / Survey'],
  ['longitude','Longitude (GDA2020)','Decimal','15,6','Yes','WGS84/GDA2020 longitude in decimal degrees — used for map display and proximity analysis','GDA2020; AS/NZS ISO 19111','GPS / Survey'],
  ['location','Location Description','String','255','','Free-text location description (nearest town, kilometre post or landmark)','TfNSW Bridge Register','Field / BMS'],
  ['assetOwner','Asset Owner','String','111','Yes','Organisation that owns the bridge asset (e.g. TfNSW, Local Council, ARTC)','NSW Roads Act 1993; NSW LG Act 1993','Asset Register'],
  ['managingAuthority','Managing Authority','String','111','','Organisation responsible for maintenance and operation (may differ from owner)','Austroads AGAM; TfNSW Asset Management Framework','Asset Register'],
  ['structureType','Structure Type','String','60','','Primary structural form — Beam, T-Girder, Box Girder, Arch, Truss, Timber, etc.','AS 5100.1; AS 5100.3; Austroads AGBT','Structural Assessment'],
  ['yearBuilt','Year Built','Integer','','','Year of original construction — used for asset age, fatigue life and design standard determination','AS 5100.1 §4.4 (design life)','Design Drawings'],
  ['designLoad','Design Load','String','40','','Original or assessed design load model (T44, SM1600, W80, A160, HLP400, CooperE etc.)','AS 5100.2; Austroads Bridge Design Code','Design Drawings / LRC'],
  ['designStandard','Design Standard','String','111','','Standard to which the bridge was designed (e.g. AS 5100:2017, NAASRA 1976, BS 153)','AS 5100 suite; NAASRA; BS 153','Design Drawings'],
  ['clearanceHeight','Clearance Height (m)','Decimal','9,2','','Minimum vertical clearance above road surface or water level posted on sign (metres)','AS 1742.2 §3.3; NHVR HVNL height limits','Field Survey / AS 1742.2'],
  ['spanLength','Span Length (m)','Decimal','9,2','','Length of the longest individual span (metres) — primary structural dimension','AS 5100.1; TfNSW Bridge Register','Design Drawings'],
  ['totalLength','Total Length (m)','Decimal','9,2','','Overall length of the bridge from abutment to abutment (metres)','TfNSW Bridge Register; Austroads AGBT','Design Drawings'],
  ['deckWidth','Deck Width (m)','Decimal','9,2','','Total deck width including traffic lanes, kerbs and footways (metres)','AS 5100.1; AS 1742.2','Design Drawings'],
  ['spanCount','Number of Spans','Integer','','','Total number of spans — single span vs multi-span affects inspection and maintenance strategy','AS 5100.1; TfNSW Bridge Register','Design Drawings'],
  ['numberOfLanes','Number of Lanes','Integer','','','Number of through traffic lanes carried by the bridge','Austroads Guide to Road Design; AS 1742','Design Drawings'],
  ['material','Primary Material','String','60','','Dominant structural material (Reinforced Concrete, Prestressed Concrete, Steel, Timber, Masonry)','AS 5100.3; AS 5100.5; TfNSW Bridge Register','Design Drawings'],
  ['surfaceType','Surface Type','String','40','','Bridge deck wearing surface type — Asphalt, Concrete, Open Grating, Timber (affects load and maintenance)','Austroads Pavement Design Guide; AS 5100.4','Inspection'],
  ['substructureType','Substructure Type','String','40','','Abutment and pier configuration — relevant for scour, seismic and load path assessment','AS 5100.3; AP-G71.8 §4','Structural Assessment'],
  ['foundationType','Foundation Type','String','40','','Type of foundation supporting the substructure — critical for scour risk classification','AS 5100.3; Austroads AP-G71.8 §4','Geotech / Design Drawings'],
  ['waterwayType','Waterway Type','String','40','','Classification of the waterway crossed — drives scour risk category and inspection frequency','Austroads AP-G71.8 §3; NSW Flood Risk Manual','Field / Hydrology Assessment'],
  ['condition','Condition (Text)','String','40','','Current overall condition expressed as text label — Good / Fair / Poor / Very Poor / Critical (TfNSW 5-point scale)','TfNSW Bridge Inspection Manual (BIM) §3.1','Principal Inspection'],
  ['conditionRating','Condition Rating (1–10)','Integer','','','Numerical condition score on 1–10 scale — higher = better; maps to NCI and sufficiency calculations','TfNSW BIM (legacy 1-10 scale)','Principal Inspection'],
  ['structuralAdequacyRating','Structural Adequacy Rating','Integer','','','Structural adequacy score 1–10 — reflects load-carrying capacity relative to posted requirements','TfNSW BIM; AS 5100.7','LRC / Engineering Assessment'],
  ['conditionSummary','Condition Summary','String','60','','Grouped condition label aligned with TfNSW 1–5 scale: Good / Fair / Poor / VeryPoor / Critical','TfNSW BIM §3.1','Principal Inspection'],
  ['conditionTrend','Condition Trend','String','20','','Direction of condition change since last inspection: Improving / Stable / Deteriorating / RapidDeterioration','Austroads AP-G71 §5.5; TfNSW BIM','BMS Computed'],
  ['conditionAssessor','Condition Assessor','String','111','','Name and accreditation level of the inspector who last rated overall condition','TfNSW BIM §3; Austroads B-CIIMS','Inspection Record'],
  ['conditionReportRef','Condition Report Reference','String','111','','Document reference for the inspection report supporting the current condition rating','TfNSW Bridge File Management','Inspection Record'],
  ['conditionNotes','Condition Notes','LargeString','','','Inspector notes on defects, deterioration mechanism and recommended follow-up','TfNSW BIM §5','Principal Inspection'],
  ['structuralAdequacy','Structural Adequacy','String','40','','Qualitative adequacy classification: Adequate / Marginal / Inadequate / Structurally Deficient / Failed','AS 5100.7; TfNSW BIM; FHWA NBI §SDCP definition','LRC / Engineering Assessment'],
  ['postingStatus','Posting Status','String','40','','Current restriction status: Unrestricted / Under Review / Restricted / Closed','NSW Roads Act 1993 §121; NHVR HVNL §§96–99','BMS Auto-computed'],
  ['postingStatusReason','Posting Status Reason','String','200','','Brief explanation of why the current posting status was applied','NSW Roads Act 1993 §121–124','BMS / Engineering'],
  ['closureDate','Closure Date','Date','','','Date the bridge was closed to traffic — required when postingStatus = Closed','NSW Roads Act 1993; TfNSW Incident Management','BMS'],
  ['closureEndDate','Closure End Date (Expected)','Date','','','Expected date of bridge reopening — used for alerts and notifications','TfNSW Incident Management','BMS'],
  ['closureReason','Closure Reason','String','500','','Detailed reason for bridge closure (structural failure, flood, construction, etc.)','TfNSW Incident Management','BMS / Engineering'],
  ['lastInspectionDate','Last Inspection Date','Date','','','Date of the most recent formal inspection of any type','TfNSW BIM §4','Inspection Record'],
  ['inspectionType','Inspection Type','String','40','','Type of the most recent inspection (Routine Visual, Principal, Post-Event, etc.)','TfNSW BIM §4','Inspection Record'],
  ['inspectionFrequencyYears','Inspection Frequency (Years)','Integer','','','Required cycle between principal inspections — default 2yr road, 5yr rail','TfNSW BIM §4.2; AS 5100.1','BMS / Agency Policy'],
  ['nextInspectionDue','Next Inspection Due','Date','','','Calculated due date for next inspection = lastInspectionDate + frequency','TfNSW BIM §4.2','BMS Computed'],
  ['seismicZone','Seismic Zone','String','40','','AS 1170.4 seismic hazard zone — Zone 1, 2 or 3; affects design and assessment requirements','AS 1170.4; AS 5100.1 §14','Geotechnical / Design'],
  ['scourRisk','Scour Risk Level','String','20','','Scour risk category from VeryLow to VeryHigh — drives inspection frequency and countermeasure requirements','Austroads AP-G71.8; TfNSW Scour Management Guideline','Scour Assessment'],
  ['scourDepthLastMeasured','Scour Depth Last Measured (m)','Decimal','9,2','','Most recently measured scour depth (metres) — compared against critical scour depth','Austroads AP-G71.8 §4; TfNSW Scour Inspection','Underwater / Scour Inspection'],
  ['floodImmunityAriYears','Flood Immunity ARI (years)','Integer','','','Annual Recurrence Interval of the flood event the bridge is designed or assessed to withstand','NSW Flood Risk Management Guide; Austroads AGRD','Hydrology Assessment'],
  ['floodImpacted','Flood Impacted','Boolean','','','Indicates the bridge is in a flood-affected location requiring heightened monitoring','NSW Flood Risk Management Guide','GIS / Agency'],
  ['highPriorityAsset','High Priority Asset','Boolean','','','Flags bridges critical to network connectivity, emergency access or freight routes — triggers priority inspections','TfNSW Asset Management Framework','BMS Computed / Agency'],
  ['status','Operational Status','String','40','','Overall operational status (Active, Under Repair, Decommissioned, Heritage Listed)','TfNSW Bridge Register','BMS / Agency'],
  ['isActive','Is Active','Boolean','','Yes','Soft-delete flag — false means bridge is archived but data retained for audit purposes','Internal (BMS data lifecycle)','BMS'],
  ['importanceLevel','Importance Level (1–4)','Integer','','','Asset criticality: 1=Critical, 2=Essential, 3=Important, 4=Ordinary — drives inspection and maintenance priority','AS 5100.1 Table 2.1; TfNSW Critical Assets Policy','Engineering Assessment'],
  ['averageDailyTraffic','Average Daily Traffic (AADT)','Integer','','','Annual Average Daily Traffic (vehicles/day) — required for load rating and fatigue life assessment','Austroads Traffic Engineering; TfNSW AADT Database','Traffic Survey / TfNSW'],
  ['heavyVehiclePercent','Heavy Vehicle Percentage (%)','Decimal','5,2','','Proportion of AADT that are heavy vehicles — used in fatigue life and pavement calculations','Austroads Bridge Fatigue Guide; AS 5100.6','Traffic Survey'],
  ['loadRating','Load Rating (t)','Decimal','9,2','','Gross load rating in tonnes from most recent Load Rating Certificate (AS 5100.7)','AS 5100.7:2017; TfNSW LRC Policy','Load Rating Certificate'],
  ['nhvrAssessed','NHVR Assessed','Boolean','','','Indicates the bridge has a current NHVR Route Assessment by an accredited assessor','NHVR HVNL §§154–157; PBS Standards','NHVR Portal / LRC'],
  ['nhvrAssessmentDate','NHVR Assessment Date','Date','','','Date of the current valid NHVR route assessment','NHVR HVNL §§154–157','NHVR Portal'],
  ['pbsApprovalClass','PBS Approval Class','String','40','','Highest PBS level approved for this bridge (General Access, Level 1–5, Not Assessed)','NHVR HVNL; PBS Standards; NHVR Approved Network','NHVR Portal'],
  ['pbsApprovalDate','PBS Approval Date','Date','','','Date PBS approval was granted or last renewed','NHVR PBS Standards','NHVR Portal'],
  ['pbsApprovalExpiry','PBS Approval Expiry','Date','','','Date PBS approval expires — alerts generated at 90/60/30 days before expiry','NHVR HVNL; NHVR PBS Standards','NHVR Portal'],
  ['hmlApproved','HML Approved','Boolean','','','Indicates bridge is approved for Higher Mass Limit vehicles (up to 23 t steer + 6.5 t/axle)','NHVR HVNL §§96–99 (HML Gazette Notice)','NHVR Portal / LRC'],
  ['hmlApprovalDate','HML Approval Date','Date','','','Date HML approval was issued or last renewed','NHVR HVNL §§96–99','NHVR Portal'],
  ['hmlApprovalExpiry','HML Approval Expiry','Date','','','Date HML approval expires — alert-driven renewal workflow','NHVR HVNL §§96–99','NHVR Portal'],
  ['bDoubleApproved','B-Double Approved','Boolean','','','Indicates bridge is on the approved B-Double network (max 26 m / 62.5 t GCM)','NHVR HVNL §§154–157; State B-Double Networks','NHVR / State Road Authority'],
  ['freightRoute','Freight Route','Boolean','','','Bridge is on a designated freight route — affects design loading requirements and priority maintenance','TfNSW Freight Network; Austroads AGBT','TfNSW / Agency'],
  ['overMassRoute','Over Mass Route','Boolean','','','Bridge is on an approved over-mass vehicle route requiring individual permits','NHVR HVNL Part 4.7; Roads Act 1993','NHVR Portal'],
  ['gazetteReference','Gazette Reference','String','111','','NSW Government Gazette reference for any load limit order applying to this bridge','NSW Roads Act 1993 §§121–124; NSW Gazette','NSW Gazette'],
  ['gazetteEffectiveDate','Gazette Effective Date','Date','','','Date the gazette load limit order came into effect','NSW Roads Act 1993 §122','NSW Gazette'],
  ['gazetteExpiryDate','Gazette Expiry Date','Date','','','Date the gazette order expires — alerts generated at 90/60/30 days','NSW Roads Act 1993 §124','NSW Gazette'],
  ['dataSource','Data Source','String','111','','Organisation or system from which asset data was sourced (e.g. TfNSW BIMS, VIC Asset Register)','BMS Data Governance Policy','BMS / Agency'],
  ['geoJson','GeoJSON','LargeString','','','GeoJSON geometry for map rendering — typically a Point or LineString in GDA2020','GeoJSON RFC 7946; GDA2020','GIS / Survey'],
  ['dataQualityScore','Data Quality Score (%)','Decimal','5,2','','Automated completeness and accuracy score (0–100%) — calculated by the DQ rules engine','BMS Data Quality Framework','BMS DQ Engine'],
  ['remarks','Remarks','LargeString','','','General notes and supplementary information not captured by other fields','TfNSW Bridge File Management','Field / BMS'],
];

const BRIDGES_EXT = [
  H,
  // TfNSW / SDAM reference fields
  ['tfnswBridgeNumber','TfNSW Bridge Number','String','20','','TfNSW unique bridge identifier from the Bridge Information Management System (BIMS)','TfNSW BIMS; TfNSW Bridge Register','TfNSW BIMS'],
  ['snNumber','Structure Number (SN)','String','50','','TfNSW Structure Number — 9-digit SN used in SDAM, LRS and maintenance systems','TfNSW SDAM; TfNSW LRS','TfNSW SDAM'],
  ['bimsRecordStatus','BIMS Record Status','String','30','','Current status of the asset record in TfNSW BIMS (Active, Decommissioned, Under Construction)','TfNSW BIMS Data Dictionary','TfNSW BIMS'],
  ['roadId','Road ID (LRS)','String','20','','TfNSW Linear Referencing System road identifier — links bridge to road chainage network','TfNSW SDAM / LAMS LRS','TfNSW SDAM'],
  ['startSlk','Start SLK (km)','Decimal','10,3','','Start chainage in kilometres on the LRS — identifies bridge location on road segment','TfNSW SDAM LRS','TfNSW SDAM'],
  ['endSlk','End SLK (km)','Decimal','10,3','','End chainage in kilometres on the LRS — defines bridge extent on road segment','TfNSW SDAM LRS','TfNSW SDAM'],
  ['carriageway','Carriageway','String','20','','Carriageway reference (L / R / Single) for dual carriageway roads','TfNSW SDAM LRS','TfNSW SDAM'],
  ['coordinateDatum','Coordinate Datum','String','20','','Geodetic datum for stored coordinates — default GDA2020','GDA2020; AS/NZS ISO 19111','Survey'],
  ['mgaEasting','MGA Easting (m)','Decimal','12,2','','Map Grid of Australia easting in metres (GDA2020 / MGA2020)','GDA2020 MGA2020; ICSM','Survey'],
  ['mgaNorthing','MGA Northing (m)','Decimal','12,2','','Map Grid of Australia northing in metres (GDA2020 / MGA2020)','GDA2020 MGA2020; ICSM','Survey'],
  ['mgaZone','MGA Zone','String','5','','MGA2020 zone number (e.g. Zone 54, Zone 55) for the bridge location','GDA2020 MGA2020; ICSM','Survey'],
  ['spatialAccuracyMetres','Spatial Accuracy (m)','Decimal','5,2','','Estimated positional accuracy of stored coordinates in metres','AS/NZS ISO 19157 (data quality); GDA2020','Survey / GIS'],
  ['spatialCaptureMethod','Spatial Capture Method','String','40','','Method used to determine coordinates (GPS, Survey, Aerial, LiDAR, Map Digitise)','AS/NZS ISO 19157','Survey / GIS'],
  ['roadClassification','Road Classification','String','30','','Road classification (National Highway, State Road, Regional Road, Local Road) per Austroads','Austroads Guide to Network Planning; NSW Roads Act','TfNSW / Agency'],
  ['networkClassification','Network Classification','String','30','','NHVR network classification for heavy vehicle access (Permit, Notice, Conditional, HML)','NHVR HVNL §38','NHVR Portal'],
  ['cmlApproved','CML Approved','Boolean','','','Indicates bridge is approved for Concessional Mass Limit vehicles under NHVR permit','NHVR HVNL §§96–99; CML Gazette Notice','NHVR Portal'],
  ['cmlApprovalDate','CML Approval Date','Date','','','Date CML approval was issued or last renewed','NHVR HVNL §§96–99','NHVR Portal'],
  ['cmlApprovalExpiry','CML Approval Expiry','Date','','','Date CML approval expires','NHVR HVNL §§96–99','NHVR Portal'],
  ['lifecycleStage','Lifecycle Stage','String','30','','Current asset lifecycle stage: Pre-Construction / Construction / Operation / Deterioration / End of Life','ISO 55000; TfNSW Asset Management Framework','Asset Management'],
  ['replacementCostEstimate','Replacement Cost Estimate ($)','Decimal','14,2','','Estimated current replacement cost in AUD — used for insurance, budgeting and prioritisation','ISO 55000; TfNSW Asset Valuation Framework','Cost Estimation'],
  ['annualMaintenanceCostEstimate','Annual Maintenance Cost Estimate ($)','Decimal','12,2','','Estimated annual maintenance expenditure — used in lifecycle cost modelling','ISO 55000; Austroads AGAM','Asset Management'],
  ['maintenancePriority','Maintenance Priority','String','20','','Maintenance priority ranking: Critical / High / Medium / Low — informed by condition and risk','ISO 55000; TfNSW Risk-Based Asset Management','BMS Computed / Engineering'],
  ['s4FunctionalLocation','S/4 Functional Location','String','40','','SAP S/4HANA PM Functional Location (TPLNR) — links bridge to S/4 EAM hierarchy','SAP S/4HANA EAM; ISO 14224','SAP S/4HANA'],
  ['s4EquipmentNumber','S/4 Equipment Number','String','18','','SAP S/4HANA Equipment master record number — primary EAM asset identifier','SAP S/4HANA EAM; ISO 14224','SAP S/4HANA'],
  ['s4CostCenter','S/4 Cost Centre','String','10','','SAP cost centre for maintenance cost allocation','SAP S/4HANA FI-CO','SAP S/4HANA'],
  ['s4Plant','S/4 Plant','String','4','','SAP plant code for the maintenance-responsible plant','SAP S/4HANA EAM','SAP S/4HANA'],
  ['s4MaintenancePlant','S/4 Maintenance Plant','String','4','','SAP plant that executes maintenance work orders for this bridge','SAP S/4HANA EAM PM','SAP S/4HANA'],
  ['s4WorkCenter','S/4 Work Centre','String','8','','SAP work centre for planning and scheduling of maintenance activities','SAP S/4HANA EAM PM','SAP S/4HANA'],
  ['s4EamSyncStatus','S/4 EAM Sync Status','String','20','','Integration sync state: NOT_LINKED / SYNCED / ERROR — updated by EAM integration job','SAP S/4HANA Integration','BMS Integration'],
  ['s4EamSyncedAt','S/4 EAM Last Synced','Timestamp','','','Date/time of the most recent successful sync with SAP S/4HANA EAM','SAP Integration Audit','BMS Integration'],
  ['bearingType','Bearing Type','String','50','','Type of bridge bearing (elastomeric, rocker, pot, mechanical) — affects maintenance and replacement planning','AS 5100.4 §4.4','Inspection / Design'],
  ['bearingCondition','Bearing Condition','String','20','','Current condition of bearings: Good / Fair / Poor / Failed','AS 5100.4; TfNSW BIM §5','Principal Inspection'],
  ['expansionJointType','Expansion Joint Type','String','50','','Type of expansion joint (asphaltic plug, strip seal, modular, buried) — affects deck maintenance','TfNSW Bridge Maintenance Manual','Inspection / Design'],
  ['expansionJointCondition','Expansion Joint Condition','String','20','','Current condition of expansion joints: Good / Fair / Poor / Failed','TfNSW Bridge Maintenance Manual; TfNSW BIM §5','Principal Inspection'],
  ['clearanceHeightSurveyed','Clearance Height Surveyed (m)','Decimal','5,2','','Actual surveyed vertical clearance at the most restrictive point (metres)','AS 1742.2 §3.3; NHVR HVNL','Field Survey'],
  ['clearanceHeightPosted','Clearance Height Posted (m)','Decimal','5,2','','Posted clearance height on sign — may be lower than surveyed due to road resurfacing tolerance','AS 1742.2 §3.3; AS 1742.10','Sign Inspection'],
  ['abutmentType','Abutment Type','String','50','','Type of bridge abutment (gravity, cantilever, spill-through, integral)','AS 5100.3; TfNSW BIM','Design Drawings / Inspection'],
  ['skewAngleDegrees','Skew Angle (°)','Decimal','5,2','','Bridge skew angle in degrees — affects transverse load distribution and seismic response','AS 5100.1; AS 5100.2','Design Drawings'],
  ['seismicSiteSoilClass','Seismic Site Soil Class','String','5','','AS 1170.4 site subsoil class (Ae, Be, Ce, De, Ee) — affects seismic design category','AS 1170.4 §4.1','Geotechnical Report'],
  ['seismicHazardFactorZ','Seismic Hazard Factor (Z)','Decimal','4,3','','AS 1170.4 hazard factor for the bridge location — lookup from AS 1170.4 Table 3.2','AS 1170.4 Table 3.2','Geotechnical / Design'],
  ['seismicEdc','Seismic EDC','String','10','','Earthquake Design Category per AS 5100.1 Table 14.2 (I, II, III, IV)','AS 5100.1 §14; AS 1170.4','Design Assessment'],
  ['bDoubleSweptPathWidth','B-Double Swept Path Width (m)','Decimal','6,2','','Swept path width of B-double turning movements — required for geometric assessment of B-double routes','NHVR HVNL §§154–157; Austroads Swept Path Guide','NHVR Assessment'],
  ['bDoubleAssessmentRef','B-Double Assessment Reference','String','50','','Reference number of the B-double swept path or structural assessment report','NHVR HVNL §§154–157','NHVR Assessment'],
  ['roadTrainApproved','Road Train Approved','Boolean','','','Indicates bridge is on an approved road train route (A- or B-train > 26 m)','NHVR HVNL Part 4','NHVR Portal'],
  ['iapRequired','IAP Required','Boolean','','','Indicates route requires participation in the Intelligent Access Program (telematics monitoring)','NHVR HVNL §§184–208 (IAP)','NHVR Portal'],
  ['iapRouteId','IAP Route ID','String','50','','NHVR Intelligent Access Program route identifier for telematics enforcement','NHVR HVNL §§184–208','NHVR Portal'],
  ['irapRoadRating','iRAP Road Rating','String','10','','International Road Assessment Programme star rating for the road segment (1–5 stars)','iRAP Protocol; ARRB iRAP Assessment','iRAP / ARRB'],
];

const RESTRICTIONS = [
  H,
  ['restrictionRef','Restriction Reference','String','40','','Unique reference code for the restriction record — used in gazette and permit references','Internal / Gazette Reference','BMS'],
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge record this restriction applies to','Internal','BMS'],
  ['restrictionCategory','Category','String','20','','Permanent or Temporary — determines whether effectiveTo date is mandatory','NSW Roads Act 1993 §121','BMS Lookup'],
  ['restrictionType','Restriction Type','String','40','','Type of restriction: Mass Limit / Dimension Limit / Speed Restriction / Access Restriction','NHVR HVNL; Roads Act 1993 §121','BMS Lookup'],
  ['restrictionValue','Restriction Value','String','60','','Numeric or descriptive value of the restriction (e.g. "42.5" for 42.5t mass limit)','NHVR HVNL; NSW Roads Act 1993','BMS / Engineering'],
  ['restrictionUnit','Unit','String','20','','Unit of the restriction value (t, m, km/h, approval)','NHVR HVNL; AS 1742.10','BMS Lookup'],
  ['restrictionStatus','Status','String','20','','Lifecycle status: Draft / Active / Suspended / Retired','NSW Roads Act 1993 §121','BMS'],
  ['appliesToVehicleClass','Applies To Vehicle Class','String','40','','Vehicle class this restriction applies to (All Vehicles, Heavy Vehicles, B-Double, etc.)','NHVR HVNL §38; PBS Standards','BMS Lookup'],
  ['grossMassLimit','Gross Mass Limit (t)','Decimal','9,2','','Maximum gross vehicle mass (GVM) in tonnes','NHVR HVNL §§96–99; AS 1742.10','BMS / Engineering'],
  ['axleMassLimit','Axle Mass Limit (t)','Decimal','9,2','','Maximum individual axle mass in tonnes','NHVR HVNL §§96–99','BMS / Engineering'],
  ['heightLimit','Height Limit (m)','Decimal','9,2','','Maximum vehicle height in metres — posted as clearance restriction','AS 1742.2 §3.3; AS 1742.10','BMS / Engineering'],
  ['widthLimit','Width Limit (m)','Decimal','9,2','','Maximum vehicle width in metres','NHVR HVNL dim limits; AS 1742.10','BMS / Engineering'],
  ['lengthLimit','Length Limit (m)','Decimal','9,2','','Maximum vehicle length in metres','NHVR HVNL dim limits','BMS / Engineering'],
  ['speedLimit','Speed Limit (km/h)','Integer','','','Maximum permitted speed across the bridge (km/h)','Australian Road Rules §20; AS 1742.1','BMS / Engineering'],
  ['permitRequired','Permit Required','Boolean','','','Indicates that a permit from NHVR or road authority must be held prior to crossing','NHVR HVNL Part 4; Roads Act 1993','BMS / Engineering'],
  ['escortRequired','Escort Required','Boolean','','','Indicates a pilot or escort vehicle is mandatory for crossing','NHVR HVNL §183; OSOM Guidelines','BMS / Engineering'],
  ['pilotVehicleCount','Pilot Vehicle Count','Integer','','','Number of pilot/escort vehicles required — typically 1 front or 1 front + 1 rear','NHVR HVNL §183','NHVR Assessment'],
  ['effectiveFrom','Effective From','Date','','','Date from which the restriction is in force','NSW Roads Act 1993 §122','BMS / Gazette'],
  ['effectiveTo','Effective To','Date','','','Date the restriction ceases — mandatory for Temporary category restrictions','NSW Roads Act 1993 §124','BMS / Gazette'],
  ['approvedBy','Approved By','String','111','','Name or title of the authority that approved the restriction','NSW Roads Act 1993 §121; NHVR HVNL','BMS / Engineering'],
  ['enforcementAuthority','Enforcement Authority','String','111','','Organisation responsible for enforcing the restriction (TfNSW, Local Council, NSW Police)','NSW Roads Act 1993 §124; HVNL §§542–550','BMS / Engineering'],
  ['direction','Direction','String','40','','Directional applicability: Both Directions / Northbound / Southbound / Eastbound / Westbound','AS 1742.10; NSW Gazette','BMS Lookup'],
  ['gazetteNumber','Gazette Number','String','30','','NSW Government Gazette order number authorising this restriction','NSW Roads Act 1993 §§121–124; NSW Gazette','NSW Gazette'],
  ['gazettePublicationDate','Gazette Publication Date','Date','','','Date the gazette order was published in the NSW Government Gazette','NSW Roads Act 1993 §122','NSW Gazette'],
  ['gazetteExpiryDate','Gazette Expiry Date','Date','','','Date the gazette authority expires — alerts generated at 90/60/30 days','NSW Roads Act 1993 §124','NSW Gazette'],
  ['loadLimitOrderRef','Load Limit Order Reference','String','50','','Load Limit Order (LLO) reference number under NSW Roads Act 1993','NSW Roads Act 1993 §121','TfNSW / Roads Authority'],
  ['loadLimitOrderExpiry','Load Limit Order Expiry','Date','','','Date the Load Limit Order expires — triggers renewal alert','NSW Roads Act 1993 §124','TfNSW / Roads Authority'],
  ['postingSignId','Posting Sign ID','String','40','','Reference to the AS 1742.10 sign erected for this restriction','AS 1742.10 Sign Posting Standard','Sign Inventory'],
  ['issuingAuthority','Issuing Authority','String','111','','Organisation that issued the restriction authority (Roads Minister, TfNSW CEO, Local Council)','NSW Roads Act 1993 §121','BMS'],
  ['legalReference','Legal Reference','String','111','','Specific legislative provision supporting the restriction (Act section, gazette reference)','NSW Roads Act 1993; NHVR HVNL','BMS / Legal'],
  ['remarks','Remarks','LargeString','','','Additional notes, conditions or limitations relevant to the restriction','Internal','BMS'],
];

const LOAD_RATINGS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge record this certificate covers','Internal','BMS'],
  ['certificateNumber','Certificate Number','String','40','Yes','Unique identifier for the Load Rating Certificate — typically issued by certifying engineer','AS 5100.7:2017; TfNSW LRC Policy','LRC'],
  ['certificateVersion','Certificate Version','Integer','','','Version number — incremented each time the certificate is superseded or revised','AS 5100.7:2017','LRC'],
  ['status','Certificate Status','String','20','','Current / Superseded / Expired — drives alerts and reporting','AS 5100.7; TfNSW LRC Policy','BMS'],
  ['ratingStandard','Rating Standard','String','40','Yes','Standard used for the load rating assessment (e.g. AS 5100.7:2017, AASHTO LRFR)','AS 5100.7:2017','LRC'],
  ['ratingLevel','Rating Level','String','20','Yes','Rating level: Inventory (conservative, long-term) or Operating (short-term, exceptional loads)','AS 5100.7:2017 §1.4','LRC'],
  ['certifyingEngineer','Certifying Engineer','String','111','Yes','Name of the NER or CPEng engineer who certified the load rating','AS 5100.7; Engineers Australia CPEng; NER','LRC'],
  ['engineerQualification','Engineer Qualification','String','20','Yes','Qualification: NER (National Engineering Register) or CPEng (Chartered Professional Engineer)','AS 5100.7; Engineers Australia','LRC'],
  ['engineerLicenseNumber','Engineer License / NER Number','String','40','','NER or CPEng registration number for the certifying engineer','AS 5100.7; Engineers Australia NER','LRC'],
  ['rfT44','RF: T44','Decimal','8,4','','Rating Factor for T44 load model — value ≥ 1.0 = adequate; < 1.0 = restricted','AS 5100.7:2017 §4; Austroads Bridge Rating Guide','LRC'],
  ['rfSM1600','RF: SM1600','Decimal','8,4','','Rating Factor for SM1600 load model (current Austroads standard)','AS 5100.7:2017; AS 5100.2','LRC'],
  ['rfHLP400','RF: HLP400','Decimal','8,4','','Rating Factor for HLP400 (Heavy Load Platform 400t) — required for approved HLP routes','AS 5100.7:2017; Austroads','LRC'],
  ['rfW80','RF: W80','Decimal','8,4','','Rating Factor for W80 wheel load model (NSW local roads)','AS 5100.7:2017; NSW W80 Standard','LRC'],
  ['rfA160','RF: A160','Decimal','8,4','','Rating Factor for A160 axle load model (NSW gazetted routes)','AS 5100.7:2017; NSW A160 Standard','LRC'],
  ['rfPBS1','RF: PBS Level 1','Decimal','8,4','','Rating Factor for PBS Level 1 vehicle configuration','AS 5100.7; NHVR PBS Standards','LRC'],
  ['rfPBS2','RF: PBS Level 2','Decimal','8,4','','Rating Factor for PBS Level 2 vehicle configuration','AS 5100.7; NHVR PBS Standards','LRC'],
  ['rfPBS3','RF: PBS Level 3','Decimal','8,4','','Rating Factor for PBS Level 3 vehicle configuration','AS 5100.7; NHVR PBS Standards','LRC'],
  ['rfPBS4','RF: PBS Level 4','Decimal','8,4','','Rating Factor for PBS Level 4 vehicle configuration','AS 5100.7; NHVR PBS Standards','LRC'],
  ['rfHML','RF: HML (High Mass Limit)','Decimal','8,4','','Rating Factor for Higher Mass Limit configuration — required to issue HML approval','AS 5100.7; NHVR HVNL §§96–99','LRC'],
  ['rfCML','RF: CML (Concessional Mass Limit)','Decimal','8,4','','Rating Factor for Concessional Mass Limit configuration','AS 5100.7; NHVR HVNL §§96–99','LRC'],
  ['dynamicLoadAllowance','Dynamic Load Allowance','Decimal','5,3','','Dynamic load allowance (impact factor) applied to rating — default 1.4 per AS 5100.2','AS 5100.2 §7; AS 5100.7','LRC'],
  ['governingMember','Governing Member','String','255','','Structural element that controls the load rating (e.g. Span 2 main girder — web shear)','AS 5100.7:2017','LRC'],
  ['governingFailureMode','Governing Failure Mode','String','100','','Critical failure mode for the governing member (Flexure, Shear, Fatigue, Buckling)','AS 5100.7; AS 5100.3','LRC'],
  ['fatigueSensitive','Fatigue Sensitive','Boolean','','','Indicates the bridge has fatigue-sensitive steel elements requiring periodic inspection','AS 5100.6 §13; AS 5100.3','LRC'],
  ['consumedLifePercent','Consumed Life (%)','Decimal','5,2','','Percentage of fatigue design life consumed — when approaching 100% requires detailed assessment','AS 5100.6 §13.5; AS 5100.7','LRC'],
  ['detailCategory','Fatigue Detail Category','String','10','','AS 5100.6 §13.5 weld detail category (A through G) — governs allowable fatigue stress range','AS 5100.6 §13.5 Table 13.5.1','LRC'],
  ['certificateIssueDate','Certificate Issue Date','Date','','Yes','Date the Load Rating Certificate was issued / signed','AS 5100.7; TfNSW LRC Policy','LRC'],
  ['certificateExpiryDate','Certificate Expiry Date','Date','','Yes','Date the certificate expires — typically 10 years or after a significant loading event','AS 5100.7; TfNSW LRC Policy','LRC'],
  ['expiryWarningDays','Expiry Warning Days','Integer','','','Days before expiry to trigger alert — default 90 days','TfNSW LRC Policy','BMS Config'],
  ['conditions','Certificate Conditions','LargeString','','','Any special conditions, limitations or notes attached to the certificate','AS 5100.7; TfNSW LRC Policy','LRC'],
  ['reportStorageRef','Report Storage Reference','String','500','','URL or document reference to the stored load rating report','TfNSW Document Management','BMS / EDMS'],
];

const RISK_ASSESSMENTS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge being assessed','Internal','BMS'],
  ['assessmentId','Assessment ID','String','40','Yes','Unique identifier for this risk assessment record','Internal','BMS'],
  ['assessmentDate','Assessment Date','Date','','Yes','Date the risk assessment was performed','ISO 31000; TfNSW Risk Management Framework','Risk Assessment'],
  ['riskType','Risk Type','String','40','Yes','Category of risk: Structural / Scour / Seismic / Flood / Fatigue / Geotechnical / Traffic / Regulatory','ISO 31000; AS/NZS 31000:2018','Risk Assessment'],
  ['riskDescription','Risk Description','String','500','Yes','Concise description of the identified risk event and its potential pathway','ISO 31000','Risk Assessment'],
  ['likelihood','Likelihood (1–5)','Integer','','Yes','Probability of the risk event: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain','ISO 31000; TfNSW Enterprise Risk Matrix','Risk Assessment'],
  ['consequence','Consequence (1–5)','Integer','','Yes','Severity of consequences: 1=Insignificant, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic','ISO 31000; TfNSW Enterprise Risk Matrix','Risk Assessment'],
  ['inherentRiskScore','Inherent Risk Score','Integer','','','Calculated: Likelihood × Consequence (1–25) — risk before controls','ISO 31000','BMS Computed'],
  ['inherentRiskLevel','Inherent Risk Level','String','20','','Text level: Low / Medium / High / Critical — derived from inherent risk score matrix','ISO 31000; TfNSW Risk Matrix','BMS Computed'],
  ['existingControls','Existing Controls','LargeString','','','Description of controls, countermeasures or treatments already in place','ISO 31000; AS/NZS 31000:2018','Risk Assessment'],
  ['controlEffectiveness','Control Effectiveness','String','30','','Effectiveness of existing controls: Ineffective / Partial / Effective / Highly Effective','ISO 31000','Risk Assessment'],
  ['residualRiskScore','Residual Risk Score','Integer','','','Risk score after applying existing controls — used for prioritisation','ISO 31000','BMS Computed'],
  ['residualRiskLevel','Residual Risk Level','String','20','','Text level after controls: Low / Medium / High / Critical','ISO 31000','BMS Computed'],
  ['riskTreatmentStrategy','Treatment Strategy','String','30','','Planned treatment: Accept / Reduce / Transfer / Avoid','ISO 31000 §6.5.3','Risk Assessment'],
  ['treatmentActions','Treatment Actions','LargeString','','','Specific actions to be taken to reduce or manage the risk','ISO 31000; TfNSW Action Plan','Risk Assessment'],
  ['treatmentDeadline','Treatment Deadline','Date','','','Date by which risk treatment must be completed','ISO 31000; TfNSW Risk Framework','Risk Assessment'],
  ['linkedInspectionId','Linked Inspection ID','String','40','','Reference to the BridgeInspection that identified or triggered this risk','TfNSW BIM; ISO 55000','BMS'],
  ['linkedDefectId','Linked Defect ID','String','40','','Reference to the BridgeDefect that is the subject of this risk assessment','TfNSW BIM §5','BMS'],
];

const INSPECTIONS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge inspected','Internal','BMS'],
  ['inspectionDate','Inspection Date','Date','','Yes','Date the inspection was conducted','TfNSW BIM §4; Austroads B-CIIMS','Inspection Record'],
  ['inspectionType','Inspection Type','String','40','Yes','Type: Routine Visual / Principal / Post-Event / Special Scour / Underwater / Load Rating / NDT','TfNSW BIM §4; Austroads B-CIIMS','BMS Lookup'],
  ['inspector','Inspector Name','String','111','Yes','Name of the lead inspector','TfNSW BIM §3; Austroads B-CIIMS','Inspection Record'],
  ['inspectorAccreditationNumber','Inspector Accreditation Number','String','40','','TfNSW or agency accreditation number for the inspector','TfNSW BIM §3.1 — Inspector Accreditation Levels 1–4','TfNSW Accreditation Register'],
  ['inspectorAccreditationLevel','Inspector Accreditation Level','String','20','','TfNSW accreditation level: Level 1 (routine) / Level 2 / Level 3 (principal) / Level 4 (specialist)','TfNSW BIM §3.1','TfNSW Accreditation Register'],
  ['inspectorCompany','Inspector Company','String','111','','Organisation employing the inspector (TfNSW, consulting firm, local council)','TfNSW BIM','Inspection Record'],
  ['inspectionStandard','Inspection Standard','String','60','','Standard used to conduct inspection (e.g. TfNSW BIM 2020, Austroads B-CIIMS, AS 5100.7)','TfNSW BIM; Austroads B-CIIMS','Inspection Record'],
  ['inspectionScope','Inspection Scope','String','500','','Description of elements inspected and any access limitations or special conditions','TfNSW BIM §4','Inspection Record'],
  ['s4InspectionOrderRef','S/4 Inspection Order Reference','String','40','','SAP S/4HANA Inspection Order number — populated when EAM integration is active','SAP S/4HANA PM; ISO 14224','SAP S/4HANA'],
  ['s4NotificationRef','S/4 Notification Reference','String','40','','SAP S/4HANA PM Notification number raised from this inspection','SAP S/4HANA PM','SAP S/4HANA'],
  ['reportStorageRef','Report Storage Reference','String','500','','URL or document reference to the inspection report in EDMS','TfNSW Document Management','BMS / EDMS'],
];

const DEFECTS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge where the defect was found','Internal','BMS'],
  ['inspection','Inspection','Association','','Yes','Foreign key to the inspection record during which defect was identified','Internal','BMS'],
  ['defectId','Defect ID','String','30','Yes','Unique identifier for the defect — typically inspection date + sequential number','TfNSW BIM; Austroads B-CIIMS','Inspection Record'],
  ['defectType','Defect Type','String','40','Yes','Category of defect: Cracking / Spalling / Corrosion / Scour / Deformation / Settlement / Other','TfNSW BIM §5; Austroads B-CIIMS Defect Catalogue','Inspection Record'],
  ['defectDescription','Defect Description','String','500','Yes','Detailed description of the observed defect including extent and location','TfNSW BIM §5','Inspection Record'],
  ['bridgeElement','Bridge Element','String','40','Yes','Primary structural element affected: Deck / Main Girder / Cross-Girder / Pier / Abutment / Bearing / Foundation','TfNSW BIM §5; Austroads B-CIIMS Element Classification','Inspection Record'],
  ['spanNumber','Span Number','Integer','','','Span in which the defect is located (1 = first span from origin)','TfNSW BIM §5','Inspection Record'],
  ['pierNumber','Pier Number','Integer','','','Pier number associated with the defect (if applicable)','TfNSW BIM §5','Inspection Record'],
  ['face','Face','String','60','','Face of the element where defect is located (e.g. North soffit, Upstream face, Deck surface)','TfNSW BIM §5','Inspection Record'],
  ['severity','Severity (1–4)','Integer','','Yes','Defect severity: 1=Negligible, 2=Minor, 3=Moderate, 4=Critical (TfNSW BIM scale)','TfNSW BIM §5.3; Austroads B-CIIMS','Inspection Record'],
  ['urgency','Urgency (1–4)','Integer','','Yes','Urgency of repair required: 1=Monitor, 2=Routine, 3=Priority, 4=Urgent/Immediate','TfNSW BIM §5.3; Austroads B-CIIMS','Inspection Record'],
  ['dimensionLengthMm','Defect Length (mm)','Decimal','8,2','','Measured length of the defect in millimetres','TfNSW BIM §5','Inspection Record'],
  ['dimensionWidthMm','Defect Width (mm)','Decimal','8,2','','Measured width of the defect in millimetres','TfNSW BIM §5','Inspection Record'],
  ['dimensionDepthMm','Defect Depth (mm)','Decimal','8,2','','Measured depth of the defect in millimetres (e.g. crack depth, spall depth)','TfNSW BIM §5','Inspection Record'],
  ['remediationStatus','Remediation Status','String','20','','Current repair status: Open / In Progress / Completed / Deferred / Monitoring','TfNSW BIM; TfNSW Maintenance Management','BMS'],
  ['estimatedRepairCost','Estimated Repair Cost ($)','Decimal','12,2','','Estimated cost to repair the defect in AUD — used in maintenance budgeting','TfNSW Asset Management; ISO 55000','BMS / Engineering'],
  ['plannedRemediationDate','Planned Remediation Date','Date','','','Target date for defect repair or remediation action','TfNSW Maintenance Management','BMS'],
  ['s4NotificationId','S/4 Notification ID','String','40','','SAP S/4HANA PM Notification number raised for this defect','SAP S/4HANA PM','SAP S/4HANA'],
  ['s4OrderId','S/4 Work Order ID','String','40','','SAP S/4HANA maintenance work order created to rectify the defect','SAP S/4HANA PM','SAP S/4HANA'],
  ['s4SyncStatus','S/4 Sync Status','String','20','','Integration sync state: NOT_SYNCED / SYNCED / ERROR','SAP S/4HANA Integration','BMS Integration'],
];

const ELEMENTS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the parent bridge','Internal','BMS'],
  ['elementId','Element ID','String','40','Yes','Unique identifier for the bridge element within its parent bridge','TfNSW BIM; Austroads B-CIIMS Element Hierarchy','BMS'],
  ['elementType','Element Type','String','40','Yes','Primary type: Deck / Main Girder / Cross-Girder / Diaphragm / Pier / Abutment / Bearing / Expansion Joint / Pile / Foundation','TfNSW BIM §5; Austroads B-CIIMS','BMS Lookup'],
  ['elementName','Element Name','String','111','Yes','Descriptive name combining type and location (e.g. Span 2 North Main Girder)','TfNSW BIM §5','BMS'],
  ['spanNumber','Span Number','Integer','','','Span in which this element is located','TfNSW BIM §5','BMS'],
  ['pierNumber','Pier Number','Integer','','','Pier or support number (if applicable)','TfNSW BIM §5','BMS'],
  ['material','Material','String','60','','Element material: RC / PSC / Steel / Timber / Masonry / Aluminium','AS 5100.3; AS 5100.5; TfNSW BIM','Design Drawings'],
  ['currentConditionRating','Condition Rating (1–5)','Integer','','','TfNSW 1–5 condition rating for this element: 1=Good, 5=Critical','TfNSW BIM §5.3; Austroads B-CIIMS','Principal Inspection'],
  ['conditionTrend','Condition Trend','String','20','','Condition trend since last rating: Improving / Stable / Deteriorating / RapidDeterioration','Austroads AP-G71 §5.5; TfNSW BIM','BMS Computed'],
  ['maintenanceRequired','Maintenance Required','Boolean','','','Flags the element as requiring maintenance action','TfNSW Maintenance Management; ISO 55000','Principal Inspection'],
  ['urgencyLevel','Urgency Level','String','20','','Maintenance urgency: Monitor / Routine / Priority / Urgent — aligned to defect urgency codes','TfNSW BIM §5.3','Principal Inspection'],
  ['estimatedRepairCost','Estimated Repair Cost ($)','Decimal','12,2','','Estimated cost to maintain or repair this element in AUD','TfNSW Asset Management; ISO 55000','BMS / Engineering'],
  ['s4EquipmentNumber','S/4 Equipment Number','String','18','','SAP S/4HANA equipment number for this sub-element if independently managed in EAM','SAP S/4HANA EAM; ISO 14224','SAP S/4HANA'],
];

const NHVR_ASSESSMENTS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge being assessed','Internal','BMS'],
  ['assessmentId','Assessment ID','String','50','Yes','NHVR-assigned or internal unique identifier for this route assessment','NHVR HVNL §§154–157; PBS Standards','NHVR Portal'],
  ['assessorName','Assessor Name','String','100','Yes','Name of the NHVR accredited route assessor','NHVR Accredited Assessor Program','NHVR Portal'],
  ['assessorAccreditationNo','Assessor Accreditation Number','String','50','Yes','NHVR accreditation number for the route assessor','NHVR Accredited Assessor Program','NHVR Portal'],
  ['assessmentDate','Assessment Date','Date','','Yes','Date the NHVR route assessment was completed','NHVR HVNL §§154–157','NHVR Portal'],
  ['assessmentStatus','Assessment Status','String','20','','Current / Expired / Superseded — drives compliance reporting','NHVR PBS Standards','BMS'],
  ['approvedVehicleClasses','Approved Vehicle Classes','LargeString','','','JSON list of approved vehicle configurations and PBS levels','NHVR HVNL; PBS Standards','NHVR Portal'],
  ['conditions','Assessment Conditions','LargeString','','','Special conditions, speed limits or route restrictions attached to the approval','NHVR HVNL §§154–157','NHVR Portal'],
  ['iapRequired','IAP Required','Boolean','','','Indicates the approved route requires Intelligent Access Program telematics monitoring','NHVR HVNL §§184–208 (IAP)','NHVR Portal'],
  ['iapRouteId','IAP Route ID','String','50','','NHVR IAP route identifier — links bridge assessment to the IAP telematics route','NHVR HVNL §§184–208','NHVR Portal'],
  ['nhvrSubmissionRef','NHVR Submission Reference','String','50','','NHVR online portal submission reference number','NHVR Portal Submission System','NHVR Portal'],
  ['validFrom','Valid From','Date','','Yes','Date from which this assessment is valid','NHVR HVNL §§154–157','NHVR Portal'],
  ['validTo','Valid To','Date','','','Date this assessment expires — alerts at 90/60/30 days','NHVR HVNL §§154–157','NHVR Portal'],
];

const SCOUR_DETAIL = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge being assessed','Internal','BMS'],
  ['assessmentDate','Assessment Date','Date','','Yes','Date the scour assessment was conducted','Austroads AP-G71.8; TfNSW Scour Management Guideline','Scour Assessment'],
  ['hydraulicModelRef','Hydraulic Model Reference','String','50','','Reference to the hydrological/hydraulic model used in the assessment','Austroads AP-G71.8 §3; NSW Flood Risk Manual','Hydrology Report'],
  ['velocityAtDesignFloodMs','Velocity at Design Flood (m/s)','Decimal','6,2','','Water velocity at the bridge opening for the design flood event (m/s)','Austroads AP-G71.8 §3.3','Hydraulic Model'],
  ['scourType','Scour Type','String','30','','Classification: General Scour / Local Scour / Lateral Migration / Degradation / Contraction Scour','Austroads AP-G71.8 §3.1','Scour Assessment'],
  ['ap71ScoreNumeric','AP-G71 Scour Score (1–5)','Integer','','','Austroads AP-G71.8 five-point scour vulnerability score: 1=Very Low to 5=Very High','Austroads AP-G71.8 §4 Table 4.1','Scour Assessment'],
  ['scourRiskCategoryAp71','AP-G71 Risk Category','String','20','','Risk category label from AP-G71.8: Very Low / Low / Medium / High / Very High','Austroads AP-G71.8 §4','BMS Computed'],
  ['countermeasureEffectivenessRating','Countermeasure Effectiveness','String','20','','Rating of installed scour countermeasures: Effective / Partially Effective / Ineffective / None','Austroads AP-G71.8 §5.4','Scour Assessment'],
  ['recommendedAction','Recommended Action','String','500','','Engineer recommendation for scour monitoring, countermeasure or bridge strengthening','Austroads AP-G71.8 §5.5','Scour Assessment'],
  ['nextAssessmentDate','Next Assessment Date','Date','','','Date by which the next scour assessment must be completed','Austroads AP-G71.8 §5.2','Scour Assessment'],
];

const ALERTS = [
  H,
  ['bridge','Bridge','Association','','Yes','Foreign key to the bridge this alert relates to','Internal','BMS'],
  ['alertType','Alert Type','String','40','Yes','Category: GazetteExpiry / PBSExpiry / HMLExpiry / LRCExpiry / InspectionOverdue / ScourCritical / ConditionCritical / DefectUrgent','BMS Alert Framework','BMS Engine'],
  ['alertTitle','Alert Title','String','200','Yes','Short title describing the alert event','Internal','BMS Engine'],
  ['severity','Severity','String','20','','Info / Warning / Critical — determines notification urgency and colour coding','BMS Alert Framework; TfNSW Risk Matrix','BMS Engine'],
  ['priority','Priority (1–5)','Integer','','','Priority ranking 1=Highest to 5=Lowest — used for alert queue ordering','TfNSW Risk Management','BMS Engine'],
  ['triggeredDate','Triggered Date','DateTime','','Yes','Date/time the alert condition was first detected','BMS Alert Framework','BMS Engine'],
  ['dueDate','Due Date','Date','','','Date by which the alert must be acted upon or acknowledged','BMS Alert Framework','BMS Engine'],
  ['status','Status','String','20','','Lifecycle: Open / Acknowledged / Resolved / Suppressed','BMS Alert Framework','BMS'],
  ['acknowledgedBy','Acknowledged By','String','111','','User who acknowledged the alert','BMS / RBAC','BMS'],
  ['resolvedBy','Resolved By','String','111','','User who marked the alert as resolved','BMS / RBAC','BMS'],
  ['resolutionNote','Resolution Note','LargeString','','','Description of action taken to resolve the alert','BMS Alert Framework','BMS'],
  ['suppressedUntil','Suppressed Until','Date','','','Date until which the alert is suppressed — used for planned outages or known deferrals','BMS Alert Framework','BMS'],
  ['emailNotificationSent','Email Notification Sent','Boolean','','','Indicates an email notification has been dispatched for this alert','BMS Notification Service','BMS Engine'],
];

const LOOKUPS = [
  ['Lookup Table', 'Codes', 'Description', 'Controlling Standard'],
  ['AssetClasses', 'Road Bridge, Rail Bridge, Pedestrian Bridge, Shared Path Bridge, Culvert, Viaduct', 'Primary use classification of the structure', 'Austroads AGBT; TfNSW Bridge Register'],
  ['ConditionStates', '1=Good, 2=Fair, 3=Poor, 4=Very Poor, 5=Critical', 'TfNSW 5-point condition scale used for all formal condition ratings', 'TfNSW Bridge Inspection Manual (BIM) §3.1; Austroads B-CIIMS'],
  ['ConditionSummaries', 'Good, Fair, Poor, VeryPoor, Critical, Unknown', 'Grouped condition aligned to TfNSW 1–5 scale — replaces old Excellent/VeryGood/Failed codes', 'TfNSW BIM §3.1'],
  ['ConditionTrends', 'Improving, Stable, Deteriorating, RapidDeterioration', 'Change in condition since previous inspection — drives maintenance escalation', 'Austroads AP-G71 §5.5; TfNSW BIM'],
  ['PostingStatuses', 'Unrestricted, Under Review, Restricted, Closed', 'Bridge posting status lifecycle — ordered from no restriction to full closure', 'NSW Roads Act 1993 §§121–124; AS 1742.10'],
  ['InspectionTypes', 'RoutineVisual, Principal, PostEvent, SpecialScour, Underwater, LoadRating, NDT', 'Ordered by inspection frequency — Routine most common, NDT least frequent', 'TfNSW BIM §4; Austroads B-CIIMS'],
  ['DesignLoads', 'T44, W80, A160, SM1600, AS5100_GP, AS5100_HP, HLP400, CooperE, UIC60, AS7613', 'Design load models ordered by road loads first then rail; generic AS5100 removed (redundant with GP/HP variants)', 'AS 5100.2; Austroads Bridge Design Code'],
  ['PbsApprovalClasses', 'General Access, Level 1–5, Not Assessed', 'PBS approval hierarchy — General Access = no permit; Level 1–5 = increasing vehicle combinations', 'NHVR HVNL; PBS Standards; NHVR Approved Network'],
  ['VehicleClasses', 'AllVehicles, LightVehicle, HeavyVehicle, BDouble, RoadTrain, PBS1–PBS4, HML, CML, OversizeOvermass, Pedestrian', 'Expanded from 5 to 13 classes — now covers full NHVR vehicle classification spectrum', 'NHVR HVNL §38; PBS Standards; HVNL §§96–99'],
  ['StructureTypes', '17 types — from BeamBridge to Movable', 'Expanded from 5 to 17 types — now covers common Australian bridge forms including T-Girder, Slab, Portal, Timber, Culvert', 'AS 5100.1; AS 5100.3; Austroads AGBT; TfNSW Timber Bridge Manual'],
  ['ScourRiskLevels', 'VeryLow, Low, Medium, High, VeryHigh', '5-point Austroads AP-G71.8 scour risk scale — drives inspection frequency and countermeasure requirements', 'Austroads AP-G71.8 §4'],
  ['FoundationTypes', 'PileSteel, PileConcrete, PileTimber, SpreadFooting, RockBearing, Caisson, WellFoundation, Raft', 'Foundation classification — drives scour vulnerability and geotechnical inspection scope', 'AS 5100.3; Austroads AP-G71.8 §4'],
  ['WaterwayTypes', 'River, Creek, Tidal, DrainageChannel, FloodPlain, LakeReservoir, DryGully, Overpass', 'Waterway classification — determines applicable scour mechanisms and inspection requirements', 'Austroads AP-G71.8 §3; NSW Flood Risk Manual'],
  ['SubstructureTypes', 'SingleSpanAbutment, MultiSpanPier, IntegralAbutment, SemiIntegral, CantileverRetaining, BankSeat, Culvert', 'Substructure configuration — affects load path, scour exposure and maintenance approach', 'AS 5100.3; AP-G71.8 §4'],
  ['SurfaceTypes', 'Asphalt, Concrete, OpenGrating, TimberDecking, CompositeOverlay, EpoxyOverlay, NoSurface', 'Deck wearing surface — affects posted width restriction and maintenance scope', 'Austroads Pavement Design Guide; AS 5100.4'],
  ['FatigueDetailCategories', 'A through G (best to worst)', 'AS 5100.6 §13.5 weld detail categories — governs allowable fatigue stress range for steel bridges', 'AS 5100.6 §13.5 Table 13.5.1'],
  ['RestrictionTypes', 'Mass Limit, Dimension Limit, Speed Restriction, Access Restriction', 'Four primary restriction categories — covers the full range of bridge posting types in NSW', 'NSW Roads Act 1993 §121; AS 1742.10'],
  ['RestrictionStatuses', 'Draft, Active, Suspended, Retired', 'Restriction lifecycle ordered from preparation to retirement', 'NSW Roads Act 1993 §121–124'],
  ['RestrictionCategories', 'Permanent, Temporary', 'Duration classification — determines whether effectiveTo date is mandatory', 'NSW Roads Act 1993 §121'],
  ['RestrictionDirections', 'Both Directions, Northbound, Southbound, Eastbound, Westbound', 'Directional applicability of a restriction', 'AS 1742.10; NSW Gazette'],
  ['RestrictionUnits', 't, m, km/h, approval', 'Unit of measurement for restriction values', 'NHVR HVNL; AS 1742.10'],
  ['States', 'NSW, VIC, QLD, SA, WA, TAS, NT, ACT', 'Australian states and territories — reordered to ABS standard geographical sequence', 'ISO 3166-2:AU; ABS State Standard'],
  ['Regions', '23 regions covering all 8 states/territories', 'Expanded from 6 (NSW/VIC/QLD/TAS only) to 23 regions covering all states — Perth, Adelaide, Darwin, ACT now included', 'TfNSW Regional Delivery Plan; Agency Administrative Regions'],
  ['CapacityStatuses', 'Current, Under Review, Superseded, Expired', 'Load capacity assessment status lifecycle', 'AS 5100.7; TfNSW LRC Policy'],
];

// ── Build workbook ────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, buildSheet(BRIDGES_CORE),        'Bridges — Core Fields');
XLSX.utils.book_append_sheet(wb, buildSheet(BRIDGES_EXT),         'Bridges — Extended Fields');
XLSX.utils.book_append_sheet(wb, buildSheet(RESTRICTIONS),        'Restrictions');
XLSX.utils.book_append_sheet(wb, buildSheet(LOAD_RATINGS),        'Load Rating Certificates');
XLSX.utils.book_append_sheet(wb, buildSheet(RISK_ASSESSMENTS),    'Risk Assessments');
XLSX.utils.book_append_sheet(wb, buildSheet(INSPECTIONS),         'Inspections');
XLSX.utils.book_append_sheet(wb, buildSheet(DEFECTS),             'Defects');
XLSX.utils.book_append_sheet(wb, buildSheet(ELEMENTS),            'Bridge Elements');
XLSX.utils.book_append_sheet(wb, buildSheet(NHVR_ASSESSMENTS),    'NHVR Route Assessments');
XLSX.utils.book_append_sheet(wb, buildSheet(SCOUR_DETAIL),        'Scour Assessments');
XLSX.utils.book_append_sheet(wb, buildSheet(ALERTS),              'Alerts & Notifications');
XLSX.utils.book_append_sheet(wb, buildSheet(LOOKUPS),             'Lookup Tables (Dropdowns)');

XLSX.writeFile(wb, OUT);
console.log('Written:', OUT);
