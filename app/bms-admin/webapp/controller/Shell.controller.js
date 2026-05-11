sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  const ROUTE_TO_KEY = {
    home:             "changeDocuments",
    changeDocuments:  "changeDocuments",
    dataQuality:      "dataQuality",
    userAccess:       "userAccess",
    systemConfig:     "systemConfig",
    bnacConfig:       "bnacConfig",
    gisConfig:        "gisConfig",
    attributeConfig:  "attributeConfig",
    attributeReport:  "attributeReport",
    apiDocs:          "apiDocs",
    demoMode:         "demoMode",
    featureFlags:     "featureFlags"
  };

  return Controller.extend("BridgeManagement.bmsadmin.controller.Shell", {

    onInit: function () {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.attachRouteMatched(this._onRouteMatched, this);
      this._pollQualityAlert();
      this._qualityPollTimer = setInterval(this._pollQualityAlert.bind(this), 5 * 60 * 1000);
      setTimeout(this._setVersionBadge.bind(this), 0);
      // Expand side nav on desktop; keep collapsed on mobile (< 768px)
      if (window.innerWidth >= 768) {
        setTimeout(function () {
          const page = this.byId("toolPage");
          if (page) { page.setSideExpanded(true); }
        }.bind(this), 0);
      }
    },

    _setVersionBadge: function () {
      const host = window.location.hostname;
      var env = "LOCAL";
      if (host !== "localhost" && host !== "127.0.0.1") {
        if      (/\bdev\b/i.test(host))  env = "DEV";
        else if (/\buat\b/i.test(host))  env = "UAT";
        else if (/\bprod\b/i.test(host)) env = "PROD";
        else                             env = host.split(".")[0].toUpperCase();
      }
      const badge = this.byId("appVersionEnv");
      if (badge) badge.setText("v1.0.0 · " + env);
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
            btn.setTooltip(critical + " bridge" + (critical !== 1 ? "s" : "") + " with critical data quality issues: click to view");
          } else {
            btn.setVisible(false);
          }
        })
        .catch(() => { /* silent: do not disrupt shell */ });
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
