sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
  (Controller, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("bms.operations.bridges.controller.Main", {
      onInit() {
        this.getView().setModel(new JSONModel({ bridges: [] }), "view");
        this._allBridges = [];
        this._loadBridges();
      },

      _loadBridges() {
        fetch("/map/api/bridges")
          .then((r) => r.json())
          .then((data) => {
            const bridges = Array.isArray(data) ? data : (data.value || []);
            this._allBridges = bridges;
            this.getView().getModel("view").setProperty("/bridges", bridges);
          })
          .catch(() => {
            this.getView().getModel("view").setProperty("/bridges", []);
          });
      },

      onSearch(oEvent) {
        const sQuery = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").toLowerCase().trim();
        if (!sQuery) {
          this.getView().getModel("view").setProperty("/bridges", this._allBridges);
          return;
        }
        const filtered = this._allBridges.filter((b) => {
          return (
            String(b.bridgeName || "").toLowerCase().includes(sQuery) ||
            String(b.ID || "").toLowerCase().includes(sQuery)
          );
        });
        this.getView().getModel("view").setProperty("/bridges", filtered);
      },

      onOpenInMap(oEvent) {
        const oContext = oEvent.getSource().getBindingContext("view");
        const bridgeId = oContext.getProperty("ID");
        sap.m.URLHelper.redirect("#Map-display?bridgeId=" + encodeURIComponent(bridgeId), false);
      }
    });
  }
);
