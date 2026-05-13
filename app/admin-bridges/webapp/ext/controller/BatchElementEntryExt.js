sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/BusyDialog"
], function (JSONModel, MessageToast, MessageBox, BusyDialog) {
  "use strict";

  var _oDialog = null;
  var _oView   = null;
  var _oInspectionCtx = null;
  var _csrfToken = null;
  var _oBusyDialog = null;

  function blankRow() {
    return {
      elementType: "",
      totalQty:    "",
      cs1Qty:      "",
      cs2Qty:      "",
      cs3Qty:      "",
      cs4Qty:      "",
      unit:        "m²"
    };
  }

  function initialRows(n) {
    var rows = [];
    for (var i = 0; i < n; i++) {
      rows.push(blankRow());
    }
    return rows;
  }

  async function getCsrfToken() {
    if (_csrfToken) return _csrfToken;
    try {
      var r = await fetch("/odata/v4/admin/", {
        method: "HEAD",
        headers: { "X-CSRF-Token": "Fetch" },
        credentials: "include"
      });
      _csrfToken = r.headers.get("x-csrf-token") || "unsafe";
    } catch (e) {
      _csrfToken = "unsafe";
    }
    return _csrfToken;
  }

  return {

    onOpenBatchElementEntry: function (oEvent) {
      _oView = this.getView ? this.getView() : null;
      if (!_oView) {
        var src = oEvent && oEvent.getSource && oEvent.getSource();
        while (src) {
          if (src.isA && src.isA("sap.ui.core.mvc.View")) { _oView = src; break; }
          src = src.getParent ? src.getParent() : null;
        }
      }

      var oContext = _oView && _oView.getBindingContext();
      var oObj = oContext ? oContext.getObject() : {};

      _oInspectionCtx = {
        inspectionId:  oObj.ID         || "",
        bridgeId:      oObj.bridge_ID  || "",
        inspectionRef: oObj.inspectionRef || oObj.ID || "—"
      };

      var oModel = new JSONModel({
        inspectionRef: _oInspectionCtx.inspectionRef,
        elements:      initialRows(5)
      });

      if (!_oDialog) {
        _oDialog = sap.ui.xmlfragment(
          _oView.getId(),
          "BridgeManagement.adminbridges.ext.view.BatchElementEntry",
          this
        );
        _oView.addDependent(_oDialog);
      }

      _oDialog.setModel(oModel, "batchEntry");
      _oDialog.open();
    },

    onAddElementRow: function () {
      var oModel = _oDialog.getModel("batchEntry");
      var aRows  = oModel.getProperty("/elements");
      aRows.push(blankRow());
      oModel.setProperty("/elements", aRows);
    },

    onDeleteElementRow: function (oEvent) {
      var oModel  = _oDialog.getModel("batchEntry");
      var aRows   = oModel.getProperty("/elements");
      var oCtx    = oEvent.getSource().getBindingContext("batchEntry");
      var sPath   = oCtx.getPath();
      var iIdx    = parseInt(sPath.replace("/elements/", ""), 10);
      aRows.splice(iIdx, 1);
      oModel.setProperty("/elements", aRows.slice());
    },

    onSaveAllElements: async function () {
      var oModel  = _oDialog.getModel("batchEntry");
      var aRows   = oModel.getProperty("/elements");
      var inspId  = _oInspectionCtx && _oInspectionCtx.inspectionId;
      var bridgeId = _oInspectionCtx && _oInspectionCtx.bridgeId;

      var validRows = aRows.filter(function (row) {
        return row.elementType && row.elementType.trim() !== "";
      });

      if (validRows.length === 0) {
        MessageToast.show("No rows to save — please select at least one Element Type.");
        return;
      }

      if (!_oBusyDialog) {
        _oBusyDialog = new BusyDialog({ title: "Saving elements…" });
      }
      _oBusyDialog.open();

      var token;
      try {
        token = await getCsrfToken();
      } catch (e) {
        token = "unsafe";
      }

      var saved   = 0;
      var errors  = [];

      for (var i = 0; i < validRows.length; i++) {
        var row = validRows[i];
        var payload = {
          inspection_ID:       inspId,
          bridge_ID:           bridgeId,
          elementType:         row.elementType,
          conditionState1Qty:  parseFloat(row.cs1Qty)    || 0,
          conditionState2Qty:  parseFloat(row.cs2Qty)    || 0,
          conditionState3Qty:  parseFloat(row.cs3Qty)    || 0,
          conditionState4Qty:  parseFloat(row.cs4Qty)    || 0,
          unit:                row.unit || "m²"
        };

        try {
          var resp = await fetch("/odata/v4/admin/BridgeInspectionElements", {
            method:      "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": token
            },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            var errBody;
            try { errBody = await resp.json(); } catch (_) { errBody = {}; }
            var msg = (errBody.error && errBody.error.message) || ("HTTP " + resp.status);
            errors.push(row.elementType + ": " + msg);
          } else {
            saved++;
          }
        } catch (fetchErr) {
          errors.push(row.elementType + ": " + (fetchErr.message || "Network error"));
        }
      }

      _oBusyDialog.close();

      if (errors.length > 0) {
        MessageBox.warning(
          saved + " element(s) saved.\n\nErrors:\n" + errors.join("\n"),
          { title: "Partial Save" }
        );
      } else {
        MessageToast.show(saved + " element(s) saved successfully.");
        _oDialog.close();
        var oPageModel = _oView && _oView.getModel();
        if (oPageModel && oPageModel.refresh) {
          oPageModel.refresh();
        }
      }
    },

    onCancelBatchEntry: function () {
      if (_oDialog) _oDialog.close();
    }

  };
});
