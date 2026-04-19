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
  "sap/ui/layout/form/SimpleForm"
], function (
  Controller, JSONModel, MessageToast, MessageBox,
  Dialog, Button, VBox, HBox, Title, Text, Label,
  ObjectStatus, ProgressIndicator, List, CustomListItem, Icon, SimpleForm
) {
  "use strict";

  // ── Severity helpers ──────────────────────────────────────────────────────
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

  function enrichBridge(b) {
    return {
      ...b,
      maxSeverityState: severityState(b.maxSeverity),
      maxSeverityLabel: severityLabel(b.maxSeverity),
      maxSeverityIcon:  severityIcon(b.maxSeverity),
      completenessState: completenessState(b.completenessScore)
    };
  }

  return Controller.extend("BridgeManagement.dataquality.controller.Main", {

    onInit: function () {
      this._allBridges = [];
      this._qualityModel = new JSONModel({ bridges: [] });
      this.getView().setModel(this._qualityModel, "quality");
      this._loadSummary();
      this._loadIssues();
    },

    // ── Summary KPIs ──────────────────────────────────────────────────────
    _loadSummary: function () {
      fetch("/quality/api/summary", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          this.byId("kpiTotalBridgesVal").setValue(data.totalBridges || 0);
          this.byId("kpiIssuesFoundVal").setValue(data.issueCount || 0);
          this.byId("kpiCriticalVal").setValue(data.criticalCount || 0);
          this.byId("kpiCompletenessVal").setValue(data.completenessPercent || 0);
        })
        .catch(err => {
          MessageBox.error("Failed to load quality summary: " + err.message);
        });
    },

    // ── Issues table ──────────────────────────────────────────────────────
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
        .catch(err => {
          view.setBusy(false);
          MessageBox.error("Failed to load quality issues: " + err.message);
        });
    },

    _applyFilters: function () {
      const sev   = this.byId("filterSeverity").getSelectedKey().toLowerCase();
      const state = (this.byId("filterState").getValue() || "").trim().toUpperCase();
      const name  = (this.byId("filterName").getValue() || "").trim().toLowerCase();

      let filtered = this._allBridges;

      if (sev) {
        filtered = filtered.filter(b =>
          b.maxSeverity === sev ||
          (b.issues || []).some(i => i.severity === sev)
        );
      }
      if (state) {
        filtered = filtered.filter(b => (b.state || "").toUpperCase() === state);
      }
      if (name) {
        filtered = filtered.filter(b =>
          (b.bridgeName || "").toLowerCase().includes(name) ||
          (b.bridgeId   || "").toLowerCase().includes(name)
        );
      }

      const table = this.byId("issueTable");
      const model = new JSONModel({ bridges: filtered });
      table.setModel(model, "quality");
      table.bindRows("quality>/bridges");

      this.byId("issueTableCount").setText(filtered.length + " bridge(s)");
    },

    // ── Filter handlers ───────────────────────────────────────────────────
    onFilterChange: function () {
      this._applyFilters();
    },

    onResetFilters: function () {
      this.byId("filterSeverity").setSelectedKey("");
      this.byId("filterState").setValue("");
      this.byId("filterName").setValue("");
      this._applyFilters();
    },

    onRefresh: function () {
      this._loadSummary();
      this._loadIssues();
    },

    onKpiPress: function () {
      // no-op – tiles are decorative
    },

    // ── View Details dialog ───────────────────────────────────────────────
    onViewDetails: function (oEvent) {
      const oRow  = oEvent.getSource().getParent();
      const oCtx  = oRow.getBindingContext("quality");
      if (!oCtx) return;
      const bridge = oCtx.getObject();
      this._openDetailDialog(bridge);
    },

    _openDetailDialog: function (bridge) {
      // Build issue list items
      const issueList = new List({ mode: "None", noDataText: "No issues found." });
      (bridge.issues || []).forEach(issue => {
        const row = new HBox({ alignItems: "Start", class: "sapUiTinyMarginTop sapUiTinyMarginBottom" });

        const icon = new Icon({
          src: severityIcon(issue.severity),
          color: issue.severity === "critical"
            ? "var(--sapErrorColor)"
            : issue.severity === "warning"
              ? "var(--sapWarningColor)"
              : "var(--sapInformationColor)",
          class: "sapUiSmallMarginEnd",
          size: "1rem"
        });

        const categoryText = new Text({ text: issue.category, wrapping: false });
        categoryText.addStyleClass(
          issue.severity === "critical" ? "bmsQualityCritical" :
          issue.severity === "warning"  ? "bmsQualityWarning"  : "bmsQualityInfo"
        );

        const msgText = new Text({ text: ": " + issue.message });

        row.addItem(icon);
        row.addItem(categoryText);
        row.addItem(msgText);

        issueList.addItem(new CustomListItem({ content: [row] }));
      });

      const completenessBar = new ProgressIndicator({
        percentValue: bridge.completenessScore,
        displayValue: bridge.completenessScore + "%",
        state: completenessState(bridge.completenessScore),
        showValue: true,
        width: "220px"
      });

      const content = new VBox({ class: "sapUiSmallMargin" });
      content.addItem(new Title({ text: "Bridge Information", level: "H4", class: "sapUiSmallMarginBottom" }));
      content.addItem(this._infoRow("Bridge ID",   bridge.bridgeId  || "—"));
      content.addItem(this._infoRow("Bridge Name", bridge.bridgeName || "—"));
      content.addItem(this._infoRow("State",        bridge.state     || "—"));
      content.addItem(new HBox({
        alignItems: "Center",
        class: "sapUiTinyMarginTop sapUiTinyMarginBottom",
        items: [
          new Label({ text: "Completeness", width: "140px" }),
          completenessBar
        ]
      }));
      content.addItem(new HBox({
        alignItems: "Center",
        class: "sapUiTinyMarginTop sapUiSmallMarginBottom",
        items: [
          new Label({ text: "Max Severity", width: "140px" }),
          new ObjectStatus({
            text: severityLabel(bridge.maxSeverity),
            state: severityState(bridge.maxSeverity),
            icon: severityIcon(bridge.maxSeverity)
          })
        ]
      }));
      content.addItem(new Title({ text: "Issues (" + bridge.issueCount + ")", level: "H4", class: "sapUiSmallMarginTop sapUiSmallMarginBottom" }));
      content.addItem(issueList);

      const dialog = new Dialog({
        title: "Issue Details — " + (bridge.bridgeName || bridge.bridgeId || "Bridge"),
        contentWidth: "580px",
        resizable: true,
        draggable: true,
        content: [content],
        beginButton: new Button({
          text: "Close",
          type: "Emphasized",
          press: function () { dialog.close(); }
        }),
        afterClose: function () { dialog.destroy(); }
      });

      this.getView().addDependent(dialog);
      dialog.open();
    },

    _infoRow: function (label, value) {
      return new HBox({
        alignItems: "Center",
        class: "sapUiTinyMarginTop sapUiTinyMarginBottom",
        items: [
          new Label({ text: label, width: "140px" }),
          new Text({ text: value })
        ]
      });
    },

    // ── CSV Export ────────────────────────────────────────────────────────
    onExportCsv: function () {
      const model = this.byId("issueTable").getModel("quality");
      if (!model) { MessageToast.show("No data to export."); return; }

      const bridges = model.getProperty("/bridges") || [];
      if (!bridges.length) { MessageToast.show("No data to export."); return; }

      const escape = v => {
        const s = (v == null ? "" : String(v));
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? '"' + s.replace(/"/g, '""') + '"' : s;
      };

      const FIELDS  = ["bridgeId", "bridgeName", "state", "issueCount", "maxSeverity", "completenessScore"];
      const HEADERS = ["Bridge ID", "Bridge Name", "State", "Issue Count", "Max Severity", "Completeness %"];

      // Flatten: one row per bridge + expand issues into extra columns
      const rows = [];
      for (const b of bridges) {
        const base = FIELDS.map(f => escape(b[f]));
        (b.issues || []).forEach((issue, i) => {
          base.push(escape(`[${issue.severity}] ${issue.category}: ${issue.message}`));
        });
        rows.push(base.join(","));
      }

      // Dynamic header: Bridge fields + Issue 1, Issue 2, ...
      const maxIssues = Math.max(...bridges.map(b => (b.issues || []).length), 0);
      const issueHeaders = Array.from({ length: maxIssues }, (_, i) => `Issue ${i + 1}`);
      const header = [...HEADERS, ...issueHeaders].join(",");

      const csv = [header, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "BMS_DataQuality_" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      MessageToast.show("Export downloaded.");
    }
  });
});
