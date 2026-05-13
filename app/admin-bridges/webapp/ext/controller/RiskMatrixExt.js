sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast"
], function (JSONModel, Fragment, MessageToast) {
  "use strict";

  // ── helpers ──────────────────────────────────────────────────────────────────

  var COLOR = {
    low:     { bg: "#4CAF50", fg: "#fff", label: "Low" },
    medium:  { bg: "#FF9800", fg: "#fff", label: "Medium" },
    high:    { bg: "#FF5722", fg: "#fff", label: "High" },
    extreme: { bg: "#F44336", fg: "#fff", label: "Extreme" }
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

  /**
   * Build an HTML table string for the 5×5 risk matrix.
   * Rows = Likelihood 5→1 (top=most likely), Cols = Consequence 1→5.
   * selectedL / selectedC mark the currently selected cell.
   */
  function buildMatrixHtml(matrixType, selectedL, selectedC) {
    var cellSize = "72px";
    var html = [
      "<div style='overflow-x:auto;'>",
      "<table id='riskMatrix_" + matrixType + "' style='border-collapse:collapse;margin:0 auto;font-family:Arial,sans-serif;font-size:13px;'>",
      // Header row
      "<tr>",
      "<th style='width:80px;padding:6px 4px;text-align:center;font-weight:600;color:#555;font-size:11px;border:none;'></th>"
    ];

    for (var c = 1; c <= 5; c++) {
      html.push(
        "<th style='width:" + cellSize + ";padding:6px 2px;text-align:center;font-weight:600;color:#555;font-size:11px;'>",
        "C" + c,
        "</th>"
      );
    }
    html.push("</tr>");

    // Label row under header
    html.push(
      "<tr>",
      "<td style='padding:2px 4px;font-size:10px;color:#777;text-align:right;'>Likelihood ↓ / Consequence →</td>"
    );
    var conseqLabels = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];
    for (var ci = 1; ci <= 5; ci++) {
      html.push("<td style='font-size:10px;color:#777;text-align:center;padding:0 2px;'>" + conseqLabels[ci] + "</td>");
    }
    html.push("</tr>");

    var likeLabels = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];

    // Data rows: likelihood 5 (top) down to 1
    for (var l = 5; l >= 1; l--) {
      html.push(
        "<tr>",
        "<td style='padding:4px 8px;font-size:11px;color:#555;font-weight:600;text-align:right;white-space:nowrap;'>",
        "L" + l + " — " + likeLabels[l],
        "</td>"
      );

      for (var col = 1; col <= 5; col++) {
        var score = l * col;
        var clr = riskColor(score);
        var isSelected = (l === selectedL && col === selectedC);
        var border = isSelected
          ? "3px solid #333"
          : "1px solid rgba(255,255,255,0.3)";
        var fontWeight = isSelected ? "800" : "600";
        var outline = isSelected ? "outline:2px solid #333;outline-offset:-3px;" : "";

        html.push(
          "<td style='width:" + cellSize + ";height:52px;text-align:center;vertical-align:middle;",
          "background:" + clr.bg + ";color:" + clr.fg + ";",
          "border:" + border + ";" + outline,
          "cursor:pointer;border-radius:3px;transition:transform 0.1s;'",
          " onclick=\"sap.ui.getCore().byId && (function(){",
          "var ctl=sap.ui.getCore().byId('BridgeManagement.adminbridges::BridgeRiskAssessmentsObjectPage--fe::CustomSubSection::riskMatrixSubSection--riskMatrixDialog');",
          "if(!ctl){var all=sap.ui.core.Fragment.getAllInstances&&sap.ui.core.Fragment.getAllInstances()||[];}",
          "})()\"",
          " data-matrix='" + matrixType + "' data-l='" + l + "' data-c='" + col + "'",
          " title='L" + l + " × C" + col + " = " + score + " (" + clr.label + ")'",
          " onmouseover=\"this.style.transform='scale(1.08)'\"",
          " onmouseout=\"this.style.transform='scale(1)'\"",
          ">",
          "<div style='font-size:16px;font-weight:" + fontWeight + ";'>" + score + "</div>",
          "<div style='font-size:10px;opacity:0.9;'>" + clr.label + "</div>",
          "</td>"
        );
      }
      html.push("</tr>");
    }

    html.push("</table></div>");
    return html.join("");
  }

  // ── Module ───────────────────────────────────────────────────────────────────

  var _oDialog = null;
  var _oView   = null;

  return {

    // ── Public API called from BridgeDetailExt delegations ──────────────────

    onOpenInherentMatrix: function (oEvent) {
      _oView = (this && typeof this.getView === "function") ? this.getView() : null;
      this._openMatrix("inherent", oEvent);
    },

    onOpenResidualMatrix: function (oEvent) {
      _oView = (this && typeof this.getView === "function") ? this.getView() : null;
      this._openMatrix("residual", oEvent);
    },

    // ── Internal: open dialog ────────────────────────────────────────────────

    _openMatrix: function (matrixType, oEvent) {
      var oSelf = this;
      var oContext = _oView && _oView.getBindingContext();

      var likelihoodField  = matrixType === "inherent" ? "likelihood"         : "residualLikelihood";
      var consequenceField = matrixType === "inherent" ? "consequence"        : "residualConsequence";

      var selL = oContext ? (Number(oContext.getProperty(likelihoodField))  || 0) : 0;
      var selC = oContext ? (Number(oContext.getProperty(consequenceField)) || 0) : 0;

      var oMatrixModel = new JSONModel({
        matrixType:    matrixType,
        title:         matrixType === "inherent" ? "Inherent Risk Matrix" : "Residual Risk Matrix",
        selectedL:     selL,
        selectedC:     selC,
        selectedLabel: selL && selC ? ("L" + selL + " × C" + selC + " = " + (selL * selC) + " — " + riskColor(selL * selC).label) : "None selected",
        selectedState: selL && selC ? stateForScore(selL * selC) : "None",
        inherentHtml:  buildMatrixHtml("inherent", matrixType === "inherent" ? selL : 0, matrixType === "inherent" ? selC : 0),
        residualHtml:  buildMatrixHtml("residual", matrixType === "residual" ? selL : 0, matrixType === "residual" ? selC : 0)
      });

      if (_oDialog) {
        _oDialog.setModel(oMatrixModel, "matrix");
        _oDialog.getContent()[0].byId
          ? null
          : null;
        // Switch to correct tab
        var oTabBar = _oDialog.getContent()[0].getItems
          ? _oDialog.getContent()[0].getItems().find(function (c) { return c.isA && c.isA("sap.m.IconTabBar"); })
          : null;
        if (oTabBar) oTabBar.setSelectedKey(matrixType);
        _oDialog.open();
        oSelf._attachCellClickHandlers(_oDialog, oMatrixModel);
        return;
      }

      Fragment.load({
        id:         (_oView && _oView.getId()) || "riskMatrixFrag",
        name:       "BridgeManagement.adminbridges.ext.view.RiskMatrix",
        controller: oSelf
      }).then(function (oFrag) {
        _oDialog = oFrag;
        _oDialog.setModel(oMatrixModel, "matrix");
        if (_oView) _oView.addDependent(_oDialog);

        var oTabBar = _oDialog.getContent()[0].getItems
          ? _oDialog.getContent()[0].getItems().find(function (c) { return c.isA && c.isA("sap.m.IconTabBar"); })
          : null;
        if (oTabBar) oTabBar.setSelectedKey(matrixType);

        _oDialog.open();
        oSelf._attachCellClickHandlers(_oDialog, oMatrixModel);
      }).catch(function (e) {
        MessageToast.show("Could not open Risk Matrix dialog: " + e.message);
      });
    },

    // ── Cell click via DOM event delegation ─────────────────────────────────

    _attachCellClickHandlers: function (oDialog, oMatrixModel) {
      var oSelf = this;
      // Use a short timeout to allow DOM rendering of the HTML controls
      setTimeout(function () {
        var domRef = oDialog.getDomRef ? oDialog.getDomRef() : null;
        if (!domRef) return;

        // Remove old listener to avoid duplicates
        if (oDialog.__riskClickHandler) {
          domRef.removeEventListener("click", oDialog.__riskClickHandler);
        }

        oDialog.__riskClickHandler = function (e) {
          var td = e.target.closest ? e.target.closest("td[data-l]") : null;
          if (!td) return;
          var l = parseInt(td.getAttribute("data-l"), 10);
          var c = parseInt(td.getAttribute("data-c"), 10);
          if (!l || !c) return;

          oSelf._selectCell(oMatrixModel, l, c);
        };

        domRef.addEventListener("click", oDialog.__riskClickHandler);
      }, 150);
    },

    _selectCell: function (oMatrixModel, l, c) {
      var matrixType = oMatrixModel.getProperty("/matrixType");
      var score = l * c;
      var clr = riskColor(score);

      oMatrixModel.setProperty("/selectedL", l);
      oMatrixModel.setProperty("/selectedC", c);
      oMatrixModel.setProperty("/selectedLabel", "L" + l + " × C" + c + " = " + score + " — " + clr.label);
      oMatrixModel.setProperty("/selectedState", stateForScore(score));

      // Rebuild both HTML tables with the new selection
      oMatrixModel.setProperty("/inherentHtml", buildMatrixHtml(
        "inherent",
        matrixType === "inherent" ? l : 0,
        matrixType === "inherent" ? c : 0
      ));
      oMatrixModel.setProperty("/residualHtml", buildMatrixHtml(
        "residual",
        matrixType === "residual" ? l : 0,
        matrixType === "residual" ? c : 0
      ));

      // Re-attach click handler after HTML rebuild
      if (_oDialog) {
        this._attachCellClickHandlers(_oDialog, oMatrixModel);
      }
    },

    // ── Tab switch ────────────────────────────────────────────────────────────

    onRiskMatrixTabSelect: function (oEvent) {
      var key = oEvent.getParameter("key");
      if (!_oDialog) return;
      var oMatrixModel = _oDialog.getModel("matrix");
      if (!oMatrixModel) return;
      oMatrixModel.setProperty("/matrixType", key);
      // Re-attach handlers for newly active tab's DOM
      this._attachCellClickHandlers(_oDialog, oMatrixModel);
    },

    // ── Apply ─────────────────────────────────────────────────────────────────

    onRiskMatrixApply: function () {
      if (!_oDialog) return;
      var oMatrixModel = _oDialog.getModel("matrix");
      if (!oMatrixModel) return;

      var matrixType = oMatrixModel.getProperty("/matrixType");
      var selL = oMatrixModel.getProperty("/selectedL");
      var selC = oMatrixModel.getProperty("/selectedC");

      if (!selL || !selC) {
        MessageToast.show("Please select a cell in the matrix first.");
        return;
      }

      var oContext = _oView && _oView.getBindingContext();
      if (!oContext) {
        MessageToast.show("No binding context — cannot save.");
        _oDialog.close();
        return;
      }

      var likelihoodField  = matrixType === "inherent" ? "likelihood"        : "residualLikelihood";
      var consequenceField = matrixType === "inherent" ? "consequence"       : "residualConsequence";

      oContext.setProperty(likelihoodField, selL);
      oContext.setProperty(consequenceField, selC);

      var oModel = _oView.getModel();
      if (oModel && oModel.submitBatch) {
        oModel.submitBatch("$auto").then(function () {
          MessageToast.show("Risk scores updated.");
        }).catch(function (e) {
          MessageToast.show("Save failed: " + (e.message || "Unknown error"));
        });
      } else {
        MessageToast.show("Risk values set — save the record to persist.");
      }

      _oDialog.close();
    },

    // ── Cancel ────────────────────────────────────────────────────────────────

    onRiskMatrixCancel: function () {
      if (_oDialog) _oDialog.close();
    }

  };
});
