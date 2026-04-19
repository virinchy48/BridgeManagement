sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/table/Column",
  "sap/m/Text",
  "sap/m/Input",
  "sap/m/Select",
  "sap/m/DatePicker",
  "sap/m/CheckBox",
  "sap/ui/core/Item"
], function (
  Controller,
  JSONModel,
  Filter,
  FilterOperator,
  MessageBox,
  MessageToast,
  Column,
  Text,
  Input,
  Select,
  DatePicker,
  CheckBox,
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
      document.body.classList.add("massEditFullBleed");

      // _baselineRows: deep-clone of original server data used for dirty comparison
      this._baselineRows = [];
      this._lookupsLoaded = false;
      this._suppressValueChange = false;
      this._loading = false;

      this.getView().setModel(new JSONModel({
        busy: false,
        initialized: false,
        entityKey: "BRIDGE",
        // allItems holds every row; the table binding filters it without replacing the array
        allItems: [],
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

    onExit: function () {
      document.body.classList.remove("massEditFullBleed");
    },

    onNavHome: function () {
      window.location.href = "#Dashboard-display";
    },

    onRefresh: function () {
      this._lookupsLoaded = false;
      this._loadEntityData();
    },

    onEntityTypeChange: function (event) {
      const entityKey = event.getParameter("item").getKey();
      const model = this._vm();
      if (model.getProperty("/entityKey") === entityKey) {
        return;
      }
      model.setProperty("/entityKey", entityKey);
      model.setProperty("/filters", { search: "", state: "", status: "", onlyDirty: false });
      model.setProperty("/allItems", []);
      model.setProperty("/selectedCount", 0);
      model.setProperty("/dirtyCount", 0);
      model.setProperty("/summaryText", "");
      model.setProperty("/bulkVisible", false);
      model.setProperty("/bulkButtonText", this._text("bulkApply"));
      model.setProperty("/applyButtonText", this._text("applyToSelected", [0]));
      model.setProperty("/dirtyMessage", this._text("dirtyRows", [0]));
      model.setProperty("/bulkFieldKey", "");
      model.setProperty("/bulkInputType", "text");
      this._clearBulkValueControls();
      this._baselineRows = [];
      // Clear any active binding filters before rebuilding columns
      const table = this.byId("massEditTable");
      const binding = table && table.getBinding("rows");
      if (binding) {
        binding.filter([]);
      }
      this._buildTable();
      this._loadEntityData();
    },

    onFilterChange: function () {
      if (this._suppressValueChange || this._loading) {
        return;
      }
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

      const table = this.byId("massEditTable");
      const selectedIndices = table.getSelectedIndices();
      if (!selectedIndices.length) {
        MessageToast.show(this._text("bulkNoRows"));
        return;
      }

      const value = this._readBulkValue(field);
      selectedIndices.forEach(function (index) {
        const context = table.getContextByIndex(index);
        if (!context) {
          return;
        }
        const rowPath = context.getPath();
        this._setFieldValue(rowPath, field, value);
      }.bind(this));

      table.clearSelection();
      this._vm().setProperty("/selectedCount", 0);
      this._vm().setProperty("/applyButtonText", this._text("applyToSelected", [0]));
      MessageToast.show(this._text("bulkApplied", [selectedIndices.length]));
    },

    onSave: async function () {
      const allItems = this._vm().getProperty("/allItems") || [];
      const dirtyRows = allItems.filter(function (row) { return row._dirty; });

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

        MessageToast.show(this._text("saveSuccess", [response.data.updated || payload.length]));
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
          // Restore from baseline — replace allItems with a fresh clone
          const restored = this._cloneRows(this._baselineRows);
          this._vm().setProperty("/allItems", restored);
          this._applyFilters();
        }.bind(this)
      });
    },

    onTableSelectionChange: function () {
      const selectedCount = this.byId("massEditTable").getSelectedIndices().length;
      this._vm().setProperty("/selectedCount", selectedCount);
      this._vm().setProperty("/applyButtonText", this._text("applyToSelected", [selectedCount]));
    },

    _loadEntityData: async function () {
      if (this._loading) {
        return;
      }
      this._loading = true;
      const model = this._vm();
      const isInitialLoad = !model.getProperty("/initialized");
      try {
        if (isInitialLoad) {
          model.setProperty("/busy", true);
        }

        if (!this._lookupsLoaded) {
          const lookupResponse = await this._fetchJsonWithFallback("api/lookups", {
            headers: { Accept: "application/json" }
          });
          this._applyLookups(lookupResponse.data);
          this._lookupsLoaded = true;
        }

        const response = await this._fetchJsonWithFallback(this._config().endpoint, {
          headers: { Accept: "application/json" }
        });

        const payloadKey = this._config().key === "BRIDGE" ? "bridges" : "restrictions";
        const rows = this._prepareRows(response.data[payloadKey] || []);
        this._baselineRows = this._cloneRows(rows);

        // Put all rows into the model at a stable path.
        // _applyFilters will filter the table binding — no array replacement.
        model.setProperty("/allItems", rows);
        this._applyFilters();
        model.setProperty("/initialized", true);
      } catch (error) {
        model.setProperty("/initialized", true);
        MessageBox.error(error.message || this._text("loadError"));
      } finally {
        this._loading = false;
        model.setProperty("/busy", false);
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
      this._suppressValueChange = true;
      const model = this._vm();
      const config = this._config();
      const filters = model.getProperty("/filters");
      const search = (filters.search || "").trim().toLowerCase();

      // -------------------------------------------------------------------
      // Build sap.ui.model.Filter objects and push them to the TABLE BINDING
      // instead of replacing the /allItems array.
      // This keeps row binding contexts stable so Select/Input/DatePicker
      // controls are never destroyed/recreated — eliminating all flicker.
      // -------------------------------------------------------------------
      const filterList = [];

      if (filters.onlyDirty) {
        filterList.push(new Filter("_dirty", FilterOperator.EQ, true));
      }
      if (config.stateField && filters.state) {
        filterList.push(new Filter(config.stateField, FilterOperator.EQ, filters.state));
      }
      if (config.statusField && filters.status) {
        filterList.push(new Filter(config.statusField, FilterOperator.EQ, filters.status));
      }
      if (search) {
        // OR across all searchable text fields
        const searchFilters = config.searchFields.map(function (sf) {
          return new Filter({
            path: sf,
            test: function (val) {
              return String(val || "").toLowerCase().includes(search);
            }
          });
        });
        filterList.push(new Filter({ filters: searchFilters, and: false }));
      }

      const table = this.byId("massEditTable");
      const binding = table && table.getBinding("rows");
      if (binding) {
        const combined = filterList.length
          ? [new Filter({ filters: filterList, and: true })]
          : [];
        binding.filter(combined);
      }

      // Count filtered rows from the JS array (synchronous, avoids binding timing)
      const allItems = model.getProperty("/allItems") || [];
      const visibleCount = this._countFiltered(allItems, config, filters, search);
      const dirtyCount = allItems.filter(function (r) { return r._dirty; }).length;

      this._setIfChanged("/tableTitle", this._text(config.key === "BRIDGE" ? "bridges" : "restrictions"));
      this._setIfChanged("/showStateFilter", Boolean(config.stateField));
      this._setIfChanged("/showStatusFilter", Boolean(config.statusField));
      this._setIfChanged("/statusFilterLabel", this._text(config.statusFilterLabelKey));
      this._setIfChanged("/statusFilterOptions", model.getProperty(config.statusOptionsPath) || []);
      this._setIfChanged("/options/bulkFields", config.fields.filter(function (f) {
        return f.editable;
      }).map(function (f) {
        return { key: f.key, text: this._text(f.labelKey) };
      }.bind(this)));
      this._setIfChanged("/dirtyCount", dirtyCount);
      this._setIfChanged("/dirtyMessage", this._text("dirtyRows", [dirtyCount]));
      this._setIfChanged("/summaryText", this._text("records", [visibleCount]));
      this._clearTableSelection();
      this._setIfChanged("/selectedCount", 0);
      this._setIfChanged("/applyButtonText", this._text("applyToSelected", [0]));
      this._suppressValueChange = false;
    },

    // Count rows matching current filter criteria — mirrors binding filter logic
    _countFiltered: function (allItems, config, filters, search) {
      return allItems.filter(function (row) {
        if (filters.onlyDirty && !row._dirty) return false;
        if (config.stateField && filters.state && row[config.stateField] !== filters.state) return false;
        if (config.statusField && filters.status && row[config.statusField] !== filters.status) return false;
        if (!search) return true;
        return config.searchFields.some(function (sf) {
          return String(row[sf] || "").toLowerCase().includes(search);
        });
      }).length;
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

      config.fields.forEach(function (field) {
        table.addColumn(new Column({
          width: field.width,
          label: new Text({ text: this._text(field.labelKey) }),
          template: this._createCell(field),
          sortProperty: field.key,
          filterProperty: field.key,
          autoResizable: true
        }));
      }.bind(this));
    },

    _createCell: function (field) {
      if (!field.editable) {
        return new Text({ text: "{view>" + field.key + "}" });
      }

      if (field.type === "select") {
        return new Select({
          width: "100%",
          selectedKey: {
            path: "view>" + field.key,
            mode: "OneWay"
          },
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
          selected: {
            path: "view>" + field.key,
            mode: "OneWay"
          },
          select: this._onValueChange.bind(this, field)
        });
      }

      if (field.type === "date") {
        return new DatePicker({
          width: "100%",
          value: {
            path: "view>" + field.key,
            mode: "OneWay"
          },
          valueFormat: "yyyy-MM-dd",
          displayFormat: "dd/MM/yyyy",
          change: this._onValueChange.bind(this, field)
        });
      }

      return new Input({
        width: "100%",
        type: field.type === "number" || field.type === "decimal" ? "Number" : "Text",
        value: {
          path: "view>" + field.key,
          mode: "OneWay"
        },
        change: this._onValueChange.bind(this, field)
      });
    },

    _onValueChange: function (field, event) {
      if (this._suppressValueChange) {
        return;
      }

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
      const model = this._vm();
      const row = model.getProperty(rowPath);
      const baseline = this._baselineRows.find(function (entry) {
        return String(entry.ID) === String(row.ID);
      });
      if (!baseline) {
        return;
      }
      const dirty = this._config().fields.some(function (field) {
        return this._sameValue(row[field.key], baseline[field.key]) === false;
      }.bind(this));
      model.setProperty(rowPath + "/_dirty", dirty);

      // Re-count from model — no separate _allRows needed
      const allItems = model.getProperty("/allItems") || [];
      const dirtyCount = allItems.filter(function (entry) { return entry._dirty; }).length;
      model.setProperty("/dirtyCount", dirtyCount);
      model.setProperty("/dirtyMessage", this._text("dirtyRows", [dirtyCount]));
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

    _setIfChanged: function (path, value) {
      const model = this._vm();
      const current = model.getProperty(path);
      if (JSON.stringify(current) !== JSON.stringify(value)) {
        model.setProperty(path, value);
      }
    },

    _clearTableSelection: function () {
      const table = this.byId("massEditTable");
      if (table && table.getSelectedIndices().length) {
        table.clearSelection();
      }
    },

    _cloneRows: function (rows) {
      return JSON.parse(JSON.stringify(rows || []));
    },

    _apiUrl: function (path) {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      return "/mass-edit/" + cleanPath;
    },

    _fetchJsonWithFallback: async function (path, options) {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      const candidates = [this._apiUrl(path)];
      if (candidates.indexOf(cleanPath) === -1) {
        candidates.push(cleanPath);
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
