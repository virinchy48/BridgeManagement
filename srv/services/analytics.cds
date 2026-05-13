using { bridge.management as bm } from '../../db/schema';

@path: '/analytics/v1'
@requires: ['view','inspect','manage','admin','executive_view']
service AnalyticsService {

  // ── 1. BridgePortfolio ─────────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity BridgePortfolio as SELECT from bm.Bridges as b
    left join bm.AssetIQScores as s on s.bridge.ID = b.ID {
      key b.bridgeId         @Analytics.Dimension,
      b.bridgeName           @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      b.lga                  @Analytics.Dimension,
      b.structureType        @Analytics.Dimension,
      b.material             @Analytics.Dimension,
      b.assetClass           @Analytics.Dimension,
      b.postingStatus        @Analytics.Dimension,
      b.designLoad           @Analytics.Dimension,
      b.assetOwner           @Analytics.Dimension,
      b.managingAuthority    @Analytics.Dimension,
      b.condition            @Analytics.Dimension,
      case b.importanceLevel
        when 1 then 'Critical'
        when 2 then 'Essential'
        when 3 then 'Important'
        when 4 then 'Ordinary'
        else        'Unknown'
      end as importanceLevelText : String(20)  @Analytics.Dimension,
      case
        when b.conditionRating >= 9 then 'Excellent'
        when b.conditionRating >= 7 then 'Good'
        when b.conditionRating >= 5 then 'Satisfactory'
        when b.conditionRating >= 3 then 'Fair'
        when b.conditionRating >= 1 then 'Critical'
        else                             'Unknown'
      end as conditionBand : String(20)         @Analytics.Dimension,
      s.ragStatus            @Analytics.Dimension,
      case when b.nhvrAssessed = true then 'Yes' else 'No' end
        as nhvrAssessedFlag : String(3)          @Analytics.Dimension,
      case when b.freightRoute = true then 'Yes' else 'No' end
        as freightRouteFlag : String(3)          @Analytics.Dimension,
      case when b.highPriorityAsset = true then 'Yes' else 'No' end
        as highPriorityFlag : String(3)          @Analytics.Dimension,
      b.conditionRating,
      b.structuralAdequacyRating,
      b.yearBuilt,
      (2026 - b.yearBuilt)  as ageYears : Integer,
      b.totalLength,
      b.deckWidth,
      b.spanCount,
      b.numberOfLanes,
      b.clearanceHeight,
      b.averageDailyTraffic,
      b.heavyVehiclePercent,
      s.overallScore         as assetIQScore
    } where b.isActive = true;


  // ── 2. InspectionHistory ───────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity InspectionHistory as SELECT from bm.BridgeInspections as i
    left join bm.Bridges as b on i.bridge.ID = b.ID {
      key i.inspectionRef    @Analytics.Dimension,
      b.bridgeId             @Analytics.Dimension,
      b.bridgeName           @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      i.inspectionType       @Analytics.Dimension,
      i.inspector            @Analytics.Dimension,
      i.inspectorAccreditationLevel @Analytics.Dimension,
      case when i.criticalFindings = true then 'Yes' else 'No' end
        as criticalFindings : String(3)          @Analytics.Dimension,
      case when i.active = true then 'Yes' else 'No' end
        as activeFlag : String(3)                @Analytics.Dimension,
      i.inspectionDate       @Analytics.Dimension,
      i.overallConditionRating,
      year(i.inspectionDate) as inspectionYear : Integer
    } where i.active = true;


  // ── 3. DefectRegister ──────────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity DefectRegister as SELECT from bm.BridgeDefects as d
    left join bm.Bridges as b on d.bridge.ID = b.ID {
      key d.defectId         @Analytics.Dimension,
      b.bridgeId             @Analytics.Dimension,
      b.bridgeName           @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      d.defectType           @Analytics.Dimension,
      d.bridgeElement        @Analytics.Dimension,
      case d.severity
        when 1 then 'Low'
        when 2 then 'Medium'
        when 3 then 'High'
        when 4 then 'Critical'
        else        'Unknown'
      end as severityLabel : String(20)          @Analytics.Dimension,
      case d.urgency
        when 1 then 'Low'
        when 2 then 'Medium'
        when 3 then 'High'
        when 4 then 'Critical'
        else        'Unknown'
      end as urgencyLabel : String(20)           @Analytics.Dimension,
      d.remediationStatus    @Analytics.Dimension,
      d.maintenancePriority  @Analytics.Dimension,
      case when d.active = true then 'Yes' else 'No' end
        as activeFlag : String(3)                @Analytics.Dimension,
      d.severity,
      d.urgency
    } where d.active = true;


  // ── 4. RiskRegister ────────────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity RiskRegister as SELECT from bm.BridgeRiskAssessments as r
    left join bm.Bridges as b on r.bridge.ID = b.ID {
      key r.assessmentId     @Analytics.Dimension,
      b.bridgeId             @Analytics.Dimension,
      b.bridgeName           @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      r.riskCategory         @Analytics.Dimension,
      r.riskType             @Analytics.Dimension,
      r.inherentRiskLevel    @Analytics.Dimension,
      r.residualRiskLevel    @Analytics.Dimension,
      r.riskRegisterStatus   @Analytics.Dimension,
      r.treatmentStatus      @Analytics.Dimension,
      case when r.active = true then 'Yes' else 'No' end
        as activeFlag : String(3)                @Analytics.Dimension,
      r.likelihood,
      r.consequence,
      r.inherentRiskScore,
      r.residualLikelihood,
      r.residualConsequence,
      r.residualRiskScore
    } where r.active = true;


  // ── 5. AssetHealthScores ───────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity AssetHealthScores as SELECT from bm.AssetIQScores as s
    left join bm.Bridges as b on s.bridge.ID = b.ID {
      key b.bridgeId         @Analytics.Dimension,
      b.bridgeName           @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      b.structureType        @Analytics.Dimension,
      s.ragStatus            @Analytics.Dimension,
      case
        when b.conditionRating >= 9 then 'Excellent'
        when b.conditionRating >= 7 then 'Good'
        when b.conditionRating >= 5 then 'Satisfactory'
        when b.conditionRating >= 3 then 'Fair'
        when b.conditionRating >= 1 then 'Critical'
        else                             'Unknown'
      end as conditionBand : String(20)          @Analytics.Dimension,
      s.overallScore,
      s.bciFactor,
      s.ageFactor,
      s.trafficFactor,
      s.defectFactor,
      s.loadFactor,
      b.conditionRating,
      b.yearBuilt
    } where b.isActive = true;


  // ── 6. NetworkKPIs ─────────────────────────────────────────────────────────
  @readonly
  @Analytics.dataCategory: #CUBE
  entity NetworkKPIs as SELECT from bm.Bridges as b
    left join bm.AssetIQScores as s on s.bridge.ID = b.ID {
      key b.bridgeId         @Analytics.Dimension,
      b.state                @Analytics.Dimension,
      b.region               @Analytics.Dimension,
      b.structureType        @Analytics.Dimension,
      b.postingStatus        @Analytics.Dimension,
      case
        when b.conditionRating >= 9 then 'Excellent'
        when b.conditionRating >= 7 then 'Good'
        when b.conditionRating >= 5 then 'Satisfactory'
        when b.conditionRating >= 3 then 'Fair'
        when b.conditionRating >= 1 then 'Critical'
        else                             'Unknown'
      end as conditionBand : String(20)          @Analytics.Dimension,
      s.ragStatus            @Analytics.Dimension,
      b.totalLength,
      b.conditionRating,
      b.averageDailyTraffic,
      s.overallScore         as assetIQScore
    } where b.isActive = true;

}

// ── Aggregation annotations (separate blocks — #enum not supported inline) ──

annotate AnalyticsService.BridgePortfolio with {
  conditionRating        @Aggregation.default: #MIN;
  structuralAdequacyRating @Aggregation.default: #MIN;
  yearBuilt              @Aggregation.default: #MIN;
  ageYears               @Aggregation.default: #MIN;
  totalLength            @Aggregation.default: #MIN;
  deckWidth              @Aggregation.default: #MIN;
  spanCount              @Aggregation.default: #MIN;
  numberOfLanes          @Aggregation.default: #MIN;
  clearanceHeight        @Aggregation.default: #MIN;
  averageDailyTraffic    @Aggregation.default: #MIN;
  heavyVehiclePercent    @Aggregation.default: #MIN;
  assetIQScore           @Aggregation.default: #MIN;
}

annotate AnalyticsService.InspectionHistory with {
  overallConditionRating @Aggregation.default: #MIN;
  inspectionYear         @Aggregation.default: #MIN;
}

annotate AnalyticsService.DefectRegister with {
  severity               @Aggregation.default: #MIN;
  urgency                @Aggregation.default: #MIN;
}

annotate AnalyticsService.RiskRegister with {
  likelihood             @Aggregation.default: #MIN;
  consequence            @Aggregation.default: #MIN;
  inherentRiskScore      @Aggregation.default: #MIN;
  residualLikelihood     @Aggregation.default: #MIN;
  residualConsequence    @Aggregation.default: #MIN;
  residualRiskScore      @Aggregation.default: #MIN;
}

annotate AnalyticsService.AssetHealthScores with {
  overallScore           @Aggregation.default: #MIN;
  bciFactor              @Aggregation.default: #MIN;
  ageFactor              @Aggregation.default: #MIN;
  trafficFactor          @Aggregation.default: #MIN;
  defectFactor           @Aggregation.default: #MIN;
  loadFactor             @Aggregation.default: #MIN;
  conditionRating        @Aggregation.default: #MIN;
  yearBuilt              @Aggregation.default: #MIN;
}

annotate AnalyticsService.NetworkKPIs with {
  totalLength            @Aggregation.default: #MIN;
  conditionRating        @Aggregation.default: #MIN;
  averageDailyTraffic    @Aggregation.default: #MIN;
  assetIQScore           @Aggregation.default: #MIN;
}
