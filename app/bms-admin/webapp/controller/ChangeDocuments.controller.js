sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Panel",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Title",
  "sap/m/Text",
  "sap/m/ObjectStatus",
  "sap/m/Label",
  "sap/m/CustomListItem"
], function (Controller, JSONModel, MessageToast, MessageBox,
             Panel, VBox, HBox, Title, Text, ObjectStatus, Label, CustomListItem) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.ChangeDocuments", {

    onInit: function () {
      this._model = new JSONModel({ changes: [], loading: false });
      this.getView().setModel(this._model, "audit");
    },

    _getFilterValues: function () {
      return {
        objectType: this.byId("filterObjectType").getSelectedKey(),
        source:     this.byId("filterSource").getSelectedKey(),
        user:       (this.byId("filterUser").getValue() || "").trim(),
        objectId:   (this.byId("filterObjectId").getValue() || "").trim(),
        from:       this.byId("filterDateFrom").getValue(),
        to:         this.byId("filterDateTo").getValue()
      };
    },

    onFilterChange: function () { /* live-change: do nothing until Apply */ },
    onApplyFilters: function () { this._loadChanges(); },
    onRefresh:      function () { this._loadChanges(); },

    onResetFilters: function () {
      this.byId("filterObjectType").setSelectedKey("");
      this.byId("filterSource").setSelectedKey("");
      this.byId("filterUser").setValue("");
      this.byId("filterObjectId").setValue("");
      this.byId("filterDateFrom").setValue("");
      this.byId("filterDateTo").setValue("");
      this.byId("emptyState").setVisible(true);
      this.byId("flatTablePanel").setVisible(false);
      this.byId("resultsPanel").setVisible(false);
      this.byId("kpiBox").setVisible(false);
    },

    _loadChanges: function () {
      const view = this.getView();
      view.setBusy(true);

      const filters = this._getFilterValues();
      const params  = new URLSearchParams();
      if (filters.objectType) params.set("objectType", filters.objectType);
      if (filters.source)     params.set("source",     filters.source);
      if (filters.user)       params.set("user",        filters.user);
      if (filters.from)       params.set("from",        filters.from);
      if (filters.to)         params.set("to",          filters.to);

      fetch("/audit/api/changes?" + params.toString(), { credentials: "same-origin" })
        .then(r => r.json())
        .then(data => {
          view.setBusy(false);
          let rows = data.changes || [];
          if (filters.objectId) {
            const needle = filters.objectId.toLowerCase();
            rows = rows.filter(r =>
              (r.objectName || "").toLowerCase().includes(needle) ||
              (r.objectId   || "").toLowerCase().includes(needle)
            );
          }
          this._renderResults(rows);
        })
        .catch(err => {
          view.setBusy(false);
          MessageBox.error("Failed to load change documents: " + err.message);
        });
    },

    _renderResults: function (rows) {
      const isEmpty = !rows || !rows.length;
      this.byId("emptyState").setVisible(isEmpty);
      this.byId("flatTablePanel").setVisible(!isEmpty);
      this.byId("resultsPanel").setVisible(!isEmpty);
      this.byId("kpiBox").setVisible(!isEmpty);
      if (isEmpty) return;

      const enriched = rows.map(r => ({
        ...r,
        changedAtDisplay: r.changedAt
          ? new Date(r.changedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
          : "",
        objectTypeState: this._objectTypeState(r.objectType),
        sourceState:     this._sourceState(r.changeSource)
      }));

      const table = this.byId("changeTable");
      table.setModel(new JSONModel({ items: enriched }));
      table.bindRows("/items");

      this.byId("flatCount").setText(enriched.length + " row(s)");
      this.byId("kpiTotalVal").setValue(enriched.length);
      this._renderGroupedPanel(enriched);
    },

    _renderGroupedPanel: function (rows) {
      const groups = new Map();
      for (const r of rows) {
        const key = r.objectType + "|" + r.objectId;
        if (!groups.has(key)) {
          groups.set(key, { objectType: r.objectType, objectId: r.objectId, objectName: r.objectName, batches: new Map() });
        }
        const g    = groups.get(key);
        const bKey = r.batchId || r.changedAt || Math.random();
        if (!g.batches.has(bKey)) {
          g.batches.set(bKey, { changedAt: r.changedAt, changedAtDisplay: r.changedAtDisplay, changedBy: r.changedBy, source: r.changeSource, fields: [] });
        }
        g.batches.get(bKey).fields.push(r);
      }

      const list = this.byId("objectGroupList");
      list.removeAllItems();

      for (const [, group] of groups) {
        const item    = new CustomListItem();
        const outerBox = new VBox({ class: "sapUiSmallMargin" });

        const headerBox = new HBox({ alignItems: "Center" });
        headerBox.addItem(new ObjectStatus({ text: group.objectType, state: this._objectTypeState(group.objectType), class: "sapUiSmallMarginEnd" }));
        headerBox.addItem(new Title({ text: group.objectName || group.objectId, level: "H4" }));
        outerBox.addItem(headerBox);

        for (const [, batch] of group.batches) {
          const batchPanel = new Panel({
            headerText: batch.changedAtDisplay + "  ·  " + batch.changedBy + "  ·  " + batch.source,
            expandable: true, expanded: false, class: "sapUiTinyMarginTop"
          });
          const fieldList = new sap.m.List({ mode: "None" });
          for (const f of batch.fields) {
            const row = new HBox({ alignItems: "Start", class: "sapUiTinyMarginTop sapUiTinyMarginBottom" });
            const lbl = new Label({ text: f.fieldName, width: "180px", class: "sapUiSmallMarginEnd" });
            const old = new Text({ text: f.oldValue || "—", wrapping: false });
            const nw  = new Text({ text: f.newValue || "—", wrapping: false });
            old.addStyleClass("bmsAuditOld");
            nw.addStyleClass("bmsAuditNew");
            row.addItem(lbl);
            row.addItem(old);
            row.addItem(new sap.ui.core.Icon({ src: "sap-icon://arrow-right", class: "sapUiSmallMarginBeginEnd" }));
            row.addItem(nw);
            fieldList.addItem(new sap.m.CustomListItem({ content: [row] }));
          }
          batchPanel.addContent(fieldList);
          outerBox.addItem(batchPanel);
        }
        item.addContent(outerBox);
        list.addItem(item);
      }

      this.byId("resultsTitle").setText("Objects with Changes (" + groups.size + ")");
      this.byId("recordCount").setText(rows.length + " field change(s)");
    },

    onExportCsv: function () {
      const model = this.byId("changeTable").getModel();
      if (!model) { MessageToast.show("No data to export."); return; }
      const items = model.getProperty("/items") || [];
      if (!items.length) { MessageToast.show("No data to export."); return; }

      const FIELDS  = ["changedAtDisplay","changedBy","objectType","objectName","objectId","fieldName","oldValue","newValue","changeSource","batchId"];
      const HEADERS = ["Changed At","Changed By","Object Type","Object Name","Object ID","Field","Old Value","New Value","Source","Batch ID"];
      const escape  = v => { const s = (v == null ? "" : String(v)); return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const csv     = [HEADERS.join(","), ...items.map(r => FIELDS.map(f => escape(r[f])).join(","))].join("\n");
      const a       = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })), download: "BMS_ChangeDocument_" + new Date().toISOString().slice(0,10) + ".csv" });
      a.click();
      URL.revokeObjectURL(a.href);
      MessageToast.show("Export downloaded.");
    },

    _objectTypeState: function (type) {
      switch ((type || "").toLowerCase()) {
        case "bridge":      return "Success";
        case "restriction": return "Warning";
        case "gisconfig":   return "Information";
        default:            return "None";
      }
    },

    _sourceState: function (source) {
      switch ((source || "").toLowerCase()) {
        case "odata":      return "Success";
        case "massedit":   return "Warning";
        case "massupload": return "Error";
        default:           return "None";
      }
    }
  });
});
