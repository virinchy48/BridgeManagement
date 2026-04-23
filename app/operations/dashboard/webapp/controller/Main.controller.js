sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"], (Controller, JSONModel) => {
  "use strict";

  return Controller.extend("BridgeManagement.dashboard.controller.Main", {
    onInit() {
      const oModel = new JSONModel({
        totalBridges: "—",
        activeRestrictions: "—",
        closedBridges: "—",
        poorCondition: "—",
        lastUpdated: ""
      });
      this.getView().setModel(oModel, "view");
      this._loadAnalytics();
    },

    onRefresh() {
      this._loadAnalytics();
    },

    _loadAnalytics() {
      fetch("/dashboard/api/analytics")
        .then((r) => r.json())
        .then((data) => {
          const oModel = this.getView().getModel("view");
          oModel.setProperty("/totalBridges", String(data.totalBridges ?? "—"));
          oModel.setProperty("/activeRestrictions", String(data.activeRestrictions ?? "—"));
          oModel.setProperty("/closedBridges", String(data.closedBridges ?? "—"));
          oModel.setProperty("/poorCondition", String(data.deficient ?? "—"));
          oModel.setProperty("/lastUpdated", "Last updated: " + new Date().toLocaleTimeString());
        })
        .catch(() => {
          const oModel = this.getView().getModel("view");
          oModel.setProperty("/lastUpdated", "Could not load data");
        });
    }
  });
});
