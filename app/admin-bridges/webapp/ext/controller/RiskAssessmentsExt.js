sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast"
], function (JSONModel, Fragment, MessageToast) {
  "use strict";

  // ── Color helpers ─────────────────────────────────────────────────────────

  var COLOR = {
    low:     { bg: "#4CAF50", label: "Low" },
    medium:  { bg: "#FF9800", label: "Medium" },
    high:    { bg: "#FF5722", label: "High" },
    extreme: { bg: "#F44336", label: "Extreme" }
  };

  function riskColor(score) {
    if (score >= 15) return COLOR.extreme;
    if (score >= 10) return COLOR.high;
    if (score >= 5)  return COLOR.medium;
    return COLOR.low;
  }

  function stateForScore(score) {
    if (score >= 15) return "Error";
    if (score >= 10) return "Warning";
    if (score >= 5)  return "Warning";
    return "Success";
  }

  // ── Matrix HTML builder ───────────────────────────────────────────────────

  function buildMatrixHtml(matrixType, selectedL, selectedC) {
    var likeLabels   = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
    var conseqLabels = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

    var parts = [
      "<div style='overflow-x:auto;padding:8px 0;'>",
      "<table style='border-collapse:collapse;margin:0 auto;font-family:Arial,sans-serif;font-size:13px;'>",
      "<tr><th style='padding:4px 6px;color:#555;font-size:11px;font-weight:600;text-align:right;white-space:nowrap;'>Likelihood ↓ / Consequence →</th>"
    ];

    for (var c = 1; c <= 5; c++) {
      parts.push("<th style='width:76px;padding:4px 2px;text-align:center;font-size:11px;color:#555;font-weight:600;'>C" + c +
        "<br><span style='font-weight:400;font-size:10px;color:#777;'>" + conseqLabels[c] + "</span></th>");
    }
    parts.push("</tr>");

    for (var l = 5; l >= 1; l--) {
      parts.push("<tr><td style='padding:4px 8px;font-size:11px;color:#555;font-weight:600;text-align:right;white-space:nowrap;'>" +
        "L" + l + " — " + likeLabels[l] + "</td>");

      for (var col = 1; col <= 5; col++) {
        var score = l * col;
        var clr   = riskColor(score);
        var isSel = (l === selectedL && col === selectedC);
        var border = isSel ? "3px solid #333" : "1px solid rgba(255,255,255,0.25)";
        var fw     = isSel ? "900" : "600";

        parts.push(
          "<td data-matrix='" + matrixType + "' data-l='" + l + "' data-c='" + col + "'",
          " title='Likelihood " + l + " × Consequence " + col + " = " + score + " (" + clr.label + ")'",
          " style='width:76px;height:54px;text-align:center;vertical-align:middle;cursor:pointer;",
          "background:" + clr.bg + ";color:#fff;border:" + border + ";border-radius:3px;transition:transform 0.1s;'",
          " onmouseover=\"this.style.transform='scale(1.06)'\"",
          " onmouseout=\"this.style.transform=''\"",
          ">",
          "<div style='font-size:18px;font-weight:" + fw + ";line-height:1.1;'>" + score + "</div>",
          "<div style='font-size:10px;opacity:0.9;'>" + clr.label + "</div>",
          "</td>"
        );
      }
      parts.push("</tr>");
    }

    parts.push("</table></div>");
    return parts.join("");
  }

  // ── Module-level state ─────────────────────────────────────────────────────

  var _oDialog = null;
  var _oView   = null;

  function _selLabel(l, c) {
    if (!l || !c) return "None selected";
    var score = l * c;
    return "L" + l + " × C" + c + " = " + score + " — " + riskColor(score).label;
  }

  function _attachCellHandlers(oModel) {
    setTimeout(function () {
      var domRef = _oDialog && _oDialog.getDomRef ? _oDialog.getDomRef() : null;
      if (!domRef) return;
      if (_oDialog.__riskClickHandler) {
        domRef.removeEventListener("click", _oDialog.__riskClickHandler);
      }
      _oDialog.__riskClickHandler = function (e) {
        var td = e.target.closest ? e.target.closest("td[data-l]") : null;
        if (!td) return;
        var l = parseInt(td.getAttribute("data-l"), 10);
        var c = parseInt(td.getAttribute("data-c"), 10);
        if (!l || !c) return;
        _selectCell(oModel, l, c);
      };
      domRef.addEventListener("click", _oDialog.__riskClickHandler);
    }, 150);
  }

  function _selectCell(oModel, l, c) {
    var matrixType = oModel.getProperty("/matrixType");
    var score = l * c;
    oModel.setProperty("/selectedL", l);
    oModel.setProperty("/selectedC", c);
    oModel.setProperty("/selectedLabel", _selLabel(l, c));
    oModel.setProperty("/selectedState", stateForScore(score));
    oModel.setProperty("/inherentHtml", buildMatrixHtml("inherent",
      matrixType === "inherent" ? l : 0, matrixType === "inherent" ? c : 0));
    oModel.setProperty("/residualHtml",  buildMatrixHtml("residual",
      matrixType === "residual"  ? l : 0, matrixType === "residual"  ? c : 0));
    if (_oDialog) _attachCellHandlers(oModel);
  }

  function _openMatrix(matrixType) {
    var oCtx  = _oView && _oView.getBindingContext();
    var lFld  = matrixType === "inherent" ? "likelihood"  : "residualLikelihood";
    var cFld  = matrixType === "inherent" ? "consequence" : "residualConsequence";
    var selL  = oCtx ? (Number(oCtx.getProperty(lFld))  || 0) : 0;
    var selC  = oCtx ? (Number(oCtx.getProperty(cFld))  || 0) : 0;

    var oModel = new JSONModel({
      matrixType:    matrixType,
      title:         matrixType === "inherent" ? "Inherent Risk Matrix" : "Residual Risk Matrix",
      selectedL:     selL,
      selectedC:     selC,
      selectedLabel: _selLabel(selL, selC),
      selectedState: selL && selC ? stateForScore(selL * selC) : "None",
      inherentHtml:  buildMatrixHtml("inherent", matrixType === "inherent" ? selL : 0, matrixType === "inherent" ? selC : 0),
      residualHtml:  buildMatrixHtml("residual",  matrixType === "residual"  ? selL : 0, matrixType === "residual"  ? selC : 0)
    });

    if (_oDialog) {
      _oDialog.setModel(oModel, "matrix");
      var oTabBar = _findTabBar();
      if (oTabBar) oTabBar.setSelectedKey(matrixType);
      _oDialog.open();
      _attachCellHandlers(oModel);
      return;
    }

    Fragment.load({
      id:         "riskMatrixAssessmentsFrag",
      name:       "BridgeManagement.adminbridges.ext.view.RiskMatrix",
      controller: _fragmentController
    }).then(function (oFrag) {
      _oDialog = oFrag;
      _oDialog.setModel(oModel, "matrix");
      if (_oView) _oView.addDependent(_oDialog);
      var oTabBar = _findTabBar();
      if (oTabBar) oTabBar.setSelectedKey(matrixType);
      _oDialog.open();
      _attachCellHandlers(oModel);
    }).catch(function (e) {
      MessageToast.show("Risk Matrix dialog error: " + e.message);
    });
  }

  function _findTabBar() {
    if (!_oDialog) return null;
    var content = _oDialog.getContent ? _oDialog.getContent() : [];
    for (var i = 0; i < content.length; i++) {
      var items = content[i].getItems ? content[i].getItems() : [];
      for (var j = 0; j < items.length; j++) {
        if (items[j].isA && items[j].isA("sap.m.IconTabBar")) return items[j];
      }
    }
    return null;
  }

  function _apply() {
    if (!_oDialog) return;
    var oModel = _oDialog.getModel("matrix");
    if (!oModel) return;
    var matrixType = oModel.getProperty("/matrixType");
    var selL = oModel.getProperty("/selectedL");
    var selC = oModel.getProperty("/selectedC");

    if (!selL || !selC) {
      MessageToast.show("Please select a cell in the matrix first.");
      return;
    }

    var oCtx = _oView && _oView.getBindingContext();
    if (!oCtx) {
      MessageToast.show("No binding context — cannot save.");
      _oDialog.close();
      return;
    }

    var lFld = matrixType === "inherent" ? "likelihood"  : "residualLikelihood";
    var cFld = matrixType === "inherent" ? "consequence" : "residualConsequence";

    oCtx.setProperty(lFld, selL);
    oCtx.setProperty(cFld, selC);

    var oODataModel = _oView.getModel();
    if (oODataModel && oODataModel.submitBatch) {
      oODataModel.submitBatch("$auto").then(function () {
        MessageToast.show("Risk scores updated. Save the record to persist.");
      }).catch(function (e) {
        MessageToast.show("Save failed: " + (e.message || "Unknown error"));
      });
    } else {
      MessageToast.show("Risk values set — save the record to persist.");
    }

    _oDialog.close();
  }

  var _fragmentController = {
    onRiskMatrixTabSelect: function (oEvent) {
      if (!_oDialog) return;
      var key    = oEvent.getParameter("key");
      var oModel = _oDialog.getModel("matrix");
      if (oModel) oModel.setProperty("/matrixType", key);
      _attachCellHandlers(oModel);
    },
    onRiskMatrixApply:  _apply,
    onRiskMatrixCancel: function () { if (_oDialog) _oDialog.close(); }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  return {

    onOpenInherentMatrix: function (oEvent) {
      // `this` is the FE4 ObjectPage controller when called from manifest press handler
      _oView = (this && typeof this.getView === "function") ? this.getView() : _oView;
      _openMatrix("inherent");
    },

    onOpenResidualMatrix: function (oEvent) {
      _oView = (this && typeof this.getView === "function") ? this.getView() : _oView;
      _openMatrix("residual");
    },

    onRiskMatrixTabSelect:  _fragmentController.onRiskMatrixTabSelect,
    onRiskMatrixApply:      _apply,
    onRiskMatrixCancel:     _fragmentController.onRiskMatrixCancel
  };
});
