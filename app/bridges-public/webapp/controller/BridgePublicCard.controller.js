sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageBox) {
  "use strict";

  var PUBLIC_SERVICE = "/public-bridge";

  // ── Formatters ─────────────────────────────────────────────────────────────

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr
      : d.toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return "—";
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr
      : d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatMeasure(val, unit) {
    if (val == null || val === "") return "—";
    return Number(val).toLocaleString("en-AU", { maximumFractionDigits: 1 }) + " " + unit;
  }

  function yesNo(bool) {
    return bool ? "Yes" : "No";
  }

  function yesNoState(bool) {
    return bool ? "Success" : "None";
  }

  function postingStatusToState(status) {
    var map = {
      Unrestricted: "Success",
      Restricted:   "Warning",
      "Under Review": "Warning",
      Closed:        "Error"
    };
    return map[status] || "None";
  }

  function postingStatusMessage(status) {
    var map = {
      Restricted:   "This bridge has active load restrictions. Check the restrictions section below before planning your route.",
      "Under Review": "The restriction status of this bridge is currently under review.",
      Closed:        "This bridge is currently closed to traffic."
    };
    return map[status] || "";
  }

  // ── URL query parameter extraction ─────────────────────────────────────────

  function getBridgeIdFromUrl() {
    // Support ?bridgeId=BRG-NSW-001 or hash #?bridgeId=BRG-NSW-001
    var search = window.location.search || (window.location.hash.split("?")[1] ? "?" + window.location.hash.split("?")[1] : "");
    var params = new URLSearchParams(search);
    return params.get("bridgeId") || params.get("id") || null;
  }

  // ── Controller ─────────────────────────────────────────────────────────────

  return Controller.extend("BridgeManagement.bridgespublic.controller.BridgePublicCard", {

    onInit: function () {
      var oModel = new JSONModel({
        busy: true,
        dataLoaded: false,
        notFound: false,
        // Bridge fields
        bridgeId: "",
        bridgeName: "",
        postingStatus: "",
        postingStatusState: "None",
        postingStatusMessage: "",
        postingStatusMessageType: "Information",
        showPostingBanner: false,
        region: "",
        lga: "",
        route: "",
        location: "",
        structureType: "",
        material: "",
        yearBuilt: "",
        totalLengthFormatted: "",
        deckWidthFormatted: "",
        numberOfLanes: "",
        hmlApprovedText: "",
        hmlApprovedState: "None",
        bDoubleApprovedText: "",
        bDoubleApprovedState: "None",
        pbsApprovalClass: "",
        lastInspectionDate: "",
        lastInspectionDateShort: "",
        nextInspectionDue: "",
        inspectionFrequency: "",
        restrictions: [],
        restrictionsSubtitle: "",
        footerTimestamp: ""
      });
      this.getView().setModel(oModel, "publicCard");
      this._loadBridge();
    },

    _loadBridge: async function () {
      var oModel = this.getView().getModel("publicCard");
      var bridgeId = getBridgeIdFromUrl();

      if (!bridgeId) {
        oModel.setProperty("/busy", false);
        oModel.setProperty("/notFound", true);
        return;
      }

      try {
        // Encode the bridgeId safely for the OData filter
        var encodedId = encodeURIComponent("'" + bridgeId.replace(/'/g, "''") + "'");
        var bridgeUrl = PUBLIC_SERVICE + "/PublicBridges?$filter=bridgeId eq " + encodedId + "&$top=1";
        var restrUrl = PUBLIC_SERVICE + "/PublicRestrictions?$filter=bridgeId eq " + encodedId + "&$orderby=restrictionType";

        var [bridgeResp, restrResp] = await Promise.all([
          fetch(bridgeUrl),
          fetch(restrUrl)
        ]);

        if (!bridgeResp.ok) throw new Error("Bridge service error: " + bridgeResp.status);

        var bridgeData = await bridgeResp.json();
        var restrData = restrResp.ok ? await restrResp.json() : { value: [] };

        var bridge = (bridgeData.value || [])[0];
        if (!bridge) {
          oModel.setProperty("/busy", false);
          oModel.setProperty("/notFound", true);
          return;
        }

        var restrictions = restrData.value || [];
        var postingMsg = postingStatusMessage(bridge.postingStatus);

        oModel.setData(Object.assign(oModel.getData(), {
          busy: false,
          dataLoaded: true,
          notFound: false,
          // Identity
          bridgeId:            bridge.bridgeId,
          bridgeName:          bridge.bridgeName || bridge.bridgeId,
          region:              bridge.region || "—",
          lga:                 bridge.lga || "—",
          route:               bridge.route || "—",
          location:            bridge.location || "—",
          // Posting status
          postingStatus:       bridge.postingStatus || "Unknown",
          postingStatusState:  postingStatusToState(bridge.postingStatus),
          postingStatusMessage: postingMsg,
          postingStatusMessageType: bridge.postingStatus === "Closed" ? "Error" : "Warning",
          showPostingBanner:   !!postingMsg,
          // Structure
          structureType:       bridge.structureType || "—",
          material:            bridge.material || "—",
          yearBuilt:           bridge.yearBuilt || "—",
          // Dimensions
          totalLengthFormatted: formatMeasure(bridge.totalLength, "m"),
          deckWidthFormatted:   formatMeasure(bridge.deckWidth, "m"),
          numberOfLanes:        bridge.numberOfLanes != null ? String(bridge.numberOfLanes) : "—",
          // Approvals
          hmlApprovedText:      yesNo(bridge.hmlApproved),
          hmlApprovedState:     yesNoState(bridge.hmlApproved),
          bDoubleApprovedText:  yesNo(bridge.bDoubleApproved),
          bDoubleApprovedState: yesNoState(bridge.bDoubleApproved),
          pbsApprovalClass:     bridge.pbsApprovalClass || "—",
          // Inspection
          lastInspectionDate:      formatDate(bridge.lastInspectionDate),
          lastInspectionDateShort: formatDateShort(bridge.lastInspectionDate),
          nextInspectionDue:       formatDate(bridge.nextInspectionDue),
          inspectionFrequency:     bridge.inspectionFrequencyYears
            ? "Every " + bridge.inspectionFrequencyYears + " year(s)" : "—",
          // Restrictions
          restrictions: restrictions,
          restrictionsSubtitle: restrictions.length
            ? restrictions.length + " active restriction(s)"
            : "No active restrictions",
          // Footer
          footerTimestamp: "Retrieved: " + new Date().toLocaleString("en-AU")
        }));

      } catch (e) {
        oModel.setProperty("/busy", false);
        oModel.setProperty("/notFound", true);
        console.error("[BridgePublicCard] Load error:", e.message);
      }
    },

    onPrint: function () {
      window.print();
    }
  });
});
