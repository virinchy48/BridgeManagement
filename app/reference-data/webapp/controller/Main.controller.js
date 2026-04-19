sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/Item"
], function (Controller, JSONModel, MessageBox, MessageToast, Item) {
  "use strict";

  const BASE_URL = "/odata/v4/admin/";

  const ENTITIES = [
    { label: "Asset Classes",          entity: "AssetClasses" },
    { label: "States",                 entity: "States" },
    { label: "Regions",                entity: "Regions" },
    { label: "Structure Types",        entity: "StructureTypes" },
    { label: "Design Loads",           entity: "DesignLoads" },
    { label: "Posting Statuses",       entity: "PostingStatuses" },
    { label: "Condition States",       entity: "ConditionStates" },
    { label: "Scour Risk Levels",      entity: "ScourRiskLevels" },
    { label: "PBS Approval Classes",   entity: "PbsApprovalClasses" },
    { label: "Restriction Types",      entity: "RestrictionTypes" },
    { label: "Restriction Statuses",   entity: "RestrictionStatuses" },
    { label: "Vehicle Classes",        entity: "VehicleClasses" },
    { label: "Restriction Categories", entity: "RestrictionCategories" },
    { label: "Restriction Units",      entity: "RestrictionUnits" },
    { label: "Restriction Directions", entity: "RestrictionDirections" }
  ];

  return Controller.extend("BridgeManagement.referencedata.controller.Main", {

    onInit: function () {
      // Main data model
      const oModel = new JSONModel({ items: [], allItems: [] });
      this.getView().setModel(oModel);

      // Populate entity Select
      const oSelect = this.byId("entitySelect");
      ENTITIES.forEach(function (e) {
        oSelect.addItem(new Item({ key: e.entity, text: e.label }));
      });

      // State
      this._currentEntity = ENTITIES[0].entity;
      this._isAdding = false;

      this._loadData();
    },

    // ── Data loading ────────────────────────────────────────────────────────────

    _currentEntity: null,
    _isAdding: false,

    _loadData: function () {
      const sEntity = this._currentEntity;
      const sUrl = BASE_URL + sEntity + "?$orderby=code";

      fetch(sUrl, { headers: { Accept: "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
          return res.json();
        })
        .then(function (data) {
          const aItems = data.value || [];
          const oModel = this.getView().getModel();
          oModel.setProperty("/allItems", aItems);
          oModel.setProperty("/items", aItems);

          // Update table title and count
          this.byId("tableTitle").setText(
            ENTITIES.find(function (e) { return e.entity === sEntity; }).label
          );
          this._updateCount(aItems.length);

          // Re-apply search filter if any text exists
          const sSearch = this.byId("searchInput").getValue();
          if (sSearch) {
            this._applyFilter(sSearch);
          }
        }.bind(this))
        .catch(function (err) {
          MessageBox.error("Failed to load data for " + sEntity + ":\n" + err.message);
        });
    },

    _updateCount: function (iCount) {
      this.byId("tableCount").setText(iCount + " entr" + (iCount === 1 ? "y" : "ies"));
    },

    _applyFilter: function (sSearch) {
      const oModel = this.getView().getModel();
      const aAll = oModel.getProperty("/allItems") || [];
      const sLower = sSearch.toLowerCase();
      const aFiltered = sLower
        ? aAll.filter(function (item) {
            return (
              (item.code && item.code.toLowerCase().includes(sLower)) ||
              (item.name && item.name.toLowerCase().includes(sLower))
            );
          })
        : aAll;
      oModel.setProperty("/items", aFiltered);
      this._updateCount(aFiltered.length);
    },

    // ── Filter bar events ────────────────────────────────────────────────────────

    onEntityChange: function (oEvent) {
      this._currentEntity = oEvent.getParameter("selectedItem").getKey();
      this.byId("searchInput").setValue("");
      this._loadData();
    },

    onSearch: function (oEvent) {
      this._applyFilter(oEvent.getParameter("value"));
    },

    onRefresh: function () {
      MessageToast.show("Refreshing...");
      this.byId("searchInput").setValue("");
      this._loadData();
    },

    // ── Table selection ──────────────────────────────────────────────────────────

    onRowSelect: function () {
      // Selection tracked per row — no action needed at table level
    },

    // ── Add / Edit / Delete ──────────────────────────────────────────────────────

    onAddEntry: function () {
      this._isAdding = true;
      const oDialog = this.byId("editDialog");
      oDialog.setTitle("Add Entry");

      this.byId("dlgCode").setValue("").setEditable(true);
      this.byId("dlgName").setValue("");
      this.byId("dlgDescr").setValue("");

      oDialog.open();
    },

    onEdit: function (oEvent) {
      this._isAdding = false;
      const oContext = oEvent.getSource().getBindingContext();
      const oData = oContext ? oContext.getObject() : this._getRowDataFromEvent(oEvent);

      const oDialog = this.byId("editDialog");
      oDialog.setTitle("Edit Entry");

      this.byId("dlgCode").setValue(oData.code).setEditable(false);
      this.byId("dlgName").setValue(oData.name || "");
      this.byId("dlgDescr").setValue(oData.descr || "");

      oDialog.open();
    },

    _getRowDataFromEvent: function (oEvent) {
      // Walk up the control hierarchy to the ColumnListItem, then get bound object
      let oControl = oEvent.getSource();
      while (oControl && !oControl.isA("sap.m.ColumnListItem")) {
        oControl = oControl.getParent();
      }
      return oControl ? oControl.getBindingContext().getObject() : {};
    },

    onDelete: function (oEvent) {
      const oData = this._getRowDataFromEvent(oEvent);
      const sCode = oData.code;
      const sEntity = this._currentEntity;

      MessageBox.confirm(
        "Delete entry with code \"" + sCode + "\"?",
        {
          title: "Confirm Delete",
          onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) return;
            fetch(BASE_URL + sEntity + "('" + encodeURIComponent(sCode) + "')", {
              method: "DELETE"
            })
              .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
                MessageToast.show("Entry deleted.");
                this._loadData();
              }.bind(this))
              .catch(function (err) {
                MessageBox.error("Delete failed:\n" + err.message);
              });
          }.bind(this)
        }
      );
    },

    onSave: function () {
      const sCode  = this.byId("dlgCode").getValue().trim();
      const sName  = this.byId("dlgName").getValue().trim();
      const sDescr = this.byId("dlgDescr").getValue().trim();
      const sEntity = this._currentEntity;

      if (!sCode) {
        MessageBox.warning("Code is required.");
        return;
      }

      let sUrl, sMethod, oBody;

      if (this._isAdding) {
        sUrl    = BASE_URL + sEntity;
        sMethod = "POST";
        oBody   = { code: sCode, name: sName, descr: sDescr };
      } else {
        sUrl    = BASE_URL + sEntity + "('" + encodeURIComponent(sCode) + "')";
        sMethod = "PATCH";
        oBody   = { name: sName, descr: sDescr };
      }

      fetch(sUrl, {
        method: sMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(oBody)
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (errBody) {
              const msg = (errBody.error && errBody.error.message) || ("HTTP " + res.status + " " + res.statusText);
              throw new Error(msg);
            });
          }
          MessageToast.show(this._isAdding ? "Entry created." : "Entry updated.");
          this.byId("editDialog").close();
          this._loadData();
        }.bind(this))
        .catch(function (err) {
          MessageBox.error("Save failed:\n" + err.message);
        }.bind(this));
    },

    onCancelDialog: function () {
      this.byId("editDialog").close();
    }

  });
});
