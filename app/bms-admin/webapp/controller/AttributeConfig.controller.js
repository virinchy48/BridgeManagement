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
  "sap/ui/core/Item"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Input, Select, Button, VBox, Label, Item) {
  "use strict";

  var BASE = "/odata/v4/admin";
  var ATTR_API = "/attributes/api";
  var DATA_TYPES = ["Text","Integer","Decimal","Date","Boolean","SingleSelect","MultiSelect"];
  var OBJECT_TYPES = ["bridge","restriction"];
  var STATUS_OPTS = ["Active","Inactive"];

  return Controller.extend("BridgeManagement.bmsadmin.controller.AttributeConfig", {

    onInit: function () {
      this._objectType = "bridge";
      this._selectedGroup = null;
      this._selectedAttr = null;
      this._loadGroups();
    },

    _loadGroups: function () {
      var self = this;
      fetch(BASE + "/AttributeGroups?$filter=objectType eq '" + self._objectType + "'&$orderby=displayOrder")
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var list = self.byId("groupList");
          var model = new JSONModel(d.value || []);
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
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var list = self.byId("attrList");
          var model = new JSONModel(d.value || []);
          list.setModel(model);
          list.bindItems({ path: "/", template: list.getBindingInfo("items").template });
          self._selectedAttr = null;
          self.byId("attrDetailPanel").setVisible(false);
        });
    },

    _loadAttrDetail: function (attrId) {
      var self = this;
      Promise.all([
        fetch(BASE + "/AttributeDefinitions('" + attrId + "')").then(function (r) { return r.json(); }),
        fetch(BASE + "/AttributeAllowedValues?$filter=attribute_ID eq '" + attrId + "'&$orderby=displayOrder").then(function (r) { return r.json(); }),
        fetch(BASE + "/AttributeObjectTypeConfig?$filter=attribute_ID eq '" + attrId + "'").then(function (r) { return r.json(); })
      ]).then(function (results) {
        var attr = results[0];
        var avs = results[1].value || [];
        var cfgs = results[2].value || [];

        self.byId("detailName").setText(attr.name || "");
        self.byId("detailKey").setText(attr.internalKey || "");
        self.byId("detailType").setText(attr.dataType || "");
        self.byId("detailUnit").setText(attr.unit || "");
        self.byId("detailHelp").setText(attr.helpText || "");
        self.byId("detailMin").setText(attr.minValue != null ? String(attr.minValue) : "");
        self.byId("detailMax").setText(attr.maxValue != null ? String(attr.maxValue) : "");
        self.byId("detailStatus").setText(attr.status || "");

        var avModel = new JSONModel(avs);
        self.byId("allowedValuesTable").setModel(avModel);
        self.byId("allowedValuesTable").bindItems({
          path: "/",
          template: self.byId("allowedValuesTable").getBindingInfo("items").template
        });

        var existingByType = {};
        cfgs.forEach(function (c) { existingByType[c.objectType] = c; });
        var configRows = OBJECT_TYPES.map(function (ot) {
          return existingByType[ot] || { objectType: ot, enabled: false, required: false, displayOrder: null, ID: null, attribute_ID: attrId };
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
        }).then(function (r) { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(function () { self._loadGroups(); MessageToast.show("Group created."); })
          .catch(function (e) { MessageBox.error("Failed to create group: " + e.message); });
      });
    },

    onEditGroup: function () {
      if (!this._selectedGroup) return;
      var self = this;
      var g = self._selectedGroup;
      self._showFormDialog("Edit Group: " + g.name, [
        { label: "Group Name", id: "dlg-name", value: g.name, required: true },
        { label: "Display Order", id: "dlg-order", value: String(g.displayOrder || 0), type: "number" },
        { label: "Status", id: "dlg-status", type: "select", options: STATUS_OPTS, value: g.status }
      ], function (vals) {
        fetch(BASE + "/AttributeGroups('" + g.ID + "')", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: vals["dlg-name"], displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
        }).then(function (r) { if (!r.ok) throw new Error(r.statusText); })
          .then(function () { self._loadGroups(); MessageToast.show("Group updated."); })
          .catch(function (e) { MessageBox.error("Failed to update group: " + e.message); });
      });
    },

    onDeleteGroup: function () {
      if (!this._selectedGroup) return;
      var self = this;
      MessageBox.confirm("Delete group \"" + self._selectedGroup.name + "\"? This will also delete its attribute definitions.", {
        onClose: function (action) {
          if (action !== "OK") return;
          fetch(BASE + "/AttributeGroups('" + self._selectedGroup.ID + "')", { method: "DELETE" })
            .then(function (r) { if (!r.ok && r.status !== 204) throw new Error(r.statusText); })
            .then(function () { self._loadGroups(); MessageToast.show("Group deleted."); })
            .catch(function (e) { MessageBox.error("Failed to delete group: " + e.message); });
        }
      });
    },

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
        }).then(function (r) { if (!r.ok) throw new Error(r.statusText); return r.json(); })
          .then(function () { self._loadAttributes(self._selectedGroup.ID); MessageToast.show("Attribute created."); })
          .catch(function (e) { MessageBox.error("Failed: " + e.message); });
      });
    },

    onEditAttribute: function () {
      if (!this._selectedAttr) return;
      var self = this;
      var a = self._selectedAttr;
      self._showFormDialog("Edit Attribute: " + a.name, [
        { label: "Attribute Name", id: "dlg-name", value: a.name, required: true },
        { label: "Unit", id: "dlg-unit", value: a.unit || "" },
        { label: "Help Text", id: "dlg-help", value: a.helpText || "" },
        { label: "Display Order", id: "dlg-order", value: String(a.displayOrder || 0), type: "number" },
        { label: "Status", id: "dlg-status", type: "select", options: STATUS_OPTS, value: a.status }
      ], function (vals) {
        fetch(BASE + "/AttributeDefinitions('" + a.ID + "')", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: vals["dlg-name"], unit: vals["dlg-unit"] || null, helpText: vals["dlg-help"] || null, displayOrder: parseInt(vals["dlg-order"] || "0", 10), status: vals["dlg-status"] })
        }).then(function (r) { if (!r.ok) throw new Error(r.statusText); })
          .then(function () { self._loadAttributes(self._selectedGroup.ID); self._loadAttrDetail(a.ID); MessageToast.show("Attribute updated."); })
          .catch(function (e) { MessageBox.error("Failed: " + e.message); });
      });
    },

    onDeleteAttribute: function () {
      if (!this._selectedAttr) return;
      var self = this;
      MessageBox.confirm("Delete attribute \"" + self._selectedAttr.name + "\"?", {
        onClose: function (action) {
          if (action !== "OK") return;
          fetch(BASE + "/AttributeDefinitions('" + self._selectedAttr.ID + "')", { method: "DELETE" })
            .then(function (r) {
              if (!r.ok && r.status !== 204) {
                return r.json().then(function (e) { throw new Error(e.error?.message || r.statusText); });
              }
            })
            .then(function () { self._loadAttributes(self._selectedGroup.ID); self.byId("attrDetailPanel").setVisible(false); MessageToast.show("Attribute deleted."); })
            .catch(function (e) { MessageBox.error(e.message); });
        }
      });
    },

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
        }).then(function (r) { if (!r.ok) throw new Error(r.statusText); })
          .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Value added."); })
          .catch(function (e) { MessageBox.error("Failed: " + e.message); });
      });
    },

    onDeleteAllowedValue: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext();
      var av = ctx.getObject();
      var self = this;
      MessageBox.confirm("Delete allowed value \"" + av.value + "\"?", {
        onClose: function (action) {
          if (action !== "OK") return;
          fetch(BASE + "/AttributeAllowedValues('" + av.ID + "')", { method: "DELETE" })
            .then(function (r) {
              if (!r.ok && r.status !== 204) {
                return r.json().then(function (e) { throw new Error(e.error?.message || r.statusText); });
              }
            })
            .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Value deleted."); })
            .catch(function (e) { MessageBox.error(e.message); });
        }
      });
    },

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
      }).then(function (r) { if (!r.ok) throw new Error(r.statusText); })
        .then(function () { self._loadAttrDetail(self._selectedAttr.ID); MessageToast.show("Config added."); })
        .catch(function (e) { MessageBox.error("Failed: " + e.message); });
    },

    onExportTemplate: function (oEvent) {
      var ot = oEvent.getSource().data("objectType");
      window.open(ATTR_API + "/template?objectType=" + ot + "&format=xlsx", "_blank");
    },

    _showFormDialog: function (title, fields, onConfirm) {
      var content = new VBox({ width: "100%" });
      var inputMap = {};

      fields.forEach(function (f) {
        var lbl = new Label({ text: f.label, required: !!f.required, labelFor: f.id });
        var ctrl;
        if (f.type === "select") {
          ctrl = new Select({ id: f.id, width: "100%" });
          (f.options || []).forEach(function (opt) { ctrl.addItem(new Item({ key: opt, text: opt })); });
          if (f.value) ctrl.setSelectedKey(f.value);
        } else {
          ctrl = new Input({ id: f.id, value: f.value || "", type: f.type === "number" ? "Number" : "Text" });
        }
        inputMap[f.id] = ctrl;
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
            fields.forEach(function (f) {
              var ctrl = inputMap[f.id];
              vals[f.id] = ctrl.getSelectedKey ? ctrl.getSelectedKey() : ctrl.getValue();
              if (f.required && !vals[f.id]) {
                MessageToast.show(f.label + " is required");
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
    }
  });
});
