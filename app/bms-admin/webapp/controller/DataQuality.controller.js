sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Title",
  "sap/m/Text",
  "sap/m/Label",
  "sap/m/ObjectStatus",
  "sap/m/ProgressIndicator",
  "sap/m/List",
  "sap/m/CustomListItem",
  "sap/ui/core/Icon",
  "sap/m/ScrollContainer",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageToast, MessageBox,
             Dialog, Button, VBox, HBox, Title, Text, Label,
             ObjectStatus, ProgressIndicator, List, CustomListItem, Icon,
             ScrollContainer, FormattedText) {
  "use strict";

  function severityState(sev) {
    switch ((sev || "").toLowerCase()) {
      case "critical": return "Error";
      case "warning":  return "Warning";
      case "info":     return "Information";
      default:         return "None";
    }
  }
  function severityLabel(sev) {
    switch ((sev || "").toLowerCase()) {
      case "critical": return "Critical";
      case "warning":  return "Warning";
      case "info":     return "Info";
      default:         return "—";
    }
  }
  function severityIcon(sev) {
    switch ((sev || "").toLowerCase()) {
      case "critical": return "sap-icon://message-error";
      case "warning":  return "sap-icon://message-warning";
      case "info":     return "sap-icon://message-information";
      default:         return "";
    }
  }
  function completenessState(pct) {
    if (pct >= 80) return "Success";
    if (pct >= 50) return "Warning";
    return "Error";
  }
  function enrichBridge(bridge) {
    return {
      ...bridge,
      maxSeverityState:  severityState(bridge.maxSeverity),
      maxSeverityLabel:  severityLabel(bridge.maxSeverity),
      maxSeverityIcon:   severityIcon(bridge.maxSeverity),
      completenessState: completenessState(bridge.completenessScore)
    };
  }

  return Controller.extend("BridgeManagement.bmsadmin.controller.DataQuality", {

    onInit: function () {
      this._allBridges   = [];
      this._qualityModel = new JSONModel({ bridges: [] });
      this.getView().setModel(this._qualityModel, "quality");
      this._loadSummary();
      this._loadIssues();
    },

    _loadSummary: function () {
      fetch("/quality/api/summary", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          this.byId("kpiTotalBridgesVal").setValue(data.totalBridges       || 0);
          this.byId("kpiIssuesFoundVal").setValue(data.issueCount          || 0);
          this.byId("kpiCriticalVal").setValue(data.criticalCount          || 0);
          this.byId("kpiCompletenessVal").setValue(data.completenessPercent || 0);
        })
        .catch(() => MessageBox.error("Failed to load quality summary."));
    },

    _loadIssues: function () {
      const view = this.getView();
      view.setBusy(true);
      fetch("/quality/api/issues", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          view.setBusy(false);
          this._allBridges = (data.bridges || []).map(enrichBridge);
          this._applyFilters();
        })
        .catch(err => { view.setBusy(false); MessageBox.error("Failed to load quality issues: " + err.message); });
    },

    _applyFilters: function () {
      const sev   = this.byId("filterSeverity").getSelectedKey().toLowerCase();
      const state = (this.byId("filterState").getValue() || "").trim().toUpperCase();
      const name  = (this.byId("filterName").getValue() || "").trim().toLowerCase();

      let filtered = this._allBridges;
      if (sev)   filtered = filtered.filter(b => b.maxSeverity === sev || (b.issues || []).some(i => i.severity === sev));
      if (state) filtered = filtered.filter(b => (b.state || "").toUpperCase() === state);
      if (name)  filtered = filtered.filter(b => (b.bridgeName || "").toLowerCase().includes(name) || (b.bridgeId || "").toLowerCase().includes(name));

      const table = this.byId("issueTable");
      table.setModel(new JSONModel({ bridges: filtered }), "quality");
      table.bindRows("quality>/bridges");
      this.byId("issueTableCount").setText(filtered.length + " bridge(s)");
    },

    onFilterChange: function () { this._applyFilters(); },
    onResetFilters: function () {
      this.byId("filterSeverity").setSelectedKey("");
      this.byId("filterState").setValue("");
      this.byId("filterName").setValue("");
      this._applyFilters();
    },
    onRefresh:   function () { this._loadSummary(); this._loadIssues(); },
    onKpiPress:  function () { /* decorative */ },

    onViewDetails: function (oEvent) {
      const oCtx = oEvent.getSource().getParent().getBindingContext("quality");
      if (!oCtx) return;
      this._openDetailDialog(oCtx.getObject());
    },

    _openDetailDialog: function (bridge) {
      const issueList = new List({ mode: "None" });
      (bridge.issues || []).forEach(issue => {
        const row = new HBox({ alignItems: "Start", class: "sapUiTinyMarginTop" });
        row.addItem(new Icon({ src: severityIcon(issue.severity), size: "1rem", class: "sapUiSmallMarginEnd" }));
        row.addItem(new Text({ text: "[" + issue.severity + "] " + issue.category + ": " + issue.message }));
        issueList.addItem(new CustomListItem({ content: [row] }));
      });

      const content = new VBox({ class: "sapUiSmallMargin" });
      content.addItem(new HBox({ alignItems: "Center", class: "sapUiTinyMarginTop", items: [new Label({ text: "Bridge ID",   width: "140px" }), new Text({ text: bridge.bridgeId  || "—" })] }));
      content.addItem(new HBox({ alignItems: "Center", class: "sapUiTinyMarginTop", items: [new Label({ text: "Bridge Name", width: "140px" }), new Text({ text: bridge.bridgeName || "—" })] }));
      content.addItem(new HBox({ alignItems: "Center", class: "sapUiTinyMarginTop", items: [new Label({ text: "State",        width: "140px" }), new Text({ text: bridge.state     || "—" })] }));
      content.addItem(new HBox({ alignItems: "Center", class: "sapUiTinyMarginTop", items: [new Label({ text: "Completeness", width: "140px" }), new ProgressIndicator({ percentValue: bridge.completenessScore, displayValue: bridge.completenessScore + "%", state: completenessState(bridge.completenessScore), showValue: true, width: "220px" })] }));
      content.addItem(new HBox({ alignItems: "Center", class: "sapUiTinyMarginTop sapUiSmallMarginBottom", items: [new Label({ text: "Max Severity", width: "140px" }), new ObjectStatus({ text: severityLabel(bridge.maxSeverity), state: severityState(bridge.maxSeverity), icon: severityIcon(bridge.maxSeverity) })] }));
      content.addItem(new Title({ text: "Issues (" + bridge.issueCount + ")", level: "H4", class: "sapUiSmallMarginTop sapUiSmallMarginBottom" }));
      content.addItem(issueList);

      const dialog = new Dialog({
        title: "Issue Details — " + (bridge.bridgeName || bridge.bridgeId || "Bridge"),
        contentWidth: "580px", resizable: true, draggable: true,
        content: [content],
        beginButton: new Button({ text: "Close", type: "Emphasized", press: () => dialog.close() }),
        afterClose: () => dialog.destroy()
      });
      this.getView().addDependent(dialog);
      dialog.open();
    },

    onExportCsv: function () {
      const model = this.byId("issueTable").getModel("quality");
      if (!model) { MessageToast.show("No data to export."); return; }
      const bridges = model.getProperty("/bridges") || [];
      if (!bridges.length) { MessageToast.show("No data to export."); return; }

      const escapeCsvCell  = bridgeCell => { const cellText = (bridgeCell == null ? "" : String(bridgeCell)); return cellText.includes(",") || cellText.includes('"') || cellText.includes("\n") ? '"' + cellText.replace(/"/g, '""') + '"' : cellText; };
      const FIELDS  = ["bridgeId","bridgeName","state","issueCount","maxSeverity","completenessScore"];
      const HEADERS = ["Bridge ID","Bridge Name","State","Issue Count","Max Severity","Completeness %"];
      const rows    = bridges.map(bridge => FIELDS.map(qualityField => escapeCsvCell(bridge[qualityField])).join(","));
      const csv     = [HEADERS.join(","), ...rows].join("\n");
      const downloadLink       = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })), download: "BMS_DataQuality_" + new Date().toISOString().slice(0,10) + ".csv" });
      downloadLink.click();
      URL.revokeObjectURL(downloadLink.href);
      MessageToast.show("Export downloaded.");
    },

    onTileInfo: function (oEvent) {
      var sKey = oEvent.getSource().data("tileKey");
      var oInfo = {
        totalBridges: {
          title: "Total Bridges",
          html: "<p><strong>Total Bridges</strong> is the count of all bridge records in the BMS register, regardless of their data quality status.</p>" +
                "<p>This is the baseline for the completeness and issue calculations below.</p>"
        },
        issuesFound: {
          title: "Bridges with Issues",
          html: "<p><strong>Bridges with Issues</strong> counts bridges that have at least one data quality rule violation of any severity (Critical, Warning, or Info).</p>" +
                "<p>Click this tile to filter the results table to show only bridges with issues.</p>"
        },
        critical: {
          title: "Critical Issues",
          html: "<p><strong>Critical Issues</strong> counts violations rated as Critical — meaning data is missing or incorrect in a way that impairs safety or compliance.</p>" +
                "<p>Examples: missing GPS coordinates, no inspection record ever entered, critical condition with no restriction posted.</p>"
        },
        completeness: {
          title: "Average Completeness",
          html: "<p><strong>Average Completeness</strong> is the mean completeness score (0–100%) across all bridges, based on 13 key fields.</p>" +
                "<p>A score of 100% means all 13 key fields are populated. Scores below 70% are highlighted as warnings.</p>"
        }
      };
      var oEntry = oInfo[sKey] || { title: "Info", html: "<p>No additional information available.</p>" };
      var oDialog = new Dialog({
        title: oEntry.title,
        contentWidth: "480px",
        content: [new ScrollContainer({ width: "100%", vertical: true,
          content: [new FormattedText({ htmlText: oEntry.html, width: "100%" }).addStyleClass("sapUiSmallMargin")]
        })],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    },

    onShowHelp: function () {
      var sHtml = [
        "<h2 style='margin-top:0'>Data Quality Dashboard — How to Use</h2>",
        "<h3>Purpose</h3>",
        "<p>The Data Quality Dashboard automatically evaluates every bridge in BMS against a set of data quality rules — checking for missing mandatory fields, ",
        "stale inspections, missing geo-coordinates, poor/critical condition without an active restriction, and incomplete data. ",
        "Use it to prioritise data remediation work across your asset register.</p>",
        "<h3>KPI Tiles</h3>",
        "<ul>",
        "<li><strong>Total Bridges</strong> — count of all bridges in the system.</li>",
        "<li><strong>Bridges with Issues</strong> — count with at least one data quality violation.</li>",
        "<li><strong>Critical Issues</strong> — violations rated as critical (e.g. missing coordinates, no inspection ever recorded).</li>",
        "<li><strong>Avg Completeness</strong> — average completeness score across all bridges (13 key fields scored).</li>",
        "</ul>",
        "<h3>Filtering</h3>",
        "<p>Use the <strong>Filters</strong> panel to narrow results by <em>Severity</em> (Critical / Warning / Info), <em>State</em>, or <em>Bridge Name/ID</em>. ",
        "Filters apply immediately — no Apply button needed.</p>",
        "<h3>Reviewing Issues</h3>",
        "<p>The <strong>Bridges with Data Issues</strong> table shows one row per bridge. Click <strong>View Details</strong> to see every individual rule violation for that bridge, ",
        "along with the completeness score bar.</p>",
        "<h3>Severity Levels</h3>",
        "<ul>",
        "<li><strong>Critical</strong> — data is missing or incorrect in a way that impairs safety or compliance (e.g. no coordinates, no inspection date).</li>",
        "<li><strong>Warning</strong> — data is incomplete or potentially outdated (e.g. stale inspection, missing condition rating).</li>",
        "<li><strong>Info</strong> — optional fields not yet populated (e.g. year built, structure type).</li>",
        "</ul>",
        "<h3>Exporting</h3>",
        "<p>Click <strong>Export CSV</strong> to download all currently filtered bridge issues for offline review or reporting.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "Data Quality Dashboard — Help",
        contentWidth: "580px",
        contentHeight: "460px",
        content: [new ScrollContainer({ width: "100%", height: "100%", vertical: true,
          content: [new FormattedText({ htmlText: sHtml, width: "100%" }).addStyleClass("sapUiSmallMargin")]
        })],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    }
  });
});
