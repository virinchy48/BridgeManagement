sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
  "use strict";

  var _oDialog = null;
  var _oView   = null;

  function ratingToCondition(rating) {
    var r = Number(rating) || 0;
    if (r >= 8) return "Good";
    if (r >= 5) return "Fair";
    if (r >= 3) return "Poor";
    if (r >= 1) return "Critical";
    return "";
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function getView(oEvent) {
    // FE4 press handlers: `this` is the FE controller — try that first.
    // Fallback: traverse up from the event source.
    if (typeof this !== "undefined" && this && typeof this.getView === "function") {
      return this.getView();
    }
    var parent = oEvent && oEvent.getSource && oEvent.getSource();
    while (parent) {
      if (parent.isA && parent.isA("sap.ui.core.mvc.View")) return parent;
      parent = parent.getParent ? parent.getParent() : null;
    }
    return _oView;
  }

  return {

    onCaptureConditionOpen: function (oEvent) {
      _oView = getView.call(this, oEvent);
      var oContext = _oView && _oView.getBindingContext();

      var oModel = new JSONModel({
        inspectionType:          oContext ? (oContext.getProperty("inspectionType")          || "RoutineVisual") : "RoutineVisual",
        conditionRating:         oContext ? (oContext.getProperty("conditionRating")         || 0)              : 0,
        condition:               oContext ? (oContext.getProperty("condition")               || "")             : "",
        conditionTrend:          oContext ? (oContext.getProperty("conditionTrend")          || "Stable")       : "Stable",
        lastInspectionDate:      oContext ? (oContext.getProperty("lastInspectionDate")      || todayIso())     : todayIso(),
        nextInspectionDue:       oContext ? (oContext.getProperty("nextInspectionDue")       || "")             : "",
        inspectionFrequencyYears: oContext ? (oContext.getProperty("inspectionFrequencyYears") || 2)            : 2,
        conditionAssessor:       oContext ? (oContext.getProperty("conditionAssessor")       || "")             : "",
        conditionReportRef:      oContext ? (oContext.getProperty("conditionReportRef")      || "")             : "",
        conditionNotes:          oContext ? (oContext.getProperty("conditionNotes")          || "")             : ""
      });

      if (!_oDialog) {
        _oDialog = sap.ui.xmlfragment(
          _oView.getId(),
          "BridgeManagement.adminbridges.ext.fragment.CaptureCondition",
          this
        );
        _oView.addDependent(_oDialog);
      }

      _oDialog.setModel(oModel, "captureCondition");
      _oDialog.open();
    },

    onConditionRatingChange: function (oEvent) {
      var rating = oEvent.getParameter("value");
      var oModel = _oDialog.getModel("captureCondition");
      oModel.setProperty("/conditionRating", Math.round(rating));
      var derived = ratingToCondition(Math.round(rating));
      if (derived) oModel.setProperty("/condition", derived);
    },

    onCaptureConditionSave: async function () {
      var oContext = _oView && _oView.getBindingContext();
      if (!oContext) {
        MessageBox.error("No bridge record is loaded.");
        return;
      }

      var data = _oDialog.getModel("captureCondition").getData();

      try {
        ["inspectionType", "conditionRating", "condition", "conditionTrend",
          "lastInspectionDate", "nextInspectionDue", "inspectionFrequencyYears",
          "conditionAssessor", "conditionReportRef", "conditionNotes"
        ].forEach(function (field) {
          oContext.setProperty(field, data[field] || null);
        });

        var oPageModel = _oView.getModel();
        if (oPageModel && oPageModel.submitBatch) {
          await oPageModel.submitBatch("$auto");
        }

        _oDialog.close();
        MessageToast.show("Condition saved");
      } catch (error) {
        MessageBox.error((error && error.message) || "Failed to save condition");
      }
    },

    onCaptureConditionCancel: function () {
      if (_oDialog) _oDialog.close();
    },

    onExportCard: function (oEvent) {
      var oView = getView.call(this, oEvent) || _oView;
      var oContext = oView && oView.getBindingContext();
      if (!oContext) return;
      var id = oContext.getProperty("ID");
      if (!id) return;
      window.open("/admin-bridges/api/bridges/" + encodeURIComponent(id) + "/card", "_blank", "noopener");
    }

  };
});
