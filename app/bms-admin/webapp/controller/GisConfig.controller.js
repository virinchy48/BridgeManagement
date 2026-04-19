sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/ScrollContainer",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, ScrollContainer, FormattedText) {
  "use strict";

  var GIS_CONFIG_URL = "/odata/v4/admin/GISConfig('default')";

  return Controller.extend("BridgeManagement.bmsadmin.controller.GisConfig", {

    onInit: function () {
      this.getView().setModel(new JSONModel(this._defaults()), "config");
      this._loadConfig();
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

    onShowHelp: function () {
      var sHtml = [
        "<h2 style='margin-top:0'>GIS Configuration — How to Use</h2>",
        "<h3>Purpose</h3>",
        "<p>GIS Configuration controls the default behaviour of the interactive Bridge Map view in BMS — ",
        "including which basemap is shown, which reference layers are enabled, and which advanced map features are active. ",
        "Changes take effect immediately for all users without a redeployment.</p>",
        "<h3>Basemap Settings</h3>",
        "<ul>",
        "<li><strong>Default Basemap</strong> — the tile layer displayed when the map first loads (OpenStreetMap, Esri, Google, or HERE).</li>",
        "<li><strong>HERE API Key</strong> — required only if HERE Maps basemap is selected. Leave blank for open tile sources.</li>",
        "</ul>",
        "<h3>Reference Layers</h3>",
        "<p>Toggle <strong>State Boundaries</strong> and <strong>LGA Boundaries</strong> overlays on or off as a default starting state for all users.</p>",
        "<h3>Advanced Features</h3>",
        "<p>Each toggle enables or disables a specific map widget:</p>",
        "<ul>",
        "<li><strong>Scale Bar</strong> — shows a distance scale on the map.</li>",
        "<li><strong>GPS / Location</strong> — enables the locate-me button.</li>",
        "<li><strong>Mini-map</strong> — shows an overview mini-map in the corner.</li>",
        "<li><strong>Heatmap</strong> — condition density heatmap layer.</li>",
        "<li><strong>Time Slider</strong> — filter bridges by inspection date.</li>",
        "<li><strong>Stats Panel</strong> — summary statistics panel on the side.</li>",
        "<li><strong>Proximity Search</strong> — find bridges within a radius.</li>",
        "<li><strong>MGA Coordinates</strong> — display MGA94 grid coordinates alongside WGS84.</li>",
        "<li><strong>Street View</strong> — open Google Street View at a bridge location.</li>",
        "<li><strong>Condition Alerts</strong> — highlight bridges below the condition threshold.</li>",
        "<li><strong>Custom WMS</strong> — allow additional WMS tile overlays (configure below).</li>",
        "<li><strong>Server Clustering</strong> — cluster markers server-side for large datasets.</li>",
        "</ul>",
        "<h3>Thresholds</h3>",
        "<p>Numeric parameters controlling heatmap appearance, proximity search defaults, and the condition alert threshold.</p>",
        "<h3>Custom WMS Layers</h3>",
        "<p>Add external WMS tile services (e.g. state government spatial layers) by enabling <strong>Custom WMS</strong> and entering the layer URL and layer names. ",
        "Each entry appears as a toggleable overlay in the Bridge Map.</p>",
        "<h3>Saving</h3>",
        "<p>Click <strong>Save</strong> to persist changes. Click <strong>Discard</strong> to revert unsaved changes back to the last saved state.</p>"
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
