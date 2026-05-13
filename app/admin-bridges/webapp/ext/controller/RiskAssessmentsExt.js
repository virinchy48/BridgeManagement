sap.ui.define([
  "sap/fe/core/PageController",
  "BridgeManagement/adminbridges/ext/controller/RiskMatrixExt"
], function (PageController, RiskMatrixExt) {
  "use strict";

  return PageController.extend("BridgeManagement.adminbridges.ext.controller.RiskAssessmentsExt", {

    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
    },

    onOpenInherentMatrix: function (oEvent) {
      return RiskMatrixExt.onOpenInherentMatrix.call(this, oEvent);
    },

    onOpenResidualMatrix: function (oEvent) {
      return RiskMatrixExt.onOpenResidualMatrix.call(this, oEvent);
    },

    onRiskMatrixTabSelect: function (oEvent) {
      return RiskMatrixExt.onRiskMatrixTabSelect.call(this, oEvent);
    },

    onRiskMatrixApply: function (oEvent) {
      return RiskMatrixExt.onRiskMatrixApply.call(this, oEvent);
    },

    onRiskMatrixCancel: function (oEvent) {
      return RiskMatrixExt.onRiskMatrixCancel.call(this, oEvent);
    }

  });
});
