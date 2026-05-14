namespace bridge.management;
using { managed } from '@sap/cds/common';

entity Bridges : managed {
  key ID           : Integer;
      descr        : String(2000);
      bridgeId     : String(40);
      bridgeName   : String(111) @mandatory;
      assetClass   : String(40);
      route        : String(111);
      state        : String(40) @mandatory;
      region       : String(80);
      lga          : String(111);
      routeNumber  : String(40);
      latitude     : Decimal(9,6)  @mandatory @assert.range: [-44, -10];   // GDA2020 — Australia bounding box
      longitude    : Decimal(10,6) @mandatory @assert.range: [112, 154];   // GDA2020 — Australia bounding box
      location     : String(255);
      assetOwner   : String(111) @mandatory;
      managingAuthority : String(111);
      structureType : String(60);
      yearBuilt    : Integer @assert.range: [1800, 2100];
      designLoad   : String(40);
      designStandard : String(111);
      clearanceHeight : Decimal(9,2);
      spanLength   : Decimal(9,2);
      material     : String(60);
      spanCount    : Integer;
      totalLength  : Decimal(9,2);
      deckWidth    : Decimal(9,2);
      numberOfLanes : Integer;
      condition    : String(40);
      conditionRating : Integer @assert.range: [1, 10];
      structuralAdequacyRating : Integer @assert.range: [1, 10];
      postingStatus : String(40);
      conditionStandard : String(111);
      seismicZone  : String(40);
      asBuiltDrawingReference : String(111);
      scourDepthLastMeasured : Decimal(9,2);
      floodImmunityAriYears : Integer;
      floodImpacted : Boolean;
      highPriorityAsset : Boolean;
      remarks      : LargeString;
      status       : String(40);
      scourRisk    : String(20);
      lastInspectionDate : Date;
      nhvrAssessed : Boolean;
      nhvrAssessmentDate : Date;
      loadRating   : Decimal(9,2);
      pbsApprovalClass : String(40);
      importanceLevel : Integer @assert.range: [1, 4];
      averageDailyTraffic : Integer;
      heavyVehiclePercent : Decimal(5,2) @assert.range: [0, 100];
      gazetteReference : String(111);
      nhvrReferenceUrl : String(255);
      freightRoute : Boolean;
      overMassRoute : Boolean;
      hmlApproved  : Boolean;
      bDoubleApproved : Boolean;
      dataSource   : String(111);
      sourceReferenceUrl : String(255);
      openDataReference : String(255);
      sourceRecordId : String(111);
      geoJson      : LargeString;
      conditionSummary    : String(60);
      conditionAssessor   : String(111);
      conditionReportRef  : String(111);
      structuralAdequacy  : String(40);
      conditionNotes      : LargeString;
      inspectionType          : String(40);
      inspectionFrequencyYears : Integer;
      nextInspectionDue       : Date;
      conditionTrend          : String(20);
      surfaceType             : String(40);
      substructureType        : String(40);
      foundationType          : String(40);
      waterwayType            : String(40);
      pbsApprovalDate         : Date;
      pbsApprovalExpiry       : Date;
      hmlApprovalDate         : Date;
      hmlApprovalExpiry       : Date;
      gazetteEffectiveDate    : Date;
      gazetteExpiryDate       : Date;
      postingStatusReason     : String(200);
      isActive                : Boolean default true;
      isDeleted               : Boolean default false;
      // ── WA/Interstate dataset fields (gaps identified May 2026) ──────────────
      precinct                : String(80);    // Zone/Precinct subdivision within region (WA: ZONE/PRECINCT)
      spansOver               : String(255);   // What the bridge crosses: river name, road, railway (WA: DESCRIPTION_OVER)
      locality                : String(111);   // Suburb/locality of bridge location (WA: DESCRIPTION_AT)
      facilityTypeCode        : String(40);    // Facility type code — road bridge, rail, pedestrian (WA: FACI_TYPE_CODE)
      operationalStatusCode   : String(40);    // Operational status code from source system (WA: OPER_STAT_CODE)
      structuralDeficiencyCode : String(40);   // Structural deficiency classification code (WA: STRUCT_DEFIC_CODE)
      deficiencyComments      : LargeString;   // Deficiency-specific notes, separate from general remarks (WA: DEFICIENCY COMMENTS)
      loadLimitTruck          : Decimal(9,2);  // Denormalised truck load limit t — also in BridgeRestrictions (WA: LOAD_LMT_TRUCK)
      loadLimitSemitrailer    : Decimal(9,2);  // Denormalised semi-trailer load limit t (WA: LOAD_LMT_SEMITRL)
      // Virtual fields populated server-side for UI KPI chips — never persisted
      virtual postingStatusCriticality : Integer;
      virtual activeRestrictionCount   : Integer default 0;
      virtual activeClosureCount       : Integer default 0;
      virtual bsiScore                 : Decimal(5,2);
      virtual bsiWidthRating           : Integer;
      virtual bsiBarrierRating         : Integer;
      virtual bsiRouteAltRating        : Integer;
      virtual bhi                      : Decimal(5,2);
      virtual nbi                      : Decimal(5,2);
}
