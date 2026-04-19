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
  "sap/m/ScrollContainer",
  "sap/m/FormattedText",
  "sap/ui/core/Item"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Input, Select, Button, VBox, Label, ScrollContainer, FormattedText, Item) {
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
          self.byId("groupList").setModel(new JSONModel(d.value || []));
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
          self.byId("attrList").setModel(new JSONModel(d.value || []));
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

        self.byId("allowedValuesTable").setModel(new JSONModel(avs));

        var existingByType = {};
        cfgs.forEach(function (c) { existingByType[c.objectType] = c; });
        var configRows = OBJECT_TYPES.map(function (ot) {
          return existingByType[ot] || { objectType: ot, enabled: false, required: false, displayOrder: null, ID: null, attribute_ID: attrId };
        });
        self.byId("configTable").setModel(new JSONModel(configRows));

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

    onShowHelp: function () {
      var sHtml = [
        "<h2 style='margin-top:0'>Attribute Configuration — How to Use</h2>",

        "<h3>Overview</h3>",
        "<p>Configurable Attributes let BMS administrators define custom data fields for <strong>Bridge</strong> and <strong>Restriction</strong> objects — similar to SAP EAM classification. ",
        "Attributes are grouped, typed, and optionally restricted to specific object types. Values entered by users are version-tracked automatically.</p>",

        "<h3>Step 1 — Create an Attribute Group</h3>",
        "<ol>",
        "<li>Select <strong>Bridge</strong> or <strong>Restriction</strong> using the toggle at the top of the left panel.</li>",
        "<li>Click <strong>+ Add Group</strong>.</li>",
        "<li>Enter a <em>Group Name</em> (e.g. <em>Hydraulic Assessment</em>), a unique <em>Internal Key</em> (lowercase, underscores only, e.g. <em>hydraulic_assessment</em>), and a <em>Display Order</em> number.</li>",
        "<li>Click <strong>Confirm</strong>. The group appears in the left panel.</li>",
        "</ol>",

        "<h3>Step 2 — Add Attributes to the Group</h3>",
        "<ol>",
        "<li>Click the group in the left panel to select it.</li>",
        "<li>Click <strong>+ Add Attribute</strong> in the middle panel toolbar.</li>",
        "<li>Fill in: <em>Attribute Name</em>, unique <em>Internal Key</em>, <em>Data Type</em> (see table below), optional <em>Unit</em>, <em>Help Text</em>, and <em>Display Order</em>.</li>",
        "<li>For numeric types set <em>Min / Max Value</em> to enforce range validation.</li>",
        "<li>Click <strong>Confirm</strong>.</li>",
        "</ol>",

        "<h3>Data Types</h3>",
        "<table style='border-collapse:collapse;width:100%;font-size:0.875rem'>",
        "<tr style='background:#f5f5f5'><th style='padding:6px 10px;text-align:left;border:1px solid #ddd'>Type</th><th style='padding:6px 10px;text-align:left;border:1px solid #ddd'>Description</th><th style='padding:6px 10px;text-align:left;border:1px solid #ddd'>Example</th></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>Text</td><td style='padding:6px 10px;border:1px solid #ddd'>Free text string</td><td style='padding:6px 10px;border:1px solid #ddd'>Heritage register number</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>Integer</td><td style='padding:6px 10px;border:1px solid #ddd'>Whole number</td><td style='padding:6px 10px;border:1px solid #ddd'>Span count (1–50)</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>Decimal</td><td style='padding:6px 10px;border:1px solid #ddd'>Decimal number</td><td style='padding:6px 10px;border:1px solid #ddd'>Freeboard (m)</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>Date</td><td style='padding:6px 10px;border:1px solid #ddd'>Calendar date</td><td style='padding:6px 10px;border:1px solid #ddd'>Next inspection date</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>Boolean</td><td style='padding:6px 10px;border:1px solid #ddd'>Yes / No toggle</td><td style='padding:6px 10px;border:1px solid #ddd'>Coastal environment</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>SingleSelect</td><td style='padding:6px 10px;border:1px solid #ddd'>One value from a fixed list</td><td style='padding:6px 10px;border:1px solid #ddd'>AS 5100 Bridge Class</td></tr>",
        "<tr><td style='padding:6px 10px;border:1px solid #ddd'>MultiSelect</td><td style='padding:6px 10px;border:1px solid #ddd'>Multiple values from a fixed list</td><td style='padding:6px 10px;border:1px solid #ddd'>Applied standards</td></tr>",
        "</table>",

        "<h3>Step 3 — Add Allowed Values (SingleSelect / MultiSelect only)</h3>",
        "<ol>",
        "<li>Click the attribute in the middle panel to open its detail in the right panel.</li>",
        "<li>Scroll to <strong>Allowed Values</strong> and click <strong>+ Add Value</strong>.</li>",
        "<li>Enter the stored <em>Value</em> and an optional <em>Display Label</em>.</li>",
        "<li>Repeat for each option. Values are validated at save time — unlisted values are rejected.</li>",
        "</ol>",

        "<h3>Step 4 — Enable for Object Types</h3>",
        "<ol>",
        "<li>In the attribute detail panel, find <strong>Object Type Configuration</strong>.</li>",
        "<li>Toggle <strong>Enabled</strong> ON for the object types where this attribute should appear.</li>",
        "<li>Optionally toggle <strong>Required</strong> to enforce the field on save.</li>",
        "<li>If a row has no config record yet, click <strong>Add</strong> to create one first.</li>",
        "</ol>",

        "<h3>Editing and Disabling Attributes</h3>",
        "<ul>",
        "<li>Click <strong>Edit</strong> in the right panel toolbar to update name, help text, unit, display order, or status.</li>",
        "<li>Set <em>Status = Inactive</em> to hide an attribute from all forms and reports. <strong>Existing stored values are preserved</strong> and will reappear if re-activated.</li>",
        "<li>The <em>Internal Key</em> and <em>Data Type</em> cannot be changed once values exist (data integrity protection).</li>",
        "<li>An attribute cannot be deleted while it has stored values.</li>",
        "</ul>",

        "<h3>Bulk Import / Export</h3>",
        "<ul>",
        "<li>Use <strong>Export Template (Bridge)</strong> or <strong>Export Template (Restriction)</strong> to download an Excel template pre-filled with all active attribute column headers.</li>",
        "<li>Fill in one row per bridge/restriction and upload via <strong>Mass Upload</strong> in the main BMS menu.</li>",
        "<li>The import sheet validates data types, ranges, and allowed values row-by-row and reports errors per cell.</li>",
        "</ul>",

        "<h3>Version History</h3>",
        "<p>Every change to an attribute value is automatically journaled with the old value, new value, changed-by user, timestamp, and change source (<em>manual</em>, <em>import</em>, or <em>api</em>). ",
        "History is visible in the Bridge / Restriction object pages under the <strong>Custom Attributes</strong> section — click the clock icon next to any field.</p>",

        "<h3>Tips</h3>",
        "<ul>",
        "<li>Internal keys must be unique per object type — use lowercase with underscores (e.g. <em>flood_level_100yr_mahd</em>).</li>",
        "<li>Display Order controls the sequence of groups and attributes in forms and reports — lower numbers appear first.</li>",
        "<li>Attribute groups are object-type-specific: a group created for Bridge does not appear on Restrictions.</li>",
        "</ul>"
      ].join("");

      var oDialog = new Dialog({
        title: "Attribute Configuration Help",
        contentWidth: "640px",
        contentHeight: "520px",
        content: [
          new ScrollContainer({
            width: "100%",
            height: "100%",
            vertical: true,
            content: [
              new FormattedText({
                htmlText: sHtml,
                width: "100%"
              }).addStyleClass("sapUiSmallMargin")
            ]
          })
        ],
        endButton: new Button({
          text: "Close",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
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
