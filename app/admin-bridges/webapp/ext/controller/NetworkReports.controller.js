sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  const C = { good: "#107E3E", fair: "#E76500", poor: "#BB0000", critical: "#6E0000" };
  const SCOUR_COLORS = { VeryHigh: "#6E0000", High: "#BB0000", Medium: "#E76500", Low: "#107E3E", VeryLow: "#5B738B", Unknown: "#999" };

  return Controller.extend("BridgeManagement.adminbridges.ext.controller.NetworkReports", {

    onInit: function () {
      const model = new JSONModel({
        busy: false,
        selectedTab: "health",
        health:       { loaded: false, kpis: {}, conditionDistribution: {}, conditionByState: [], worstBridges: [], ageProfile: {}, structureTypeBreakdown: [], importanceBreakdown: {} },
        inspection:   { loaded: false, kpis: {}, overdueByState: [], overdueInspections: [], upcomingInspections: [] },
        defects:      { loaded: false, kpis: {}, bySeverity: [], topBridges: [], elementBreakdown: [], byPriority: [] },
        regulatory:   { loaded: false, kpis: {}, gazetteBreakdown: [], restrictionsByType: [], urgentBridges: [] },
        risk:         { loaded: false, kpis: {}, formalRisk: {}, scourDistribution: [], riskByState: [], topRiskBridges: [] },
        maintenance:  { loaded: false, kpis: {}, programmeByYear: [], priorityBreakdown: [] },
        restrictions: { loaded: false, kpis: {}, postingBreakdown: [], massRestrictedBridges: [], heightRestrictedBridges: [], fullCapacityBridges: [] },
        quality:      { loaded: false, kpis: {}, scoreDistribution: [], lowestBridges: [] }
      });
      this.getView().setModel(model, "view");

      // Support ?tab= and ?filter= deep-link parameters (e.g. from Dashboard KPI click)
      const mTab    = window.location.hash.match(/[?&]tab=([^&]+)/);
      const mFilter = window.location.hash.match(/[?&]filter=([^&]+)/);
      const startTab    = mTab    ? decodeURIComponent(mTab[1])    : "health";
      const startFilter = mFilter ? decodeURIComponent(mFilter[1]) : null;
      model.setProperty("/selectedTab", startTab);
      model.setProperty("/activeFilter", startFilter);
      this._loadTab(startTab);
    },

    onAfterRendering: function () {
      window.bmsScrollTo = (id) => {
        const ctrl = this.byId(id);
        if (ctrl && ctrl.getDomRef()) {
          ctrl.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
    },

    onFilterBannerClose: function (oEvent) {
      oEvent.getSource().setVisible(false);
    },

    onNavBack: function () {
      var router = sap.ui.core.UIComponent.getRouterFor(this);
      if (router) {
        router.navTo("BridgesList");
      } else {
        window.history.go(-1);
      }
    },

    onTabSelect: function (oEvent) {
      this._loadTab(oEvent.getParameter("key"));
    },

    onRefresh: function () {
      const key = this.byId("reportTabs").getSelectedKey();
      this.getView().getModel("view").setProperty("/" + key + "/loaded", false);
      this._loadTab(key);
      MessageToast.show("Refreshing\u2026");
    },

    onStateFilterChange: function () {
      const key = this.byId("reportTabs").getSelectedKey();
      this.getView().getModel("view").setProperty("/" + key + "/loaded", false);
      this._loadTab(key);
    },

    onBridgeRowPress: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("view");
      if (!ctx) return;
      const id = ctx.getProperty("ID");
      if (id) {
        const router = sap.ui.core.UIComponent.getRouterFor(this);
        if (router) {
          router.navTo("BridgesDetails", { key: id });
        } else {
          window.location.href = "#Bridges-manage&/Bridges(" + id + ")";
        }
      }
    },

    _loadTab: function (key) {
      const model = this.getView().getModel("view");
      if (model.getProperty("/" + key + "/loaded")) return;

      const endpoints = {
        health:       "/reports/api/network-health",
        inspection:   "/reports/api/inspection-compliance",
        defects:      "/reports/api/defects",
        regulatory:   "/reports/api/regulatory-compliance",
        risk:         "/reports/api/risk-register",
        maintenance:  "/reports/api/maintenance",
        restrictions: "/reports/api/bridges-restrictions",
        quality:      "/reports/api/data-quality"
      };

      const url = endpoints[key];
      if (!url) return;

      const stateCtrl = this.byId("stateFilter");
      const state = stateCtrl ? stateCtrl.getSelectedKey() : "";
      const fullUrl = state ? url + "?state=" + encodeURIComponent(state) : url;

      fetch(fullUrl)
        .then(r => r.json())
        .then(data => {
          model.setProperty("/" + key, Object.assign({ loaded: true }, data));
          this._renderTab(key, data);
        })
        .catch(() => MessageToast.show("Failed to load " + key + " report"));
    },

    _renderTab: function (key, data) {
      const render = {
        health:       () => this._renderHealth(data),
        inspection:   () => this._renderInspection(data),
        defects:      () => this._renderDefects(data),
        regulatory:   () => this._renderRegulatory(data),
        risk:         () => this._renderRisk(data),
        maintenance:  () => this._renderMaintenance(data),
        restrictions: () => this._renderRestrictions(data),
        quality:      () => this._renderQuality(data)
      };
      if (render[key]) render[key]();
      // Apply drill-down filter from Dashboard deep-link (once, then clear)
      const filter = this.getView().getModel("view").getProperty("/activeFilter");
      if (filter) {
        this.getView().getModel("view").setProperty("/activeFilter", null);
        this._applyDrillFilter(key, filter);
      }
    },

    // Scroll to the relevant section and show a filter banner based on the
    // Dashboard KPI that triggered navigation.
    _applyDrillFilter: function (tab, filter) {
      const scrollMap = {
        deficient:  { id: "topRiskTable",       label: "Showing: Structurally Deficient Bridges" },
        scour:      { id: "topRiskTable",       label: "Showing: Scour-Critical Bridges" },
        overdue:    { id: "overdueTable",       label: "Showing: Overdue Inspections" },
        gazette:    { id: "urgentBridgesTable", label: "Showing: Gazette Expiry Issues" },
        sufficiency:{ id: "worstBridgesTable",  label: "Showing: Low Sufficiency Bridges" }
      };
      // condition_<key> filters the worst bridges section
      const condMatch = filter.match(/^condition_(.+)$/);
      const target = condMatch
        ? { id: "worstBridgesTable", label: "Showing: " + condMatch[1].charAt(0).toUpperCase() + condMatch[1].slice(1) + " Condition Bridges" }
        : scrollMap[filter];
      if (!target) return;

      // Show a dismissable banner in the tab
      const bannerId = tab + "FilterBanner";
      const existing = this.byId(bannerId);
      if (existing) {
        existing.setText(target.label);
        existing.setVisible(true);
      }

      // Scroll after a brief render delay
      setTimeout(() => {
        const ctrl = this.byId(target.id);
        if (ctrl && ctrl.getDomRef()) {
          ctrl.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    },

    _renderHealth: function (d) {
      const k = d.kpis || {};
      const dist = d.conditionDistribution || {};
      const total = dist.total || 1;

      const saLabel = k.ratedCount > 0 ? (k.structuralAdequacyPct || 0) + "%" : "—";
      const saSubtext = k.ratedCount > 0 ? k.ratedCount + " rated" : "No rating data";
      const saClass = k.ratedCount === 0 ? "rptKpiNeutral"
        : k.structuralAdequacyPct >= 70 ? "rptKpiGood"
        : k.structuralAdequacyPct >= 50 ? "rptKpiWarn" : "rptKpiError";

      const bsiLabel = k.avgBsi != null ? k.avgBsi : "—";
      const bsiClass = k.avgBsi == null ? "rptKpiNeutral"
        : k.avgBsi >= 70 ? "rptKpiGood"
        : k.avgBsi >= 50 ? "rptKpiWarn" : "rptKpiError";

      const deficiencyValue = (k.deficiencyCount || 0) + " (" + (k.deficiencyRate || 0) + "%)";
      const deficiencyClass = (k.deficiencyRate || 0) > 15 ? "rptKpiError"
        : (k.deficiencyRate || 0) > 5 ? "rptKpiWarn" : "rptKpiGood";

      const kpiHtml = this._kpiStrip([
        { label: "Total Bridges",          value: k.totalBridges || 0,              cls: "rptKpiNeutral", nav: "#Bridges-manage" },
        { label: "Network Condition Index", value: (k.networkConditionIndex || 0) + "%", cls: this._nciClass(k.networkConditionIndex), scroll: "worstBridgesTable" },
        { label: "Deficiency",             value: deficiencyValue,                  cls: deficiencyClass, scroll: "worstBridgesTable" },
        { label: "Structural Adequacy",    value: saLabel,                          cls: saClass, scroll: "worstBridgesTable" },
        { label: "Avg BSI",                value: bsiLabel,                         cls: bsiClass, scroll: "worstBridgesTable" }
      ]);

      const chartHtml = `
        <div class="rptChartSection">
          <div class="rptChartTitle">Condition Distribution</div>
          ${this._stackedBar(dist, total)}
          ${this._conditionLegend(dist, total)}
        </div>`;

      this._setHtml("healthKpiChart", kpiHtml + chartHtml);

      const states = d.conditionByState || [];
      const maxTotal = Math.max(...states.map(s => s.total), 1);
      const stateHtml = states.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Condition by State</div>
          ${states.map(s => `
            <div style="margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:#555;margin-bottom:2px">
                <span>${s.state}</span><span>${s.total} bridges</span>
              </div>
              ${this._stackedBar(s, s.total, Math.round(s.total / maxTotal * 100))}
            </div>`).join("")}
        </div>` : "";
      this._setHtml("healthStateChart", stateHtml);

      const age = d.ageProfile || {};
      const ageBands = [
        { label: "Pre-1940",  key: "pre1940", color: "#6E0000" },
        { label: "1940–1959", key: "d1940s",  color: "#BB0000" },
        { label: "1960–1979", key: "d1960s",  color: "#E76500" },
        { label: "1980–1999", key: "d1980s",  color: "#E9730C" },
        { label: "2000+",     key: "d2000s",  color: "#107E3E" },
        { label: "Unknown",   key: "unknown", color: "#999" }
      ].filter(b => age[b.key] > 0);
      const maxAge = Math.max(...ageBands.map(b => age[b.key]), 1);
      const ageHtml = ageBands.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Age Profile by Decade</div>
          <div class="rptBarGrid">
            ${ageBands.map(b => `
              <div class="rptBarLabel">${b.label}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(age[b.key] / maxAge * 100)}%;background:${b.color}"></div></div>
              <div class="rptBarCount">${age[b.key]}</div>`).join("")}
          </div>
        </div>` : "";
      this._setHtml("healthAgeChart", ageHtml);

      const types = d.structureTypeBreakdown || [];
      const maxType = Math.max(...types.map(t => t.count), 1);
      const typeHtml = types.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Structure Type Breakdown</div>
          <div class="rptBarGrid">
            ${types.slice(0, 10).map(t => `
              <div class="rptBarLabel">${t.type}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(t.count / maxType * 100)}%"></div></div>
              <div class="rptBarCount">${t.count}</div>`).join("")}
          </div>
        </div>` : "";
      this._setHtml("healthTypeChart", typeHtml);
    },

    _renderInspection: function (d) {
      const k = d.kpis || {};
      const kpiHtml = this._kpiStrip([
        { label: "Overdue Inspections", value: k.overdue || 0,      cls: k.overdue > 0 ? "rptKpiError" : "rptKpiGood",   scroll: "overdueTable" },
        { label: "Due Within 30 Days",  value: k.due30 || 0,        cls: k.due30 > 5 ? "rptKpiWarn" : "rptKpiNeutral",   scroll: "upcomingTable" },
        { label: "Due in 31\u201390 Days", value: k.due31to90 || 0, cls: "rptKpiNeutral",                                scroll: "upcomingTable" },
        { label: "Avg Days Since Insp", value: k.avgDaysSince || 0, cls: k.avgDaysSince > 365 ? "rptKpiWarn" : "rptKpiGood", scroll: "overdueTable" }
      ]);
      this._setHtml("inspKpiChart", kpiHtml);

      const byState = d.overdueByState || [];
      const maxCount = Math.max(...byState.map(s => s.count), 1);
      const stateHtml = byState.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Overdue Inspections by State</div>
          <div class="rptBarGrid">
            ${byState.map(s => `
              <div class="rptBarLabel">${s.state}</div>
              <div class="rptBarTrack"><div class="rptBarFill rptBarError" style="width:${Math.round(s.count / maxCount * 100)}%"></div></div>
              <div class="rptBarCount">${s.count}</div>`).join("")}
          </div>
        </div>` : "";
      this._setHtml("inspStateChart", stateHtml);
    },

    _renderRegulatory: function (d) {
      const k = d.kpis || {};
      const kpiHtml = this._kpiStrip([
        { label: "Gazette Expired",        value: k.gazetteExpired || 0,   cls: k.gazetteExpired > 0 ? "rptKpiCritical" : "rptKpiGood", scroll: "urgentBridgesTable" },
        { label: "Gazette Expiring < 30d", value: k.gazetteRed || 0,       cls: k.gazetteRed > 0 ? "rptKpiError" : "rptKpiGood",       scroll: "urgentBridgesTable" },
        { label: "Gazette Expiring < 90d", value: k.gazetteAmber || 0,     cls: k.gazetteAmber > 0 ? "rptKpiWarn" : "rptKpiGood",      scroll: "urgentBridgesTable" },
        { label: "Active Restrictions",    value: k.totalRestrictions || 0, cls: "rptKpiNeutral",                                        nav: "#Restrictions-manage" }
      ]);

      const gaz = d.gazetteBreakdown || [];
      const maxGaz = Math.max(...gaz.map(g => g.count), 1);
      const gazHtml = gaz.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Gazette Status Breakdown</div>
          <div class="rptBarGrid">
            ${gaz.map(g => `
              <div class="rptBarLabel">${g.label}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(g.count / maxGaz * 100)}%;background:${g.color}"></div></div>
              <div class="rptBarCount">${g.count}</div>`).join("")}
          </div>
        </div>` : "";

      const restr = d.restrictionsByType || [];
      const maxR = Math.max(...restr.map(r => r.count), 1);
      const restrHtml = restr.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Active Restrictions by Type</div>
          <div class="rptBarGrid">
            ${restr.map(r => `
              <div class="rptBarLabel">${r.type || "Other"}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(r.count / maxR * 100)}%"></div></div>
              <div class="rptBarCount">${r.count}</div>`).join("")}
          </div>
        </div>` : "";

      this._setHtml("regulatoryKpiChart", kpiHtml);
      this._setHtml("regulatoryCharts", gazHtml + restrHtml);
    },

    _renderRisk: function (d) {
      const k = d.kpis || {};
      const fr = d.formalRisk || {};
      const kpiHtml = this._kpiStrip([
        { label: "Poor/Critical Condition",  value: k.criticalCondition || 0, cls: k.criticalCondition > 0 ? "rptKpiError" : "rptKpiGood",  scroll: "topRiskTable" },
        { label: "High/VeryHigh Scour Risk", value: k.highScour || 0,         cls: k.highScour > 0 ? "rptKpiError" : "rptKpiGood",          scroll: "topRiskTable" },
        { label: "Critical Defects",         value: k.criticalDefects || 0,   cls: k.criticalDefects > 0 ? "rptKpiCritical" : "rptKpiGood", scroll: "topRiskTable" },
        { label: "High Priority Assets",     value: k.highPriority || 0,      cls: "rptKpiWarn",                                            scroll: "topRiskTable" },
        { label: "Formal Risks (Open)",      value: fr.open != null ? fr.open + " / " + (fr.total || 0) : "—", cls: (fr.open || 0) > 0 ? "rptKpiWarn" : "rptKpiNeutral", scroll: "topRiskTable" },
        { label: "Extreme Risk",             value: fr.extreme || 0,          cls: (fr.extreme || 0) > 0 ? "rptKpiCritical" : "rptKpiGood", scroll: "topRiskTable" }
      ]);

      const scour = d.scourDistribution || [];
      const maxS = Math.max(...scour.map(s => s.count), 1);
      const scourHtml = scour.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Scour Risk Distribution</div>
          <div class="rptBarGrid">
            ${scour.map(s => `
              <div class="rptBarLabel">${s.risk}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(s.count / maxS * 100)}%;background:${SCOUR_COLORS[s.risk] || "#999"}"></div></div>
              <div class="rptBarCount">${s.count}</div>`).join("")}
          </div>
        </div>` : "";

      const byState = d.riskByState || [];
      const maxRS = Math.max(...byState.map(s => s.critical + s.highScour), 1);
      const stateRiskHtml = byState.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Risk Concentration by State</div>
          ${byState.map(s => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:0.8rem">
              <span style="min-width:50px;text-align:right;color:#555">${s.state}</span>
              <div style="flex:1;background:#f0f0f0;border-radius:3px;height:16px;overflow:hidden">
                <div style="height:100%;width:${Math.round((s.critical + s.highScour) / maxRS * 100)}%;background:#BB0000;border-radius:3px"></div>
              </div>
              <span style="min-width:80px;color:#666">Crit:${s.critical} Scour:${s.highScour}</span>
            </div>`).join("")}
        </div>` : "";

      const formalRiskBands = [
        { label: "Extreme", count: fr.extreme || 0, color: "#6E0000" },
        { label: "High",    count: fr.high    || 0, color: "#BB0000" },
        { label: "Medium",  count: fr.medium  || 0, color: "#E76500" },
        { label: "Low",     count: fr.low     || 0, color: "#107E3E" }
      ].filter(b => b.count > 0);
      const maxFR = Math.max(...formalRiskBands.map(b => b.count), 1);
      const formalRiskHtml = formalRiskBands.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Formal Risk Register — Inherent Risk Levels (${fr.total || 0} assessments)</div>
          <div class="rptBarGrid">
            ${formalRiskBands.map(b => `
              <div class="rptBarLabel">${b.label}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(b.count / maxFR * 100)}%;background:${b.color}"></div></div>
              <div class="rptBarCount">${b.count}</div>`).join("")}
          </div>
        </div>` : "";

      this._setHtml("riskKpiChart", kpiHtml);
      this._setHtml("riskCharts", formalRiskHtml + scourHtml + stateRiskHtml);
    },

    _renderDefects: function (d) {
      const k = d.kpis || {};

      const fmtAud = v => v > 0 ? "$" + v.toLocaleString("en-AU") : "$0";

      const kpiHtml = this._kpiStrip([
        { label: "Total Open Defects",     value: k.total || 0,              cls: (k.total || 0) > 0 ? "rptKpiWarn" : "rptKpiGood",    scroll: "topDefectBridgesTable" },
        { label: "Critical (Severity 4)",  value: k.criticalDefects || 0,    cls: (k.criticalDefects || 0) > 0 ? "rptKpiCritical" : "rptKpiGood", scroll: "topDefectBridgesTable" },
        { label: "Require Load Restriction", value: k.requiresRestriction || 0, cls: (k.requiresRestriction || 0) > 0 ? "rptKpiWarn" : "rptKpiGood", scroll: "topDefectBridgesTable" },
        { label: "Est. Total Repair Cost", value: fmtAud(k.totalRepairValue || 0), cls: "rptKpiNeutral" }
      ]);
      this._setHtml("defectsKpiChart", kpiHtml);

      const sevs = d.bySeverity || [];
      const maxSev = Math.max(...sevs.map(s => s.count), 1);
      const sevHtml = sevs.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Defects by Severity</div>
          <div class="rptBarGrid">
            ${sevs.map(s => `
              <div class="rptBarLabel">${s.label}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(s.count / maxSev * 100)}%;background:${s.color}"></div></div>
              <div class="rptBarCount">${s.count}</div>`).join("")}
          </div>
        </div>` : "";

      const elems = d.elementBreakdown || [];
      const maxElem = Math.max(...elems.map(e => e.count), 1);
      const elemHtml = elems.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Defects by Element Type (Top 10)</div>
          <div class="rptBarGrid">
            ${elems.map(e => `
              <div class="rptBarLabel">${e.type}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(e.count / maxElem * 100)}%"></div></div>
              <div class="rptBarCount">${e.count}</div>`).join("")}
          </div>
        </div>` : "";

      this._setHtml("defectsSeverityChart", sevHtml + elemHtml);
    },

    _renderMaintenance: function (d) {
      const k = d.kpis || {};

      const fmtAud = v => v > 0 ? "$" + Math.round(v).toLocaleString("en-AU") : "$0";

      const kpiHtml = this._kpiStrip([
        { label: "Open Defects",              value: k.openDefects || 0,             cls: (k.openDefects || 0) > 0 ? "rptKpiWarn" : "rptKpiGood" },
        { label: "Restrictions with Repairs", value: k.restrictionsWithRepairs || 0, cls: "rptKpiNeutral" },
        { label: "Defect Backlog Cost",        value: fmtAud(k.defectBacklogCost || 0), cls: (k.defectBacklogCost || 0) > 0 ? "rptKpiWarn" : "rptKpiGood" },
        { label: "Total Maintenance Value",    value: fmtAud(k.totalMaintenanceValue || 0), cls: "rptKpiNeutral" }
      ]);
      this._setHtml("maintenanceKpiChart", kpiHtml);

      const byYear = d.programmeByYear || [];
      const maxYear = Math.max(...byYear.map(y => y.count), 1);
      const yearHtml = byYear.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Maintenance Programme by Year</div>
          <div class="rptBarGrid">
            ${byYear.map(y => `
              <div class="rptBarLabel">${y.year}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(y.count / maxYear * 100)}%"></div></div>
              <div class="rptBarCount">${y.count} items — ${fmtAud(y.cost)}</div>`).join("")}
          </div>
        </div>` : "";

      const priorities = d.priorityBreakdown || [];
      const priorityColors = { P1: "#BB0000", P2: "#E76500", P3: "#E9730C", P4: "#107E3E", Unknown: "#999" };
      const maxPri = Math.max(...priorities.map(p => p.count), 1);
      const priHtml = priorities.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Open Defects by Maintenance Priority</div>
          <div class="rptBarGrid">
            ${priorities.map(p => `
              <div class="rptBarLabel">${p.priority}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(p.count / maxPri * 100)}%;background:${priorityColors[p.priority] || "#999"}"></div></div>
              <div class="rptBarCount">${p.count}</div>`).join("")}
          </div>
        </div>` : "";

      this._setHtml("maintenanceProgrammeChart", yearHtml + priHtml);
    },

    _renderRestrictions: function (d) {
      const k = d.kpis || {};
      const total = (k.totalRestricted || 0) + (k.underReview || 0) + (k.unrestricted || 0);

      const kpiHtml = this._kpiStrip([
        { label: "Mass Restricted",   value: k.totalRestricted || 0, cls: k.totalRestricted > 0 ? "rptKpiError" : "rptKpiGood", scroll: "massRestrictedTable" },
        { label: "Under Review",      value: k.underReview || 0,     cls: k.underReview > 0 ? "rptKpiWarn" : "rptKpiNeutral",   scroll: "massRestrictedTable" },
        { label: "Unrestricted",      value: k.unrestricted || 0,    cls: "rptKpiGood",                                         nav: "#Bridges-manage" },
        { label: "Height Limited",    value: k.withHeightLimit || 0, cls: "rptKpiNeutral",                                      scroll: "heightRestrictedTable" },
        { label: "HML Approved",      value: k.hmlApproved || 0,     cls: "rptKpiGood",                                         scroll: "fullCapacityTable" },
        { label: "B-Double Approved", value: k.bDoubleApproved || 0, cls: "rptKpiGood",                                         scroll: "fullCapacityTable" }
      ]);

      const breakdown = d.postingBreakdown || [];
      const maxB = Math.max(...breakdown.map(b => b.count), 1);
      const colorMap = { Unrestricted: "#107E3E", Restricted: "#BB0000", "Under Review": "#E76500", Closed: "#6E0000" };
      const breakdownHtml = breakdown.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">Posting Status Distribution (${total} bridges)</div>
          <div class="rptBarGrid">
            ${breakdown.map(b => `
              <div class="rptBarLabel">${b.status}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(b.count / maxB * 100)}%;background:${colorMap[b.status] || "#999"}"></div></div>
              <div class="rptBarCount">${b.count} (${total > 0 ? Math.round(b.count / total * 100) : 0}%)</div>`).join("")}
          </div>
        </div>` : "";

      this._setHtml("restrictionsKpiChart", kpiHtml);
      this._setHtml("restrictionsCharts", breakdownHtml);
    },

    _renderQuality: function (d) {
      const k = d.kpis || {};
      const score = k.avgScore || 0;
      const gaugeColor = score >= 90 ? "#107E3E" : score >= 75 ? "#E76500" : "#BB0000";
      const circumference = 2 * Math.PI * 15.9;

      const gaugeHtml = `
        <div style="display:inline-flex;flex-direction:column;align-items:center;margin-right:1.5rem">
          <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg)">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e0e0e0" stroke-width="3.2"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="${gaugeColor}" stroke-width="3.2"
              stroke-linecap="round"
              stroke-dasharray="${(score / 100 * circumference).toFixed(1)} ${circumference.toFixed(1)}"/>
          </svg>
          <span style="font-size:1.4rem;font-weight:700;color:${gaugeColor};margin-top:-5px">${score}%</span>
          <span style="font-size:0.72rem;color:#777;text-transform:uppercase;letter-spacing:0.04em">Avg DQ Score</span>
        </div>`;

      const kpiHtml = `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
        ${gaugeHtml}
        ${this._kpiStrip([
          { label: "Complete (\u2265 90%)",  value: k.complete100 || 0,  cls: "rptKpiGood",                                        scroll: "lowestQualityTable" },
          { label: "Partial (75\u201389%)",  value: k.partial75 || 0,    cls: "rptKpiWarn",                                        scroll: "lowestQualityTable" },
          { label: "Incomplete (< 50%)",     value: k.incomplete50 || 0, cls: k.incomplete50 > 0 ? "rptKpiError" : "rptKpiGood",  scroll: "lowestQualityTable" },
          { label: "Total Bridges",          value: k.total || 0,        cls: "rptKpiNeutral",                                     nav: "#Bridges-manage" }
        ], true)}
      </div>`;

      const dist = d.scoreDistribution || [];
      const maxD = Math.max(...dist.map(b => b.count), 1);
      const distHtml = dist.length ? `
        <div class="rptChartSection">
          <div class="rptChartTitle">DQ Score Distribution</div>
          <div class="rptBarGrid">
            ${dist.map((b, i) => {
              const colors = ["#107E3E", "#5cb85c", "#E76500", "#BB0000"];
              return `<div class="rptBarLabel">${b.band}</div>
              <div class="rptBarTrack"><div class="rptBarFill" style="width:${Math.round(b.count / maxD * 100)}%;background:${colors[i] || "#999"}"></div></div>
              <div class="rptBarCount">${b.count}</div>`;
            }).join("")}
          </div>
        </div>` : "";

      this._setHtml("qualityKpiChart", kpiHtml);
      this._setHtml("qualityDistChart", distHtml);
    },

    _kpiStrip: function (items, inline) {
      const wrap = inline ? "display:inline-flex" : "display:flex";
      return `<div class="rptKpiStrip" style="${wrap};gap:1rem;flex-wrap:wrap;margin-bottom:${inline ? "0" : "1.5rem"}">
        ${items.map(item => {
          const hasLink = item.nav || item.scroll;
          const onclick = item.nav
            ? `onclick="window.location.href='${item.nav}'"`
            : `onclick="window.bmsScrollTo && window.bmsScrollTo('${item.scroll}')"`;
          const pointer = hasLink ? `${onclick} style="cursor:pointer" title="Click to view details"` : "";
          return `<div class="rptKpiCard ${item.cls || "rptKpiNeutral"}" ${pointer}>
            <div class="rptKpiValue">${item.value}</div>
            <div class="rptKpiLabel">${item.label}${hasLink ? ' <span style="font-size:0.65rem;opacity:0.55;margin-left:2px">&#x2197;</span>' : ""}</div>
          </div>`;
        }).join("")}
      </div>`;
    },

    _stackedBar: function (dist, total, widthPct) {
      const pct = v => total > 0 ? Math.round((v || 0) / total * 100) : 0;
      const w = widthPct !== undefined ? widthPct + "%" : "100%";
      return `<div class="rptStackedBar" style="width:${w}">
        <div class="rptSeg rptSegGood"     style="width:${pct(dist.good)}%"     title="Good: ${dist.good || 0} (${pct(dist.good)}%)"></div>
        <div class="rptSeg rptSegFair"     style="width:${pct(dist.fair)}%"     title="Fair: ${dist.fair || 0} (${pct(dist.fair)}%)"></div>
        <div class="rptSeg rptSegPoor"     style="width:${pct(dist.poor)}%"     title="Poor: ${dist.poor || 0} (${pct(dist.poor)}%)"></div>
        <div class="rptSeg rptSegCritical" style="width:${pct(dist.critical)}%" title="Critical: ${dist.critical || 0} (${pct(dist.critical)}%)"></div>
      </div>`;
    },

    _conditionLegend: function (dist, total) {
      const pct = v => total > 0 ? Math.round((v || 0) / total * 100) : 0;
      const items = [
        { label: "Good",     key: "good",     color: C.good },
        { label: "Fair",     key: "fair",     color: C.fair },
        { label: "Poor",     key: "poor",     color: C.poor },
        { label: "Critical", key: "critical", color: C.critical }
      ];
      return `<div class="rptLegend">
        ${items.map(i => `<span><span class="rptLegendDot" style="background:${i.color}"></span>${i.label}: ${dist[i.key] || 0} (${pct(dist[i.key])}%)</span>`).join("")}
      </div>`;
    },

    _setHtml: function (id, html) {
      const ctrl = this.byId(id);
      if (ctrl) ctrl.setContent(html || "");
    },

    _nciClass: function (nci) {
      if (nci >= 80) return "rptKpiGood";
      if (nci >= 60) return "rptKpiWarn";
      return "rptKpiError";
    },

    fmtConditionState: function (condition) {
      const map = { Good: "Success", Fair: "Warning", Poor: "Error", Critical: "Error" };
      return map[condition] || "None";
    },

    fmtPostingState: function (status) {
      const map = { Unrestricted: "Success", Restricted: "Warning", "Under Review": "Warning", Closed: "Error" };
      return map[status] || "None";
    },

    fmtUrgencyState: function (urgency) {
      const map = { GREEN: "Success", AMBER: "Warning", RED: "Error", EXPIRED: "Error" };
      return map[urgency] || "None";
    },

    fmtScourState: function (risk) {
      const map = { VeryHigh: "Error", High: "Error", Medium: "Warning", Low: "Success", VeryLow: "Success" };
      return map[risk] || "None";
    },

    fmtDueState: function (days) {
      if (days <= 7) return "Error";
      if (days <= 30) return "Warning";
      return "None";
    },

    fmtRiskScoreState: function (score) {
      if (score >= 60) return "Error";
      if (score >= 30) return "Warning";
      return "None";
    },

    fmtQualityState: function (score) {
      if (score >= 90) return "Success";
      if (score >= 75) return "Warning";
      return "Error";
    },

    fmtDate: function (dateStr) {
      if (!dateStr) return "";
      try {
        return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
      } catch (_) { return dateStr; }
    },

    fmtImportance: function (level) {
      const map = { 1: "Critical", 2: "Essential", 3: "Important", 4: "Ordinary" };
      return map[level] || "";
    },

    fmtBool: function (v) { return v ? "Yes" : "No"; },

    fmtBoolState: function (v) { return v ? "Success" : "None"; },

    fmtClearanceState: function (h) {
      if (h == null) return "None";
      if (h < 4.6) return "Error";
      if (h < 5.0) return "Warning";
      return "None";
    },

    fmtDefectCountState: function (v) {
      if (!v) return "Success";
      if (v >= 5) return "Error";
      if (v >= 2) return "Warning";
      return "None";
    },

    fmtCriticalState: function (v) {
      if (!v || v === 0) return "None";
      return "Error";
    }

  });
});
