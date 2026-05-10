sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/StandardTreeItem",
  "sap/m/MessageToast"
], function (Controller, JSONModel, StandardTreeItem, MessageToast) {
  "use strict";

  const BASE_ODATA   = "/odata/v4/admin";
  const BASE_SERVICE = "/bridge-management";

  // AS 5100 / NAASRA element group taxonomy
  const ELEMENT_GROUPS = {
    Superstructure: {
      icon: "sap-icon://building",
      description: "Deck, girders, bearings and all above-substructure components",
      types: new Set([
        "DECK", "SLAB", "GIRDER", "BEAM", "TRUSS", "ARCH",
        "BOX_GIRDER", "T_GIRDER", "COMPOSITE_GIRDER", "PRESTRESSED_GIRDER",
        "STRINGER", "CROSS_BEAM", "CROSS_GIRDER", "FLOOR_BEAM",
        "EXPANSION_JOINT", "JOINT_SEAL", "KERB", "BARRIER",
        "HANDRAIL", "PARAPET", "RAILING", "FASCIA", "SOFFIT",
        "OVERLAY", "WATERPROOFING", "WEARING_SURFACE"
      ])
    },
    Substructure: {
      icon: "sap-icon://machine",
      description: "Piers, abutments, wing walls and bearing assemblies",
      types: new Set([
        "PIER", "ABUTMENT", "WING_WALL", "BEARING", "BEARING_PAD",
        "ELASTOMERIC_BEARING", "POT_BEARING", "CAP", "PIER_CAP",
        "ABUTMENT_CAP", "COLUMN", "HEADSTOCK", "DIAPHRAGM",
        "END_WALL", "RETURN_WALL", "SPANDREL_WALL"
      ])
    },
    Foundation: {
      icon: "sap-icon://drill-down",
      description: "Piles, footings, caissons and all below-ground elements",
      types: new Set([
        "PILE", "FOOTING", "CAISSON", "SPREAD_FOOTING", "PILE_CAP",
        "RAFT", "BORED_PILE", "DRIVEN_PILE", "MICRO_PILE",
        "SCREW_PILE", "MASS_CONCRETE", "ROCK_ANCHOR"
      ])
    },
    Approaches: {
      icon: "sap-icon://journey-arrive",
      description: "Approach slabs, embankments, pavement and transitions",
      types: new Set([
        "APPROACH_SLAB", "EMBANKMENT", "PAVEMENT", "GUARD_RAIL",
        "TRANSITION", "SLEEPER_SLAB", "APPROACH_FILL", "CRASH_BARRIER"
      ])
    },
    "Services & Drainage": {
      icon: "sap-icon://wrench",
      description: "Utilities, conduits, drainage and signage",
      types: new Set([
        "UTILITY", "CONDUIT", "LIGHTING", "SIGN", "SCUPPER",
        "DOWNPIPE", "GUTTER", "DRAIN", "PIPE", "CABLE_TRAY",
        "FIRE_MAIN", "GAS_MAIN", "ELECTRICAL"
      ])
    }
  };

  // Standard skeleton shown when no element records exist (AS 5100 template)
  const STANDARD_SKELETON = {
    Superstructure:        ["Deck / Slab", "Primary Members (Girders/Beams)", "Secondary Members", "Expansion Joints", "Kerbs & Barriers", "Handrails / Parapets"],
    Substructure:          ["Piers", "Abutments", "Wing Walls", "Bearings"],
    Foundation:            ["Piles / Footings", "Pile Caps"],
    Approaches:            ["Approach Slabs", "Embankments", "Pavement Transitions"],
    "Services & Drainage": ["Drainage Scuppers", "Utility Conduits"]
  };

  const CONDITION_LABEL = { 1: "Excellent", 2: "Good", 3: "Fair", 4: "Poor", 5: "Critical" };
  const CONDITION_COLOR = { 1: "#1b5e20", 2: "#388e3c", 3: "#f57c00", 4: "#d32f2f", 5: "#7b1fa2" };

  function condStateForRating(r) {
    if (!r) return "None";
    return r >= 4 ? "Error" : r >= 3 ? "Warning" : "Success";
  }

  function groupKey(elem) {
    const t = (elem.elementType || "").toUpperCase();
    for (const [name, def] of Object.entries(ELEMENT_GROUPS)) {
      if (def.types.has(t)) return name;
    }
    return "Other";
  }

  function spanLabel(elem) {
    if (elem.spanNumber != null) return "Span " + elem.spanNumber;
    if (elem.pierNumber != null) return "Pier " + elem.pierNumber;
    return null;
  }

  return Controller.extend("BridgeManagement.bridgehierarchy.controller.Main", {

    onInit: function () {
      this._model = new JSONModel({
        bridges: [],
        filteredBridges: [],
        selectedBridge: null,
        elements: [],
        elementsLoading: false,
        bridgeCount: 0,
        searchQuery: "",
        stateFilter: "All"
      });
      this.getView().setModel(this._model);
      this._allBridges = [];
      this._mapReady = false;
      this._markerLayer = null;
      this._mapConditionFilter = "all";
      this._loadBridges();
    },

    // ── Data loading ────────────────────────────────────────────────────────

    _loadBridges: function () {
      const fields = [
        "ID", "bridgeId", "bridgeName", "state", "structureType",
        "conditionRating", "postingStatus", "latitude", "longitude",
        "isActive", "yearBuilt", "managingAuthority", "condition",
        "lastInspectionDate", "totalLength", "spanCount"
      ].join(",");

      fetch(`${BASE_ODATA}/Bridges?$select=${fields}&$filter=isActive eq true&$orderby=bridgeName&$top=500`)
        .then(r => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(data => {
          const list = data.value || [];
          this._allBridges = list;
          this._model.setProperty("/bridges", list);
          this._applyFilters();
          if (this._mapReady) this._refreshMapMarkers();
        })
        .catch(err => MessageToast.show("Could not load bridges: " + err.message));
    },

    _loadElementsForBridge: function (bridge) {
      this._model.setProperty("/elementsLoading", true);
      this._model.setProperty("/elements", []);

      fetch(`${BASE_SERVICE}/BridgeElements?$filter=bridge_ID eq ${bridge.ID}&$orderby=spanNumber,pierNumber,elementType&$top=200`)
        .then(r => r.json())
        .then(data => {
          const elems = data.value || [];
          this._model.setProperty("/elements", elems);
          this._model.setProperty("/elementsLoading", false);
          this._renderTree(bridge, elems);
        })
        .catch(() => {
          this._model.setProperty("/elementsLoading", false);
          this._renderTree(bridge, []);
        });
    },

    // ── Filtering ────────────────────────────────────────────────────────────

    onSearch: function (oEvent) {
      this._model.setProperty("/searchQuery",
        (oEvent.getParameter("newValue") || oEvent.getParameter("query") || "").toLowerCase());
      this._applyFilters();
    },

    onStateFilterChange: function (oEvent) {
      this._model.setProperty("/stateFilter",
        oEvent.getParameter("selectedItem").getKey());
      this._applyFilters();
    },

    _applyFilters: function () {
      const q = this._model.getProperty("/searchQuery");
      const st = this._model.getProperty("/stateFilter");
      let list = this._allBridges;

      if (q) list = list.filter(b =>
        (b.bridgeName || "").toLowerCase().includes(q) ||
        (b.bridgeId  || "").toLowerCase().includes(q) ||
        (b.state     || "").toLowerCase().includes(q) ||
        (b.managingAuthority || "").toLowerCase().includes(q)
      );
      if (st && st !== "All") list = list.filter(b => b.state === st);

      this._model.setProperty("/filteredBridges", list);
      this._model.setProperty("/bridgeCount", list.length);

      if (this._mapReady) this._refreshMapMarkers();
    },

    onReload: function () {
      this._loadBridges();
      MessageToast.show("Reloading bridge data…");
    },

    // ── Tab selection ─────────────────────────────────────────────────────────

    onTabSelect: function (oEvent) {
      const key = oEvent.getParameter("key");
      if (key === "map" && !this._mapReady) {
        setTimeout(() => this._initMap(), 150);
      }
      if (key === "map" && this._mapReady && this._map) {
        setTimeout(() => this._map.invalidateSize(), 200);
      }
    },

    // ── List tab ──────────────────────────────────────────────────────────────

    onListRowPress: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext();
      if (!ctx) return;
      this._switchToHierarchyTab(ctx.getObject());
    },

    onOpenInHierarchy: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext();
      if (!ctx) return;
      this._switchToHierarchyTab(ctx.getObject());
    },

    _switchToHierarchyTab: function (bridge) {
      this.byId("viewTabBar").setSelectedKey("hierarchy");
      this._selectBridge(bridge);
    },

    // ── Hierarchy tab ─────────────────────────────────────────────────────────

    onBridgeSelected: function (oEvent) {
      const item = oEvent.getParameter("listItem");
      if (!item) return;
      const bridge = item.getBindingContext().getObject();
      this._selectBridge(bridge);
    },

    _selectBridge: function (bridge) {
      this._model.setProperty("/selectedBridge", bridge);

      // Scroll pick-list to the selected item if tab switching
      const pickList = this.byId("bridgePickList");
      if (pickList) {
        pickList.getItems().forEach(item => {
          const b = item.getBindingContext() && item.getBindingContext().getObject();
          if (b && b.ID === bridge.ID) {
            item.setSelected(true);
          }
        });
      }

      // Show skeleton immediately then load real data
      this._renderTree(bridge, null);
      this._loadElementsForBridge(bridge);
    },

    // ── Tree rendering ────────────────────────────────────────────────────────

    _renderTree: function (bridge, elements) {
      const tree = this.byId("hierarchyTree");
      if (!tree) return;
      tree.destroyItems();

      // Root node — the bridge asset
      const root = this._makeItem(
        bridge.bridgeName,
        (bridge.structureType || "Bridge") +
          " · " + (bridge.state || "") +
          (bridge.yearBuilt ? " · Built " + bridge.yearBuilt : "") +
          (bridge.totalLength ? " · " + bridge.totalLength + " m" : ""),
        "sap-icon://functional-location",
        "Active"
      );

      if (!elements) {
        // Loading skeleton
        root.addItem(this._makeItem("Loading elements…", "Fetching from server", "sap-icon://synchronize", "Inactive"));
        tree.addItem(root);
        tree.expandToLevel(1);
        return;
      }

      if (elements.length === 0) {
        // No elements recorded — show AS 5100 standard template skeleton
        for (const [groupName, skeletonItems] of Object.entries(STANDARD_SKELETON)) {
          const groupDef = ELEMENT_GROUPS[groupName] || { icon: "sap-icon://detail-view" };
          const groupNode = this._makeItem(
            groupName,
            groupDef.description || "AS 5100 element group — no records yet",
            groupDef.icon,
            "Active"
          );
          skeletonItems.forEach(label => {
            groupNode.addItem(this._makeItem(
              label,
              "Not yet recorded in system",
              "sap-icon://add-document",
              "Inactive"
            ));
          });
          root.addItem(groupNode);
        }
      } else {
        // Real elements — group by AS 5100 taxonomy then by span/pier
        const byGroup = this._groupByTaxonomy(elements);

        for (const [gName, gElems] of Object.entries(byGroup)) {
          const groupDef = ELEMENT_GROUPS[gName] || { icon: "sap-icon://detail-view", description: "" };
          const worst = this._worstCondition(gElems);
          const worstLabel = worst ? (" · Worst: " + (CONDITION_LABEL[worst] || worst)) : "";

          const groupNode = this._makeItem(
            gName + " (" + gElems.length + ")",
            groupDef.description + worstLabel,
            groupDef.icon,
            "Active"
          );

          const bySpan = this._groupBySpan(gElems);

          for (const [spanKey, spanElems] of Object.entries(bySpan)) {
            if (spanKey === "__none") {
              // No span/pier grouping — attach elements directly to group
              spanElems.forEach(elem => groupNode.addItem(this._elementNode(elem)));
            } else {
              const spanNode = this._makeItem(
                spanKey,
                spanElems.length + " element(s)",
                "sap-icon://grid",
                "Active"
              );
              spanElems.forEach(elem => spanNode.addItem(this._elementNode(elem)));
              groupNode.addItem(spanNode);
            }
          }

          root.addItem(groupNode);
        }
      }

      // Restrictions node — always present as a structural placeholder
      const restrictNode = this._makeItem(
        "Restrictions",
        "Load limits and access restrictions — navigate to Restrictions app for detail",
        "sap-icon://alert",
        "Active"
      );
      root.addItem(restrictNode);

      // Inspections / defects placeholder
      const inspNode = this._makeItem(
        "Inspections & Defects",
        "Inspection history and defect records — navigate to Bridges app for detail",
        "sap-icon://inspect",
        "Active"
      );
      root.addItem(inspNode);

      tree.addItem(root);
      tree.expandToLevel(2);
    },

    _elementNode: function (elem) {
      const condRating = elem.currentConditionRating;
      const condLabel = condRating ? " · " + (CONDITION_LABEL[condRating] || "Cond " + condRating) : "";
      const matLabel = elem.material ? " · " + elem.material : "";
      const posLabel = elem.position ? " · " + elem.position : "";

      return this._makeItem(
        elem.elementName || elem.elementId || ("Element " + elem.ID),
        (elem.elementType || "").replace(/_/g, " ") + matLabel + posLabel + condLabel,
        "sap-icon://accidental-leave",
        "Navigation"
      );
    },

    _makeItem: function (title, description, icon, type) {
      return new StandardTreeItem({
        title: title,
        description: description,
        icon: icon,
        type: type || "Active"
      });
    },

    _groupByTaxonomy: function (elements) {
      const result = {};
      elements.forEach(elem => {
        const g = groupKey(elem);
        if (!result[g]) result[g] = [];
        result[g].push(elem);
      });
      // Preserve canonical order
      const ordered = {};
      [...Object.keys(ELEMENT_GROUPS), "Other"].forEach(k => {
        if (result[k]) ordered[k] = result[k];
      });
      return ordered;
    },

    _groupBySpan: function (elements) {
      const result = {};
      elements.forEach(elem => {
        const key = spanLabel(elem) || "__none";
        if (!result[key]) result[key] = [];
        result[key].push(elem);
      });
      return result;
    },

    _worstCondition: function (elements) {
      let worst = 0;
      elements.forEach(e => { if (e.currentConditionRating > worst) worst = e.currentConditionRating; });
      return worst || null;
    },

    onExpandAll: function () {
      this.byId("hierarchyTree").expandToLevel(5);
    },

    onCollapseAll: function () {
      this.byId("hierarchyTree").collapseAll();
    },

    // ── Map tab ───────────────────────────────────────────────────────────────

    onMapRendered: function () {
      if (!this._mapReady) {
        this._ensureLeaflet(() => this._initMap());
      } else if (this._map) {
        setTimeout(() => this._map.invalidateSize(), 300);
      }
    },

    _ensureLeaflet: function (callback) {
      if (window.L) { callback(); return; }

      // Reuse Leaflet vendor from the map-view app (same origin)
      const cssHref = "/map-view/webapp/vendor/leaflet/leaflet.css";
      if (!document.querySelector('link[href="' + cssHref + '"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssHref;
        document.head.appendChild(link);
      }

      const script = document.createElement("script");
      script.src = "/map-view/webapp/vendor/leaflet/leaflet.js";
      script.onload = callback;
      script.onerror = () => {
        // CDN fallback
        const fallback = document.createElement("link");
        fallback.rel = "stylesheet";
        fallback.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(fallback);

        const fb = document.createElement("script");
        fb.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        fb.onload = callback;
        document.head.appendChild(fb);
      };
      document.head.appendChild(script);
    },

    _initMap: function () {
      const L = window.L;
      if (!L) return;

      const mapDiv = document.getElementById("bhMapContainer");
      if (!mapDiv || this._mapReady) return;

      this._map = L.map("bhMapContainer", {
        center: [-25.5, 134.5],
        zoom: 4,
        zoomControl: true,
        attributionControl: true
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(this._map);

      this._mapReady = true;
      this._refreshMapMarkers();

      // Click on map outside markers clears selection
      this._map.on("click", () => {
        this._model.setProperty("/mapSelectedBridge", null);
      });
    },

    onMapConditionFilter: function (oEvent) {
      this._mapConditionFilter = oEvent.getParameter("selectedItem").getKey();
      if (this._mapReady) this._refreshMapMarkers();
    },

    _refreshMapMarkers: function () {
      if (!this._map || !window.L) return;
      const L = window.L;

      if (this._markerLayer) {
        this._markerLayer.clearLayers();
      } else {
        this._markerLayer = L.layerGroup().addTo(this._map);
      }

      const bridges = this._model.getProperty("/filteredBridges") || [];
      const condFilter = this._mapConditionFilter;

      bridges.forEach(bridge => {
        if (!bridge.latitude || !bridge.longitude) return;

        const cr = bridge.conditionRating || 0;

        // Apply condition filter
        if (condFilter === "good" && cr > 4) return;
        if (condFilter === "fair" && (cr < 5 || cr > 6)) return;
        if (condFilter === "poor" && cr < 7) return;

        const color = cr >= 7 ? "#d32f2f" : cr >= 5 ? "#f57c00" : "#388e3c";
        const radius = cr >= 7 ? 9 : 7;

        const marker = L.circleMarker([bridge.latitude, bridge.longitude], {
          radius: radius,
          fillColor: color,
          color: "#ffffff",
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.88
        });

        marker.bindPopup(
          "<div style='min-width:200px'>" +
          "<strong style='font-size:1rem'>" + bridge.bridgeName + "</strong><br/>" +
          "<span style='color:#666'>ID:</span> " + bridge.bridgeId + "<br/>" +
          "<span style='color:#666'>State:</span> " + (bridge.state || "N/A") + "<br/>" +
          "<span style='color:#666'>Structure:</span> " + (bridge.structureType || "N/A") + "<br/>" +
          "<span style='color:#666'>Condition:</span> " + (cr || "N/A") + "/10<br/>" +
          "<span style='color:#666'>Posting:</span> " + (bridge.postingStatus || "N/A") + "<br/>" +
          "<a href='#BridgeHierarchy-display' style='color:#1473e6;font-size:0.85rem'>View Hierarchy ↗</a>" +
          "</div>",
          { maxWidth: 260 }
        );

        marker.on("click", () => {
          this._model.setProperty("/selectedBridge", bridge);
        });

        this._markerLayer.addLayer(marker);
      });
    }

  });
});
