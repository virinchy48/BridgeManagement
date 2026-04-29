sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/Input",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Label",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, Input, VBox, HBox, Label,  FormattedText) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.GisConfig", {

    onInit: function () {
      this._adminBase    = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/AdminService/uri").replace(/\/$/, "");
      this._gisConfigUrl = this._adminBase + "/GISConfig('default')";
      this._refLayerUrl  = this._adminBase + "/ReferenceLayerConfig";
      this.getView().setModel(new JSONModel(this._defaults()), "config");
      this.getView().setModel(new JSONModel({ layers: [] }), "refLayers");
      this._loadConfig();
      this._loadRefLayers();
    },

    _defaults: function () {
      return {
        id: "default",
        defaultBasemap: "osm",
        hereApiKey: "",
        showStateBoundaries: false,
        showLgaBoundaries: false,
        enableScaleBar: true,
        enableGps: true,
        enableMinimap: true,
        enableHeatmap: false,
        enableTimeSlider: false,
        enableStatsPanel: true,
        enableProximity: true,
        enableMgaCoords: true,
        enableStreetView: true,
        enableConditionAlerts: true,
        enableCustomWms: false,
        enableServerClustering: false,
        conditionAlertThreshold: 3,
        proximityDefaultRadiusKm: 10,
        heatmapRadius: 20,
        heatmapBlur: 15,
        viewportLoadingZoom: 8,
        customWmsLayers: []
      };
    },

    _loadConfig: function () {
      var model = this.getView().getModel("config");
      fetch(this._gisConfigUrl, { headers: { "Accept": "application/json" }, credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.statusText); })
        .then(function (data) {
          var cfg = Object.assign(this._defaults(), data);
          if (typeof cfg.customWmsLayers === "string") {
            try { cfg.customWmsLayers = JSON.parse(cfg.customWmsLayers); } catch (_) { cfg.customWmsLayers = []; }
          }
          if (!Array.isArray(cfg.customWmsLayers)) { cfg.customWmsLayers = []; }
          model.setData(cfg);
        }.bind(this))
        .catch(function () {
          // Entity may not exist yet: defaults are used; save will create it
        });
    },

    onRefresh: function () {
      this._loadConfig();
      this._loadRefLayers();
      MessageToast.show("Refreshed.");
    },

    onSave: function () {
      var self = this;
      var model = this.getView().getModel("config");
      var data = JSON.parse(JSON.stringify(model.getData()));
      data.customWmsLayers = JSON.stringify(data.customWmsLayers || []);
      delete data["@context"];
      delete data["@metadataEtag"];

      fetch(this._gisConfigUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (res.status === 404) {
            return fetch(self._adminBase + "/GISConfig", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              credentials: "same-origin",
              body: JSON.stringify(data)
            });
          }
          if (!res.ok) return Promise.reject(res.statusText);
          return res;
        })
        .then(function (res) {
          if (res && !res.ok) return Promise.reject(res.statusText);
          MessageToast.show("GIS configuration saved successfully.");
        })
        .catch(function (err) {
          MessageBox.error("Failed to save GIS configuration: " + (err || "Unknown error"));
        });
    },

    onDiscard: function () {
      this._loadConfig();
      MessageToast.show("Changes discarded.");
    },

    onAddCustomWms: function () {
      var model = this.getView().getModel("config");
      var layers = model.getProperty("/customWmsLayers") || [];
      layers.push({ label: "", url: "", layers: "", opacity: 0.7, transparent: true });
      model.setProperty("/customWmsLayers", layers.slice());
    },

    onDeleteCustomWms: function (oEvent) {
      var model = this.getView().getModel("config");
      var ctx = oEvent.getSource().getBindingContext("config");
      var path = ctx.getPath();
      var idx = parseInt(path.split("/").pop(), 10);
      var layers = model.getProperty("/customWmsLayers") || [];
      layers.splice(idx, 1);
      model.setProperty("/customWmsLayers", layers.slice());
    },

    // ── Reference Layer Library ──────────────────────────────────────────────

    _loadRefLayers: function () {
      var model = this.getView().getModel("refLayers");
      fetch(this._refLayerUrl + "?$orderby=category,sortOrder,name", { headers: { "Accept": "application/json" } })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.statusText); })
        .then(function (data) { model.setProperty("/layers", data.value || []); })
        .catch(function () { /* non-fatal */ });
    },

    onToggleRefLayerActive: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || (src.getParent && src.getParent().getBindingContext("refLayers"));
      var row  = ctx.getObject();
      fetch(this._refLayerUrl + "('" + row.ID + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: oEvent.getParameter("state") })
      }).catch(function () { MessageToast.show("Failed to update layer."); });
    },

    onToggleRefLayerDefault: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || (src.getParent && src.getParent().getBindingContext("refLayers"));
      var row = ctx.getObject();
      fetch(this._refLayerUrl + "('" + row.ID + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledByDefault: oEvent.getParameter("state") })
      }).catch(function () { MessageToast.show("Failed to update layer."); });
    },

    _openRefLayerDialog: function (oData) {
      var self  = this;
      var oAppCfg       = self.getOwnerComponent().getModel("appConfig");
      var LAYER_CATEGORIES = oAppCfg.getProperty("/layerCategories");
      var LAYER_TYPES      = oAppCfg.getProperty("/layerTypes");
      var bEdit = !!oData.ID;
      var oModel = new JSONModel(Object.assign({
        ID: null, name: "", category: "Custom", layerType: "WMS",
        url: "", subLayers: "", attribution: "", opacity: 0.70,
        description: "", enabledByDefault: false, active: true,
        wmsFormat: "image/png", transparent: true, minZoom: 0, maxZoom: 19
      }, oData));

      var makeLabelInput = function (label, path, placeholder) {
        return new VBox({ items: [
          new Label({ text: label, required: path === "/url" || path === "/name" }),
          new Input({ value: "{dlg>" + path.slice(1) + "}", placeholder: placeholder || "" })
        ]}).addStyleClass("sapUiSmallMarginBottom");
      };

      var makeSelect = function (label, path, items) {
        var oSel = new sap.m.Select({ selectedKey: "{dlg>" + path.slice(1) + "}" });
        items.forEach(function (selectOption) { oSel.addItem(new sap.ui.core.Item({ key: selectOption, text: selectOption })); });
        return new VBox({ items: [new Label({ text: label }), oSel] }).addStyleClass("sapUiSmallMarginBottom");
      };

      var oDialog = new Dialog({
        title: bEdit ? "Edit Reference Layer" : "Add Reference Layer",
        contentWidth: "520px",
        content: [
          new VBox({ class: "sapUiSmallMargin", items: [
            makeLabelInput("Layer Name *", "/name", "e.g. BOM Rainfall Radar"),
            makeSelect("Category", "/category", LAYER_CATEGORIES),
            makeSelect("Layer Type", "/layerType", LAYER_TYPES),
            makeLabelInput("Service URL *", "/url", "https://services.ga.gov.au/..."),
            makeLabelInput("Sub-layers / Layer IDs", "/subLayers", "WMS: comma-separated layer names"),
            makeLabelInput("Attribution", "/attribution", "© Data Provider"),
            makeLabelInput("Description", "/description", "Brief description for map users"),
            new VBox({ items: [
              new Label({ text: "Opacity (0 – 1)" }),
              new sap.m.Slider({ value: "{dlg>/opacity}", min: 0, max: 1, step: 0.05, width: "100%" })
            ]}).addStyleClass("sapUiSmallMarginBottom"),
            new HBox({ items: [
              new Label({ text: "Enable by default", width: "12rem" }),
              new sap.m.Switch({ state: "{dlg>/enabledByDefault}" })
            ]})
          ]})
        ],
        beginButton: new Button({
          text: bEdit ? "Save" : "Add",
          type: "Emphasized",
          press: function () {
            var referenceLayer = oModel.getData();
            if (!referenceLayer.name || !referenceLayer.url) { MessageToast.show("Name and URL are required."); return; }
            var method = bEdit ? "PATCH" : "POST";
            var url    = bEdit ? self._refLayerUrl + "('" + referenceLayer.ID + "')" : self._refLayerUrl;
            var body   = Object.assign({}, referenceLayer);
            delete body["@context"]; delete body["@metadataEtag"];
            fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
              .then(function (res) { return res.ok ? res : Promise.reject(res.statusText); })
              .then(function () { self._loadRefLayers(); oDialog.close(); })
              .catch(function (error) { MessageBox.error("Failed to save layer: " + error); });
          }
        }),
        endButton: new Button({ text: "Cancel", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.setModel(oModel, "dlg");
      oDialog.addStyleClass("sapUiContentPadding");
      oDialog.open();
    },

    onAddRefLayer: function () {
      this._openRefLayerDialog({});
    },

    onEditRefLayer: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || src.getParent().getBindingContext("refLayers");
      this._openRefLayerDialog(Object.assign({}, ctx.getObject()));
    },

    onDeleteRefLayer: function (oEvent) {
      var self = this;
      var src  = oEvent.getSource();
      var ctx  = src.getBindingContext("refLayers") || src.getParent().getBindingContext("refLayers");
      var row  = ctx.getObject();
      MessageBox.confirm("Delete layer \"" + row.name + "\"?", {
        onClose: function (action) {
          if (action !== "OK") return;
          fetch(self._refLayerUrl + "('" + row.ID + "')", { method: "DELETE" })
            .then(function () { self._loadRefLayers(); })
            .catch(function () { MessageToast.show("Failed to delete layer."); });
        }
      });
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>GIS Configuration controls the default behaviour of the interactive Bridge Map for all BMS users: ",
        "which basemap is shown on load, which reference layer overlays are available, and which advanced map tools are enabled.</p>",
        "<h4>Basemap Settings</h4>",
        "<ul>",
        "<li><strong>Default Basemap:</strong> the tile layer shown when users first open the map (OpenStreetMap, Esri, Google, HERE Maps).</li>",
        "<li><strong>HERE API Key:</strong> required only when HERE Maps is selected. Leave blank for all other sources.</li>",
        "</ul>",
        "<h4>Reference Layers</h4>",
        "<p>Toggle visibility of <em>State &amp; Territory Boundaries</em> and <em>LGA Boundaries</em> overlays in the map panel.</p>",
        "<h4>Reference Layer Library</h4>",
        "<ul>",
        "<li><strong>Active:</strong> controls whether the layer appears in the Additional Layers panel.</li>",
        "<li><strong>Default On:</strong> switches the layer on automatically when users open the map.</li>",
        "<li><strong>Add Custom Layer:</strong> add any WMS, XYZ tile, ArcGIS REST, or GeoJSON service.</li>",
        "<li><strong>Preset layers:</strong> system-shipped layers can only be activated or deactivated, not deleted.</li>",
        "</ul>",
        "<h4>Advanced Map Features</h4>",
        "<ul>",
        "<li><strong>Scale Bar, GPS, Mini-map, Heatmap, Time Slider, Stats Panel, Proximity Search, MGA Coordinates, Street View, Condition Alerts, Custom WMS, Server Clustering</strong>: each toggle enables or disables that widget system-wide.</li>",
        "</ul>",
        "<h4>Thresholds &amp; Defaults</h4>",
        "<ul>",
        "<li><strong>Condition Alert Threshold:</strong> bridges at or below this rating are flagged (1–10).</li>",
        "<li><strong>Proximity Default Radius:</strong> pre-filled radius (km) in the Proximity Search panel.</li>",
        "<li><strong>Heatmap Radius / Blur:</strong> pixel size and blur of each heatmap point.</li>",
        "</ul>",
        "<h4>Saving Changes</h4>",
        "<p>Click <strong>Save</strong> to persist all settings immediately. Click <strong>Discard</strong> to revert unsaved changes.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "GIS Configuration: Help",
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
