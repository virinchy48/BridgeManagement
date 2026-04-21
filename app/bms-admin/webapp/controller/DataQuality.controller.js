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
  "sap/m/FormattedText",
  "sap/m/Input",
  "sap/m/TextArea",
  "sap/m/Select",
  "sap/m/StepInput",
  "sap/m/Switch",
  "sap/m/CheckBox",
  "sap/ui/core/Item",
  "sap/m/ObjectNumber"
], function (Controller, JSONModel, MessageToast, MessageBox,
             Dialog, Btn, VBox, HBox, Title, Text, Label,
             ObjectStatus, ProgressIndicator, List, CustomListItem, Icon,
             ScrollContainer, FormattedText,
             Input, TextArea, Select, StepInput, Switch, CheckBox, Item, ObjectNumber) {
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
      default:         return "-";
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
      this._rulesModel = new JSONModel({ rules: [] });
      this.getView().setModel(this._rulesModel, "rules");
      this._loadSummary();
      this._loadIssues();
    },

    _loadSummary: function () {
      fetch("/quality/api/summary", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          this.byId("kpiTotalBridgesVal").setValue(data.totalBridges        || 0);
          this.byId("kpiIssuesFoundVal").setValue(data.issueCount           || 0);
          this.byId("kpiCriticalVal").setValue(data.criticalCount           || 0);
          this.byId("kpiCompletenessVal").setValue(data.completenessPercent || 0);
          this.byId("kpiWeightedScoreVal").setValue(data.avgWeightedScore   || 0);
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

    onRefresh: function () {
      const tab = this.byId("mainTabBar");
      const key = tab ? tab.getSelectedKey() : "dashboard";
      if (key === "rules") { this._loadSummary(); this._loadRules(); }
      else { this._loadSummary(); this._loadIssues(); }
    },

    onTabSelect: function (oEvent) {
      const key = oEvent.getParameter("key");
      if (key === "rules") this._loadRules();
    },

    onKpiPress: function () { /* decorative */ },

    _loadRules: function () {
      const view = this.getView();
      view.setBusy(true);
      fetch("/quality/api/rules", { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          view.setBusy(false);
          const rules = data.rules || [];
          this._rulesModel.setProperty("/rules", rules);
          const tbl = this.byId("rulesTable");
          tbl.setModel(this._rulesModel, "rules");
          tbl.bindRows("rules>/rules");
          this.byId("rulesCount").setText(rules.length + " rule(s)");
          this._renderWeightDist(rules);
        })
        .catch(err => { view.setBusy(false); MessageBox.error("Failed to load rules: " + err.message); });
    },

    _renderWeightDist: function (rules) {
      const cont = this.byId("weightDistContent");
      if (!cont) return;
      cont.destroyItems();
      const active = rules.filter(r => r.enabled);
      const total = active.reduce((s, r) => s + (r.weight || 10), 0);
      if (!total) { cont.addItem(new Text({ text: "No enabled rules." })); return; }
      const sorted = [...active].sort((a, b) => (b.weight || 10) - (a.weight || 10));
      sorted.forEach(rule => {
        const pct = Math.round(((rule.weight || 10) / total) * 100);
        const sev = rule.severity;
        const state = sev === "critical" ? "Error" : sev === "warning" ? "Warning" : "Information";
        const pi = new ProgressIndicator({
          percentValue: pct,
          displayValue: "w=" + rule.weight + " (" + pct + "%)",
          state: state, showValue: true, width: "300px"
        }).addStyleClass("sapUiSmallMarginBegin");
        const row = new HBox({ alignItems: "Center", items: [
          new Text({ text: rule.name, width: "240px", wrapping: false }),
          pi
        ]}).addStyleClass("sapUiTinyMarginTop");
        cont.addItem(row);
      });
    },

    onAddRule: function () {
      this._openRuleDialog(null);
    },

    onEditRule: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext("rules");
      if (!oCtx) return;
      this._openRuleDialog(Object.assign({}, oCtx.getObject()));
    },

    onDeleteRule: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext("rules");
      if (!oCtx) return;
      const rule = oCtx.getObject();
      MessageBox.confirm('Delete rule "' + rule.name + '"?', {
        onClose: (action) => {
          if (action !== MessageBox.Action.OK) return;
          fetch("/quality/api/rules/" + rule.id, { method: "DELETE", credentials: "same-origin" })
            .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || r.statusText))); return r.json(); })
            .then(() => { MessageToast.show("Rule deleted."); this._loadRules(); })
            .catch(err => MessageBox.error("Failed to delete: " + err.message));
        }
      });
    },

    onRuleToggle: function (oEvent) {
      const cb = oEvent.getSource();
      const oCtx = cb.getBindingContext("rules");
      if (!oCtx) return;
      const rule = oCtx.getObject();
      const enabled = oEvent.getParameter("selected");
      fetch("/quality/api/rules/" + rule.id, {
        method: "PUT", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, enabled })
      })
        .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || r.statusText))); return r.json(); })
        .then(() => this._loadRules())
        .catch(err => { MessageBox.error("Failed to update: " + err.message); this._loadRules(); });
    },

    _openRuleDialog: function (rule) {
      const isEdit = !!(rule && rule.id);
      const d = rule || { enabled: true, weight: 10, sortOrder: 0 };

      const oName = new Input({ value: d.name || "", placeholder: "Rule name" });
      const oCategory = new Input({ value: d.category || "", placeholder: "e.g. Missing Mandatory Field" });
      const oSeverity = new Select({ selectedKey: d.severity || "warning", items: [
        new Item({ key: "critical", text: "Critical" }),
        new Item({ key: "warning",  text: "Warning" }),
        new Item({ key: "info",     text: "Info" })
      ]});
      const BRIDGE_FIELDS = ["bridgeId","bridgeName","state","region","assetOwner","latitude","longitude",
        "structureType","condition","conditionRating","postingStatus","lastInspectionDate",
        "geoJson","yearBuilt","scourRisk","nhvrAssessed","freightRoute"];
      const oRuleType = new Select({ selectedKey: d.ruleType || "required_field", items: [
        new Item({ key: "required_field",               text: "Required Field" }),
        new Item({ key: "non_zero",                     text: "Non-Zero Value" }),
        new Item({ key: "not_older_than_days",          text: "Not Older Than Days" }),
        new Item({ key: "condition_requires_restriction", text: "Condition Requires Restriction" }),
        new Item({ key: "freight_requires_nhvr",        text: "Freight Requires NHVR" })
      ]});
      const oField = new Select({ selectedKey: d.field || "", items: [new Item({ key: "", text: "(none)" })].concat(
        BRIDGE_FIELDS.map(f => new Item({ key: f, text: f }))
      )});
      const oConfig = new TextArea({ value: d.config || "", placeholder: 'e.g. {"days":730}', rows: 2, width: "100%" });
      const oConfigHint = new Text({ text: "" });
      const oMessage = new TextArea({ value: d.message || "", placeholder: "Violation message shown to users", rows: 2, width: "100%" });
      const oWeight = new StepInput({ value: d.weight || 10, min: 1, max: 100, step: 5, width: "100%" });
      const oSortOrder = new StepInput({ value: d.sortOrder || 0, min: 0, step: 10, width: "100%" });
      const oEnabled = new Switch({ state: d.enabled !== false });

      const HINTS = {
        required_field: "Field required. No config needed.",
        non_zero: "Field required. No config needed.",
        not_older_than_days: 'Field required. Config: {"days": 730}',
        condition_requires_restriction: 'No field. Config: {"conditions": ["Poor","Critical"]}',
        freight_requires_nhvr: "No field or config needed."
      };
      const updateHint = () => {
        const rt = oRuleType.getSelectedKey();
        oConfigHint.setText(HINTS[rt] || "");
        const needsField = ["required_field","non_zero","not_older_than_days"].includes(rt);
        oField.setEnabled(needsField);
      };
      oRuleType.attachChange(updateHint);
      updateHint();

      const mkRow = (lbl, ctrl, required) => {
        const lb = new Label({ text: lbl, required: !!required });
        return new VBox({ items: [lb, ctrl] }).addStyleClass("sapUiTinyMarginTop");
      };

      const oWeightRow = new HBox({ items: [
        new VBox({ width: "50%", items: [new Label({ text: "Weight (1–100)" }), oWeight] }).addStyleClass("sapUiSmallMarginEnd"),
        new VBox({ width: "50%", items: [new Label({ text: "Sort Order" }), oSortOrder] })
      ]}).addStyleClass("sapUiTinyMarginTop");
      const oEnabledRow = new HBox({ alignItems: "Center", items: [
        new Label({ text: "Enabled", width: "80px" }), oEnabled
      ]}).addStyleClass("sapUiSmallMarginTop");

      const form = new VBox({ width: "100%", items: [
        mkRow("Name", oName, true),
        mkRow("Category", oCategory, true),
        mkRow("Severity", oSeverity, true),
        mkRow("Rule Type", oRuleType, true),
        mkRow("Field (bridge property)", oField),
        mkRow("Config JSON", oConfig),
        oConfigHint,
        mkRow("Violation Message", oMessage, true),
        oWeightRow,
        oEnabledRow
      ]});

      const oScrollContent = new VBox({ items: [form] }).addStyleClass("sapUiSmallMargin");
      const dialog = new Dialog({
        title: isEdit ? "Edit Rule" : "Add Rule",
        contentWidth: "520px", resizable: true, draggable: true,
        content: [new ScrollContainer({ height: "75vh", vertical: true, content: [oScrollContent] })],
        beginButton: new Btn({
          text: "Save", type: "Emphasized",
          press: () => {
            const payload = {
              name:      oName.getValue().trim(),
              category:  oCategory.getValue().trim(),
              severity:  oSeverity.getSelectedKey(),
              ruleType:  oRuleType.getSelectedKey(),
              field:     oField.getSelectedKey() || null,
              config:    oConfig.getValue().trim() || null,
              message:   oMessage.getValue().trim(),
              weight:    oWeight.getValue(),
              sortOrder: oSortOrder.getValue(),
              enabled:   oEnabled.getState()
            };
            if (!payload.name || !payload.category || !payload.message) {
              MessageToast.show("Name, category and message are required.");
              return;
            }
            const url    = isEdit ? "/quality/api/rules/" + rule.id : "/quality/api/rules";
            const method = isEdit ? "PUT" : "POST";
            fetch(url, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
              .then(r => { if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.error?.message || r.statusText))); return r.json(); })
              .then(() => { MessageToast.show(isEdit ? "Rule updated." : "Rule created."); dialog.close(); this._loadRules(); })
              .catch(err => MessageBox.error("Failed to save rule: " + err.message));
          }
        }),
        endButton: new Btn({ text: "Cancel", press: () => dialog.close() }),
        afterClose: () => dialog.destroy()
      });
      this.getView().addDependent(dialog);
      dialog.open();
    },

    onViewDetails: function (oEvent) {
      const oCtx = oEvent.getSource().getParent().getBindingContext("quality");
      if (!oCtx) return;
      this._openDetailDialog(oCtx.getObject());
    },

    _openDetailDialog: function (bridge) {
      const issueList = new List({ mode: "None" });
      (bridge.issues || []).forEach(issue => {
        const row = new HBox({ alignItems: "Start" }).addStyleClass("sapUiTinyMarginTop");
        row.addItem(new Icon({ src: severityIcon(issue.severity), size: "1rem" }).addStyleClass("sapUiSmallMarginEnd"));
        row.addItem(new Text({ text: "[" + issue.severity + "] " + issue.category + ": " + issue.message }));
        issueList.addItem(new CustomListItem({ content: [row] }));
      });

      const content = new VBox().addStyleClass("sapUiSmallMargin");
      content.addItem(new HBox({ alignItems: "Center", items: [new Label({ text: "Bridge ID",   width: "140px" }), new Text({ text: bridge.bridgeId  || "-" })] }).addStyleClass("sapUiTinyMarginTop"));
      content.addItem(new HBox({ alignItems: "Center", items: [new Label({ text: "Bridge Name", width: "140px" }), new Text({ text: bridge.bridgeName || "-" })] }).addStyleClass("sapUiTinyMarginTop"));
      content.addItem(new HBox({ alignItems: "Center", items: [new Label({ text: "State",        width: "140px" }), new Text({ text: bridge.state     || "-" })] }).addStyleClass("sapUiTinyMarginTop"));
      content.addItem(new HBox({ alignItems: "Center", items: [new Label({ text: "Completeness", width: "140px" }), new ProgressIndicator({ percentValue: bridge.completenessScore, displayValue: bridge.completenessScore + "%", state: completenessState(bridge.completenessScore), showValue: true, width: "220px" })] }).addStyleClass("sapUiTinyMarginTop"));
      content.addItem(new HBox({ alignItems: "Center", items: [new Label({ text: "Max Severity", width: "140px" }), new ObjectStatus({ text: severityLabel(bridge.maxSeverity), state: severityState(bridge.maxSeverity), icon: severityIcon(bridge.maxSeverity) })] }).addStyleClass("sapUiTinyMarginTop sapUiSmallMarginBottom"));
      content.addItem(new Title({ text: "Issues (" + bridge.issueCount + ")", level: "H4" }).addStyleClass("sapUiSmallMarginTop sapUiSmallMarginBottom"));
      content.addItem(issueList);

      const dialog = new Dialog({
        title: "Issue Details: " + (bridge.bridgeName || bridge.bridgeId || "Bridge"),
        contentWidth: "580px", resizable: true, draggable: true,
        content: [content],
        beginButton: new Btn({ text: "Close", type: "Emphasized", press: () => dialog.close() }),
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
          html: "<p><strong>Critical Issues</strong> counts violations rated as Critical: meaning data is missing or incorrect in a way that impairs safety or compliance.</p>" +
                "<p>Examples: missing GPS coordinates, no inspection record ever entered, critical condition with no restriction posted.</p>"
        },
        completeness: {
          title: "Average Completeness",
          html: "<p><strong>Average Completeness</strong> is the mean completeness score (0–100%) across all bridges, based on 13 key fields.</p>" +
                "<p>A score of 100% means all 13 key fields are populated. Scores below 70% are highlighted as warnings.</p>"
        },
        weightedScore: {
          title: "Avg Quality Score",
          html: "<p><strong>Avg Quality Score</strong> is the mean weighted quality score (0–100%) across all bridges.</p>" +
                "<p>Unlike plain completeness, this score weights each rule violation by its configured weight, giving higher-priority rules more influence on the overall score.</p>"
        }
      };
      var oEntry = oInfo[sKey] || { title: "Info", html: "<p>No additional information available.</p>" };
      this._openInfoDialog(oEntry.title, oEntry.html);
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>The Data Quality Dashboard automatically evaluates every bridge in BMS against a set of data quality rules: checking for missing mandatory fields, ",
        "stale inspections, missing geo-coordinates, poor/critical condition without an active restriction, and incomplete data.</p>",
        "<h4>KPI Tiles</h4>",
        "<ul>",
        "<li><strong>Total Bridges:</strong> count of all bridges in the system.</li>",
        "<li><strong>Bridges with Issues:</strong> count with at least one data quality violation.</li>",
        "<li><strong>Critical Issues:</strong> violations rated as critical (e.g. missing coordinates, no inspection ever recorded).</li>",
        "<li><strong>Avg Completeness:</strong> average completeness score across all bridges (13 key fields scored).</li>",
        "<li><strong>Avg Quality Score:</strong> weighted quality score — higher-weight rules have more influence on the overall score.</li>",
        "</ul>",
        "<h4>Filtering</h4>",
        "<p>Use the <strong>Filters</strong> panel to narrow results by <em>Severity</em> (Critical / Warning / Info), <em>State</em>, or <em>Bridge Name/ID</em>. Filters apply immediately.</p>",
        "<h4>Reviewing Issues</h4>",
        "<p>The <strong>Bridges with Data Issues</strong> table shows one row per bridge. Click <strong>View Details</strong> to see every individual rule violation along with the completeness score bar.</p>",
        "<h4>Rules Engine</h4>",
        "<p>Switch to the <strong>Rules Engine</strong> tab to view, create, edit, delete, and enable/disable data quality rules. Each rule has a weight that determines its contribution to the weighted quality score.</p>",
        "<h4>Severity Levels</h4>",
        "<ul>",
        "<li><strong>Critical:</strong> data is missing or incorrect in a way that impairs safety or compliance.</li>",
        "<li><strong>Warning:</strong> data is incomplete or potentially outdated.</li>",
        "<li><strong>Info:</strong> optional fields not yet populated.</li>",
        "</ul>",
        "<h4>Exporting</h4>",
        "<p>Click <strong>Export CSV</strong> to download all currently filtered bridge issues for offline review or reporting.</p>"
      ].join("");
      this._openInfoDialog("Data Quality Dashboard: Help", sHtml);
    },

    _openInfoDialog: function (title, html) {
      this.byId("infoDialog").setTitle(title);
      this.byId("infoDialogHtml").setHtmlText(html);
      this.byId("infoDialog").open();
    },

    onInfoDialogClose: function () {
      this.byId("infoDialog").close();
    }
  });
});
