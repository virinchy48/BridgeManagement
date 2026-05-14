sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Input",
  "sap/m/Select",
  "sap/m/Button",
  "sap/m/VBox",
  "sap/m/Label",
  "sap/ui/core/Item",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Input, Select, Button, VBox, Label, Item,  FormattedText) {
  "use strict";

  var BASE = "/odata/v4/admin";
  var ATTR_API = "/attributes/api";
  var DATA_TYPES = ["Text","Integer","Decimal","Date","Boolean","SingleSelect","MultiSelect"];
  var OBJECT_TYPES = ["bridge","restriction"];
  var STATUS_OPTS = ["Active","Inactive"];

  return Controller.extend("BridgeManagement.attributesadmin.AttributesAdmin", {

    _getCsrfToken: function () {
      if (this._csrfToken) return Promise.resolve(this._csrfToken);
      return fetch(BASE + "/AttributeDefinitions", { method: "HEAD", credentials: "same-origin", headers: { "X-CSRF-Token": "Fetch" } })
        .then(function (r) { this._csrfToken = r.headers.get("X-CSRF-Token"); return this._csrfToken; }.bind(this))
        .catch(function () { throw new Error("CSRF token fetch failed — reload the page"); }.bind(this));
    },

    _mutate: function (url, method, body) {
      return this._getCsrfToken().then(function (token) {
        return fetch(url, {
          method: method, credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: body != null ? JSON.stringify(body) : undefined
        }).then(function (r) {
          if (!r.ok) return r.json().then(function (e) { return Promise.reject(new Error(e.error && e.error.message || r.statusText)); });
          return r;
        });
      });
    },

    onInit: function () {
      this._objectType = "bridge";
      this._selectedGroup = null;
      this._selectedAttr = null;
      this._loadGroups();
    },

    // ── Data loaders ────────────────────────────────────────────────────────

    _loadGroups: function () {
      var self = this;
      fetch(BASE + "/AttributeGroups?$filter=objectType eq '" + self._objectType + "'&$orderby=displayOrder")
        .then(function (groupResponse) { return groupResponse.json(); })
        .then(function (groupData) {
          self.byId("groupList").setModel(new JSONModel(groupData.value || []));
          self._selectedGroup = null;
          self.byId("defsPanel").setVisible(false);
          self.byId("attrDetailPanel").setVisible(false);
        })
        .catch(function (err) { MessageBox.error("Failed to load groups: " + err.message); });
    },

    _loadAttributes: function (groupId) {
      var self = this;
      fetch(BASE + "/AttributeDefinitions?$filter=group_ID eq '" + groupId + "'&$orderby=displayOrder")
        .then(function (attributeResponse) { return attributeResponse.json(); })
        .then(function (attributeData) {
          self.byId("attrList").setModel(new JSONModel(attributeData.value || []));
          self._selectedAttr = null;
          self.byId("attrDetailPanel").setVisible(false);
        })
        .catch(function (err) { MessageBox.error("Failed to load attributes: " + err.message); });
    },

    _loadAttrDetail: function (attrId) {
      var self = this;
      Promise.all([
        fetch(BASE + "/AttributeDefinitions('" + attrId + "')").then(function (r) { return r.json(); }),
        fetch(BASE + "/AttributeAllowedValues?$filter=attribute_ID eq '" + attrId + "'&$orderby=displayOrder").then(function (r) { return r.json(); }),
        fetch(BASE + "/AttributeObjectTypeConfig?$filter=attribute_ID eq '" + attrId + "'").then(function (r) { return r.json(); })
      ]).then(function (results) {
        var attr = results[0];
        var allowedValues = results[1].value || [];
        var objectTypeConfigs = results[2].value || [];

        self.byId("detailName").setText(attr.name || "");
        self.byId("detailKey").setText(attr.internalKey || "");
        self.byId("detailType").setText(attr.dataType || "");
        self.byId("detailUnit").setText(attr.unit || "");
        self.byId("detailHelp").setText(attr.helpText || "");
        self.byId("detailMin").setText(attr.minValue != null ? String(attr.minValue) : "");
        self.byId("detailMax").setText(attr.maxValue != null ? String(attr.maxValue) : "");
        self.byId("detailStatus").setText(attr.status || "");

        self.byId("allowedValuesTable").setModel(new JSONModel(allowedValues));

        var existingByType = {};
        objectTypeConfigs.forEach(function (objectTypeConfig) { existingByType[objectTypeConfig.objectType] = objectTypeConfig; });
        var configRows = OBJECT_TYPES.map(function (objectType) {
          return existingByType[objectType] || { objectType: objectType, enabled: false, required: false, displayOrder: null, ID: null, attribute_ID: attrId };
        });
        self.byId("configTable").setModel(new JSONModel(configRows));

        self.byId("attrDetailPanel").setVisible(true);
      }).catch(function (err) { MessageBox.error("Failed to load attribute details: " + err.message); });
    },

    // ── Selection handlers ───────────────────────────────────────────────────

    onObjectTypeChange: function (oEvent) {
      this._objectType = oEvent.getParameter("item").getKey();
      this._loadGroups();
    },

    onGroupSelect: function (oEvent) {
      var ctx = oEvent.getParameter("listItem").getBindingContext();
      this._selectedGroup = ctx.getObject();
      this.byId("defsPanel").setVisible(true);
      this._loadAttributes(this._selectedGroup.ID);
    },

    onAttrSelect: function (oEvent) {
      var ctx = oEvent.getParameter("listItem").getBindingContext();
      this._selectedAttr = ctx.getObject();
      this._loadAttrDetail(this._selectedAttr.ID);
    },

    // ── Group CRUD ──────────────────────────────────────────────────────────

    onAddGroup: function () {
      var self = this;
      self._showFormDialog("Add Attribute Group", [
        { label: "Group Name", id: "dlg-name", required: true },
        { label: "Internal Key", id: "dlg-key", required: true },
        { label: "Display Order", id: "dlg-order", type: "number" }
      ], function (vals) {
        self._mutate(BASE + "/AttributeGroups", "POST", { name: vals["dlg-name"], internalKey: vals["dlg-key"], objectType: self._objectType, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: "Active" })
          .then(function () { self._loadGroups(); MessageToast.show("Group created."); })
          .catch(function (error) { MessageBox.error("Failed to create group: " + error.message); });
      });
    },

    onEditGroup: function () {
      if (!this._selectedGroup) return;
      var self = this;
      var selectedGroup = self._selectedGroup;
      self._showFormDialog("Edit Group: " + selectedGroup.name, [
        { label: "Group Name", id: "dlg-name", value: selectedGroup.name, required: true },
        { label: "Display Order", id: "dlg-order", value: String(selectedGroup.displayOrder || 0), type: "number" },
        { label: "Status", id: "dlg-status", type: "select", options: STATUS_OPTS, value: selectedGroup.status }
      ], function (vals) {
        self._mutate(BASE + "/AttributeGroups('" + selectedGroup.ID + "')", "PATCH", { name: vals["dlg-name"], displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
          .then(function () { self._loadGroups(); MessageToast.show("Group updated."); })
          .catch(function (error) { MessageBox.error("Failed to update group: " + error.message); });
      });
    },

    onDeleteGroup: function () {
      if (!this._selectedGroup) return;
      var self = this;
      MessageBox.confirm("Delete group \"" + self._selectedGroup.name + "\"? This will also delete its attribute definitions.", {
        onClose: function (action) {
          if (action !== "OK") return;
          self._mutate(BASE + "/AttributeGroups('" + self._selectedGroup.ID + "')", "DELETE", null)
            .then(function () { self._loadGroups(); MessageToast.show("Group deleted."); })
            .catch(function (error) { MessageBox.error("Failed to delete group: " + error.message); });
        }
      });
    },

    // ── Attribute CRUD ───────────────────────────────────────────────────────

    onAddAttribute: function () {
      if (!this._selectedGroup) return;
      var self = this;
      self._showFormDialog("Add Attribute", [
        { label: "Attribute Name", id: "dlg-name", required: true },
        { label: "Internal Key", id: "dlg-key", required: true },
        { label: "Data Type", id: "dlg-type", type: "select", options: DATA_TYPES, required: true },
        { label: "Unit", id: "dlg-unit" },
        { label: "Help Text", id: "dlg-help" },
        { label: "Display Order", id: "dlg-order", type: "number" },
        { label: "Min Value (numeric types)", id: "dlg-min", type: "number" },
        { label: "Max Value (numeric types)", id: "dlg-max", type: "number" }
      ], function (vals) {
        self._mutate(BASE + "/AttributeDefinitions", "POST", {
          group_ID: self._selectedGroup.ID,
          objectType: self._objectType,
          name: vals["dlg-name"],
          internalKey: vals["dlg-key"],
          dataType: vals["dlg-type"],
          unit: vals["dlg-unit"] || null,
          helpText: vals["dlg-help"] || null,
          displayOrder: parseInt(vals["dlg-order"] || "0", 10),
          minValue: vals["dlg-min"] ? parseFloat(vals["dlg-min"]) : null,
          maxValue: vals["dlg-max"] ? parseFloat(vals["dlg-max"]) : null,
          status: "Active"
        })
          .then(function () { self._loadAttributes(self._selectedGroup.ID); MessageToast.show("Attribute created."); })
          .catch(function (error) { MessageBox.error("Failed: " + error.message); });
      });
    },

    onEditAttribute: function () {
      if (!this._selectedAttr) return;
      var self = this;
      var selectedAttribute = self._selectedAttr;
      self._showFormDialog("Edit Attribute: " + selectedAttribute.name, [
        { label: "Attribute Name", id: "dlg-name", value: selectedAttribute.name, required: true },
        { label: "Unit", id: "dlg-unit", value: selectedAttribute.unit || "" },
        { label: "Help Text", id: "dlg-help", value: selectedAttribute.helpText || "" },
        { label: "Display Order", id: "dlg-order", value: String(selectedAttribute.displayOrder || 0), type: "number" },
        { label: "Status", id: "dlg-status", type: "select", options: STATUS_OPTS, value: selectedAttribute.status }
      ], function (vals) {
        self._mutate(BASE + "/AttributeDefinitions('" + selectedAttribute.ID + "')", "PATCH", { name: vals["dlg-name"], unit: vals["dlg-unit"] || null, helpText: vals["dlg-help"] || null, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
          .then(function () { self._loadAttributes(self._selectedGroup.ID); self._loadAttrDetail(selectedAttribute.ID); MessageToast.show("Attribute updated."); })
          .catch(function (error) { MessageBox.error("Failed: " + error.message); });
      });
    },

    onDeleteAttribute: function () {
      if (!this._selectedAttr) return;
      var self = this;
      MessageBox.confirm("Delete attribute \"" + self._selectedAttr.name + "\"?", {
        onClose: function (action) {
          if (action !== "OK") return;
          self._mutate(BASE + "/AttributeDefinitions('" + self._selectedAttr.ID + "')", "DELETE", null)
            .then(function () { self._loadAttributes(self._selectedGroup.ID); self.byId("attrDetailPanel").setVisible(false); MessageToast.show("Attribute deleted."); })
            .catch(function (error) { MessageBox.error(error.message); });
        }
      });
    },

    // ── Allowed Values ───────────────────────────────────────────────────────

    onAddAllowedValue: function () {
      if (!this._selectedAttr) return;
      var self = this;
      self._showFormDialog("Add Allowed Value", [
        { label: "Value (stored)", id: "dlg-val", required: true },
        { label: "Display Label", id: "dlg-label" },
        { label: "Display Order", id: "dlg-order", type: "number" }
      ], function (vals) {
        self._mutate(BASE + "/AttributeAllowedValues", "POST", { attribute_ID: self._selectedAttr.ID, value: vals["dlg-val"], label: vals["dlg-label"] || null, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: "Active" })
          .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Value added."); })
          .catch(function (error) { MessageBox.error("Failed: " + error.message); });
      });
    },

    onDeleteAllowedValue: function (oEvent) {
      var allowedValueContext = oEvent.getSource().getBindingContext();
      var allowedValue = allowedValueContext.getObject();
      var self = this;
      MessageBox.confirm("Delete allowed value \"" + allowedValue.value + "\"?", {
        onClose: function (action) {
          if (action !== "OK") return;
          self._mutate(BASE + "/AttributeAllowedValues('" + allowedValue.ID + "')", "DELETE", null)
            .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Value deleted."); })
            .catch(function (error) { MessageBox.error(error.message); });
        }
      });
    },

    // ── Object Type Config ───────────────────────────────────────────────────

    onConfigChange: function () {
      var self = this;
      var model = self.byId("configTable").getModel();
      var rows = model.getData();
      rows.forEach(function (row) {
        if (!row.ID) return;
        self._mutate(BASE + "/AttributeObjectTypeConfig('" + row.ID + "')", "PATCH", { enabled: row.enabled, required: row.required, displayOrder: row.displayOrder || null })
          .catch(function (err) { MessageToast.show("Config update failed: " + err.message); });
      });
    },

    onAddConfig: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext();
      var row = ctx.getObject();
      var self = this;
      self._mutate(BASE + "/AttributeObjectTypeConfig", "POST", { attribute_ID: row.attribute_ID, objectType: row.objectType, enabled: true, required: false })
        .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Config added."); })
        .catch(function (error) { MessageBox.error("Failed: " + error.message); });
    },

    // ── Template export ──────────────────────────────────────────────────────

    onExportTemplate: function (oEvent) {
      var ot = oEvent.getSource().data("objectType");
      window.open(ATTR_API + "/template?objectType=" + ot + "&format=xlsx", "_blank");
    },

    // ── Dialog helper ────────────────────────────────────────────────────────

    _showFormDialog: function (title, fields, onConfirm) {
      var content = new VBox({ width: "100%" });
      var inputMap = {};

      fields.forEach(function (dialogField) {
        var lbl = new Label({ text: dialogField.label, required: !!dialogField.required, labelFor: dialogField.id });
        var ctrl;
        if (dialogField.type === "select") {
          ctrl = new Select({ id: dialogField.id, width: "100%" });
          (dialogField.options || []).forEach(function (optionValue) { ctrl.addItem(new Item({ key: optionValue, text: optionValue })); });
          if (dialogField.value) ctrl.setSelectedKey(dialogField.value);
        } else {
          ctrl = new Input({ id: dialogField.id, value: dialogField.value || "", type: dialogField.type === "number" ? "Number" : "Text" });
        }
        inputMap[dialogField.id] = ctrl;
        content.addItem(new VBox({ items: [lbl, ctrl] }).addStyleClass("sapUiTinyMarginBottom"));
      });

      var dlg = new Dialog({
        title: title,
        content: [content],
        beginButton: new Button({
          text: "Confirm",
          type: "Emphasized",
          press: function () {
            var vals = {};
            var valid = true;
            fields.forEach(function (dialogField) {
              var ctrl = inputMap[dialogField.id];
              vals[dialogField.id] = ctrl.getSelectedKey ? ctrl.getSelectedKey() : ctrl.getValue();
              if (dialogField.required && !vals[dialogField.id]) {
                MessageToast.show(dialogField.label + " is required");
                valid = false;
              }
            });
            if (!valid) return;
            dlg.close();
            onConfirm(vals);
          }
        }),
        endButton: new Button({ text: "Cancel", press: function () { dlg.close(); } }),
        afterClose: function () { dlg.destroy(); }
      });
      dlg.open();
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>Attribute Configuration lets administrators define custom fields that appear on Bridge and Restriction records.</p>",
        "<h4>Three-Panel Layout</h4>",
        "<ul>",
        "<li><strong>Attribute Groups (left):</strong> organise attributes into logical sections. Toggle between Bridge and Restriction using the segmented button.</li>",
        "<li><strong>Attribute Definitions (middle):</strong> shows the attributes within the selected group. Click Add Attribute to create a new field.</li>",
        "<li><strong>Attribute Detail (right):</strong> shows data type, allowed values, object-type configuration, and required setting.</li>",
        "</ul>",
        "<h4>Data Types</h4>",
        "<p>Supported types: Text, Integer, Decimal, Date, Boolean, SingleSelect, MultiSelect. For Select types, add allowed values in the Allowed Values section.</p>",
        "<h4>Object Type Configuration</h4>",
        "<p>Each attribute can be enabled/required independently for Bridge and Restriction. Toggle <strong>Enabled</strong> to show the field, and <strong>Required</strong> to enforce entry on save.</p>",
        "<h4>Export Template</h4>",
        "<p>Use <strong>Export Template</strong> to download an Excel template pre-populated with all active custom attribute columns for use with Mass Upload.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "Attribute Configuration: Help",
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
