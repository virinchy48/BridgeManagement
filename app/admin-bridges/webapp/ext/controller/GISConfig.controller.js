sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Input",
  "sap/m/Button",
  "sap/m/VBox",
  "sap/m/Label",
  "sap/m/ScrollContainer",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Input, Button, VBox, Label, ScrollContainer, FormattedText) {
  "use strict";

  var GIS_CONFIG_URL = "/odata/v4/admin/GISConfig('default')";

  return Controller.extend("BridgeManagement.adminbridges.ext.controller.GISConfig", {

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
      fetch(GIS_CONFIG_URL, { headers: { "Accept": "application/json" } })
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
          // Entity may not exist yet — use defaults, save will upsert
        });
    },

    onNavBack: function () {
      var router = sap.ui.core.UIComponent.getRouterFor(this);
      if (router) {
        router.navTo("BridgesList");
      } else {
        window.history.go(-1);
      }
    },

    onSave: function () {
      var model = this.getView().getModel("config");
      var data = JSON.parse(JSON.stringify(model.getData()));

      // Serialise custom WMS layers back to JSON string
      data.customWmsLayers = JSON.stringify(data.customWmsLayers || []);

      // Remove OData metadata fields
      delete data["@context"];
      delete data["@metadataEtag"];

      var method = "PATCH";
      var url = GIS_CONFIG_URL;

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (res.status === 404 || res.status === 201) {
            // Try POST/PUT to create
            return fetch("/odata/v4/admin/GISConfig", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
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
      model.setProperty("/customWmsLayers", layers);
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
        "<p>GIS Config controls the default map appearance and advanced GIS feature flags for all users of the Map View application.</p>",
        "<h3>Basemap Settings</h3>",
        "<p>Set the <strong>Default Basemap</strong> shown when users open the map (e.g. OpenStreetMap, Esri Satellite). If you enable HERE Maps, enter your HERE Maps API Key.</p>",
        "<h3>Reference Layers</h3>",
        "<p>Toggle default visibility of <strong>State Boundaries</strong> and <strong>LGA Boundaries</strong> overlay layers.</p>",
        "<h3>Advanced GIS Features</h3>",
        "<p>Enable or disable optional map features system-wide:</p>",
        "<ul>",
        "<li><strong>Scale Bar</strong> — Distance scale on the map.</li>",
        "<li><strong>GPS / Locate Me</strong> — Browser geolocation button.</li>",
        "<li><strong>Mini Map</strong> — Overview inset map (bottom-right corner).</li>",
        "<li><strong>Heat Map</strong> — Density overlay by condition rating.</li>",
        "<li><strong>Time Slider</strong> — Filter bridges by year built.</li>",
        "<li><strong>Stats Panel</strong> — Live statistics sidebar.</li>",
        "<li><strong>Proximity Analysis</strong> — Find bridges within a radius.</li>",
        "<li><strong>MGA Coordinates</strong> — Show MGA grid reference alongside decimal degrees.</li>",
        "<li><strong>Condition Alerts</strong> — Highlight bridges below the alert threshold.</li>",
        "<li><strong>Custom WMS</strong> — Allow adding external WMS tile layers.</li>",
        "<li><strong>Server-side Clustering</strong> — Cluster markers server-side for large datasets.</li>",
        "</ul>",
        "<h3>Thresholds</h3>",
        "<p>Set numeric defaults: condition alert threshold, proximity search radius, and heatmap parameters.</p>",
        "<h3>Saving</h3>",
        "<p>Click <strong>Save</strong> to apply changes immediately. Changes take effect for all users on their next map load.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "GIS Configuration — Help",
        contentWidth: "560px",
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
