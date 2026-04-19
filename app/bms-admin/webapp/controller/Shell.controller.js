sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function (Controller) {
  "use strict";

  const ROUTE_TO_KEY = {
    home:            "changeDocuments",
    changeDocuments: "changeDocuments",
    dataQuality:     "dataQuality",
    referenceData:   "referenceData",
    userAccess:      "userAccess",
    systemConfig:    "systemConfig",
    bnacConfig:      "bnacConfig",
    attributeConfig: "attributeConfig"
  };

  return Controller.extend("BridgeManagement.bmsadmin.controller.Shell", {

    onInit: function () {
      const oRouter = this.getOwnerComponent().getRouter();
      oRouter.attachRouteMatched(this._onRouteMatched, this);
    },

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
