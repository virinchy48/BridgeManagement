sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Column",
  "sap/m/Text",
  "sap/m/Input",
  "sap/m/Select",
  "sap/m/DatePicker",
  "sap/m/CheckBox",
  "sap/m/ColumnListItem",
  "sap/ui/core/Item"
], function (
  Controller,
  JSONModel,
  MessageBox,
  MessageToast,
  Column,
  Text,
  Input,
  Select,
  DatePicker,
  CheckBox,
  ColumnListItem,
  Item
) {
  "use strict";

  const ENTITY_CONFIG = {
    BRIDGE: {
      key: "BRIDGE",
      title: "Bridges",
      endpoint: "api/bridges",
      saveEndpoint: "api/bridges/save",
      idField: "ID",
      statusFilterLabelKey: "postingStatus",
      statusField: "postingStatus",
      statusOptionsPath: "/options/postingStatuses",
      stateField: "state",
      searchFields: ["bridgeId", "bridgeName", "route", "region", "assetOwner", "remarks"],
      fields: [
        { key: "bridgeId", labelKey: "bridgeId", type: "text", editable: false, width: "9rem" },
        { key: "bridgeName", labelKey: "bridgeName", type: "text", editable: true, width: "14rem" },
        { key: "state", labelKey: "state", type: "select", editable: true, width: "8rem", optionsPath: "/options/states" },
        { key: "route", labelKey: "route", type: "text", editable: true, width: "10rem" },
        { key: "region", labelKey: "region", type: "text", editable: true, width: "10rem" },
        { key: "assetOwner", labelKey: "assetOwner", type: "text", editable: true, width: "12rem" },
        { key: "structureType", labelKey: "structureType", type: "select", editable: true, width: "11rem", optionsPath: "/options/structureTypes" },
        { key: "yearBuilt", labelKey: "yearBuilt", type: "number", editable: true, width: "8rem" },
        { key: "condition", labelKey: "condition", type: "select", editable: true, width: "9rem", optionsPath: "/options/conditions" },
        { key: "conditionRating", labelKey: "conditionRating", type: "number", editable: true, width: "9rem" },
        { key: "postingStatus", labelKey: "postingStatus", type: "select", editable: true, width: "11rem", optionsPath: "/options/postingStatuses" },
        { key: "lastInspectionDate", labelKey: "lastInspectionDate", type: "date", editable: true, width: "10rem" },
        { key: "scourRisk", labelKey: "scourRisk", type: "select", editable: true, width: "10rem", optionsPath: "/options/scourRisks" },
        { key: "pbsApprovalClass", labelKey: "pbsApprovalClass", type: "select", editable: true, width: "11rem", optionsPath: "/options/pbsApprovalClasses" },
        { key: "nhvrAssessed", labelKey: "nhvrAssessed", type: "boolean", editable: true, width: "8rem" },
        { key: "freightRoute", labelKey: "freightRoute", type: "boolean", editable: true, width: "8rem" },
        { key: "overMassRoute", labelKey: "overMassRoute", type: "boolean", editable: true, width: "8rem" },
        { key: "hmlApproved", labelKey: "hmlApproved", type: "boolean", editable: true, width: "8rem" },
        { key: "bDoubleApproved", labelKey: "bDoubleApproved", type: "boolean", editable: true, width: "8rem" },
        { key: "remarks", labelKey: "remarks", type: "text", editable: true, width: "16rem" }
      ]
    },
    RESTRICTION: {
      key: "RESTRICTION",
      title: "Restrictions",
      endpoint: "api/restrictions",
      saveEndpoint: "api/restrictions/save",
      idField: "ID",
      statusFilterLabelKey: "restrictionStatus",
      statusField: "restrictionStatus",
      statusOptionsPath: "/options/restrictionStatuses",
      stateField: null,
      searchFields: ["restrictionRef", "bridgeRef", "restrictionType", "approvedBy", "remarks"],
      fields: [
        { key: "restrictionRef", labelKey: "restrictionRef", type: "text", editable: false, width: "11rem" },
        { key: "bridgeRef", labelKey: "bridgeRef", type: "text", editable: false, width: "10rem" },
        { key: "restrictionCategory", labelKey: "restrictionCategory", type: "select", editable: true, width: "10rem", optionsPath: "/options/restrictionCategories" },
        { key: "restrictionType", labelKey: "restrictionType", type: "select", editable: true, width: "11rem", optionsPath: "/options/restrictionTypes" },
        { key: "restrictionValue", labelKey: "restrictionValue", type: "text", editable: true, width: "10rem" },
        { key: "restrictionUnit", labelKey: "restrictionUnit", type: "select", editable: true, width: "8rem", optionsPath: "/options/restrictionUnits" },
        { key: "restrictionStatus", labelKey: "restrictionStatus", type: "select", editable: true, width: "11rem", optionsPath: "/options/restrictionStatuses" },
        { key: "appliesToVehicleClass", labelKey: "appliesToVehicleClass", type: "select", editable: true, width: "11rem", optionsPath: "/options/vehicleClasses" },
        { key: "grossMassLimit", labelKey: "grossMassLimit", type: "decimal", editable: true, width: "8rem" },
        { key: "axleMassLimit", labelKey: "axleMassLimit", type: "decimal", editable: true, width: "8rem" },
        { key: "heightLimit", labelKey: "heightLimit", type: "decimal", editable: true, width: "7rem" },
        { key: "widthLimit", labelKey: "widthLimit", type: "decimal", editable: true, width: "7rem" },
        { key: "lengthLimit", labelKey: "lengthLimit", type: "decimal", editable: true, width: "7rem" },
        { key: "speedLimit", labelKey: "speedLimit", type: "number", editable: true, width: "7rem" },
        { key: "permitRequired", labelKey: "permitRequired", type: "boolean", editable: true, width: "8rem" },
        { key: "escortRequired", labelKey: "escortRequired", type: "boolean", editable: true, width: "8rem" },
        { key: "temporary", labelKey: "temporary", type: "boolean", editable: true, width: "8rem" },
        { key: "active", labelKey: "active", type: "boolean", editable: true, width: "8rem" },
        { key: "effectiveFrom", labelKey: "effectiveFrom", type: "date", editable: true, width: "10rem" },
        { key: "effectiveTo", labelKey: "effectiveTo", type: "date", editable: true, width: "10rem" },
        { key: "approvedBy", labelKey: "approvedBy", type: "text", editable: true, width: "11rem" },
        { key: "direction", labelKey: "direction", type: "select", editable: true, width: "9rem", optionsPath: "/options/restrictionDirections" },
        { key: "remarks", labelKey: "remarks", type: "text", editable: true, width: "14rem" }
      ]
    }
  };

  return Controller.extend("BridgeManagement.massedit.controller.MassEdit", {
    onInit: function () {
      this._allRows = [];
      this._baselineRows = [];
      this._lookupsLoaded = false;

      this.getView().setModel(new JSONModel({
        busy: false,
        initialized: false,
        entityKey: "BRIDGE",
        items: [],
        bulkButtonText: this._text("bulkApply"),
        applyButtonText: this._text("applyToSelected", [0]),
        dirtyMessage: this._text("dirtyRows", [0]),
        showStateFilter: true,
        showStatusFilter: true,
        statusFilterLabel: this._text("postingStatus"),
        statusFilterOptions: [],
        tableTitle: this._text("bridges"),
        summaryText: "",
        selectedCount: 0,
        dirtyCount: 0,
        bulkVisible: false,
        bulkFieldKey: "",
        bulkInputType: "text",
        filters: {
          search: "",
          state: "",
          status: "",
          onlyDirty: false
        },
        options: {
          states: [],
          conditions: [],
          postingStatuses: [],
          structureTypes: [],
          scourRisks: [],
          pbsApprovalClasses: [],
          restrictionCategories: [],
          restrictionTypes: [],
          restrictionStatuses: [],
          restrictionUnits: [],
          restrictionDirections: [],
          vehicleClasses: [],
          bulkFields: [],
          bulkFieldOptions: []
        }
      }), "view");

      this._buildTable();
      this._loadEntityData();
    },

    onNavHome: function () {
      window.location.href = "#Dashboard-display";
    },

    onRefresh: function () {
      this._loadEntityData();
    },

    onEntityTypeChange: function (event) {
      const entityKey = event.getParameter("item").getKey();
      const model = this._vm();
      model.setProperty("/entityKey", entityKey);
      model.setProperty("/filters", { search: "", state: "", status: "", onlyDirty: false });
      model.setProperty("/selectedCount", 0);
      model.setProperty("/dirtyCount", 0);
      model.setProperty("/bulkVisible", false);
      model.setProperty("/bulkButtonText", this._text("bulkApply"));
      model.setProperty("/applyButtonText", this._text("applyToSelected", [0]));
      model.setProperty("/dirtyMessage", this._text("dirtyRows", [0]));
      model.setProperty("/bulkFieldKey", "");
      model.setProperty("/bulkInputType", "text");
      this._clearBulkValueControls();
      this._buildTable();
      this._loadEntityData();
    },

    onFilterChange: function () {
      this._applyFilters();
    },

    onToggleBulkApply: function () {
      const visible = !this._vm().getProperty("/bulkVisible");
      this._vm().setProperty("/bulkVisible", visible);
      this._vm().setProperty("/bulkButtonText", this._text(visible ? "hideBulkApply" : "bulkApply"));
      if (!visible) {
        this._vm().setProperty("/bulkFieldKey", "");
        this._vm().setProperty("/bulkInputType", "text");
        this._vm().setProperty("/options/bulkFieldOptions", []);
        this._clearBulkValueControls();
      }
    },

    onBulkFieldChange: function (event) {
      const field = this._config().fields.find((entry) => entry.key === event.getSource().getSelectedKey());
      this._vm().setProperty("/bulkInputType", field ? field.type : "text");
      this._vm().setProperty("/options/bulkFieldOptions", field && field.optionsPath ? (this._vm().getProperty(field.optionsPath) || []) : []);
      this._clearBulkValueControls();
    },

    onBulkApply: function () {
      const fieldKey = this._vm().getProperty("/bulkFieldKey");
      const field = this._config().fields.find((entry) => entry.key === fieldKey);
      if (!field) {
        MessageToast.show(this._text("bulkNoField"));
        return;
      }

      const selectedItems = this.byId("massEditTable").getSelectedItems();
      if (!selectedItems.length) {
        MessageToast.show(this._text("bulkNoRows"));
        return;
      }

      const value = this._readBulkValue(field);
      selectedItems.forEach(function (item) {
        const rowPath = item.getBindingContext("view").getPath();
        this._setFieldValue(rowPath, field, value);
      }.bind(this));

      this.byId("massEditTable").removeSelections(true);
      this._vm().setProperty("/selectedCount", 0);
      this._vm().setProperty("/applyButtonText", this._text("applyToSelected", [0]));
      MessageToast.show(this._text("bulkApplied", [selectedItems.length]));
    },

    onSave: async function () {
      const dirtyRows = this._allRows.filter(function (row) {
        return row._dirty;
      });

      if (!dirtyRows.length) {
        return;
      }

      try {
        this._vm().setProperty("/busy", true);
        const payload = dirtyRows.map(function (row) {
          return this._toPayload(row);
        }.bind(this));

        const response = await this._fetchJsonWithFallback(this._config().saveEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ updates: payload })
        });
        const data = response.data;

        MessageToast.show(this._text("saveSuccess", [data.updated || payload.length]));
        await this._loadEntityData();
      } catch (error) {
        MessageBox.error(error.message || this._text("saveError"));
      } finally {
        this._vm().setProperty("/busy", false);
      }
    },

    onDiscard: function () {
      if (!this._vm().getProperty("/dirtyCount")) {
        return;
      }

      MessageBox.confirm(this._text("discardConfirm"), {
        title: this._text("discardTitle"),
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: function (action) {
          if (action !== MessageBox.Action.OK) return;
          this._allRows = this._cloneRows(this._baselineRows);
          this._applyFilters();
        }.bind(this)
      });
    },

    onTableSelectionChange: function () {
      const selectedCount = this.byId("massEditTable").getSelectedItems().length;
      this._vm().setProperty("/selectedCount", selectedCount);
      this._vm().setProperty("/applyButtonText", this._text("applyToSelected", [selectedCount]));
    },

    _loadEntityData: async function () {
      try {
        this._vm().setProperty("/busy", true);
        if (!this._lookupsLoaded) {
          const lookupResponse = await this._fetchJsonWithFallback("api/lookups", {
            headers: { Accept: "application/json" }
          });
          const lookupData = lookupResponse.data;
          this._applyLookups(lookupData);
          this._lookupsLoaded = true;
        }

        const response = await this._fetchJsonWithFallback(this._config().endpoint, {
          headers: { Accept: "application/json" }
        });
        const data = response.data;

        const payloadKey = this._config().key === "BRIDGE" ? "bridges" : "restrictions";
        this._allRows = this._prepareRows(data[payloadKey] || []);
        this._baselineRows = this._cloneRows(this._allRows);
        this._applyFilters();
        this._vm().setProperty("/initialized", true);
      } catch (error) {
        this._vm().setProperty("/initialized", true);
        MessageBox.error(error.message || this._text("loadError"));
      } finally {
        this._vm().setProperty("/busy", false);
      }
    },

    _applyLookups: function (lookups) {
      const model = this._vm();
      Object.keys(lookups || {}).forEach(function (key) {
        model.setProperty("/options/" + key, this._withEmptyOption(lookups[key] || []));
      }.bind(this));
    },

    _withEmptyOption: function (items) {
      return [{ key: "", text: "—" }].concat(items || []);
    },

    _applyFilters: function () {
      const config = this._config();
      const filters = this._vm().getProperty("/filters");
      const search = (filters.search || "").trim().toLowerCase();
      const items = this._allRows.filter(function (row) {
        if (filters.onlyDirty && !row._dirty) return false;
        if (config.stateField && filters.state && row[config.stateField] !== filters.state) return false;
        if (config.statusField && filters.status && row[config.statusField] !== filters.status) return false;
        if (!search) return true;
        return config.searchFields.some(function (field) {
          return String(row[field] || "").toLowerCase().includes(search);
        });
      });

      this._vm().setProperty("/items", items);
      this._vm().setProperty("/tableTitle", this._text(config.key === "BRIDGE" ? "bridges" : "restrictions"));
      this._vm().setProperty("/showStateFilter", Boolean(config.stateField));
      this._vm().setProperty("/showStatusFilter", Boolean(config.statusField));
      this._vm().setProperty("/statusFilterLabel", this._text(config.statusFilterLabelKey));
      this._vm().setProperty("/statusFilterOptions", this._vm().getProperty(config.statusOptionsPath) || []);
      this._vm().setProperty("/options/bulkFields", config.fields.filter(function (field) {
        return field.editable;
      }).map(function (field) {
        return { key: field.key, text: this._text(field.labelKey) };
      }.bind(this)));
      const dirtyCount = this._allRows.filter(function (row) { return row._dirty; }).length;
      this._vm().setProperty("/dirtyCount", dirtyCount);
      this._vm().setProperty("/dirtyMessage", this._text("dirtyRows", [dirtyCount]));
      this._vm().setProperty("/summaryText", this._text("records", [items.length]));
      this.byId("massEditTable").removeSelections(true);
      this._vm().setProperty("/selectedCount", 0);
      this._vm().setProperty("/applyButtonText", this._text("applyToSelected", [0]));
    },

    _prepareRows: function (rows) {
      return (rows || []).map(function (row) {
        return Object.assign({}, row, { _dirty: false });
      });
    },

    _buildTable: function () {
      const table = this.byId("massEditTable");
      const config = this._config();
      table.destroyColumns();
      table.unbindItems();

      config.fields.forEach(function (field) {
        table.addColumn(new Column({
          width: field.width,
          header: new Text({ text: this._text(field.labelKey) })
        }));
      }.bind(this));

      table.bindItems({
        path: "view>/items",
        template: new ColumnListItem({
          highlight: "{= ${view>_dirty} ? 'Warning' : 'None' }",
          cells: config.fields.map(function (field) {
            return this._createCell(field);
          }.bind(this))
        })
      });
    },

    _createCell: function (field) {
      if (!field.editable) {
        return new Text({ text: "{view>" + field.key + "}" });
      }

      if (field.type === "select") {
        return new Select({
          width: "100%",
          selectedKey: "{view>" + field.key + "}",
          items: {
            path: "view>" + field.optionsPath,
            template: new Item({
              key: "{view>key}",
              text: "{view>text}"
            }),
            templateShareable: false
          },
          change: this._onValueChange.bind(this, field)
        });
      }

      if (field.type === "boolean") {
        return new CheckBox({
          selected: "{view>" + field.key + "}",
          select: this._onValueChange.bind(this, field)
        });
      }

      if (field.type === "date") {
        return new DatePicker({
          width: "100%",
          value: "{view>" + field.key + "}",
          valueFormat: "yyyy-MM-dd",
          displayFormat: "dd/MM/yyyy",
          change: this._onValueChange.bind(this, field)
        });
      }

      return new Input({
        width: "100%",
        type: field.type === "number" || field.type === "decimal" ? "Number" : "Text",
        value: "{view>" + field.key + "}",
        change: this._onValueChange.bind(this, field)
      });
    },

    _onValueChange: function (field, event) {
      const rowPath = event.getSource().getBindingContext("view").getPath();
      const value = this._extractControlValue(field, event.getSource());
      this._setFieldValue(rowPath, field, value);
    },

    _setFieldValue: function (rowPath, field, value) {
      const normalized = this._normalizeClientValue(field.type, value);
      this._vm().setProperty(rowPath + "/" + field.key, normalized);
      this._updateDirtyFlag(rowPath);
    },

    _updateDirtyFlag: function (rowPath) {
      const row = this._vm().getProperty(rowPath);
      const baseline = this._baselineRows.find(function (entry) {
        return String(entry.ID) === String(row.ID);
      });
      const dirty = this._config().fields.some(function (field) {
        return this._sameValue(row[field.key], baseline[field.key]) === false;
      }.bind(this));
      this._vm().setProperty(rowPath + "/_dirty", dirty);
      const dirtyCount = this._allRows.filter(function (entry) { return entry._dirty; }).length;
      this._vm().setProperty("/dirtyCount", dirtyCount);
      this._vm().setProperty("/dirtyMessage", this._text("dirtyRows", [dirtyCount]));
    },

    _extractControlValue: function (field, control) {
      switch (field.type) {
        case "select":
          return control.getSelectedKey();
        case "boolean":
          return control.getSelected();
        case "date":
          return control.getValue();
        default:
          return control.getValue();
      }
    },

    _normalizeClientValue: function (type, value) {
      if (value === "") return null;
      if (type === "number") {
        const parsedInt = value == null ? null : Number.parseInt(value, 10);
        return Number.isFinite(parsedInt) ? parsedInt : null;
      }
      if (type === "decimal") {
        const parsedFloat = value == null ? null : Number.parseFloat(value);
        return Number.isFinite(parsedFloat) ? parsedFloat : null;
      }
      if (type === "boolean") return Boolean(value);
      return value;
    },

    _readBulkValue: function (field) {
      if (field.type === "select") {
        return this.byId("bulkValueSelect").getSelectedKey();
      }
      if (field.type === "boolean") {
        return this.byId("bulkValueBool").getSelected();
      }
      if (field.type === "date") {
        return this.byId("bulkValueDate").getValue();
      }
      return this.byId("bulkValueInput").getValue();
    },

    _clearBulkValueControls: function () {
      const input = this.byId("bulkValueInput");
      const select = this.byId("bulkValueSelect");
      const date = this.byId("bulkValueDate");
      const checkbox = this.byId("bulkValueBool");
      if (input) input.setValue("");
      if (select) select.setSelectedKey("");
      if (date) date.setValue("");
      if (checkbox) checkbox.setSelected(false);
    },

    _toPayload: function (row) {
      const payload = { ID: row.ID };
      this._config().fields.forEach(function (field) {
        if (!field.editable) return;
        payload[field.key] = row[field.key];
      });
      return payload;
    },

    _sameValue: function (left, right) {
      const a = left == null ? null : String(left);
      const b = right == null ? null : String(right);
      return a === b;
    },

    _cloneRows: function (rows) {
      return JSON.parse(JSON.stringify(rows || []));
    },

    _apiUrl: function (path) {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      const pathname = window.location.pathname || "";
      if (pathname.indexOf("/mass-edit/webapp") !== -1) {
        return "/mass-edit/" + cleanPath;
      }
      return cleanPath;
    },

    _fetchJsonWithFallback: async function (path, options) {
      const candidates = [this._apiUrl(path)];
      const cleanPath = String(path || "").replace(/^\/+/, "");
      const localFallback = "/mass-edit/" + cleanPath;
      if (candidates.indexOf(localFallback) === -1) {
        candidates.push(localFallback);
      }

      let lastError;
      for (let index = 0; index < candidates.length; index += 1) {
        try {
          const response = await fetch(candidates[index], options || {});
          const data = await this._readJsonResponse(response, this._text("loadError"));
          if (!response.ok) {
            throw new Error((data && data.error && data.error.message) || this._text("loadError"));
          }
          return { response: response, data: data };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error(this._text("loadError"));
    },

    _readJsonResponse: async function (response, fallbackMessage) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        const snippet = String(text || "").trim().slice(0, 120);
        throw new Error(snippet.startsWith("<") ? fallbackMessage : (snippet || fallbackMessage));
      }
      return response.json();
    },

    _config: function () {
      return ENTITY_CONFIG[this._vm().getProperty("/entityKey") || "BRIDGE"];
    },

    _text: function (key, args) {
      return this.getView().getModel("i18n").getResourceBundle().getText(key, args);
    },

    _vm: function () {
      return this.getView().getModel("view");
    }
  });
});
