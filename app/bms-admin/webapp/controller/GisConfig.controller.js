sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
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
          // Entity may not exist yet: defaults are used; save will create it
        });
    },

    onRefresh: function () {
      this._loadConfig();
      this._loadRefLayers();
      MessageToast.show("Refreshed.");
    },

    _getCsrfToken: function () {
      if (this._csrfToken) return Promise.resolve(this._csrfToken);
      return fetch("/odata/v4/admin/GISConfig", { method: "HEAD", credentials: "same-origin", headers: { "X-CSRF-Token": "Fetch" } })
        .then(function (r) { this._csrfToken = r.headers.get("X-CSRF-Token") || "unsafe"; return this._csrfToken; }.bind(this))
        .catch(function () { this._csrfToken = "unsafe"; return this._csrfToken; }.bind(this));
    },

    _mutate: function (url, method, body) {
      return this._getCsrfToken().then(function (token) {
        return fetch(url, {
          method: method, credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: body != null ? JSON.stringify(body) : undefined
        }).then(function (r) { if (!r.ok) return r.json().then(function (e) { return Promise.reject(new Error(e.error && e.error.message || r.statusText)); }); return r; });
      });
    },

    onSave: function () {
      var self = this;
      var model = this.getView().getModel("config");
      var data = JSON.parse(JSON.stringify(model.getData()));
      data.customWmsLayers = JSON.stringify(data.customWmsLayers || []);
      delete data["@context"];
      delete data["@metadataEtag"];

      self._getCsrfToken().then(function (token) {
        return fetch(GIS_CONFIG_URL, {
          method: "PATCH", credentials: "same-origin",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: JSON.stringify(data)
        }).then(function (res) {
          if (res.status === 404) {
            return fetch("/odata/v4/admin/GISConfig", {
              method: "POST", credentials: "same-origin",
              headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
              body: JSON.stringify(data)
            });
          }
          if (!res.ok) return Promise.reject(new Error(res.statusText));
          return res;
        });
      })
        .then(function (res) {
          if (res && !res.ok) return Promise.reject(new Error(res.statusText));
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
      this._mutate(REF_LAYER_URL + "('" + row.ID + "')", "PATCH", { active: oEvent.getParameter("state") })
        .catch(function () { MessageToast.show("Failed to update layer."); });
    },

    onToggleRefLayerDefault: function (oEvent) {
      var src = oEvent.getSource();
      var ctx = src.getBindingContext("refLayers") || (src.getParent && src.getParent().getBindingContext("refLayers"));
      var row = ctx.getObject();
      this._mutate(REF_LAYER_URL + "('" + row.ID + "')", "PATCH", { enabledByDefault: oEvent.getParameter("state") })
        .catch(function () { MessageToast.show("Failed to update layer."); });
    },

    _openRefLayerDialog: function (oData) {
      this._refLayerIsEdit = !!oData.ID;
      this._refLayerData   = oData;
      var oModel = new JSONModel(Object.assign({
        ID: null, name: "", category: "Custom", layerType: "WMS",
        url: "", subLayers: "", attribution: "", opacity: 0.70,
        description: "", enabledByDefault: false, active: true,
        wmsFormat: "image/png", transparent: true, minZoom: 0, maxZoom: 19
      }, oData));
      this.getView().setModel(oModel, "dlgLayer");
      var dlg = this.byId("refLayerDialog");
      dlg.setTitle(this._refLayerIsEdit ? "Edit Reference Layer" : "Add Reference Layer");
      this.byId("refLayerDialogSaveBtn").setText(this._refLayerIsEdit ? "Save" : "Add");
      dlg.open();
    },

    onRefLayerDialogSave: function () {
      var data = this.getView().getModel("dlgLayer").getData();
      if (!data.name || !data.url) { MessageToast.show("Name and URL are required."); return; }
      var method = this._refLayerIsEdit ? "PATCH" : "POST";
      var url    = this._refLayerIsEdit ? REF_LAYER_URL + "('" + data.ID + "')" : REF_LAYER_URL;
      var body   = Object.assign({}, data);
      delete body["@context"]; delete body["@metadataEtag"];
      var self = this;
      this._mutate(url, method, body)
        .then(function () { self._loadRefLayers(); self.byId("refLayerDialog").close(); })
        .catch(function (error) { MessageBox.error("Failed to save layer: " + error); });
    },

    onRefLayerDialogClose: function () {
      this.byId("refLayerDialog").close();
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
          self._mutate(REF_LAYER_URL + "('" + row.ID + "')", "DELETE", null)
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
      this._openInfoDialog("GIS Configuration: Help", sHtml);
    },

    _openInfoDialog: function (title, html) {
      this.byId("infoDialog").setTitle(title);
      this.byId("infoDialogHtml").setHtmlText(html);
      this.byId("infoDialog").open();
    },

    onInfoDialogClose: function () {
      this.byId("infoDialog").close();
    }
  });
});
