sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, FormattedText) {
  "use strict";

  var BASE = "/odata/v4/admin/DataQualityRules";

  // Rule types that require a field name
  var FIELD_TYPES = ["required_field", "non_zero", "not_older_than_days"];

  var RULE_TYPE_DOCS = [
    { type: "required_field",                label: "required_field",                desc: "Fires when the specified bridge field is null or empty. Use for any field that should always have a value." },
    { type: "non_zero",                       label: "non_zero",                      desc: "Fires when a numeric field is null, zero, or not a finite number. Best for latitude and longitude which must be non-zero coordinates." },
    { type: "not_older_than_days",            label: "not_older_than_days",           desc: "Fires when a date field exists but is older than the configured number of days. Set config to {\"days\": 730} for a 2-year threshold. Does not fire if the field is null — pair with required_field to catch that." },
    { type: "condition_requires_restriction", label: "condition_requires_restriction", desc: "Fires when a bridge condition matches one of the configured values AND the bridge has no active restriction. Config: {\"conditions\": [\"Poor\", \"Critical\"]}." },
    { type: "freight_requires_nhvr",          label: "freight_requires_nhvr",          desc: "Fires when freightRoute is true but nhvrAssessed is false or null. No field or config needed." }
  ];

  return Controller.extend("BridgeManagement.bmsadmin.controller.DataQualityRules", {

    onInit: function () {
      this._model    = new JSONModel({ rules: [] });
      this._editId   = null;
      this.getView().setModel(this._model);
      this._loadRules();
    },

    _loadRules: function () {
      fetch(BASE + "?$orderby=sortOrder", { headers: { Accept: "application/json" } })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(d => {
          this._model.setProperty("/rules", d.value || []);
          this._updateCount((d.value || []).length);
        })
        .catch(e => MessageBox.error("Failed to load rules: " + e));
    },

    _updateCount: function (n) {
      this.byId("ruleCount").setText(n + " rule" + (n !== 1 ? "s" : ""));
    },

    onRefresh: function () { this._loadRules(); MessageToast.show("Refreshed."); },

    formatSeverityState: function (sev) {
      switch ((sev || "").toLowerCase()) {
        case "critical": return "Error";
        case "warning":  return "Warning";
        case "info":     return "Information";
        default:         return "None";
      }
    },

    // ── Toggle enabled ──────────────────────────────────────────────
    onToggleEnabled: function (oEvent) {
      const oCtx  = oEvent.getSource().getBindingContext();
      const rule  = oCtx.getObject();
      const state = oEvent.getParameter("state");
      fetch(BASE + "('" + encodeURIComponent(rule.id) + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ enabled: state })
      })
        .then(r => { if (!r.ok) throw new Error(r.statusText); })
        .catch(e => { MessageBox.error("Failed to update rule: " + e); this._loadRules(); });
    },

    // ── Add / Edit ──────────────────────────────────────────────────
    onAddRule: function () {
      this._editId = null;
      this._openDialog({
        name: "", category: "", severity: "warning",
        ruleType: "required_field", field: "", config: "", message: "", sortOrder: 0
      });
    },

    onEditRule: function (oEvent) {
      const rule = this._ruleFromEvent(oEvent);
      this._editId = rule.id;
      this._openDialog(rule);
    },

    _openDialog: function (rule) {
      const dlg = this.byId("ruleDialog");
      dlg.setTitle(this._editId ? "Edit Rule" : "Add Rule");
      this.byId("dlgName").setValue(rule.name || "");
      this.byId("dlgCategory").setValue(rule.category || "");
      this.byId("dlgSeverity").setSelectedKey(rule.severity || "warning");
      this.byId("dlgRuleType").setSelectedKey(rule.ruleType || "required_field");
      this.byId("dlgField").setValue(rule.field || "");
      this.byId("dlgConfig").setValue(rule.config || "");
      this.byId("dlgMessage").setValue(rule.message || "");
      this.byId("dlgSortOrder").setValue(rule.sortOrder || 0);
      this._updateFieldVisibility(rule.ruleType || "required_field");
      dlg.open();
    },

    onRuleTypeChange: function (oEvent) {
      this._updateFieldVisibility(oEvent.getParameter("selectedItem").getKey());
    },

    _updateFieldVisibility: function (ruleType) {
      const needsField = FIELD_TYPES.includes(ruleType);
      this.byId("dlgFieldLabel").setVisible(needsField);
      this.byId("dlgField").setVisible(needsField);
      const needsConfig = ruleType === "not_older_than_days" || ruleType === "condition_requires_restriction";
      this.byId("dlgConfigLabel").setVisible(needsConfig);
      this.byId("dlgConfig").setVisible(needsConfig);
    },

    onCancelDialog: function () { this.byId("ruleDialog").close(); },

    onSaveRule: function () {
      const name     = this.byId("dlgName").getValue().trim();
      const category = this.byId("dlgCategory").getValue().trim();
      const severity = this.byId("dlgSeverity").getSelectedKey();
      const ruleType = this.byId("dlgRuleType").getSelectedKey();
      const field    = this.byId("dlgField").getValue().trim();
      const config   = this.byId("dlgConfig").getValue().trim();
      const message  = this.byId("dlgMessage").getValue().trim();
      const sortOrder = parseInt(this.byId("dlgSortOrder").getValue(), 10) || 0;

      if (!name || !category || !message) {
        MessageToast.show("Name, Category and Message are required.");
        return;
      }
      if (FIELD_TYPES.includes(ruleType) && !field) {
        MessageToast.show("Field is required for this rule type.");
        return;
      }
      if (config) {
        try { JSON.parse(config); } catch (_) {
          MessageToast.show("Config must be valid JSON (e.g. {\"days\":730}).");
          return;
        }
      }

      const body = { name, category, severity, ruleType, field: field || null, config: config || null, message, sortOrder };
      const isEdit = !!this._editId;
      const url  = isEdit ? BASE + "('" + encodeURIComponent(this._editId) + "')" : BASE;

      fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body)
      })
        .then(r => {
          if (!r.ok) return r.json().then(e => { throw new Error(e.error?.message || r.statusText); });
          return r.json();
        })
        .then(() => {
          MessageToast.show(isEdit ? "Rule updated." : "Rule created.");
          this.byId("ruleDialog").close();
          this._loadRules();
        })
        .catch(e => MessageBox.error("Save failed: " + e.message));
    },

    // ── Delete ──────────────────────────────────────────────────────
    onDeleteRule: function (oEvent) {
      const rule = this._ruleFromEvent(oEvent);
      MessageBox.confirm("Delete rule \"" + rule.name + "\"?", {
        title: "Confirm Delete",
        onClose: action => {
          if (action !== MessageBox.Action.OK) return;
          fetch(BASE + "('" + encodeURIComponent(rule.id) + "')", {
            method: "DELETE", credentials: "same-origin"
          })
            .then(r => { if (!r.ok) throw new Error(r.statusText); })
            .then(() => { MessageToast.show("Rule deleted."); this._loadRules(); })
            .catch(e => MessageBox.error("Delete failed: " + e.message));
        }
      });
    },

    _ruleFromEvent: function (oEvent) {
      return oEvent.getSource().getBindingContext().getObject();
    },

    // ── Rule Type Reference dialog ──────────────────────────────────
    onShowRuleTypeRef: function () {
      var sHtml = [
        "<p><strong>Rule Type Reference</strong></p>",
        "<p>Each rule runs against every bridge when the Data Quality Dashboard loads. ",
        "Choose the <strong>Rule Type</strong> that matches what you want to check:</p>"
      ];
      RULE_TYPE_DOCS.forEach(function (rt) {
        sHtml.push(
          "<p><strong><code style='color:#0070f2'>" + rt.label + "</code></strong></p>",
          "<p>" + rt.desc + "</p>"
        );
      });
      sHtml.push(
        "<p><strong>Config JSON examples</strong></p>",
        "<ul>",
        "<li><code>not_older_than_days</code>: <code>{\"days\": 730}</code> — flag inspections older than 2 years</li>",
        "<li><code>condition_requires_restriction</code>: <code>{\"conditions\": [\"Poor\", \"Critical\"]}</code></li>",
        "</ul>",
        "<p><strong>Bridge fields you can reference</strong></p>",
        "<p>bridgeName · state · region · assetOwner · latitude · longitude · geoJson · condition · conditionRating · postingStatus · structureType · yearBuilt · lastInspectionDate · nhvrAssessed · freightRoute · scourRisk</p>"
      );
      var oDialog = new Dialog({
        title: "Rule Type Reference",
        contentWidth: "560px",
        contentHeight: "460px",
        content: [new FormattedText({ htmlText: sHtml.join(""), width: "100%" }).addStyleClass("sapUiSmallMargin")],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    },

    // ── Help dialog ─────────────────────────────────────────────────
    onShowHelp: function () {
      var sHtml = [
        "<p><strong>Data Quality Rules — How to Use</strong></p>",
        "<p><strong>Purpose</strong></p>",
        "<p>This page controls which checks are run against every bridge record when the <strong>Data Quality Dashboard</strong> loads. ",
        "Instead of hardcoded logic, rules live in the database — you can add, edit, disable, or delete them without a code deployment.</p>",
        "<p><strong>Adding a Rule</strong></p>",
        "<ol>",
        "<li>Click <strong>Add Rule</strong>.</li>",
        "<li>Give the rule a <em>Name</em> and <em>Category</em> (category groups related rules together in the dashboard).</li>",
        "<li>Choose a <em>Severity</em>: <strong>Critical</strong> (safety/compliance risk), <strong>Warning</strong> (data quality concern), or <strong>Info</strong> (optional field missing).</li>",
        "<li>Choose a <em>Rule Type</em> — click the <strong>ⓘ</strong> button for a full reference of what each type does.</li>",
        "<li>Fill in <em>Field</em> and <em>Config</em> if the rule type requires them.</li>",
        "<li>Write a clear <em>Message</em> — this is shown to the admin in the dashboard when the rule fires.</li>",
        "<li>Set <em>Sort Order</em> to control the order rules are evaluated (lower = earlier).</li>",
        "</ol>",
        "<p><strong>Enabling / Disabling Rules</strong></p>",
        "<p>Use the <strong>On/Off toggle</strong> on each row to enable or disable a rule without deleting it. ",
        "Disabled rules are skipped during evaluation — useful for rules you want to pause temporarily.</p>",
        "<p><strong>Editing or Deleting Rules</strong></p>",
        "<p>Click the <strong>Edit</strong> (pencil) icon to modify a rule, or the <strong>Delete</strong> (trash) icon to remove it permanently. ",
        "You will be asked to confirm before deletion.</p>",
        "<p><strong>When Do Rules Take Effect?</strong></p>",
        "<p>Rules are loaded fresh from the database every time the Data Quality Dashboard is opened — no server restart required. ",
        "Changes you make here are reflected the next time someone views the dashboard.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "Data Quality Rules — Help",
        contentWidth: "560px",
        contentHeight: "460px",
        content: [new FormattedText({ htmlText: sHtml, width: "100%" }).addStyleClass("sapUiSmallMargin")],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    }
  });
});
