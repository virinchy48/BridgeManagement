sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/IconTabFilter",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageToast, MessageBox, IconTabFilter, Dialog, Button,  FormattedText) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.SystemConfig", {

    onInit: function () {
      this._dirty           = new Map();
      this._currentCategory = null;
      // Initialise a default JSONModel so getModel() is never null
      this.getView().setModel(new JSONModel({ configs: [], filtered: [], categories: [] }));
      this._loadConfigs();
    },

    _loadConfigs: function () {
      fetch("/system/api/config")
        .then(res => res.json())
        .then(data => {
          const configs = data.configs || [];
          const model   = this.getView().getModel();
          model.setProperty("/configs", configs);

          const seen = {}, categoryOrder = [];
          configs.forEach(c => { if (!seen[c.category]) { seen[c.category] = true; categoryOrder.push(c.category); } });
          model.setProperty("/categories", categoryOrder);

          const tabBar = this.byId("categoryTabs");
          tabBar.removeAllItems();
          categoryOrder.forEach((cat, idx) => {
            tabBar.addItem(new IconTabFilter({ text: cat, count: String(configs.filter(c => c.category === cat).length), key: cat }));
            if (idx === 0) this._currentCategory = cat;
          });

          if (categoryOrder.length > 0) {
            tabBar.setSelectedKey(categoryOrder[0]);
            this._filterByCategory(categoryOrder[0]);
          }
        })
        .catch(err => MessageToast.show("Failed to load configuration: " + err.message));
    },

    _filterByCategory: function (category) {
      const model   = this.getView().getModel();
      const all     = model.getProperty("/configs") || [];
      model.setProperty("/filtered", all.filter(c => c.category === category));
      this._currentCategory = category;
    },

    onCategoryChange: function (oEvent) { this._filterByCategory(oEvent.getParameter("selectedKey")); },

    formatBoolValue: function (value) { return value === "true" || value === "1" || value === true; },

    onCheckBoxChange: function (oEvent) {
      const oCtx  = oEvent.getSource().getBindingContext();
      if (!oCtx) return;
      const key    = oCtx.getProperty("configKey");
      const newVal = oEvent.getParameter("selected") ? "true" : "false";
      const model  = this.getView().getModel();
      const filtered = model.getProperty("/filtered");
      const entry  = filtered.find(c => c.configKey === key);
      if (entry) entry.value = newVal;
      model.setProperty("/filtered", filtered);
      this._dirty.set(key, newVal);
      this.byId("saveBtn").setEnabled(true);
    },

    onValueChange: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext();
      if (!oCtx) return;
      this._dirty.set(oCtx.getProperty("configKey"), oEvent.getParameter("value"));
      this.byId("saveBtn").setEnabled(true);
    },

    onSaveChanges: function () {
      if (this._dirty.size === 0) { MessageToast.show("No changes to save."); return; }
      const promises = [];
      this._dirty.forEach((value, key) => {
        promises.push(
          fetch("/system/api/config/" + encodeURIComponent(key), {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value })
          }).then(res => {
            if (!res.ok) return res.json().then(e => { throw new Error(e.error?.message || "Failed to save " + key); });
            return res.json();
          })
        );
      });
      Promise.all(promises)
        .then(() => {
          const count = this._dirty.size;
          this._dirty.clear();
          this.byId("saveBtn").setEnabled(false);
          MessageToast.show(count + " setting(s) saved successfully.");
          this._loadConfigs();
        })
        .catch(err => MessageBox.error("Save failed: " + err.message));
    },

    onResetDefaults: function () {
      MessageBox.confirm("Reset all settings in the current category to their default values?", {
        title: "Reset to Defaults",
        onClose: action => {
          if (action !== MessageBox.Action.OK) return;
          const model    = this.getView().getModel();
          const filtered = model.getProperty("/filtered") || [];
          const toReset  = filtered.filter(c => !c.isReadOnly && c.value !== c.defaultValue);
          if (!toReset.length) { MessageToast.show("All settings are already at their default values."); return; }
          Promise.all(toReset.map(c =>
            fetch("/system/api/config/" + encodeURIComponent(c.configKey), {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: c.defaultValue })
            }).then(res => { if (!res.ok) return res.json().then(e => { throw new Error(e.error?.message || "Failed to reset"); }); return res.json(); })
          ))
          .then(() => {
            this._dirty.clear();
            this.byId("saveBtn").setEnabled(false);
            MessageToast.show(toReset.length + " setting(s) reset to defaults.");
            this._loadConfigs();
          })
          .catch(err => MessageBox.error("Reset failed: " + err.message));
        }
      });
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>System Configuration lets BMS administrators tune application-level settings without a code deployment: ",
        "controlling maintenance mode, performance limits, refresh intervals, and feature flags.</p>",
        "<h4>Editing a Setting</h4>",
        "<ol>",
        "<li>Find the setting in the table. Settings are grouped by category (e.g. <em>Application</em>, <em>Performance</em>, <em>Notifications</em>).</li>",
        "<li>Click the <strong>edit icon</strong> on the row or click directly on the value to edit it inline.</li>",
        "<li>Once you have made all your changes, click <strong>Save Changes</strong> in the header. Changes take effect immediately: no restart required.</li>",
        "</ol>",
        "<h4>Maintenance Mode</h4>",
        "<p>Setting <strong>appMaintenanceMode</strong> to <em>true</em> displays a banner across all BMS pages. ",
        "Set <strong>appMaintenanceMessage</strong> to the text users should see during maintenance windows.</p>",
        "<h4>Read-Only Settings</h4>",
        "<p>Some settings are marked as <strong>Read-Only</strong>: these are system constants that can only be changed via a deployment. They are shown for reference only.</p>",
        "<h4>Resetting to Defaults</h4>",
        "<p>Click <strong>Reset to Defaults</strong> to restore all editable settings to their factory values. You will be asked to confirm before changes are applied.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "System Configuration: Help",
        contentWidth: "480px",
        content: [new FormattedText({ htmlText: sHtml })],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.addStyleClass("sapUiContentPadding");
      oDialog.open();
    }
  });
});
