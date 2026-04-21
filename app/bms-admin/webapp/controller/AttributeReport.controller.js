sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/Column",
  "sap/m/Text",
  "sap/m/ColumnListItem",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, Column, Text, ColumnListItem, MessageBox, MessageToast) {
  "use strict";

  var ATTR_API = "/attributes/api";
  var ADMIN_API = "/odata/v4/admin";

  return Controller.extend("BridgeManagement.bmsadmin.controller.AttributeReport", {

    onInit: function () {
      this._objectType = "bridge";
      this._allRows = [];
      this._attrCols = [];
      this.byId("reportTable").setModel(new JSONModel({ rows: [] }));
      this._load();
    },

    onObjectTypeChange: function (oEvent) {
      this._objectType = oEvent.getSource().getSelectedKey();
      this._load();
    },

    onRefresh: function () {
      this._load();
    },

    onSearch: function (oEvent) {
      var query = (oEvent.getParameter("newValue") || "").toLowerCase();
      this._applyFilter(query, this.byId("groupFilter").getSelectedKey());
    },

    onGroupFilter: function (oEvent) {
      var groupKey = oEvent.getSource().getSelectedKey();
      var query = (this.byId("reportSearch").getValue() || "").toLowerCase();
      this._applyFilter(query, groupKey);
    },

    _applyFilter: function (query, groupKey) {
      var rows = this._allRows;
      if (query) {
        rows = rows.filter(function (row) {
          return (row.ref || "").toLowerCase().includes(query) ||
                 (row.name || "").toLowerCase().includes(query);
        });
      }
      if (groupKey) {
        rows = rows.filter(function (row) {
          return row._groupKeys && row._groupKeys.indexOf(groupKey) !== -1;
        });
      }
      this.byId("reportTable").getModel().setProperty("/rows", rows);
      this.byId("reportRecordCount").setText(rows.length + " records");
    },

    _load: function () {
      var self = this;
      var ot = this._objectType;
      var table = self.byId("reportTable");
      table.getModel().setProperty("/rows", []);
      table.setBusy(true);

      var objectsUrl = ot === "bridge"
        ? ADMIN_API + "/Bridges?$select=ID,bridgeId,bridgeName,state&$top=5000"
        : ADMIN_API + "/Restrictions?$select=ID,restrictionRef,restrictionType,restrictionStatus&$top=5000";

      Promise.all([
        fetch(ATTR_API + "/config?objectType=" + ot).then(function (r) { return r.json(); }),
        fetch(ATTR_API + "/export?objectType=" + ot + "&format=csv")
          .then(function (r) { return r.text(); })
          .then(function (csv) { return self._parseCsv(csv); }),
        fetch(objectsUrl).then(function (r) { return r.json(); })
      ]).then(function (results) {
        var config = results[0];
        var csvData = results[1];
        var objectsData = results[2];

        var groups = config.groups || [];
        self._attrCols = [];
        groups.forEach(function (group) {
          (group.attributes || []).forEach(function (attr) {
            self._attrCols.push({ key: attr.internalKey, label: attr.name, group: group.name, groupKey: group.internalKey });
          });
        });

        // Rebuild dynamic columns
        self._buildTableColumns(ot, self._attrCols);

        // Build group filter
        self._buildGroupFilter(groups);

        // Index CSV rows by reference field
        var refField = ot === "bridge" ? "bridgeId" : "restrictionRef";
        var nameField = ot === "bridge" ? "bridgeName" : "restrictionType";
        var stateField = ot === "bridge" ? "state" : "restrictionStatus";
        var csvByRef = new Map();
        csvData.forEach(function (csvRow) {
          if (csvRow[refField]) csvByRef.set(csvRow[refField], csvRow);
        });

        var objects = objectsData.value || [];
        var rows = objects.map(function (obj) {
          var csvRow = csvByRef.get(obj[refField]) || {};
          var row = {
            ref: obj[refField] || "",
            name: obj[nameField] || "",
            state: obj[stateField] || "",
            _groupKeys: groups.map(function (g) { return g.internalKey; })
          };
          self._attrCols.forEach(function (col) {
            row[col.key] = csvRow[col.key] != null ? csvRow[col.key] : "";
          });
          return row;
        });

        self._allRows = rows;
        table.getModel().setProperty("/rows", rows);
        table.setBusy(false);

        // Update tiles
        var withAttrs = rows.filter(function (row) {
          return self._attrCols.some(function (col) { return row[col.key] !== ""; });
        }).length;
        self.byId("numTotalObjects").setValue(String(rows.length));
        self.byId("numWithAttrs").setValue(String(withAttrs));
        self.byId("numAttrCount").setValue(String(self._attrCols.length));
        self.byId("tileTotalObjects").setHeader(ot === "bridge" ? "Total Bridges" : "Total Restrictions");
        self.byId("reportRecordCount").setText(rows.length + " records");

      }).catch(function (err) {
        table.setBusy(false);
        MessageBox.error("Failed to load report: " + (err.message || err));
      });
    },

    _buildTableColumns: function (ot, attrCols) {
      var table = this.byId("reportTable");
      table.destroyColumns();

      var refLabel = ot === "bridge" ? "Bridge ID" : "Restriction Ref";
      var nameLabel = ot === "bridge" ? "Name" : "Type";
      var stateLabel = ot === "bridge" ? "State" : "Status";

      [
        { label: refLabel, key: "ref", width: "140px" },
        { label: nameLabel, key: "name", width: "220px" },
        { label: stateLabel, key: "state", width: "90px" }
      ].forEach(function (colDef) {
        var col = new Column({ width: colDef.width });
        col.setHeader(new Text({ text: colDef.label }));
        table.addColumn(col);
      });

      attrCols.forEach(function (attrCol) {
        var col = new Column({ width: "160px" });
        col.setHeader(new Text({ text: attrCol.label }));
        table.addColumn(col);
      });

      // Rebuild item template
      table.destroyItems();
      var itemTemplate = new ColumnListItem();
      ["ref", "name", "state"].forEach(function (field) {
        itemTemplate.addCell(new Text({ text: "{" + field + "}" }));
      });
      attrCols.forEach(function (attrCol) {
        itemTemplate.addCell(new Text({ text: "{" + attrCol.key + "}" }));
      });
      table.bindItems({ path: "/rows", template: itemTemplate });
    },

    _buildGroupFilter: function (groups) {
      var select = this.byId("groupFilter");
      select.destroyItems();
      var Item = sap.ui.core.Item;
      select.addItem(new Item({ key: "", text: "All Groups" }));
      groups.forEach(function (group) {
        select.addItem(new Item({ key: group.internalKey, text: group.name }));
      });
    },

    _parseCsv: function (csv) {
      var lines = csv.split(/\r?\n/);
      if (lines.length < 2) return [];
      // Strip surrounding quotes and extract internalKey from "Label (internalKey)" format
      var headers = lines[0].split(",").map(function (h) {
        var clean = h.replace(/^"|"$/g, "").trim();
        var m = clean.match(/\(([^)]+)\)\s*$/);
        return m ? m[1] : clean;
      });
      var rows = [];
      for (var i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        var vals = lines[i].split(",");
        var row = {};
        headers.forEach(function (h, idx) { row[h] = vals[idx] != null ? vals[idx].trim() : ""; });
        rows.push(row);
      }
      return rows;
    },

    onExport: function () {
      var ot = this._objectType;
      window.open(ATTR_API + "/export?objectType=" + ot + "&format=xlsx", "_blank");
      MessageToast.show("Downloading Excel export...");
    }

  });
});
