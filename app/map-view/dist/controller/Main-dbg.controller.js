sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/VBox",
  "sap/m/HBox",
  "sap/m/Switch",
  "sap/m/Text",
  "sap/m/Button",
  "sap/ui/dom/includeStylesheet"
], function (
  Controller,
  JSONModel,
  MessageBox,
  MessageToast,
  Dialog,
  VBox,
  HBox,
  Switch,
  Text,
  Button,
  includeStylesheet
) {
  "use strict";

  const AUSTRALIA_BOUNDS = [[-44.5, 112], [-9, 154.5]];
  const STATE_OPTIONS = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
  const POSTING_STATUS_OPTIONS = ["Unrestricted", "Posted", "Closed"];
  const ROUTE_FLAGS = [
    { key: "freightRoute", label: "Freight Route" },
    { key: "overMassRoute", label: "Over Mass Route" },
    { key: "hmlApproved", label: "HML Approved" },
    { key: "bDoubleApproved", label: "B-Double Approved" }
  ];
  const TILE_LAYERS = {
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      options: {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
      }
    }
  };
  const HILLSHADE_LAYER = {
    url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 18,
      opacity: 0.35,
      attribution: "Hillshade &copy; Esri"
    }
  };

  return Controller.extend("BridgeManagement.mapview.controller.Main", {
    onInit: function () {
      this._selectionShape = null;
      this._drawMode = null;
      this._markerIndex = new Map();
      this._plainMarkerLayer = null;
      this._clusterLayer = null;
      this._selectionLayer = null;
      this._hillshadeLayer = null;
      this._layerDialog = null;

      this.getView().setModel(new JSONModel({
        busy: true,
        showFilters: true,
        layoutMode: "map",
        colorBy: "condition",
        basemap: "street",
        allBridges: [],
        filteredBridges: [],
        bridges: [],
        totalBridges: 0,
        summaryText: "0 of 0 bridges",
        selectedBridge: null,
        selectedRestrictions: [],
        detailOpen: false,
        selectionActive: false,
        selectionCount: 0,
        selectionLabel: "",
        filters: {
          minCondition: 1,
          maxCondition: 10,
          minYear: 1900,
          maxYear: new Date().getFullYear()
        },
        limits: {
          minCondition: 1,
          maxCondition: 10,
          minYear: 1900,
          maxYear: new Date().getFullYear()
        },
        filterOptions: {
          states: [],
          postingStatuses: [],
          structureTypes: [],
          scourRisks: [],
          routeFlags: [],
          vehicleClasses: []
        },
        layers: {
          clusterMarkers: true,
          showLabels: false,
          showLegend: true,
          showHillshade: false
        }
      }), "view");

      this._leafletReady = this._ensureLeaflet();
      this._loadBridges();
    },

    onAfterRendering: function () {
      this._leafletReady
        .then(this._initMap.bind(this))
        .catch(function () {
          MessageBox.error(this._text("leafletError"));
        }.bind(this));
    },

    onToggleFilters: function () {
      const model = this._vm();
      model.setProperty("/showFilters", !model.getProperty("/showFilters"));
      setTimeout(this._invalidateMap.bind(this), 80);
    },

    onNavHome: function () {
      window.location.href = "#Dashboard-display";
    },

    onCenterMap: function () {
      if (this._leafletMap) {
        this._leafletMap.fitBounds(AUSTRALIA_BOUNDS);
      }
    },

    onRefresh: function () {
      MessageToast.show(this._text("refresh"));
      this._loadBridges();
    },

    onLayoutSelect: function (oEvent) {
      this._vm().setProperty("/layoutMode", oEvent.getParameter("item").getKey());
      this._applyLayoutMode();
    },

    onColorByChange: function (oEvent) {
      this._vm().setProperty("/colorBy", oEvent.getSource().getSelectedKey());
      this._renderMarkers(false);
    },

    onBasemapChange: function (oEvent) {
      this._vm().setProperty("/basemap", oEvent.getSource().getSelectedKey());
      this._applyBaseLayer();
    },

    onDrawPolygon: function () {
      this._activateDraw("polygon");
    },

    onDrawRectangle: function () {
      this._activateDraw("rectangle");
    },

    onDrawCircle: function () {
      this._activateDraw("circle");
    },

    onClearDrawing: function () {
      if (this._selectionLayer) {
        this._selectionLayer.clearLayers();
      }
      this._selectionShape = null;
      this._drawMode = null;
      this._vm().setProperty("/selectionActive", false);
      this._vm().setProperty("/selectionCount", 0);
      this._applyFilters();
    },

    onOpenLayerManager: function () {
      if (!this._layerDialog) {
        const content = new VBox({
          items: [
            this._layerRow("clusterMarkers", this._text("clusterMarkers")),
            this._layerRow("showLabels", this._text("showLabels")),
            this._layerRow("showLegend", this._text("showLegend")),
            this._layerRow("showHillshade", this._text("showHillshade"))
          ]
        }).addStyleClass("mapLayerDialogContent");

        this._layerDialog = new Dialog({
          title: this._text("layerManager"),
          contentWidth: "24rem",
          content: [content],
          endButton: new Button({
            text: this._text("close"),
            press: function () {
              this._layerDialog.close();
            }.bind(this)
          })
        });

        this.getView().addDependent(this._layerDialog);
      }

      this._layerDialog.open();
    },

    onApplyFilters: function () {
      this._applyFilters();
      MessageToast.show(this._vm().getProperty("/summaryText"));
    },

    onClearFilters: function () {
      const model = this._vm();
      const limits = model.getProperty("/limits");
      const filterOptions = model.getProperty("/filterOptions");

      Object.keys(filterOptions).forEach(function (group) {
        (filterOptions[group] || []).forEach(function (item) {
          item.selected = false;
        });
      });

      model.setProperty("/filterOptions", filterOptions);
      model.setProperty("/filters", {
        minCondition: limits.minCondition,
        maxCondition: limits.maxCondition,
        minYear: limits.minYear,
        maxYear: limits.maxYear
      });

      this.onClearDrawing();
    },

    onBridgePress: function (oEvent) {
      this._focusBridge(oEvent.getSource().getBindingContext("view").getObject());
    },

    onBridgeSelectionChange: function (oEvent) {
      const item = oEvent.getParameter("listItem");
      if (item) {
        this._focusBridge(item.getBindingContext("view").getObject());
      }
    },

    onListSearch: function (oEvent) {
      const term = String(oEvent.getSource().getValue() || "").trim().toLowerCase();
      const bridges = this._activeBridges();
      const searched = !term ? bridges : bridges.filter(function (bridge) {
        return [bridge.bridgeId, bridge.bridgeName, bridge.state, bridge.region, bridge.route]
          .filter(Boolean)
          .some(function (value) {
            return String(value).toLowerCase().includes(term);
          });
      });

      this._vm().setProperty("/bridges", searched);
      this._vm().setProperty("/summaryText", searched.length + " of " + this._vm().getProperty("/totalBridges") + " bridges");
      this._renderMarkers(false);
    },

    onLocateBridgeOnMap: function (oEvent) {
      const bridge = oEvent.getSource().getBindingContext("view").getObject();
      this._focusBridge(bridge);
    },

    onCloseDetail: function () {
      this._vm().setProperty("/detailOpen", false);
    },

    onZoomToSelected: function () {
      this._focusBridge(this._vm().getProperty("/selectedBridge"));
    },

    onOpenBridgeDetail: function () {
      window.location.href = "#Bridges-manage";
    },

    _layerRow: function (path, label) {
      return new HBox({
        justifyContent: "SpaceBetween",
        alignItems: "Center",
        items: [
          new Text({ text: label }),
          new Switch({
            state: "{view>/layers/" + path + "}",
            change: this._onLayerSwitchChange.bind(this, path)
          })
        ]
      }).addStyleClass("mapLayerDialogRow");
    },

    _onLayerSwitchChange: function (path, oEvent) {
      this._vm().setProperty("/layers/" + path, oEvent.getParameter("state"));
      this._applyLayerSettings();
    },

    _loadBridges: async function () {
      const model = this._vm();
      model.setProperty("/busy", true);

      try {
        const response = await fetch("/map/api/bridges");
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        const payload = await response.json();
        const bridges = (payload.bridges || []).map(this._normalizeBridge.bind(this));
        const yearValues = bridges.map(function (bridge) { return bridge.yearBuilt; }).filter(Number.isFinite);
        const limits = {
          minCondition: 1,
          maxCondition: 10,
          minYear: yearValues.length ? Math.min.apply(null, yearValues) : 1900,
          maxYear: yearValues.length ? Math.max.apply(null, yearValues) : new Date().getFullYear()
        };

        model.setProperty("/allBridges", bridges);
        model.setProperty("/totalBridges", bridges.length);
        model.setProperty("/limits", limits);
        model.setProperty("/filters", {
          minCondition: limits.minCondition,
          maxCondition: limits.maxCondition,
          minYear: limits.minYear,
          maxYear: limits.maxYear
        });
        model.setProperty("/filterOptions", this._buildFilterOptions(bridges));
        model.setProperty("/selectedBridge", bridges[0] || null);
        model.setProperty("/selectedRestrictions", bridges[0] ? bridges[0].restrictions : []);
        model.setProperty("/detailOpen", Boolean(bridges[0]));

        this._applyFilters();
      } catch (error) {
        MessageBox.error(this._text("mapError"));
      } finally {
        model.setProperty("/busy", false);
      }
    },

    _normalizeBridge: function (bridge) {
      const conditionRating = Number.isFinite(Number(bridge.conditionRating)) ? Number(bridge.conditionRating) : null;
      const yearBuilt = Number.isFinite(Number(bridge.yearBuilt)) ? Number(bridge.yearBuilt) : null;
      const clearanceHeight = Number.isFinite(Number(bridge.clearanceHeight)) ? Number(bridge.clearanceHeight) : null;
      const spanLength = Number.isFinite(Number(bridge.spanLength)) ? Number(bridge.spanLength) : null;
      const postingStatus = bridge.postingStatus || "Unrestricted";

      return {
        ID: bridge.ID,
        bridgeId: bridge.bridgeId || "—",
        bridgeName: bridge.bridgeName || bridge.bridgeId || "Bridge",
        state: bridge.state || null,
        latitude: Number(bridge.latitude),
        longitude: Number(bridge.longitude),
        postingStatus: postingStatus,
        postingStatusLabel: this._postingStatusLabel(postingStatus),
        postingStatusState: postingStatus === "Closed" ? "Error" : postingStatus === "Posted" ? "Warning" : "Success",
        conditionRating: conditionRating,
        yearBuilt: yearBuilt,
        structureType: bridge.structureType || null,
        route: bridge.route || null,
        region: bridge.region || null,
        clearanceHeight: clearanceHeight,
        spanLength: spanLength,
        spanLengthText: spanLength == null ? "—" : spanLength.toFixed(1) + " m",
        lastInspectionDate: bridge.lastInspectionDate || null,
        nhvrAssessed: Boolean(bridge.nhvrAssessed),
        nhvrAssessedLabel: Boolean(bridge.nhvrAssessed) ? this._text("statusAssessed") : this._text("statusNotAssessed"),
        scourRisk: bridge.scourRisk || null,
        scourRiskLabel: this._text("statusScour") + ": " + (bridge.scourRisk || "—"),
        vehicleClass: bridge.vehicleClass || null,
        freightRoute: Boolean(bridge.freightRoute),
        freightRouteLabel: Boolean(bridge.freightRoute) ? this._text("statusFreight") : "No Freight Route",
        overMassRoute: Boolean(bridge.overMassRoute),
        hmlApproved: Boolean(bridge.hmlApproved),
        bDoubleApproved: Boolean(bridge.bDoubleApproved),
        restrictions: bridge.restrictions || [],
        conditionBandLabel: this._conditionBandLabel(conditionRating),
        conditionState: this._conditionState(conditionRating),
        conditionColor: this._conditionColor(conditionRating),
        coordinateText: Number(bridge.latitude).toFixed(5) + ", " + Number(bridge.longitude).toFixed(5),
        metricRating: conditionRating == null ? "—" : String(conditionRating),
        metricClearance: clearanceHeight == null ? "—" : clearanceHeight.toFixed(1) + " m",
        metricYear: yearBuilt == null ? "—" : String(yearBuilt)
      };
    },

    _buildFilterOptions: function (bridges) {
      return {
        states: STATE_OPTIONS.map(function (code) {
          return { key: code, label: code, selected: false };
        }),
        postingStatuses: POSTING_STATUS_OPTIONS.map(function (status) {
          return { key: status, label: status, selected: false };
        }),
        structureTypes: this._uniqueOptions(bridges, "structureType"),
        scourRisks: this._uniqueOptions(bridges, "scourRisk"),
        routeFlags: ROUTE_FLAGS.map(function (flag) {
          return { key: flag.key, label: flag.label, selected: false };
        }),
        vehicleClasses: this._uniqueOptions(bridges, "vehicleClass")
      };
    },

    _uniqueOptions: function (bridges, key) {
      return [...new Set(bridges.map(function (bridge) { return bridge[key]; }).filter(Boolean))]
        .sort()
        .map(function (value) {
          return { key: value, label: value, selected: false };
        });
    },

    _applyFilters: function () {
      const model = this._vm();
      const allBridges = model.getProperty("/allBridges") || [];
      const filters = model.getProperty("/filters");
      const limits = model.getProperty("/limits");
      const options = model.getProperty("/filterOptions");

      const selectedStates = this._selectedKeys(options.states);
      const selectedStatuses = this._selectedKeys(options.postingStatuses);
      const selectedTypes = this._selectedKeys(options.structureTypes);
      const selectedScour = this._selectedKeys(options.scourRisks);
      const selectedVehicleClasses = this._selectedKeys(options.vehicleClasses);
      const selectedRouteFlags = this._selectedKeys(options.routeFlags);

      const filtered = allBridges.filter(function (bridge) {
        if (selectedStates.length && !selectedStates.includes(bridge.state)) return false;
        if (selectedStatuses.length && !selectedStatuses.includes(bridge.postingStatusLabel)) return false;
        if (selectedTypes.length && !selectedTypes.includes(bridge.structureType)) return false;
        if (selectedScour.length && !selectedScour.includes(bridge.scourRisk)) return false;
        if (selectedVehicleClasses.length && !selectedVehicleClasses.includes(bridge.vehicleClass)) return false;
        if (selectedRouteFlags.length && !selectedRouteFlags.every(function (flag) { return bridge[flag]; })) return false;
        if (!this._matchesRange(bridge.conditionRating, filters.minCondition, filters.maxCondition, limits.minCondition, limits.maxCondition)) return false;
        if (!this._matchesRange(bridge.yearBuilt, filters.minYear, filters.maxYear, limits.minYear, limits.maxYear)) return false;
        return true;
      }.bind(this));

      model.setProperty("/filteredBridges", filtered);
      this._applySelectionToDisplay(filtered);
    },

    _applySelectionToDisplay: function (bridges) {
      const model = this._vm();
      const displayed = this._selectionShape ? this._spatialSelect(bridges) : bridges.slice();
      const total = model.getProperty("/totalBridges");

      model.setProperty("/bridges", displayed);
      model.setProperty("/summaryText", displayed.length + " of " + total + " bridges");
      model.setProperty("/selectionActive", Boolean(this._selectionShape));
      model.setProperty("/selectionCount", this._selectionShape ? displayed.length : 0);
      model.setProperty("/selectionLabel", this._selectionShape ? this._text("selectionActive") : "");

      if (displayed.length) {
        const selected = model.getProperty("/selectedBridge");
        const nextSelected = selected && displayed.some(function (bridge) { return bridge.ID === selected.ID; })
          ? selected
          : displayed[0];
        model.setProperty("/selectedBridge", nextSelected);
        model.setProperty("/selectedRestrictions", nextSelected.restrictions || []);
        model.setProperty("/detailOpen", true);
      } else {
        model.setProperty("/selectedRestrictions", []);
      }

      this._renderMarkers(false);
    },

    _matchesRange: function (value, min, max, defaultMin, defaultMax) {
      if (value == null) {
        return min === defaultMin && max === defaultMax;
      }
      return value >= min && value <= max;
    },

    _selectedKeys: function (items) {
      return (items || []).filter(function (item) { return item.selected; }).map(function (item) { return item.key; });
    },

    _ensureLeaflet: function () {
      if (window.L && window.L.markerClusterGroup && window.L.Draw) {
        return Promise.resolve();
      }

      includeStylesheet(this._resourceUrl("vendor/leaflet/leaflet.css"));
      includeStylesheet(this._resourceUrl("vendor/leaflet.markercluster/MarkerCluster.css"));
      includeStylesheet(this._resourceUrl("vendor/leaflet.markercluster/MarkerCluster.Default.css"));
      includeStylesheet(this._resourceUrl("vendor/leaflet.draw/leaflet.draw.css"));

      return this._loadScript(this._resourceUrl("vendor/leaflet/leaflet.js"))
        .then(this._loadScript.bind(this, this._resourceUrl("vendor/leaflet.markercluster/leaflet.markercluster.js")))
        .then(this._loadScript.bind(this, this._resourceUrl("vendor/leaflet.draw/leaflet.draw.js")));
    },

    _loadScript: function (src) {
      return new Promise(function (resolve, reject) {
        const existing = document.querySelector("script[data-src='" + src + "']");
        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve();
          } else {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", reject, { once: true });
          }
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.dataset.src = src;
        script.addEventListener("load", function () {
          script.dataset.loaded = "true";
          resolve();
        }, { once: true });
        script.addEventListener("error", reject, { once: true });
        document.head.appendChild(script);
      });
    },

    _initMap: function () {
      if (this._leafletMap || !this.byId("mapHost").getDomRef()) {
        return;
      }

      const host = this.byId("mapHost").getDomRef().querySelector(".bridgeMapCanvas");
      this._leafletMap = window.L.map(host, {
        zoomControl: true,
        attributionControl: true
      });

      this._selectionLayer = window.L.featureGroup().addTo(this._leafletMap);
      this._applyBaseLayer();
      this._applyLayerSettings();
      this._leafletMap.fitBounds(AUSTRALIA_BOUNDS);

      this._leafletMap.on("draw:created", function (event) {
        this._selectionLayer.clearLayers();
        this._selectionLayer.addLayer(event.layer);
        this._selectionShape = event.layer;
        this._drawMode = event.layerType;
        this._applySelectionToDisplay(this._vm().getProperty("/filteredBridges") || []);
      }.bind(this));

      this._renderMarkers(false);
      this._applyLayoutMode();
    },

    _applyBaseLayer: function () {
      if (!this._leafletMap) return;

      const key = this._vm().getProperty("/basemap");
      const config = TILE_LAYERS[key] || TILE_LAYERS.street;

      if (this._tileLayer) {
        this._leafletMap.removeLayer(this._tileLayer);
      }

      this._tileLayer = window.L.tileLayer(config.url, config.options);
      this._tileLayer.addTo(this._leafletMap);
    },

    _applyLayerSettings: function () {
      if (!this._leafletMap) return;

      const layers = this._vm().getProperty("/layers");
      const shouldCluster = Boolean(layers.clusterMarkers);
      const activeMarkerLayer = shouldCluster
        ? (this._clusterLayer || (this._clusterLayer = window.L.markerClusterGroup({
            maxClusterRadius: 44,
            showCoverageOnHover: false
          })))
        : (this._plainMarkerLayer || (this._plainMarkerLayer = window.L.layerGroup()));

      [this._clusterLayer, this._plainMarkerLayer].filter(Boolean).forEach(function (layer) {
        if (this._leafletMap.hasLayer(layer)) {
          this._leafletMap.removeLayer(layer);
        }
      }.bind(this));

      activeMarkerLayer.addTo(this._leafletMap);

      if (layers.showHillshade) {
        if (!this._hillshadeLayer) {
          this._hillshadeLayer = window.L.tileLayer(HILLSHADE_LAYER.url, HILLSHADE_LAYER.options);
        }
        this._hillshadeLayer.addTo(this._leafletMap);
      } else if (this._hillshadeLayer && this._leafletMap.hasLayer(this._hillshadeLayer)) {
        this._leafletMap.removeLayer(this._hillshadeLayer);
      }

      this._renderMarkers(false);
    },

    _renderMarkers: function (fitToBounds) {
      if (!this._leafletMap) return;

      const layers = this._vm().getProperty("/layers");
      const markerLayer = layers.clusterMarkers ? this._clusterLayer : this._plainMarkerLayer;
      const bridges = this._vm().getProperty("/bridges") || [];
      const selected = this._vm().getProperty("/selectedBridge");

      if (!markerLayer) return;

      markerLayer.clearLayers();
      this._markerIndex.clear();

      bridges.forEach(function (bridge) {
        const marker = window.L.circleMarker([bridge.latitude, bridge.longitude], this._markerStyle(bridge, selected));
        marker.bindPopup(this._popupHtml(bridge), { maxWidth: 260 });
        if (layers.showLabels) {
          marker.bindTooltip(bridge.bridgeName, { permanent: true, direction: "top", offset: [0, -8], className: "bridgeMapLabel" });
        }
        marker.on("click", function () {
          this._focusBridge(bridge);
        }.bind(this));
        this._markerIndex.set(bridge.ID, marker);
        markerLayer.addLayer(marker);
      }.bind(this));

      const legend = this.byId("legendBox");
      if (legend) {
        legend.setVisible(Boolean(layers.showLegend));
      }

      if (fitToBounds !== false && bridges.length) {
        const bounds = window.L.latLngBounds(bridges.map(function (bridge) {
          return [bridge.latitude, bridge.longitude];
        }));
        this._leafletMap.fitBounds(bounds.pad(0.18));
      } else if (fitToBounds !== false) {
        this._leafletMap.fitBounds(AUSTRALIA_BOUNDS);
      }

      this._invalidateMap();
    },

    _markerStyle: function (bridge, selected) {
      const colorBy = this._vm().getProperty("/colorBy");
      const isSelected = selected && selected.ID === bridge.ID;
      return {
        radius: isSelected ? 11 : 8,
        weight: isSelected ? 4 : 3,
        color: this._borderColor(bridge.postingStatus),
        fillColor: colorBy === "status" ? this._statusColor(bridge.postingStatus) : this._conditionColor(bridge.conditionRating),
        fillOpacity: isSelected ? 1 : 0.88
      };
    },

    _popupHtml: function (bridge) {
      return [
        "<div class='leafletPopup'>",
        "<strong>", bridge.bridgeName, "</strong><br>",
        bridge.bridgeId, "<br>",
        (bridge.state || "—"), " • ", (bridge.postingStatusLabel || "—"), "<br>",
        "Condition: ", (bridge.conditionRating == null ? "n/a" : bridge.conditionRating), "<br>",
        "Structure: ", (bridge.structureType || "n/a"), "<br>",
        "Year Built: ", (bridge.yearBuilt || "n/a"),
        "</div>"
      ].join("");
    },

    _focusBridge: function (bridge) {
      if (!bridge || !this._leafletMap) return;

      if (this._vm().getProperty("/layoutMode") === "map") {
        this._vm().setProperty("/layoutMode", "split");
        this._applyLayoutMode();
      }

      this._vm().setProperty("/selectedBridge", bridge);
      this._vm().setProperty("/selectedRestrictions", bridge.restrictions || []);
      this._vm().setProperty("/detailOpen", true);

      const marker = this._markerIndex.get(bridge.ID);
      if (marker) {
        this._leafletMap.setView([bridge.latitude, bridge.longitude], Math.max(this._leafletMap.getZoom(), 8));
        marker.openPopup();
      }

      this._renderMarkers(false);
    },

    _applyLayoutMode: function () {
      const workspace = this.byId("workspace");
      const mode = this._vm().getProperty("/layoutMode");

      ["mode-map", "mode-split", "mode-list"].forEach(function (styleClass) {
        workspace.removeStyleClass(styleClass);
      });
      workspace.addStyleClass("mode-" + mode);

      setTimeout(this._invalidateMap.bind(this), 90);
    },

    _activateDraw: function (type) {
      if (!this._leafletMap || !window.L || !window.L.Draw) return;

      let handler;
      if (type === "polygon") {
        handler = new window.L.Draw.Polygon(this._leafletMap, {
          shapeOptions: { color: "#2563eb", weight: 2, fillOpacity: 0.08 }
        });
      } else if (type === "rectangle") {
        handler = new window.L.Draw.Rectangle(this._leafletMap, {
          shapeOptions: { color: "#ea580c", weight: 2, fillOpacity: 0.08 }
        });
      } else {
        handler = new window.L.Draw.Circle(this._leafletMap, {
          shapeOptions: { color: "#16a34a", weight: 2, fillOpacity: 0.08 }
        });
      }

      handler.enable();
    },

    _spatialSelect: function (bridges) {
      if (!this._selectionShape) return bridges.slice();

      if (this._drawMode === "rectangle") {
        const bounds = this._selectionShape.getBounds();
        return bridges.filter(function (bridge) {
          return bounds.contains([bridge.latitude, bridge.longitude]);
        });
      }

      if (this._drawMode === "circle") {
        const center = this._selectionShape.getLatLng();
        const radius = this._selectionShape.getRadius();
        return bridges.filter(function (bridge) {
          return center.distanceTo([bridge.latitude, bridge.longitude]) <= radius;
        });
      }

      const polygon = this._normalizePolygonLatLngs(this._selectionShape.getLatLngs());
      return bridges.filter(function (bridge) {
        return this._pointInPolygon([bridge.longitude, bridge.latitude], polygon);
      }.bind(this));
    },

    _normalizePolygonLatLngs: function (latlngs) {
      const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      return ring.map(function (latlng) {
        return [latlng.lng, latlng.lat];
      });
    },

    _pointInPolygon: function (point, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        const intersect = ((yi > point[1]) !== (yj > point[1])) &&
          (point[0] < (xj - xi) * (point[1] - yi) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    },

    _activeBridges: function () {
      return this._vm().getProperty("/selectionActive")
        ? this._spatialSelect(this._vm().getProperty("/filteredBridges") || [])
        : (this._vm().getProperty("/filteredBridges") || []);
    },

    _invalidateMap: function () {
      if (this._leafletMap) {
        this._leafletMap.invalidateSize();
      }
    },

    _conditionBandLabel: function (rating) {
      if (rating == null) return this._text("statusUnrated");
      if (rating >= 7) return this._text("conditionGood");
      if (rating >= 5) return this._text("conditionFair");
      return this._text("conditionPoor");
    },

    _conditionState: function (rating) {
      if (rating == null) return "None";
      if (rating >= 7) return "Success";
      if (rating >= 5) return "Warning";
      return "Error";
    },

    _conditionColor: function (rating) {
      if (rating == null) return "#64748b";
      if (rating >= 7) return "#16a34a";
      if (rating >= 5) return "#f59e0b";
      return "#ef4444";
    },

    _postingStatusLabel: function (status) {
      if (status === "Closed") return this._text("statusClosed");
      if (status === "Posted") return this._text("statusPosted");
      return this._text("statusUnrestricted");
    },

    _statusColor: function (status) {
      if (status === "Closed") return "#ef4444";
      if (status === "Posted") return "#f59e0b";
      return "#2563eb";
    },

    _borderColor: function (status) {
      if (status === "Closed") return "#991b1b";
      if (status === "Posted") return "#b45309";
      return "#1d4ed8";
    },

    _resourceUrl: function (path) {
      return sap.ui.require.toUrl("BridgeManagement/mapview/" + path);
    },

    _text: function (key) {
      return this.getView().getModel("i18n").getResourceBundle().getText(key);
    },

    _vm: function () {
      return this.getView().getModel("view");
    }
  });
});
