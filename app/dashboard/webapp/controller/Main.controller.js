sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
  "use strict";

  const CONDITION_CONFIG = [
    { key: "good",     label: "Good",     state: "Success", color: "#107E3E", icon: "sap-icon://sys-enter-2" },
    { key: "fair",     label: "Fair",     state: "Warning", color: "#E76500", icon: "sap-icon://warning"     },
    { key: "poor",     label: "Poor",     state: "Error",   color: "#BB0000", icon: "sap-icon://error"       },
    { key: "critical", label: "Critical", state: "Error",   color: "#6E0000", icon: "sap-icon://alert"       }
  ];

  return Controller.extend("BridgeManagement.dashboard.controller.Main", {

    onInit: function () {
      document.body.classList.add("dashboardFullBleed");

      const model = new JSONModel({
        busy: true,
        totalBridges: 0,
        activeRestrictions: 0,
        closedBridges: 0,
        postedRestrictions: 0,
        scourCritical: 0,
        deficient: 0,
        sufficiencyPct: 0,
        conditionRows: [],
        conditionSummaryLabel: "",
        lastRefreshedLabel: ""
      });
      this.getView().setModel(model, "view");
      this._loadAnalytics();
    },

    onExit: function () {
      document.body.classList.remove("dashboardFullBleed");
    },

    onRefresh: function () {
      MessageToast.show("Refreshing…");
      this._loadAnalytics();
    },

    onNavigateBridges: function () {
      window.location.href = "#Bridges-manage";
    },

    onNavigateRestrictions: function () {
      window.location.href = "#Restrictions-manage";
    },

    _loadAnalytics: async function () {
      const model = this._vm();
      model.setProperty("/busy", true);

      try {
        const response = await fetch("/dashboard/api/analytics");
        if (!response.ok) {
          const ct = response.headers.get("content-type") || "";
          const msg = ct.includes("application/json")
            ? (await response.json()).error?.message
            : `HTTP ${response.status}`;
          throw new Error(msg || "Failed to load analytics");
        }

        const data = await response.json();
        this._applyData(model, data);
      } catch (error) {
        MessageBox.error(error.message || "Could not load dashboard analytics.");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    _applyData: function (model, data) {
      const dist  = data.conditionDistribution || {};
      const total = dist.total || 0;

      // Build condition rows with computed percentages
      const conditionRows = CONDITION_CONFIG.map(function (cfg) {
        const count = dist[cfg.key] || 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        return {
          key:     cfg.key,
          label:   cfg.label,
          count:   count,
          pct:     pct,
          pctText: pct + "%",
          state:   cfg.state,
          color:   cfg.color,
          icon:    cfg.icon
        };
      });

      // Dominant condition label for header
      const dominant = conditionRows.reduce(function (best, row) {
        return row.count > best.count ? row : best;
      }, conditionRows[0] || { label: "—", pct: 0 });
      const summaryLabel = total > 0
        ? dominant.pct + "% " + dominant.label.toLowerCase()
        : "No condition data";

      // Timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      model.setProperty("/totalBridges",       data.totalBridges       || 0);
      model.setProperty("/activeRestrictions", data.activeRestrictions || 0);
      model.setProperty("/closedBridges",      data.closedBridges      || 0);
      model.setProperty("/postedRestrictions", data.postedRestrictions || 0);
      model.setProperty("/scourCritical",      data.scourCritical      || 0);
      model.setProperty("/deficient",          data.deficient          || 0);
      model.setProperty("/sufficiencyPct",     data.sufficiencyPct     || 0);
      model.setProperty("/conditionRows",      conditionRows);
      model.setProperty("/conditionSummaryLabel", summaryLabel);
      model.setProperty("/lastRefreshedLabel", "Last refreshed: " + timeStr);
    },

    _vm: function () {
      return this.getView().getModel("view");
    }

  });
});
