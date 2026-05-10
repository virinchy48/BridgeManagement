sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (JSONModel, MessageToast) {
  "use strict";

  var SERVICE = "/odata/v4/admin";

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getHost(control) {
    var current = control;
    while (current && !(current.isA && current.isA("sap.m.VBox"))) {
      current = current.getParent && current.getParent();
    }
    return current || control;
  }

  function getModel(host) {
    var model = host.getModel("executiveKpi");
    if (!model) {
      model = new JSONModel({
        busy: false,
        bridgeId: null,
        // Condition
        conditionRating: 0,
        conditionTrend: "",
        conditionColor: "Neutral",
        conditionIndicator: "None",
        // Defects
        openDefects: 0,
        criticalDefectsText: "",
        defectsColor: "Neutral",
        // Inspection
        daysSinceInspection: 0,
        lastInspectionDateFormatted: "",
        inspectionColor: "Neutral",
        // Restrictions
        activeRestrictions: 0,
        // Load rating
        lrcExpiryDays: 0,
        lrcStatusText: "",
        lrcColor: "Neutral",
        // Risk
        riskLevel: "Unknown",
        riskState: "None",
        // Lists
        conditionHistory: [],
        restrictionsSummary: [],
        hasMoreRestrictions: false
      });
      host.setModel(model, "executiveKpi");
    }
    return model;
  }

  function getBridgeIdFromContext(host) {
    var ctx = host.getBindingContext && host.getBindingContext();
    if (ctx) {
      var id = ctx.getProperty && ctx.getProperty("ID");
      if (id != null) return String(id);
    }
    var m = (window.location.hash || "").match(/Bridges\(ID=(\d+)/);
    return m ? m[1] : null;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  }

  function daysBetween(isoStr) {
    if (!isoStr) return null;
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function conditionToColor(rating) {
    if (rating >= 8) return "Good";
    if (rating >= 5) return "Critical"; // amber — UI5 uses Critical for orange
    if (rating >= 3) return "Critical";
    return "Error";
  }

  function conditionToLabel(rating) {
    if (rating >= 8) return "Good";
    if (rating >= 5) return "Fair";
    if (rating >= 3) return "Poor";
    return "Critical";
  }

  function conditionToState(rating) {
    if (rating >= 8) return "Success";
    if (rating >= 5) return "Warning";
    return "Error";
  }

  function trendToIndicator(trend) {
    var map = { Improving: "Up", Deteriorating: "Down", RapidDeterioration: "Down", Stable: "None" };
    return map[trend] || "None";
  }

  function daysToColor(days, warningThreshold, errorThreshold) {
    if (days == null) return "Neutral";
    if (days > warningThreshold) return "Good";
    if (days > errorThreshold) return "Critical";
    return "Error";
  }

  function riskLevelToState(level) {
    var map = { Critical: "Error", High: "Error", Medium: "Warning", Low: "Success", Unknown: "None" };
    return map[level] || "None";
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  async function loadKpis(host) {
    var model = getModel(host);
    var bridgeId = getBridgeIdFromContext(host);
    if (!bridgeId) return;

    model.setProperty("/busy", true);

    try {
      // Parallel fetches for KPI data — all read from AdminService OData
      var [bridgeResp, inspResp, defResp, restrResp, lrcResp] = await Promise.all([
        // Bridge header fields
        fetch(SERVICE + "/Bridges(ID=" + bridgeId + ",IsActiveEntity=true)"
          + "?$select=conditionRating,conditionTrend,lastInspectionDate,nextInspectionDue"),
        // Last 5 inspections for condition trend list (direct entity query — no navigation)
        fetch(SERVICE + "/BridgeInspections"
          + "?$filter=bridge_ID eq " + bridgeId
          + "&$select=inspectionDate,inspector,inspectionType"
          + "&$orderby=inspectionDate desc&$top=5"),
        // Open defect count
        fetch(SERVICE + "/BridgeDefects"
          + "?$filter=bridge_ID eq " + bridgeId + " and remediationStatus eq 'Open'"
          + "&$count=true&$top=0"),
        // Active restrictions count + top 3 for summary list
        fetch(SERVICE + "/BridgeRestrictions"
          + "?$filter=bridge_ID eq " + bridgeId + " and active eq true"
          + "&$select=restrictionType,restrictionValue,restrictionUnit,appliesToVehicleClass"
          + "&$orderby=restrictionType&$top=4"),
        // Current load rating certificate
        fetch(SERVICE + "/LoadRatingCertificates"
          + "?$filter=bridge_ID eq " + bridgeId + " and status eq 'Current'"
          + "&$select=certificateExpiryDate,ratingLevel,status&$top=1")
      ]);

      var bridge = bridgeResp.ok ? await bridgeResp.json() : {};
      var inspData = inspResp.ok ? await inspResp.json() : { value: [] };
      var defData = defResp.ok ? await defResp.json() : { "@odata.count": 0 };
      var restrData = restrResp.ok ? await restrResp.json() : { value: [] };
      var lrcData = lrcResp.ok ? await lrcResp.json() : { value: [] };

      // Condition
      var rating = bridge.conditionRating || 0;
      var trend = bridge.conditionTrend || "Stable";
      model.setProperty("/conditionRating", rating);
      model.setProperty("/conditionTrend", trend);
      model.setProperty("/conditionColor", conditionToColor(rating));
      model.setProperty("/conditionIndicator", trendToIndicator(trend));

      // Inspection
      var days = daysBetween(bridge.lastInspectionDate);
      model.setProperty("/daysSinceInspection", days != null ? days : 0);
      model.setProperty("/lastInspectionDateFormatted", formatDate(bridge.lastInspectionDate));
      // Overdue if > 730 days (2 years default frequency)
      model.setProperty("/inspectionColor", daysToColor(days != null ? 730 - days : 0, 180, 0));

      // Defects
      var openDef = defData["@odata.count"] || 0;
      var critDef = (inspData.value || []).reduce(function (acc, insp) {
        return acc + (insp.defects || []).filter(function (d) { return d.severity >= 3 && d.remediationStatus === "Open"; }).length;
      }, 0);
      model.setProperty("/openDefects", openDef);
      model.setProperty("/criticalDefectsText", critDef > 0 ? critDef + " critical" : "None critical");
      model.setProperty("/defectsColor", openDef === 0 ? "Good" : critDef > 0 ? "Error" : "Critical");

      // Risk level derived from condition + defects
      var riskLevel = openDef > 5 || rating <= 2 ? "Critical"
        : openDef > 2 || rating <= 4 ? "High"
        : rating <= 6 ? "Medium" : "Low";
      model.setProperty("/riskLevel", riskLevel);
      model.setProperty("/riskState", riskLevelToState(riskLevel));

      // Restrictions
      var restrList = restrData.value || [];
      model.setProperty("/activeRestrictions", restrList.length);
      model.setProperty("/restrictionsSummary", restrList.slice(0, 3));
      model.setProperty("/hasMoreRestrictions", restrList.length > 3);

      // Load rating certificate
      var lrc = (lrcData.value || [])[0];
      if (lrc) {
        var expiryDays = daysBetween(lrc.certificateExpiryDate);
        var remaining = expiryDays != null ? -expiryDays : 0; // negative = days until expiry
        model.setProperty("/lrcExpiryDays", remaining > 0 ? remaining : 0);
        model.setProperty("/lrcStatusText", lrc.ratingLevel + " (" + (remaining > 0 ? "expires in " + remaining + " days" : "EXPIRED") + ")");
        model.setProperty("/lrcColor", remaining > 90 ? "Good" : remaining > 0 ? "Critical" : "Error");
      } else {
        model.setProperty("/lrcExpiryDays", 0);
        model.setProperty("/lrcStatusText", "No current certificate");
        model.setProperty("/lrcColor", "Error");
      }

      // Condition history list (last 5 inspections)
      var history = (inspData.value || []).map(function (insp) {
        var ratingVal = bridge.conditionRating; // bridge-level rating as proxy
        return {
          inspectionDateFormatted: formatDate(insp.inspectionDate),
          inspector: insp.inspector || "—",
          inspectionType: insp.inspectionType,
          conditionLabel: conditionToLabel(ratingVal),
          conditionState: conditionToState(ratingVal)
        };
      });
      model.setProperty("/conditionHistory", history);

    } catch (e) {
      // Graceful degradation — KPIs show 0 / unknown
      console.warn("[ExecutiveKpiPanel] KPI load failed:", e.message);
    } finally {
      model.setProperty("/busy", false);
    }
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  function scrollToSection(sectionIdFragment) {
    // Attempt to scroll the ObjectPage to the matching section
    var oPage = sap.ui.getCore().byId("BridgesDetailsList--fe::ObjectPage") ||
      sap.ui.getCore().byId("BridgesDetails--fe::ObjectPage");
    if (!oPage) return;
    var sections = oPage.getSections ? oPage.getSections() : [];
    var target = sections.find(function (s) { return s.getId && s.getId().includes(sectionIdFragment); });
    if (target) oPage.scrollToSection(target.getId());
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    onContextChange: function (oEvent) {
      var host = getHost(oEvent.getSource());
      loadKpis(host);
    },

    onConditionTilePress: function () {
      scrollToSection("ConditionInspections");
    },

    onDefectsTilePress: function () {
      scrollToSection("ConditionInspections");
    },

    onInspectionTilePress: function () {
      scrollToSection("ConditionInspections");
    },

    onRestrictionsTilePress: function () {
      scrollToSection("RestrictionsPermits");
    },

    onOpenFullRecord: function (oEvent) {
      // For Executive persona: switches userScopes to manager view and reloads sections
      // Emits an event picked up by BridgeDetailExt.js to show all sections
      var host = getHost(oEvent.getSource());
      var view = host;
      while (view && !(view.isA && view.isA("sap.ui.core.mvc.View"))) {
        view = view.getParent && view.getParent();
      }
      if (view) {
        var scopeModel = view.getModel("userScopes");
        if (scopeModel) {
          // Temporarily elevate to full view for this session (read-only)
          scopeModel.setProperty("/showFullRecord", true);
          MessageToast.show("Showing full bridge record (read-only)");
        }
      }
    }
  };
});
