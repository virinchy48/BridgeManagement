const cds = require('@sap/cds');

module.exports = function registerMaintenanceHandlers(srv, helpers) {
  const { logAudit } = helpers;
  const { BridgeMaintenanceActions, Bridges } = cds.entities('bridge.management');

  srv.before(['CREATE', 'UPDATE'], BridgeMaintenanceActions, async req => {
    const d = req.data;

    if (req.event === 'CREATE' && !d.actionRef) {
      const last = await SELECT.one.from(BridgeMaintenanceActions)
        .columns('actionRef')
        .orderBy('createdAt desc');
      const m = last?.actionRef?.match(/^MA-(\d+)$/);
      const seq = m ? parseInt(m[1], 10) + 1 : 1;
      d.actionRef = 'MA-' + String(seq).padStart(4, '0');
    }

    if (d.bridgeRef) {
      const bridge = await SELECT.one.from(Bridges).columns('ID').where({ bridgeId: d.bridgeRef });
      if (bridge) d.bridge_ID = bridge.ID;
      else req.error(404, `Bridge '${d.bridgeRef}' not found`);
    }
  });

  srv.on('deactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0];
    await UPDATE(BridgeMaintenanceActions).set({ active: false }).where({ ID });
    await logAudit(req, 'BridgeMaintenanceActions', ID, { active: true }, { active: false });
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID });
  });

  srv.on('reactivate', BridgeMaintenanceActions, async req => {
    const { ID } = req.params[0];
    await UPDATE(BridgeMaintenanceActions).set({ active: true }).where({ ID });
    await logAudit(req, 'BridgeMaintenanceActions', ID, { active: false }, { active: true });
    return SELECT.one.from(BridgeMaintenanceActions).where({ ID });
  });

  srv.after('READ', Bridges, async (results, req) => {
    if (!Array.isArray(results)) results = [results];
    const ids = results.map(r => r?.ID).filter(Boolean);
    if (!ids.length) return;

    const counts = await SELECT
      .from(BridgeMaintenanceActions)
      .columns('bridge_ID', 'count(1) as cnt')
      .where({ bridge_ID: { in: ids }, active: true, status: { in: ['Planned', 'Scheduled', 'InProgress'] } })
      .groupBy('bridge_ID');

    const countMap = {};
    counts.forEach(c => { countMap[c.bridge_ID] = parseInt(c.cnt, 10); });

    for (const b of results) {
      if (!b) continue;
      b.maintenanceActionCount = countMap[b.ID] || 0;

      const today = new Date();
      let daysSince = null;
      if (b.lastInspectionDate) {
        daysSince = Math.floor((today - new Date(b.lastInspectionDate)) / 86400000);
      }
      b.daysSinceInspection = daysSince;

      const conditionRating = b.conditionRating || 10;
      if (conditionRating <= 3 && (daysSince === null || daysSince > 548)) {
        b.predictiveRiskFlag = 'HIGH';
      } else if (conditionRating <= 5 && (daysSince === null || daysSince > 365)) {
        b.predictiveRiskFlag = 'MEDIUM';
      } else if (conditionRating <= 7) {
        b.predictiveRiskFlag = 'LOW';
      } else {
        b.predictiveRiskFlag = null;
      }
    }
  });
};
