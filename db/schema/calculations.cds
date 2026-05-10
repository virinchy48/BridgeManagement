namespace hastha.bridge.calculations;

/**
 * BHI Calculation Result — stored on BridgeInspection after compute.
 * Formula v2.1 — AS 5100.7 structural significance weights.
 * Reference: srv/lib/bhi-calculator.js
 */
type BHIResult {
  score              : Decimal(5,2);
  conditionBand      : String(20);   // EXCELLENT | GOOD | FAIR | POOR | CRITICAL
  calculationVersion : String(10);   // "v2.1"
  calculatedAt       : Timestamp;
  calculatedBy       : String(50);   // "AUTO" | user ID
}

/**
 * BSI — Bridge Sufficiency Index (FHWA-aligned, adapted for AU).
 * Composite of structural adequacy (55%), serviceability (30%), essentiality (15%).
 * Reference: srv/lib/bsi-calculator.js
 */
type BSIResult {
  score              : Decimal(5,2);
  structuralAdequacy : Decimal(5,2);
  serviceability     : Decimal(5,2);
  essentiality       : Decimal(5,2);
  deficiencyFlag     : Boolean;      // score < 50 = structurally deficient
  calculationVersion : String(10);   // "v1.0"
  calculatedAt       : Timestamp;
}
