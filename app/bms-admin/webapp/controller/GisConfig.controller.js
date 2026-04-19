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
  "sap/m/ScrollContainer",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, Input, VBox, HBox, Label, ScrollContainer, FormattedText) {
  "use strict";

  var GIS_CONFIG_URL = "/odata/v4/admin/GISConfig('default')";
  var REF_LAYER_URL  = "/odata/v4/admin/ReferenceLayerConfig";

  var LAYER_CATEGORIES = ["Weather","Flood","Traffic","Geology","Infrastructure","Environment","Emergency","Administrative","Custom"];
  var LAYER_TYPES      = ["WMS","XYZ","ArcGISRest","GeoJSON"];

  return Controller.extend("BridgeManagement.bmsadmin.controller.GisConfig", {

    onInit: function () {
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
      fetch(GIS_CONFIG_URL, { headers: { "Accept": "application/json" }, credentials: "same-origin" })
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
          // Entity may not exist yet — defaults are used; save will create it
        });
    },

    onRefresh: function () {
      this._loadConfig();
      this._loadRefLayers();
      MessageToast.show("Refreshed.");
    },

    onSave: function () {
      var model = this.getView().getModel("config");
      var data = JSON.parse(JSON.stringify(model.getData()));
      data.customWmsLayers = JSON.stringify(data.customWmsLayers || []);
      delete data["@context"];
      delete data["@metadataEtag"];

      fetch(GIS_CONFIG_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (res.status === 404) {
            return fetch("/odata/v4/admin/GISConfig", {
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
      fetch(REF_LAYER_URL + "?$orderby=category,sortOrder,name", { headers: { "Accept": "application/json" } })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.statusText); })
        .then(function (data) { model.setProperty("/layers", data.value || []); })
        .catch(function () { /* non-fatal */ });
    },

    onToggleRefLayerActive: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || (src.getParent && src.getParent().getBindingContext("refLayers"));
      var row  = ctx.getObject();
      fetch(REF_LAYER_URL + "('" + row.ID + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: oEvent.getParameter("state") })
      }).catch(function () { MessageToast.show("Failed to update layer."); });
    },

    onToggleRefLayerDefault: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || (src.getParent && src.getParent().getBindingContext("refLayers"));
      var row = ctx.getObject();
      fetch(REF_LAYER_URL + "('" + row.ID + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledByDefault: oEvent.getParameter("state") })
      }).catch(function () { MessageToast.show("Failed to update layer."); });
    },

    _openRefLayerDialog: function (oData) {
      var self  = this;
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
        items.forEach(function (k) { oSel.addItem(new sap.ui.core.Item({ key: k, text: k })); });
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
            var d = oModel.getData();
            if (!d.name || !d.url) { MessageToast.show("Name and URL are required."); return; }
            var method = bEdit ? "PATCH" : "POST";
            var url    = bEdit ? REF_LAYER_URL + "('" + d.ID + "')" : REF_LAYER_URL;
            var body   = Object.assign({}, d);
            delete body["@context"]; delete body["@metadataEtag"];
            fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
              .then(function (res) { return res.ok ? res : Promise.reject(res.statusText); })
              .then(function () { self._loadRefLayers(); oDialog.close(); })
              .catch(function (e) { MessageBox.error("Failed to save layer: " + e); });
          }
        }),
        endButton: new Button({ text: "Cancel", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.setModel(oModel, "dlg");
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
          fetch(REF_LAYER_URL + "('" + row.ID + "')", { method: "DELETE" })
            .then(function () { self._loadRefLayers(); })
            .catch(function () { MessageToast.show("Failed to delete layer."); });
        }
      });
    },

    onShowHelp: function () {
      var sHtml = [
        "<h2 style='margin-top:0'>GIS Configuration — Help</h2>",
        "<h3>Purpose</h3>",
        "<p>GIS Configuration controls the default behaviour of the interactive Bridge Map for all BMS users — ",
        "which basemap is shown on load, which reference layer overlays are available, and which advanced map tools are enabled. ",
        "Changes take effect immediately without a redeployment.</p>",

        "<h3>Basemap Settings</h3>",
        "<ul>",
        "<li><strong>Default Basemap</strong> — the tile layer shown when users first open the map. ",
        "Options include OpenStreetMap, Esri Street/Satellite/Topo, Google Maps/Satellite, and HERE Maps.</li>",
        "<li><strong>HERE API Key</strong> — required only when HERE Maps is selected as the default basemap. ",
        "Leave blank for all other (open) tile sources.</li>",
        "</ul>",

        "<h3>Reference Layers (State &amp; LGA Boundaries)</h3>",
        "<p>These two toggles control whether the <em>State &amp; Territory Boundaries</em> and ",
        "<em>LGA Boundaries (ABS ASGS)</em> overlay rows are shown in the map's Reference Layers panel, ",
        "and whether they are switched on by default when users open the map. ",
        "Turn a toggle off to hide that boundary option from users entirely.</p>",

        "<h3>Reference Layer Library</h3>",
        "<p>The library manages curated spatial datasets that appear in the map's <strong>Additional Layers</strong> panel. ",
        "Only layers marked <strong>Active</strong> here are visible to users in the map view.</p>",
        "<ul>",
        "<li><strong>Active (On/Off)</strong> — controls whether the layer appears in the map's Additional Layers panel at all. ",
        "Inactive layers are completely hidden from map users.</li>",
        "<li><strong>Default On</strong> — if active, also switch this layer on automatically when users open the map.</li>",
        "<li><strong>Add Custom Layer</strong> — add any WMS, XYZ tile, ArcGIS REST, or GeoJSON service. ",
        "Fill in the Service URL and Sub-layers (for WMS, comma-separated layer names).</li>",
        "<li><strong>Preset layers (🔒)</strong> — system-shipped layers cannot be deleted; ",
        "they can only be activated or deactivated.</li>",
        "</ul>",

        "<h3>Advanced Map Features</h3>",
        "<p>Each toggle enables or disables a specific map widget system-wide:</p>",
        "<ul>",
        "<li><strong>Scale Bar</strong> — distance scale overlay on the map canvas.</li>",
        "<li><strong>GPS / Locate Me</strong> — browser geolocation button; centres the map on the user's position.</li>",
        "<li><strong>Mini-map</strong> — overview inset map in the bottom-right corner.</li>",
        "<li><strong>Heatmap</strong> — condition-density colour gradient overlay.</li>",
        "<li><strong>Time Slider</strong> — filter bridges by year built.</li>",
        "<li><strong>Stats Panel</strong> — live summary of visible bridge counts, average condition, and restrictions.</li>",
        "<li><strong>Proximity Search</strong> — find all bridges within a configurable radius of a point.</li>",
        "<li><strong>MGA Coordinates</strong> — display MGA94 grid reference alongside WGS84 decimal degrees.</li>",
        "<li><strong>Street View</strong> — open Google Street View at a selected bridge location.</li>",
        "<li><strong>Condition Alerts</strong> — highlight bridges whose condition rating is at or below the alert threshold.</li>",
        "<li><strong>Custom WMS</strong> — enable the Custom WMS Layers section below (add external WMS tile overlays).</li>",
        "<li><strong>Server Clustering</strong> — cluster bridge markers server-side for very large datasets.</li>",
        "</ul>",

        "<h3>Thresholds &amp; Defaults</h3>",
        "<ul>",
        "<li><strong>Condition Alert Threshold</strong> — bridges with a condition rating at or below this value are flagged (1–10).</li>",
        "<li><strong>Proximity Default Radius</strong> — pre-filled radius (km) in the Proximity Search panel.</li>",
        "<li><strong>Heatmap Radius / Blur</strong> — pixel size and blur of each heatmap point — higher values produce smoother, broader blobs.</li>",
        "<li><strong>Viewport Loading Zoom</strong> — minimum zoom level at which viewport-based loading activates.</li>",
        "</ul>",

        "<h3>Saving Changes</h3>",
        "<p>Click <strong>Save</strong> to persist all settings immediately. ",
        "Click <strong>Discard</strong> to revert all unsaved changes back to the last saved state. ",
        "Click <strong>Refresh</strong> (↺) to reload the current saved configuration from the server.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "GIS Configuration — Help",
        contentWidth: "580px",
        contentHeight: "480px",
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
