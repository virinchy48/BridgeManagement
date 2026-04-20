sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  const ROUTE_TO_KEY = {
    home:             "changeDocuments",
    changeDocuments:  "changeDocuments",
    dataQuality:      "dataQuality",
    dataQualityRules: "dataQualityRules",
    massUpload:       "massUpload",
    referenceData:    "referenceData",
    userAccess:       "userAccess",
    systemConfig:     "systemConfig",
    bnacConfig:       "bnacConfig",
    gisConfig:        "gisConfig",
    attributeConfig:  "attributeConfig",
    apiDocs:          "apiDocs",
    demoMode:         "demoMode"
  };

  return Controller.extend("BridgeManagement.bmsadmin.controller.Shell", {

    onInit: function () {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.attachRouteMatched(this._onRouteMatched, this);
      // Poll data quality for critical issues every 5 minutes
      this._pollQualityAlert();
      this._qualityPollTimer = setInterval(this._pollQualityAlert.bind(this), 5 * 60 * 1000);
    },

    onExit: function () {
      if (this._qualityPollTimer) clearInterval(this._qualityPollTimer);
    },

    // ── Quality alert badge ─────────────────────────────────────────────────
    _pollQualityAlert: function () {
      fetch("/quality/api/summary")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const critical = data.criticalCount || 0;
          const btn = this.byId("qualityAlertBtn");
          if (!btn) return;
          if (critical > 0) {
            btn.setVisible(true);
            btn.setTooltip(critical + " bridge" + (critical !== 1 ? "s" : "") + " with critical data quality issues — click to view");
          } else {
            btn.setVisible(false);
          }
        })
        .catch(() => { /* silent — do not disrupt shell */ });
    },

    onQualityAlertPress: function () {
      this.getOwnerComponent().getRouter().navTo("dataQuality");
    },

    // ── Route matching ──────────────────────────────────────────────────────
    _onRouteMatched: function (oEvent) {
      const sName = oEvent.getParameter("name");
      const sKey  = ROUTE_TO_KEY[sName] || "changeDocuments";
      const oNavList = this.byId("navList");
      const aItems   = oNavList.getItems();
      const target   = aItems.find(item => item.getKey() === sKey);
      if (target) oNavList.setSelectedItem(target);
    },

    onGoHome: function () {
      window.location.href = "/fiori-apps.html";
    },

    onToggleSideNav: function () {
      const oPage = this.byId("toolPage");
      oPage.setSideExpanded(!oPage.getSideExpanded());
    },

    onNavSelect: function (oEvent) {
      const sKey = oEvent.getParameter("item").getKey();
      this.getOwnerComponent().getRouter().navTo(sKey);
    }
  });
});
