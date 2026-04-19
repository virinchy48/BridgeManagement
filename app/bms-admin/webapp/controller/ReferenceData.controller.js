sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/Item",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/ScrollContainer",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Item, Dialog, Button, ScrollContainer, FormattedText) {
  "use strict";

  const BASE_URL = "/odata/v4/admin/";

  const ENTITIES = [
    { label: "Asset Classes",           entity: "AssetClasses" },
    { label: "States",                  entity: "States" },
    { label: "Regions",                 entity: "Regions" },
    { label: "Structure Types",         entity: "StructureTypes" },
    { label: "Design Loads",            entity: "DesignLoads" },
    { label: "Posting Statuses",        entity: "PostingStatuses" },
    { label: "Condition States",        entity: "ConditionStates" },
    { label: "Scour Risk Levels",       entity: "ScourRiskLevels" },
    { label: "PBS Approval Classes",    entity: "PbsApprovalClasses" },
    { label: "Restriction Types",       entity: "RestrictionTypes" },
    { label: "Restriction Statuses",    entity: "RestrictionStatuses" },
    { label: "Vehicle Classes",         entity: "VehicleClasses" },
    { label: "Restriction Categories",  entity: "RestrictionCategories" },
    { label: "Restriction Units",       entity: "RestrictionUnits" },
    { label: "Restriction Directions",  entity: "RestrictionDirections" }
  ];

  return Controller.extend("BridgeManagement.bmsadmin.controller.ReferenceData", {

    onInit: function () {
      const oModel = new JSONModel({ items: [], allItems: [] });
      this.getView().setModel(oModel);

      const oSelect = this.byId("entitySelect");
      ENTITIES.forEach(e => oSelect.addItem(new Item({ key: e.entity, text: e.label })));

      this._currentEntity = ENTITIES[0].entity;
      this._isAdding      = false;
      this._loadData();
    },

    _loadData: function () {
      const sEntity = this._currentEntity;
      fetch(BASE_URL + sEntity + "?$orderby=code", { headers: { Accept: "application/json" } })
        .then(res => {
          if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
          return res.json();
        })
        .then(data => {
          const aItems = data.value || [];
          const oModel = this.getView().getModel();
          oModel.setProperty("/allItems", aItems);
          oModel.setProperty("/items", aItems);
          this.byId("tableTitle").setText(ENTITIES.find(e => e.entity === sEntity).label);
          this._updateCount(aItems.length);
          const sSearch = this.byId("searchInput").getValue();
          if (sSearch) this._applyFilter(sSearch);
        })
        .catch(err => MessageBox.error("Failed to load data for " + sEntity + ":\n" + err.message));
    },

    _updateCount: function (iCount) {
      this.byId("tableCount").setText(iCount + " entr" + (iCount === 1 ? "y" : "ies"));
    },

    _applyFilter: function (sSearch) {
      const oModel   = this.getView().getModel();
      const aAll     = oModel.getProperty("/allItems") || [];
      const sLower   = sSearch.toLowerCase();
      const filtered = sLower
        ? aAll.filter(item => (item.code && item.code.toLowerCase().includes(sLower)) || (item.name && item.name.toLowerCase().includes(sLower)))
        : aAll;
      oModel.setProperty("/items", filtered);
      this._updateCount(filtered.length);
    },

    onEntityChange: function (oEvent) {
      this._currentEntity = oEvent.getParameter("selectedItem").getKey();
      this.byId("searchInput").setValue("");
      this._loadData();
    },

    onSearch: function (oEvent) { this._applyFilter(oEvent.getParameter("value")); },

    onRefresh: function () {
      MessageToast.show("Refreshing...");
      this.byId("searchInput").setValue("");
      this._loadData();
    },

    onRowSelect: function () { /* tracked per row */ },

    onAddEntry: function () {
      this._isAdding = true;
      const oDialog  = this.byId("editDialog");
      oDialog.setTitle("Add Entry");
      this.byId("dlgCode").setValue("").setEditable(true);
      this.byId("dlgName").setValue("");
      this.byId("dlgDescr").setValue("");
      oDialog.open();
    },

    onEdit: function (oEvent) {
      this._isAdding = false;
      const oData    = this._getRowDataFromEvent(oEvent);
      const oDialog  = this.byId("editDialog");
      oDialog.setTitle("Edit Entry");
      this.byId("dlgCode").setValue(oData.code).setEditable(false);
      this.byId("dlgName").setValue(oData.name  || "");
      this.byId("dlgDescr").setValue(oData.descr || "");
      oDialog.open();
    },

    _getRowDataFromEvent: function (oEvent) {
      let oCtrl = oEvent.getSource();
      while (oCtrl && !oCtrl.isA("sap.m.ColumnListItem")) oCtrl = oCtrl.getParent();
      return oCtrl ? oCtrl.getBindingContext().getObject() : {};
    },

    onDelete: function (oEvent) {
      const oData   = this._getRowDataFromEvent(oEvent);
      const sCode   = oData.code;
      const sEntity = this._currentEntity;
      MessageBox.confirm("Delete entry with code \"" + sCode + "\"?", {
        title: "Confirm Delete",
        onClose: sAction => {
          if (sAction !== MessageBox.Action.OK) return;
          fetch(BASE_URL + sEntity + "('" + encodeURIComponent(sCode) + "')", { method: "DELETE" })
            .then(res => {
              if (!res.ok) throw new Error("HTTP " + res.status);
              MessageToast.show("Entry deleted.");
              this._loadData();
            })
            .catch(err => MessageBox.error("Delete failed:\n" + err.message));
        }
      });
    },

    onSave: function () {
      const sCode  = this.byId("dlgCode").getValue().trim();
      const sName  = this.byId("dlgName").getValue().trim();
      const sDescr = this.byId("dlgDescr").getValue().trim();
      if (!sCode) { MessageBox.warning("Code is required."); return; }

      const isAdd  = this._isAdding;
      const sUrl   = isAdd ? BASE_URL + this._currentEntity : BASE_URL + this._currentEntity + "('" + encodeURIComponent(sCode) + "')";
      const oBody  = isAdd ? { code: sCode, name: sName, descr: sDescr } : { name: sName, descr: sDescr };

      fetch(sUrl, { method: isAdd ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(oBody) })
        .then(res => {
          if (!res.ok) return res.json().catch(() => ({})).then(e => { throw new Error((e.error && e.error.message) || "HTTP " + res.status); });
          MessageToast.show(isAdd ? "Entry created." : "Entry updated.");
          this.byId("editDialog").close();
          this._loadData();
        })
        .catch(err => MessageBox.error("Save failed:\n" + err.message));
    },

    onCancelDialog: function () { this.byId("editDialog").close(); },

    onShowHelp: function () {
      var sHtml = [
        "<h2 style='margin-top:0'>Reference Data Administration — How to Use</h2>",
        "<h3>Purpose</h3>",
        "<p>Reference Data (also called Code Lists or Lookup Tables) defines the allowed values for dropdown fields throughout BMS — ",
        "such as bridge condition states, posting statuses, restriction types, structure types, and more. ",
        "Changes here immediately affect all forms and reports that use these lookups.</p>",
        "<h3>Selecting a Dataset</h3>",
        "<p>Use the <strong>Dataset</strong> dropdown at the top to choose which code list you want to manage. The table below updates to show all entries for that list.</p>",
        "<h3>Adding an Entry</h3>",
        "<ol>",
        "<li>Click <strong>Add Entry</strong> in the header.</li>",
        "<li>Enter a unique <em>Code</em> (the stored value, e.g. <em>ARCH</em>) and a <em>Name</em> (the display label, e.g. <em>Arch Bridge</em>).</li>",
        "<li>Optionally add a <em>Description</em> for context.</li>",
        "<li>Click <strong>Save</strong>. The new entry appears immediately in all dropdowns that use this list.</li>",
        "</ol>",
        "<h3>Editing an Entry</h3>",
        "<p>Click the <strong>Edit</strong> (pencil) icon on any row to open the edit dialog. Update the name or description and click <strong>Save</strong>. ",
        "Note: changing the <em>Code</em> value is not supported — delete and re-create if the code needs to change.</p>",
        "<h3>Deleting an Entry</h3>",
        "<p>Click the <strong>Delete</strong> (trash) icon. You will be asked to confirm. ",
        "⚠️ Only delete codes that are no longer in use — existing bridge or restriction records referencing this code will lose their display label.</p>",
        "<h3>Refreshing</h3>",
        "<p>Click <strong>Refresh</strong> to reload the current dataset from the database — useful if another administrator has made changes concurrently.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "Reference Data Administration — Help",
        contentWidth: "560px",
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
