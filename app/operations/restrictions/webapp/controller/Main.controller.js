sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"], (Controller, JSONModel) => {
  "use strict";

  const ODATA_URL =
    "/odata/v4/admin/Restrictions?$select=ID,restrictionType,bridgeName,restrictionStatus,grossMassLimit,heightLimit,speedLimit,permitRequired&$filter=active eq true";

  return Controller.extend("bms.operations.restrictions.controller.Main", {
    onInit() {
      this.getView().setModel(new JSONModel({ restrictions: [] }), "view");
      this._allRestrictions = [];
      this._loadRestrictions();
    },

    _loadRestrictions() {
      fetch(ODATA_URL)
        .then((r) => r.json())
        .then((data) => {
          const restrictions = data.value || [];
          this._allRestrictions = restrictions;
          this.getView().getModel("view").setProperty("/restrictions", restrictions);
        })
        .catch(() => {
          this.getView().getModel("view").setProperty("/restrictions", []);
        });
    },

    onSearch(oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").toLowerCase().trim();
      if (!sQuery) {
        this.getView().getModel("view").setProperty("/restrictions", this._allRestrictions);
        return;
      }
      const filtered = this._allRestrictions.filter((r) =>
        String(r.bridgeName || "").toLowerCase().includes(sQuery)
      );
      this.getView().getModel("view").setProperty("/restrictions", filtered);
    }
  });
});
