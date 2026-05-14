sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "BridgeManagement/adminbridges/ext/controller/CaptureCondition",
  "BridgeManagement/adminbridges/ext/controller/RiskAssessmentsExt",
  "BridgeManagement/adminbridges/ext/controller/BridgeInspectionsExt"
], function (JSONModel, MessageToast, CaptureCondition, RiskAssessmentsExt, BridgeInspectionsExt) {
  "use strict";

  var XSAPPNAME = "bridge-management";

  var SECTION_VISIBILITY = {
    OverviewIdentity:            { show: ["admin", "manage", "inspect", "operate", "view", "executive_view"] },
    PhysicalStructural:          { show: ["admin", "manage", "inspect", "operate", "view"] },
    ConditionInspections:        { show: ["admin", "manage", "inspect", "operate", "view"] },
    RestrictionsPermits:         { show: ["admin", "manage", "inspect", "operate", "view"] },
    DocumentsMap:                { show: ["admin", "manage", "inspect", "view"] },
    RiskComplianceAlerts:        { show: ["admin", "manage"] },
    Administration:              { show: ["admin", "manage"] },
    executiveKpiSection:         { show: ["admin", "manage", "executive_view"] },
    inspectionRegisterSection:   { show: ["admin", "manage", "inspect"] }
  };

  // FE4 header-action press events have null getSource() — fall back to component registry.
  function _viewFromRegistry() {
    var comps = sap.ui.core.Component.registry.all();
    var keys = Object.keys(comps);
    for (var i = 0; i < keys.length; i++) {
      var c = comps[keys[i]];
      if (c.getMetadata && c.getMetadata().getName() === "sap.fe.templates.ObjectPage.Component") {
        var root = c.getRootControl && c.getRootControl();
        if (root) return root;
      }
    }
    return null;
  }

  function _getView(oEvent) {
    var parent = oEvent && oEvent.getSource && oEvent.getSource();
    while (parent) {
      if (parent.isA && parent.isA("sap.ui.core.mvc.View")) return parent;
      parent = parent.getParent ? parent.getParent() : null;
    }
    return _viewFromRegistry();
  }

  return {

    // ── Lifecycle — FE4 calls these with ObjectPage controller as `this` ───────

    onInit: function () {
      var self = this;
      this._resolveScopes().then(function (scopes) {
        self._scopes = scopes;
        self._applyPersona(scopes);
      }).catch(function (e) {
        console.warn("[BridgeDetailExt] Scope resolution failed — dev mode:", e.message);
      });
    },

    _resolveScopes: async function () {
      try {
        var resp = await fetch("/user-api/currentUser", { credentials: "include" });
        if (!resp.ok) {
          console.warn("[BridgeDetailExt] /user-api/currentUser not available (HTTP " + resp.status + ") — all sections shown");
          return [];
        }
        var user = await resp.json();
        return (user.scopes || []).map(function (s) {
          return s.replace(XSAPPNAME + ".", "");
        });
      } catch (e) {
        console.warn("[BridgeDetailExt] /user-api/currentUser fetch failed — all sections shown:", e.message);
        return [];
      }
    },

    _applyPersona: function (shortScopes) {
      var oView = this.getView();
      var isExecutive = shortScopes.includes("executive_view");
      var isExternal  = shortScopes.includes("external_view");

      var scopeModel = new JSONModel({
        rawScopes:         shortScopes,
        isAdmin:           shortScopes.includes("admin"),
        isManager:         shortScopes.includes("manage"),
        isInspector:       shortScopes.includes("inspect"),
        isOperator:        shortScopes.includes("operate"),
        isViewer:          shortScopes.includes("view"),
        isExecutiveViewer: isExecutive,
        isExternalViewer:  isExternal,
        canEdit:    shortScopes.some(function (s) { return ["admin", "manage"].includes(s); }),
        canInspect: shortScopes.some(function (s) { return ["admin", "manage", "inspect"].includes(s); }),
        canOperate: shortScopes.some(function (s) { return ["admin", "manage", "operate"].includes(s); }),
        showFullRecord: false
      });
      oView.setModel(scopeModel, "userScopes");

      fetch("/odata/v4/admin/SystemConfig('S4_BASE_URL')", { credentials: "include" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cfg) {
          if (cfg && cfg.value) scopeModel.setProperty("/s4BaseUrl", cfg.value);
        })
        .catch(function () {});

      if (shortScopes.length === 0) return;
      this._hideSections(shortScopes, isExecutive);
    },

    _hideSections: function (shortScopes, isExecutive) {
      var oView = this.getView();
      var oPage = oView.byId("fe::ObjectPage");
      if (!oPage) oPage = this._findObjectPage(oView);
      if (!oPage) {
        console.warn("[BridgeDetailExt] ObjectPage not found — section visibility unchanged");
        return;
      }

      var sections = oPage.getSections ? oPage.getSections() : [];
      sections.forEach(function (section) {
        var sId = section.getId ? section.getId() : "";
        section.setVisible(this._isSectionVisible(sId, shortScopes, isExecutive));
      }.bind(this));

      if (isExecutive) {
        var kpi = sections.find(function (s) { return s.getId && s.getId().includes("executiveKpiSection"); });
        if (kpi) oPage.scrollToSection(kpi.getId());
      }

      if (shortScopes.includes("inspect") && !shortScopes.includes("manage") && !shortScopes.includes("admin")) {
        var cond = sections.find(function (s) { return s.getId && s.getId().includes("ConditionInspections"); });
        if (cond) {
          oPage.setSelectedSection(cond.getId());
          oPage.scrollToSection(cond.getId());
        }
      }
    },

    _isSectionVisible: function (sId, shortScopes, isExecutive) {
      var rule = null;
      Object.keys(SECTION_VISIBILITY).forEach(function (frag) {
        if (sId.includes(frag)) rule = SECTION_VISIBILITY[frag];
      });
      if (!rule) return true;
      if (isExecutive) return sId.includes("executiveKpiSection") || sId.includes("OverviewIdentity");
      return rule.show.some(function (s) { return shortScopes.includes(s); });
    },

    _findObjectPage: function (oView) {
      var result = null;
      function walk(control) {
        if (!control || result) return;
        if (control.isA && (
          control.isA("sap.uxap.ObjectPageLayout") ||
          control.isA("sap.fe.templates.ObjectPage.ObjectPage")
        )) { result = control; return; }
        var agg = control.getAggregation && control.getAggregation("content");
        if (Array.isArray(agg)) agg.forEach(walk); else if (agg) walk(agg);
        var inner = control._page || control._view;
        if (inner) walk(inner);
      }
      walk(oView);
      return result;
    },

    onAfterRendering: function () {
      if (this._scopes && this._scopes.length > 0) {
        this._hideSections(this._scopes, this._scopes.includes("executive_view"));
      }
      sap.ui.require(
        ["BridgeManagement/adminbridges/ext/controller/CustomAttributesInit"],
        function (CAInit) {
          if (CAInit && typeof CAInit.onContextChange === "function") CAInit.onContextChange();
        }
      );
    },

    // ── CaptureCondition delegation ─────────────────────────────────────────

    onCaptureConditionOpen: function (oEvent) {
      CaptureCondition.onCaptureConditionOpen.call(this, oEvent);
    },
    onConditionRatingChange: function (oEvent) {
      CaptureCondition.onConditionRatingChange.call(this, oEvent);
    },
    onCaptureConditionSave: function (oEvent) {
      CaptureCondition.onCaptureConditionSave.call(this, oEvent);
    },
    onCaptureConditionCancel: function (oEvent) {
      CaptureCondition.onCaptureConditionCancel.call(this, oEvent);
    },
    onExportCard: function (oEvent) {
      CaptureCondition.onExportCard.call(this, oEvent);
    },

    // ── Risk matrix delegation ──────────────────────────────────────────────

    onOpenInherentMatrix: function (oEvent) {
      var oView = _getView(oEvent);
      RiskAssessmentsExt.prototype.onOpenInherentMatrix.call(
        { getView: function () { return oView; } }, oEvent
      );
    },
    onOpenResidualMatrix: function (oEvent) {
      var oView = _getView(oEvent);
      RiskAssessmentsExt.prototype.onOpenResidualMatrix.call(
        { getView: function () { return oView; } }, oEvent
      );
    },

    // ── New Inspection — creates draft with bridge pre-filled, then navigates ──

    onNewInspection: function (oEvent) {
      var oView = _getView(oEvent);
      var oCtx = oView && oView.getBindingContext();
      if (!oCtx) { MessageToast.show("No bridge loaded"); return; }
      var bridge_ID = oCtx.getProperty("ID");

      fetch("/odata/v4/admin/BridgeInspections", {
        method: "HEAD",
        headers: { "X-CSRF-Token": "Fetch" }
      }).then(function (r) {
        var token = r.headers.get("x-csrf-token") || "unsafe";
        return fetch("/odata/v4/admin/BridgeInspections", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: JSON.stringify({ bridge_ID: bridge_ID })
        });
      }).then(function (r) {
        return r.json();
      }).then(function (data) {
        if (data.ID) {
          window.location.href = "#Bridges-manage&/BridgeInspections(ID='" + data.ID + "',IsActiveEntity=false)";
        } else {
          MessageToast.show("Failed to create inspection draft");
        }
      }).catch(function () {
        MessageToast.show("Could not start new inspection");
      });
    },

    onOpenBatchElementEntry: function () {
      MessageToast.show("Batch element entry is not yet available in this release.");
    },

    // ── S/4HANA deep-link actions ───────────────────────────────────────────

    onCreateWorkOrder: function (oEvent) {
      var oView = _getView(oEvent);
      var ctx = oView && oView.getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var s4BaseUrl = oView.getModel("userScopes") && oView.getModel("userScopes").getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#MaintenanceOrder-create?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank", "noopener");
      } else {
        MessageToast.show("S/4HANA integration not configured. Contact your administrator.");
      }
    },

    onViewInS4Hana: function (oEvent) {
      var oView = _getView(oEvent);
      var ctx = oView && oView.getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var s4BaseUrl = oView.getModel("userScopes") && oView.getModel("userScopes").getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#Equipment-display?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank", "noopener");
      } else {
        MessageToast.show("S/4HANA URL not configured. Contact your administrator.");
      }
    }

  };
});
