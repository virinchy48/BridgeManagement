sap.ui.define(["sap/m/MessageToast"], function (MessageToast) {
  "use strict";
  return {
    onOpenGISConfig: function () {
      var router = sap.ui.core.UIComponent.getRouterFor(this);
      if (router) {
        router.navTo("GISConfig");
      } else {
        window.location.hash = "#GISConfig";
      }
    },

    onOpenNetworkReports: function () {
      var router = sap.ui.core.UIComponent.getRouterFor(this);
      if (router) {
        router.navTo("NetworkReports");
      } else {
        window.location.hash = "Bridges-manage&/NetworkReports";
      }
    },

    onExportCsv: function () {
      var url = "/admin-bridges/api/bridges/export";
      var a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      MessageToast.show("Bridge list export started");
    }
  };
});
