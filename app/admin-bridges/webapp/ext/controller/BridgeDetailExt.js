// Press-handler dispatcher for Bridge Details ObjectPage header actions.
// FE4 AMD-requires this file for press string resolution (no .controller suffix).
// BridgeDetailExt.controller.js handles the lifecycle extension (onInit/onAfterRendering).
sap.ui.define([
  "sap/m/MessageToast",
  "BridgeManagement/adminbridges/ext/controller/CaptureCondition",
  "BridgeManagement/adminbridges/ext/controller/RiskAssessmentsExt"
], function (MessageToast, CaptureCondition, RiskAssessmentsExt) {
  "use strict";

  function _getView(oEvent) {
    var parent = oEvent && oEvent.getSource && oEvent.getSource();
    while (parent) {
      if (parent.isA && parent.isA("sap.ui.core.mvc.View")) return parent;
      parent = parent.getParent ? parent.getParent() : null;
    }
    return null;
  }

  // FE4 custom-action press handlers receive null getSource() — fall back to component registry.
  function _viewFromRegistry() {
    var comps = sap.ui.core.Component.registry.all();
    var keys = Object.keys(comps);
    for (var i = 0; i < keys.length; i++) {
      var c = comps[keys[i]];
      if (c.getMetadata && c.getMetadata().getName() === "sap.fe.templates.ObjectPage.Component") {
        var root = c.getRootControl && c.getRootControl();
        if (root) return root;
      }
    }
    return null;
  }

  function _getView(oEvent) {
    return _getView(oEvent) || _viewFromRegistry();
  }

  return {

    // ── CaptureCondition delegation ─────────────────────────────────────────

    onCaptureConditionOpen: function (oEvent) {
      CaptureCondition.onCaptureConditionOpen.call(this, oEvent);
    },

    onConditionRatingChange: function (oEvent) {
      CaptureCondition.onConditionRatingChange.call(this, oEvent);
    },

    onCaptureConditionSave: function (oEvent) {
      CaptureCondition.onCaptureConditionSave.call(this, oEvent);
    },

    onCaptureConditionCancel: function (oEvent) {
      CaptureCondition.onCaptureConditionCancel.call(this, oEvent);
    },

    onExportCard: function (oEvent) {
      CaptureCondition.onExportCard.call(this, oEvent);
    },

    // ── Risk matrix delegation ──────────────────────────────────────────────
    // RiskAssessmentsExt stores _oCtrl = this; _getCtx() calls _oCtrl.getView().
    // Provide a minimal adapter with getView() resolved from the event source.

    onOpenInherentMatrix: function (oEvent) {
      var oView = _getView(oEvent);
      RiskAssessmentsExt.prototype.onOpenInherentMatrix.call(
        { getView: function () { return oView; } }, oEvent
      );
    },

    onOpenResidualMatrix: function (oEvent) {
      var oView = _getView(oEvent);
      RiskAssessmentsExt.prototype.onOpenResidualMatrix.call(
        { getView: function () { return oView; } }, oEvent
      );
    },

    // ── Inspections batch entry ─────────────────────────────────────────────

    onOpenBatchElementEntry: function () {
      MessageToast.show("Batch element entry is not yet available in this release.");
    },

    // ── S/4HANA deep-link actions ───────────────────────────────────────────

    onCreateWorkOrder: function (oEvent) {
      var oView = _getView(oEvent);
      var ctx = oView && oView.getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var s4BaseUrl = oView.getModel("userScopes") && oView.getModel("userScopes").getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#MaintenanceOrder-create?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank", "noopener");
      } else {
        MessageToast.show("S/4HANA integration not configured. Contact your administrator.");
      }
    },

    onViewInS4Hana: function (oEvent) {
      var oView = _getView(oEvent);
      var ctx = oView && oView.getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var s4BaseUrl = oView.getModel("userScopes") && oView.getModel("userScopes").getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#Equipment-display?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank", "noopener");
      } else {
        MessageToast.show("S/4HANA URL not configured. Contact your administrator.");
      }
    }

  };
});
