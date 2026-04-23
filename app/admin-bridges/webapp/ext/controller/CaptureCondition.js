sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
  "use strict";

  var _oDialog = null;

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

  return {
    onCaptureConditionOpen: function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      var oModel = new JSONModel({
        conditionRating: oContext ? (oContext.getProperty("conditionRating") || 0) : 0,
        condition: oContext ? (oContext.getProperty("condition") || "") : "",
        lastInspectionDate: oContext ? (oContext.getProperty("lastInspectionDate") || todayIso()) : todayIso(),
        conditionAssessor: oContext ? (oContext.getProperty("conditionAssessor") || "") : "",
        conditionReportRef: oContext ? (oContext.getProperty("conditionReportRef") || "") : "",
        conditionNotes: oContext ? (oContext.getProperty("conditionNotes") || "") : ""
      });

      if (!_oDialog) {
        _oDialog = sap.ui.xmlfragment(
          oView.getId(),
          "BridgeManagement.adminbridges.ext.fragment.CaptureCondition",
          this
        );
        oView.addDependent(_oDialog);
      }

      _oDialog.setModel(oModel, "captureCondition");
      _oDialog.open();
    },

    onConditionRatingChange: function (oEvent) {
      var rating = oEvent.getParameter("value");
      var oModel = _oDialog.getModel("captureCondition");
      oModel.setProperty("/conditionRating", Math.round(rating));
      var derived = ratingToCondition(Math.round(rating));
      if (derived) {
        oModel.setProperty("/condition", derived);
      }
    },

    onCaptureConditionSave: async function () {
      var oView = this.getView();
      var oContext = oView.getBindingContext();

      if (!oContext) {
        MessageBox.error("No bridge record is loaded.");
        return;
      }

      var oModel = _oDialog.getModel("captureCondition");
      var data = oModel.getData();

      try {
        var fields = [
          "conditionRating",
          "condition",
          "lastInspectionDate",
          "conditionAssessor",
          "conditionReportRef",
          "conditionNotes"
        ];
        fields.forEach(function (field) {
          oContext.setProperty(field, data[field] || null);
        });

        var oPageModel = oView.getModel();
        if (oPageModel && oPageModel.submitBatch) {
          await oPageModel.submitBatch("$auto");
        }

        _oDialog.close();
        MessageToast.show("Condition saved");
      } catch (error) {
        MessageBox.error(
          (error && error.message) || "Failed to save condition"
        );
      }
    },

    onCaptureConditionCancel: function () {
      if (_oDialog) {
        _oDialog.close();
      }
    }
  };
});
