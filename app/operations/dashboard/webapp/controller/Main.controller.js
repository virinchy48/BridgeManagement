sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  const C = { good: "#107E3E", fair: "#E76500", poor: "#BB0000", critical: "#6E0000" };

  return Controller.extend("BridgeManagement.dashboard.controller.Main", {

    onInit: function () {
      this.getView().setModel(new JSONModel({
        overdueInspections: [],
        gazetteWatchlist: []
      }), "view");
      this._load();
    },

    onRefresh: function () {
      this._load();
      MessageToast.show("Refreshing\u2026");
    },

    onStateFilterChange: function () {
      this._load();
    },

    onBridgePress: function (oEvent) {
      const ctx = oEvent.getSource().getBindingContext("view");
      if (!ctx) return;
      const id = ctx.getProperty("ID");
      if (id) window.location.href = "#Bridges-manage&/Bridges(" + id + ")";
    },

    fmtUrgencyState: function (urgency) {
      return { GREEN: "Success", AMBER: "Warning", RED: "Error", EXPIRED: "Error" }[urgency] || "None";
    },

    _load: function () {
      const stateCtrl = this.byId("stateFilter");
      const state = stateCtrl ? stateCtrl.getSelectedKey() : "";
      const url = "/dashboard/api/analytics" + (state ? "?state=" + encodeURIComponent(state) : "");

      fetch(url)
        .then(r => r.json())
        .then(data => this._render(data))
        .catch(() => this._setHtml("kpiStrip", "<div class='rptEmptyState'>Could not load dashboard data</div>"));
    },

    _render: function (d) {
      const model = this.getView().getModel("view");
      model.setProperty("/overdueInspections", d.overdueInspections || []);
      model.setProperty("/gazetteWatchlist", d.gazetteWatchlist || []);

      this._setHtml("lastUpdatedHtml",
        "<div class='dshLastUpdated'>Last updated: " + new Date().toLocaleTimeString("en-AU") + "</div>");

      // ── KPI strip ────────────────────────────────────────────────────────
      const nciCls  = d.nci >= 80 ? "rptKpiGood" : d.nci >= 60 ? "rptKpiWarn" : "rptKpiError";
      const defCls  = d.deficiencyRate > 15 ? "rptKpiError" : d.deficiencyRate > 5 ? "rptKpiWarn" : "rptKpiGood";
      const inspCls = d.overdueCount > 0 ? "rptKpiError" : "rptKpiGood";
      const gazCls  = d.gazetteIssueCount > 0 ? "rptKpiError" : "rptKpiGood";

      const kpis = [
        { label: "Total Bridges",        value: d.totalBridges || 0,        cls: "rptKpiNeutral", href: "#Bridges-manage" },
        { label: "Network Condition",     value: (d.nci || 0) + "%",         cls: nciCls,          href: "#Bridges-manage&/NetworkReports?tab=health" },
        { label: "Deficiency Rate",       value: (d.deficiencyRate || 0) + "%", cls: defCls,        href: "#Bridges-manage&/NetworkReports?tab=risk" },
        { label: "Overdue Inspections",   value: d.overdueCount || 0,        cls: inspCls,         href: "#Bridges-manage&/NetworkReports?tab=inspection" },
        { label: "Gazette Issues",        value: d.gazetteIssueCount || 0,   cls: gazCls,          href: "#Bridges-manage&/NetworkReports?tab=regulatory" },
        { label: "Active Restrictions",   value: d.activeRestrictions || 0,  cls: "rptKpiNeutral", href: "#Bridges-manage&/NetworkReports?tab=restrictions" }
      ];

      const kpiHtml = `<div class="rptKpiStrip">
        ${kpis.map(k => `
          <div class="rptKpiCard ${k.cls}" style="cursor:pointer" onclick="window.location.href='${k.href}'" title="Click to drill in">
            <div class="rptKpiValue">${k.value}</div>
            <div class="rptKpiLabel">${k.label} <span style="font-size:.6rem;opacity:.5">&#x2197;</span></div>
          </div>`).join("")}
      </div>`;
      this._setHtml("kpiStrip", kpiHtml);

      // ── Condition distribution ────────────────────────────────────────────
      const dist  = d.conditionDistribution || {};
      const total = dist.total || 1;
      const pct   = v => total > 0 ? Math.round((v || 0) / total * 100) : 0;

      const stackedBar = `
        <div class="rptStackedBar" style="margin-bottom:.4rem">
          <div class="rptSeg rptSegGood"     style="width:${pct(dist.good)}%"     title="Good: ${dist.good || 0}"></div>
          <div class="rptSeg rptSegFair"     style="width:${pct(dist.fair)}%"     title="Fair: ${dist.fair || 0}"></div>
          <div class="rptSeg rptSegPoor"     style="width:${pct(dist.poor)}%"     title="Poor: ${dist.poor || 0}"></div>
          <div class="rptSeg rptSegCritical" style="width:${pct(dist.critical)}%" title="Critical: ${dist.critical || 0}"></div>
        </div>`;

      const legend = `<div class="rptLegend">
        ${[["Good", C.good, dist.good], ["Fair", C.fair, dist.fair], ["Poor", C.poor, dist.poor], ["Critical", C.critical, dist.critical]]
          .map(([l, c, n]) => `<span><span class="rptLegendDot" style="background:${c}"></span>${l}: ${n || 0} (${pct(n)}%)</span>`)
          .join("")}
      </div>`;

      const states    = d.conditionByState || [];
      const maxTotal  = Math.max(...states.map(s => s.total), 1);
      const stateRows = states.slice(0, 8).map(s => `
        <div style="margin-bottom:5px">
          <div style="display:flex;justify-content:space-between;font-size:.75rem;color:#555;margin-bottom:2px">
            <span>${s.state}</span><span>${s.total}</span>
          </div>
          <div class="rptStackedBar" style="width:${Math.round(s.total / maxTotal * 100)}%;height:14px">
            <div class="rptSeg rptSegGood"     style="width:${total > 0 ? Math.round(s.good / s.total * 100) : 0}%"></div>
            <div class="rptSeg rptSegFair"     style="width:${total > 0 ? Math.round(s.fair / s.total * 100) : 0}%"></div>
            <div class="rptSeg rptSegPoor"     style="width:${total > 0 ? Math.round(s.poor / s.total * 100) : 0}%"></div>
            <div class="rptSeg rptSegCritical" style="width:${total > 0 ? Math.round(s.critical / s.total * 100) : 0}%"></div>
          </div>
        </div>`).join("");

      const chartHtml = `
        <div class="rptChartSection" style="cursor:pointer" onclick="window.location.href='#Bridges-manage&/NetworkReports?tab=health'">
          <div class="rptChartTitle">Network Condition Distribution (${total} bridges) <span style="font-size:.6rem;opacity:.5">&#x2197;</span></div>
          ${stackedBar}${legend}
          ${stateRows ? `<div style="margin-top:1rem"><div class="rptChartTitle">By State</div>${stateRows}</div>` : ""}
        </div>`;
      this._setHtml("conditionChart", chartHtml);

      // ── Priority section header ───────────────────────────────────────────
      this._setHtml("priorityHeader",
        "<div class='rptChartTitle' style='margin-bottom:.5rem'>Priority Actions</div>");

      // ── Table "View All" footers ──────────────────────────────────────────
      this._setHtml("overdueFooter",
        `<a class="dshViewAllLink" onclick="window.location.href='#Bridges-manage&/NetworkReports?tab=inspection'">View all overdue inspections &#x2197;</a>`);
      this._setHtml("gazetteFooter",
        `<a class="dshViewAllLink" onclick="window.location.href='#Bridges-manage&/NetworkReports?tab=regulatory'">View all compliance issues &#x2197;</a>`);
    },

    _setHtml: function (id, html) {
      const ctrl = this.byId(id);
      if (ctrl) ctrl.setContent(html || "");
    }

  });
});
