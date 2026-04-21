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
          var list = self.byId("groupList");
          var model = new JSONModel(groupData.value || []);
          list.setModel(model);
          list.bindItems({ path: "/", template: list.getBindingInfo("items").template });
          self._selectedGroup = null;
          self.byId("defsPanel").setVisible(false);
          self.byId("attrDetailPanel").setVisible(false);
        });
    },

    _loadAttributes: function (groupId) {
      var self = this;
      fetch(BASE + "/AttributeDefinitions?$filter=group_ID eq " + groupId + "&$orderby=displayOrder")
        .then(function (attributeResponse) { return attributeResponse.json(); })
        .then(function (attributeData) {
          var list = self.byId("attrList");
          var model = new JSONModel(attributeData.value || []);
          list.setModel(model);
          list.bindItems({ path: "/", template: list.getBindingInfo("items").template });
          self._selectedAttr = null;
          self.byId("attrDetailPanel").setVisible(false);
        });
    },

    _loadAttrDetail: function (attrId) {
      var self = this;
      Promise.all([
        fetch(BASE + "/AttributeDefinitions('" + attrId + "')").then(function (attributeResponse) { return attributeResponse.json(); }),
        fetch(BASE + "/AttributeAllowedValues?$filter=attribute_ID eq '" + attrId + "'&$orderby=displayOrder").then(function (allowedValuesResponse) { return allowedValuesResponse.json(); }),
        fetch(BASE + "/AttributeObjectTypeConfig?$filter=attribute_ID eq '" + attrId + "'").then(function (objectTypeConfigResponse) { return objectTypeConfigResponse.json(); })
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

        // Allowed values table
        var avModel = new JSONModel(allowedValues);
        self.byId("allowedValuesTable").setModel(avModel);
        self.byId("allowedValuesTable").bindItems({
          path: "/",
          template: self.byId("allowedValuesTable").getBindingInfo("items").template
        });

        // Config table — show existing + placeholder for missing object types
        var existingByType = {};
        objectTypeConfigs.forEach(function (objectTypeConfig) { existingByType[objectTypeConfig.objectType] = objectTypeConfig; });
        var configRows = OBJECT_TYPES.map(function (objectType) {
          return existingByType[objectType] || { objectType: objectType, enabled: false, required: false, displayOrder: null, ID: null, attribute_ID: attrId };
        });
        var cfgModel = new JSONModel(configRows);
        self.byId("configTable").setModel(cfgModel);
        self.byId("configTable").bindItems({
          path: "/",
          template: self.byId("configTable").getBindingInfo("items").template
        });

        self.byId("attrDetailPanel").setVisible(true);
      });
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
        fetch(BASE + "/AttributeGroups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: vals["dlg-name"], internalKey: vals["dlg-key"], objectType: self._objectType, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: "Active" })
        }).then(function (createGroupResponse) { if (!createGroupResponse.ok) throw new Error(createGroupResponse.statusText); return createGroupResponse.json(); })
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
        fetch(BASE + "/AttributeGroups('" + selectedGroup.ID + "')", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: vals["dlg-name"], displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
        }).then(function (updateGroupResponse) { if (!updateGroupResponse.ok) throw new Error(updateGroupResponse.statusText); })
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
          fetch(BASE + "/AttributeGroups('" + self._selectedGroup.ID + "')", { method: "DELETE" })
            .then(function (deleteGroupResponse) { if (!deleteGroupResponse.ok && deleteGroupResponse.status !== 204) throw new Error(deleteGroupResponse.statusText); })
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
        fetch(BASE + "/AttributeDefinitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
        }).then(function (createAttributeResponse) { if (!createAttributeResponse.ok) throw new Error(createAttributeResponse.statusText); return createAttributeResponse.json(); })
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
        fetch(BASE + "/AttributeDefinitions('" + selectedAttribute.ID + "')", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: vals["dlg-name"], unit: vals["dlg-unit"] || null, helpText: vals["dlg-help"] || null, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
        }).then(function (updateAttributeResponse) { if (!updateAttributeResponse.ok) throw new Error(updateAttributeResponse.statusText); })
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
          fetch(BASE + "/AttributeDefinitions('" + self._selectedAttr.ID + "')", { method: "DELETE" })
            .then(function (deleteAttributeResponse) {
              if (!deleteAttributeResponse.ok && deleteAttributeResponse.status !== 204) {
                return deleteAttributeResponse.json().then(function (errorBody) { throw new Error(errorBody.error?.message || deleteAttributeResponse.statusText); });
              }
            })
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
        fetch(BASE + "/AttributeAllowedValues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attribute_ID: self._selectedAttr.ID, value: vals["dlg-val"], label: vals["dlg-label"] || null, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: "Active" })
        }).then(function (createAllowedValueResponse) { if (!createAllowedValueResponse.ok) throw new Error(createAllowedValueResponse.statusText); })
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
          fetch(BASE + "/AttributeAllowedValues('" + allowedValue.ID + "')", { method: "DELETE" })
            .then(function (deleteAllowedValueResponse) {
              if (!deleteAllowedValueResponse.ok && deleteAllowedValueResponse.status !== 204) {
                return deleteAllowedValueResponse.json().then(function (errorBody) { throw new Error(errorBody.error?.message || deleteAllowedValueResponse.statusText); });
              }
            })
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
        fetch(BASE + "/AttributeObjectTypeConfig('" + row.ID + "')", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: row.enabled, required: row.required, displayOrder: row.displayOrder || null })
        }).catch(function () {});
      });
    },

    onAddConfig: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext();
      var row = ctx.getObject();
      var self = this;
      fetch(BASE + "/AttributeObjectTypeConfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribute_ID: row.attribute_ID, objectType: row.objectType, enabled: true, required: false })
      }).then(function (createConfigResponse) { if (!createConfigResponse.ok) throw new Error(createConfigResponse.statusText); })
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
        content.addItem(new VBox({ items: [lbl, ctrl], class: "sapUiTinyMarginBottom" }));
      });

      var dlg = new Dialog({
        title: title,
        content: [content],
        beginButton: new Button({
          text: "Confirm",
          type: "Emphasized",
          press: function () {
            var vals = {};
            fields.forEach(function (dialogField) {
              var ctrl = inputMap[dialogField.id];
              vals[dialogField.id] = ctrl.getSelectedKey ? ctrl.getSelectedKey() : ctrl.getValue();
              if (dialogField.required && !vals[dialogField.id]) {
                MessageToast.show(dialogField.label + " is required");
                return;
              }
            });
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
        title: "Attribute Configuration — Help",
        contentWidth: "480px",
        content: [new FormattedText({ htmlText: sHtml, width: "100%" })],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.addStyleClass("sapUiContentPadding");
      oDialog.open();
    }
  });
});
