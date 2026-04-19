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
  "sap/m/Button"
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
  Button
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
      document.body.classList.add("bridgeMapFullBleed");

      this._selectionShape = null;
      this._drawMode = null;
      this._markerIndex = new Map();
      this._plainMarkerLayer = null;
      this._clusterLayer = null;
      this._selectionLayer = null;
      this._hillshadeLayer = null;
      this._layerDialog = null;
      this._mapInitAttempts = 0;
      this._mapInitScheduled = false;

      this.getView().setModel(new JSONModel({
        busy: true,
        fclLayout: "TwoColumnsMidExpanded",
        panelOpen: true,
        panelToggleTooltip: "Close Filters & Layers panel",
        drawToolbarVisible: false,
        showList: false,
        bridgeCountText: "0 bridges",
        listTitleText: "0 visible bridges",
        coordinateText: "",
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

    onExit: function () {
      document.body.classList.remove("bridgeMapFullBleed");
    },

    onAfterRendering: function () {
      this._leafletReady
        .then(function () {
          this._scheduleMapInit();
        }.bind(this))
        .catch(function (error) {
          const detail = error && error.message ? "\n\n" + error.message : "";
          MessageBox.error(this._text("leafletError") + detail);
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

    onTogglePanel: function () {
      const model = this._vm();
      const open = !model.getProperty("/panelOpen");
      model.setProperty("/panelOpen", open);
      model.setProperty("/fclLayout", open ? "TwoColumnsMidExpanded" : "MidColumnFullScreen");
      model.setProperty("/panelToggleTooltip", open ? "Close Filters & Layers panel" : "Open Filters & Layers panel");
      setTimeout(this._invalidateMap.bind(this), 120);
    },

    onToggleDrawToolbar: function () {
      const model = this._vm();
      model.setProperty("/drawToolbarVisible", !model.getProperty("/drawToolbarVisible"));
    },

    onCloseDrawToolbar: function () {
      this._vm().setProperty("/drawToolbarVisible", false);
    },

    onClearSelection: function () {
      this.onClearDrawing();
    },

    onToggleSplitView: function (oEvent) {
      const showList = Boolean(oEvent.getParameter("pressed"));
      const model = this._vm();
      model.setProperty("/showList", showList);
      model.setProperty("/layoutMode", showList ? "split" : "map");
      setTimeout(this._invalidateMap.bind(this), 120);
    },

    onZoomAll: function () {
      this._renderMarkers(true);
    },

    onZoomSelected: function () {
      const bridges = this._vm().getProperty("/bridges") || [];
      if (!this._leafletMap || !bridges.length) {
        return;
      }

      const bounds = window.L.latLngBounds(bridges.map(function (bridge) {
        return [bridge.latitude, bridge.longitude];
      }));
      this._leafletMap.fitBounds(bounds.pad(0.18));
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
      return displayed;
    },

    onSymbologyChange: function (oEvent) {
      const item = oEvent.getParameter("item");
      const key = item ? item.getKey() : oEvent.getSource().getSelectedKey();
      this._vm().setProperty("/colorBy", key === "status" ? "status" : "condition");
      this._renderMarkers(false);
    },

    onBasemapChange: function (oEvent) {
      const source = oEvent.getSource();
      const customData = source.getCustomData && source.getCustomData()[0];
      const key = source.getSelectedKey ? source.getSelectedKey() : customData && customData.getValue();
      this._vm().setProperty("/basemap", key || "street");
      this._applyBaseLayer();
    },

    onToggleClusterLayer: function (oEvent) {
      this._onLayerSwitchChange("clusterMarkers", oEvent);
    },

    onToggleLabelLayer: function (oEvent) {
      this._onLayerSwitchChange("showLabels", oEvent);
    },

    onToggleHillshadeLayer: function (oEvent) {
      this._onLayerSwitchChange("showHillshade", oEvent);
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

    onSearchBridge: function (oEvent) {
      this.onListSearch(oEvent);
    },

    onSearchLiveChange: function (oEvent) {
      this.onListSearch(oEvent);
    },

    onListSearchLive: function (oEvent) {
      this.onListSearch(oEvent);
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

    onListItemPress: function (oEvent) {
      const item = oEvent.getSource();
      this._focusBridge(item.getBindingContext("view").getObject());
    },

    onListItemDetail: function (oEvent) {
      const item = oEvent.getSource().getParent();
      this._focusBridge(item.getBindingContext("view").getObject());
    },

    onNavToDashboard: function () {
      this.onNavHome();
    },

    onNavToBridgesFE: function () {
      window.location.href = "#Bridges-manage";
    },

    onNavToReports: function () {
      window.location.href = "#Reports-display";
    },

    onNavToUpload: function () {
      window.location.href = "#Upload-display";
    },

    onNavToMassEdit: function () {
      window.location.href = "#MassEdit-manage";
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
      const value = oEvent.getParameter("state");
      this._vm().setProperty("/layers/" + path, value == null ? oEvent.getParameter("selected") : value);
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
      model.setProperty("/bridgeCountText", displayed.length + " of " + total + " bridges");
      model.setProperty("/listTitleText", displayed.length + " visible bridges");
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

      this._includeStylesheet("vendor/leaflet/leaflet.css");
      this._includeStylesheet("vendor/leaflet.markercluster/MarkerCluster.css");
      this._includeStylesheet("vendor/leaflet.markercluster/MarkerCluster.Default.css");
      this._includeStylesheet("vendor/leaflet.draw/leaflet.draw.css");

      return this._loadScriptCandidates("vendor/leaflet/leaflet.js")
        .then(function () {
          if (!window.L) {
            throw new Error("Leaflet loaded, but window.L is not available.");
          }
          return this._loadScriptCandidates("vendor/leaflet.markercluster/leaflet.markercluster.js");
        }.bind(this))
        .then(function () {
          if (!window.L.markerClusterGroup) {
            throw new Error("Leaflet MarkerCluster loaded, but L.markerClusterGroup is not available.");
          }
          return this._loadScriptCandidates("vendor/leaflet.draw/leaflet.draw.js");
        }.bind(this))
        .then(function () {
          if (!window.L.Draw) {
            throw new Error("Leaflet Draw loaded, but L.Draw is not available.");
          }
        });
    },

    _includeStylesheet: function (path) {
      const candidates = this._resourceUrlCandidates(path);
      const alreadyLoaded = candidates.some(function (href) {
        return Boolean(document.querySelector("link[data-map-href='" + href + "']"));
      });

      if (alreadyLoaded) {
        return;
      }

      this._includeStylesheetCandidate(candidates, 0);
    },

    _includeStylesheetCandidate: function (candidates, index) {
      const href = candidates[index];
      if (!href) {
        return;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.mapHref = href;
      link.addEventListener("error", function () {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        this._includeStylesheetCandidate(candidates, index + 1);
      }.bind(this), { once: true });
      document.head.appendChild(link);
    },

    _loadScriptCandidates: function (path) {
      const candidates = this._resourceUrlCandidates(path);
      let chain = Promise.reject(new Error("No script URL candidates for " + path));

      candidates.forEach(function (src) {
        chain = chain.catch(function () {
          return this._loadScript(src);
        }.bind(this));
      }.bind(this));

      return chain.catch(function (error) {
        throw new Error("Could not load " + path + ". Tried: " + candidates.join(", ") + ". " + (error && error.message ? error.message : ""));
      });
    },

    _loadScript: function (src) {
      return new Promise(function (resolve, reject) {
        const existing = document.querySelector("script[data-src='" + src + "']");
        if (existing) {
          if (existing.dataset.loaded === "true") {
            resolve();
          } else {
            existing.addEventListener("load", resolve, { once: true });
            existing.addEventListener("error", function () {
              reject(new Error("Failed to load script: " + src));
            }, { once: true });
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
        script.addEventListener("error", function () {
          reject(new Error("Failed to load script: " + src));
        }, { once: true });
        document.head.appendChild(script);
      });
    },

    _scheduleMapInit: function () {
      if (this._leafletMap || this._mapInitScheduled) {
        return;
      }

      this._mapInitScheduled = true;
      setTimeout(function () {
        this._mapInitScheduled = false;
        this._initMap();
      }.bind(this), 0);
    },

    _initMap: function () {
      if (this._leafletMap) {
        return;
      }

      const host = this._resolveMapHost();
      if (!host) {
        this._mapInitAttempts += 1;
        if (this._mapInitAttempts <= 20) {
          setTimeout(this._initMap.bind(this), 50);
        } else {
          MessageBox.error("Map container not found. The map host control did not render.");
        }
        return;
      }

      this._mapInitAttempts = 0;
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
        const selectedBridges = this._applySelectionToDisplay(this._vm().getProperty("/filteredBridges") || []);
        this._openSelectionPopup(event.layer, event.layerType, selectedBridges.length);
      }.bind(this));

      this._leafletMap.on("mousemove", function (event) {
        this._vm().setProperty("/coordinateText", event.latlng.lat.toFixed(5) + ", " + event.latlng.lng.toFixed(5));
      }.bind(this));

      this._renderMarkers(false);
      this._applyLayoutMode();
      setTimeout(this._invalidateMap.bind(this), 250);
    },

    _resolveMapHost: function () {
      const mapHost = this.byId("mapHost");
      const domRef = mapHost && mapHost.getDomRef();
      if (!domRef) {
        return null;
      }

      domRef.setAttribute("role", "application");
      domRef.setAttribute("aria-label", "Bridge geographic map");
      domRef.setAttribute("tabindex", "0");

      if (domRef.classList && domRef.classList.contains("bridgeMapCanvas")) {
        return domRef;
      }

      const existing = domRef.querySelector(".bridgeMapCanvas");
      if (existing) {
        return existing;
      }

      const created = document.createElement("div");
      created.className = "bridgeMapCanvas";
      domRef.appendChild(created);
      return created;
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

    _openSelectionPopup: function (layer, layerType, count) {
      if (!layer || !this._leafletMap) {
        return;
      }

      const html = this._selectionPopupHtml(layer, layerType, count);
      const popupLocation = this._selectionPopupLocation(layer);
      if (!popupLocation) {
        return;
      }

      if (layer.bindPopup) {
        layer.bindPopup(html, { maxWidth: 260 });
        layer.off("click", this._boundSelectionPopupClick);
        this._boundSelectionPopupClick = function () {
          this._showSelectionPopup(html, popupLocation);
        }.bind(this);
        layer.on("click", this._boundSelectionPopupClick);
      }

      setTimeout(function () {
        this._showSelectionPopup(html, popupLocation);
      }.bind(this), 80);
    },

    _showSelectionPopup: function (html, popupLocation) {
      window.L.popup({ maxWidth: 260 })
        .setLatLng(popupLocation)
        .setContent(html)
        .openOn(this._leafletMap);
    },

    _selectionPopupHtml: function (layer, layerType, count) {
      const label = layerType === "circle" ? "Circle selection" :
        layerType === "rectangle" ? "Rectangle selection" :
          "Polygon selection";
      const radius = layerType === "circle" && layer.getRadius
        ? "<br>Radius: " + this._formatRadius(layer.getRadius())
        : "";

      return [
        "<div class='leafletPopup selectionPopup'>",
        "<strong>", label, "</strong><br>",
        count, " bridge", count === 1 ? "" : "s", " selected",
        radius,
        "<br><span class='selectionPopupHint'>Use Clear Selection to reset.</span>",
        "</div>"
      ].join("");
    },

    _selectionPopupLocation: function (layer) {
      if (layer.getLatLng) {
        return layer.getLatLng();
      }
      if (layer.getBounds) {
        return layer.getBounds().getCenter();
      }
      return null;
    },

    _formatRadius: function (meters) {
      return meters >= 1000
        ? (meters / 1000).toFixed(2) + " km"
        : Math.round(meters) + " m";
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
      if (!workspace) {
        setTimeout(this._invalidateMap.bind(this), 90);
        return;
      }
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
      return this._resourceUrlCandidates(path)[0];
    },

    _resourceUrlCandidates: function (path) {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      const candidates = [];
      const add = function (value) {
        if (value && candidates.indexOf(value) === -1) {
          candidates.push(value);
        }
      };

      try {
        add(this.getOwnerComponent().getManifestObject().resolveUri(cleanPath));
      } catch (error) {
        // Fall back to explicit local sandbox and deployed app URLs below.
      }

      add("/map-view/webapp/" + cleanPath);
      add("/map-view/" + cleanPath);
      add(cleanPath);

      return candidates;
    },

    _text: function (key) {
      return this.getView().getModel("i18n").getResourceBundle().getText(key);
    },

    _vm: function () {
      return this.getView().getModel("view");
    }
  });
});
