sap.ui.define([
  "sap/fe/core/PageController",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "BridgeManagement/adminbridges/ext/controller/CaptureCondition",
  "BridgeManagement/adminbridges/ext/controller/RiskMatrixExt",
  "BridgeManagement/adminbridges/ext/controller/BatchElementEntryExt"
], function (PageController, JSONModel, MessageToast, CaptureCondition, RiskMatrixExt, BatchElementEntryExt) {
  "use strict";

  /**
   * BridgeDetailExt — Scope-gated persona controller for the Bridge ObjectPage.
   *
   * Reads XSUAA scopes from the AppRouter /user-api/currentUser endpoint and
   * conditionally shows/hides ObjectPage sections. All visibility control is done
   * via section.setVisible() — never CSS — to comply with WCAG and Fiori guidelines.
   *
   * Scope → Persona mapping:
   *   bridge-management.admin          → BRIDGE_ADMIN   (all sections RW)
   *   bridge-management.manage         → BRIDGE_MANAGER (all sections, S7 read-only)
   *   bridge-management.inspect        → BRIDGE_INSPECTOR (S3 P0, S6+S7 hidden)
   *   bridge-management.operate        → BMS_OPERATOR  (S4 RW, S6+S7 hidden)
   *   bridge-management.view           → BMS_VIEWER    (all sections read-only)
   *   bridge-management.executive_view → EXECUTIVE_VIEWER (KPI panel only, tabs hidden)
   *   bridge-management.external_view  → EXTERNAL_VIEWER (separate public route — not here)
   *
   * Section IDs (from fiori-service.cds UI.Facets):
   *   OverviewIdentity, PhysicalStructural, ConditionInspections,
   *   RestrictionsPermits, DocumentsMap, RiskComplianceAlerts, Administration
   *
   * Custom section IDs (from manifest.json):
   *   executiveKpiSection, inspectionRegisterSection
   */

  // Xsappname prefix used in scopes — matches xs-security.json xsappname
  var XSAPPNAME = "bridge-management";

  var SECTION_VISIBILITY = {
    // [sectionIdFragment]: { minScope, hideFromScopes[] }
    OverviewIdentity:       { show: ["admin", "manage", "inspect", "operate", "view", "executive_view"] },
    PhysicalStructural:     { show: ["admin", "manage", "inspect", "operate", "view"] },
    ConditionInspections:   { show: ["admin", "manage", "inspect", "operate", "view"] },
    RestrictionsPermits:    { show: ["admin", "manage", "inspect", "operate", "view"] },
    DocumentsMap:           { show: ["admin", "manage", "inspect", "view"] },
    RiskComplianceAlerts:   { show: ["admin", "manage"] },
    Administration:         { show: ["admin", "manage"] },
    // Custom sections
    executiveKpiSection:    { show: ["admin", "manage", "executive_view"] },
    inspectionRegisterSection: { show: ["admin", "manage", "inspect"] }
  };

  return PageController.extend("BridgeManagement.adminbridges.ext.controller.BridgeDetailExt", {

    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      this._resolveScopes().then(function (scopes) {
        this._scopes = scopes;          // stored for onAfterRendering re-apply
        this._applyPersona(scopes);
      }.bind(this)).catch(function (e) {
        console.warn("[BridgeDetailExt] Scope resolution failed — showing all sections (dev mode):", e.message);
      });
    },

    // ── Scope resolution ────────────────────────────────────────────────────

    _resolveScopes: async function () {
      try {
        // AppRouter provides /user-api/currentUser when XSUAA is configured
        var resp = await fetch("/user-api/currentUser", { credentials: "include" });
        if (!resp.ok) {
          // Local cds watch: endpoint absent — default to showing everything
          console.warn("[BridgeDetailExt] /user-api/currentUser not available (HTTP " + resp.status + ") — dev mode, all sections shown");
          return [];
        }
        var user = await resp.json();
        var rawScopes = user.scopes || [];
        // Scopes arrive as "bridge-management.admin" — normalise to short form
        return rawScopes.map(function (s) {
          return s.replace(XSAPPNAME + ".", "");
        });
      } catch (e) {
        console.warn("[BridgeDetailExt] /user-api/currentUser fetch failed — dev mode, all sections shown:", e.message);
        return [];
      }
    },

    // ── Persona application ──────────────────────────────────────────────────

    _applyPersona: function (shortScopes) {
      var oView = this.getView();
      var isExecutive = shortScopes.includes("executive_view");
      var isExternal = shortScopes.includes("external_view");

      // Build the userScopes model consumed by fragment bindings
      var scopeModel = new JSONModel({
        rawScopes:         shortScopes,
        isAdmin:           shortScopes.includes("admin"),
        isManager:         shortScopes.includes("manage"),
        isInspector:       shortScopes.includes("inspect"),
        isOperator:        shortScopes.includes("operate"),
        isViewer:          shortScopes.includes("view"),
        isExecutiveViewer: isExecutive,
        isExternalViewer:  isExternal,
        // Composite permissions consumed by fragment controllers
        canEdit:    shortScopes.some(function (s) { return ["admin", "manage"].includes(s); }),
        canInspect: shortScopes.some(function (s) { return ["admin", "manage", "inspect"].includes(s); }),
        canOperate: shortScopes.some(function (s) { return ["admin", "manage", "operate"].includes(s); }),
        // Used by ExecutiveKpiPanel.onOpenFullRecord
        showFullRecord: false
      });
      oView.setModel(scopeModel, "userScopes");

      // Fetch S4_BASE_URL from SystemConfig (non-blocking — used by S4 action buttons)
      fetch("/odata/v4/admin/SystemConfig('S4_BASE_URL')", { credentials: "include" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cfg) {
          if (cfg && cfg.value) scopeModel.setProperty("/s4BaseUrl", cfg.value);
        })
        .catch(function () { /* S4 not configured — buttons show MessageToast */ });

      // If no scopes resolved (dev mode) — show all sections and exit
      if (shortScopes.length === 0) return;

      this._hideSections(shortScopes, isExecutive);
    },

    _hideSections: function (shortScopes, isExecutive) {
      var oView = this.getView();

      // Find the ObjectPage control — FE generates it under a predictable prefix
      var oPage = oView.byId("fe::ObjectPage");
      if (!oPage) {
        // Fallback: search via aggregation walk
        oPage = this._findObjectPage(oView);
      }
      if (!oPage) {
        console.warn("[BridgeDetailExt] ObjectPage control not found — section visibility unchanged");
        return;
      }

      var sections = oPage.getSections ? oPage.getSections() : [];

      sections.forEach(function (section) {
        var sId = section.getId ? section.getId() : "";
        var visible = this._isSectionVisible(sId, shortScopes, isExecutive);
        section.setVisible(visible);
      }.bind(this));

      // When Executive: scroll to KPI panel (it is placed Before OverviewIdentity)
      if (isExecutive) {
        var kpiSection = sections.find(function (s) {
          return s.getId && s.getId().includes("executiveKpiSection");
        });
        if (kpiSection) {
          oPage.scrollToSection(kpiSection.getId());
        }
      }

      // When Inspector: scroll to Condition & Inspections (P0 section)
      if (shortScopes.includes("inspect") && !shortScopes.includes("manage") && !shortScopes.includes("admin")) {
        var condSection = sections.find(function (s) {
          return s.getId && s.getId().includes("ConditionInspections");
        });
        if (condSection) {
          oPage.setSelectedSection(condSection.getId());  // anchor nav active tab
          oPage.scrollToSection(condSection.getId());     // scroll viewport
        }
      }
    },

    _isSectionVisible: function (sId, shortScopes, isExecutive) {
      // Find the matching rule by fragment ID
      var matchingRule = null;
      Object.keys(SECTION_VISIBILITY).forEach(function (fragment) {
        if (sId.includes(fragment)) {
          matchingRule = SECTION_VISIBILITY[fragment];
        }
      });

      // Unknown section — default visible
      if (!matchingRule) return true;

      // Executive mode: only executiveKpiSection and OverviewIdentity (for header context)
      if (isExecutive) {
        return sId.includes("executiveKpiSection") || sId.includes("OverviewIdentity");
      }

      // Check if any of the user's scopes appear in the section's allow-list
      return matchingRule.show.some(function (allowedScope) {
        return shortScopes.includes(allowedScope);
      });
    },

    _findObjectPage: function (oView) {
      // Walk the view's content tree to find an ObjectPage control
      var result = null;
      function walk(control) {
        if (!control || result) return;
        if (control.isA && (
          control.isA("sap.uxap.ObjectPageLayout") ||
          control.isA("sap.fe.templates.ObjectPage.ObjectPage")
        )) {
          result = control;
          return;
        }
        var agg = control.getAggregation && control.getAggregation("content");
        if (Array.isArray(agg)) agg.forEach(walk);
        else if (agg) walk(agg);
        // Also check _page or _view internal references
        var inner = control._page || control._view;
        if (inner) walk(inner);
      }
      walk(oView);
      return result;
    },

    // ── S/4HANA deep-link actions ────────────────────────────────────────────

    onCreateWorkOrder: function () {
      var ctx = this.getView().getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var scopeModel = this.getView().getModel("userScopes");
      var s4BaseUrl = scopeModel && scopeModel.getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#MaintenanceOrder-create?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank");
      } else {
        sap.m.MessageToast.show("S/4HANA integration not configured. Contact your administrator.");
      }
    },

    onViewInS4Hana: function () {
      var ctx = this.getView().getBindingContext();
      if (!ctx) return;
      var bridgeId = ctx.getProperty("bridgeId");
      var scopeModel = this.getView().getModel("userScopes");
      var s4BaseUrl = scopeModel && scopeModel.getProperty("/s4BaseUrl");
      if (s4BaseUrl) {
        window.open(s4BaseUrl + "#Equipment-display?FunctionalLocation=" + encodeURIComponent(bridgeId), "_blank");
      } else {
        sap.m.MessageToast.show("S/4HANA URL not configured. Contact your administrator.");
      }
    },

    // ── Lifecycle hooks used by FE framework ─────────────────────────────────

    onAfterRendering: function () {
      // Re-apply section visibility after each render — FE sections may not exist at onInit time
      if (this._scopes && this._scopes.length > 0) {
        var isExecutive = this._scopes.includes("executive_view");
        this._hideSections(this._scopes, isExecutive);
      }
    },

    // ── CaptureCondition delegations ─────────────────────────────────────────

    onCaptureConditionOpen: function (oEvent) {
      return CaptureCondition.onCaptureConditionOpen.call(this, oEvent);
    },

    onConditionRatingChange: function (oEvent) {
      return CaptureCondition.onConditionRatingChange.call(this, oEvent);
    },

    onCaptureConditionSave: function (oEvent) {
      return CaptureCondition.onCaptureConditionSave.call(this, oEvent);
    },

    onCaptureConditionCancel: function (oEvent) {
      return CaptureCondition.onCaptureConditionCancel.call(this, oEvent);
    },

    onExportCard: function (oEvent) {
      return CaptureCondition.onExportCard.call(this, oEvent);
    },

    // ── RiskMatrixExt delegations ─────────────────────────────────────────────

    onOpenInherentMatrix: function (oEvent) {
      return RiskMatrixExt.onOpenInherentMatrix.call(this, oEvent);
    },

    onOpenResidualMatrix: function (oEvent) {
      return RiskMatrixExt.onOpenResidualMatrix.call(this, oEvent);
    },

    // ── BatchElementEntry delegation ─────────────────────────────────────────

    onOpenBatchElementEntry: function (oEvent) {
      return BatchElementEntryExt.onOpenBatchElementEntry.call(this, oEvent);
    }
  });
});
