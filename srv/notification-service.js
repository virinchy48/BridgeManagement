'use strict';

const https = require('https');
const http  = require('http');

const ANS_URL   = process.env.ALERT_NOTIFICATION_URL   || '';
const ANS_OAUTH = process.env.ALERT_NOTIFICATION_TOKEN || '';

async function sendNotification({ category, subject, body, priority = 'MEDIUM', tags = {} }) {
  if (!ANS_URL) {
    console.info('[notification-service] ALERT_NOTIFICATION_URL not set; skipping:', subject);
    return { skipped: true };
  }

  const payload = JSON.stringify({
    eventType  : category,
    resource   : { resourceName: 'BridgeManagement', resourceType: 'Application', tags },
    body       : body,
    subject    : subject,
    priority   : priority,
    category   : category,
    tags       : tags
  });

  return new Promise((resolve, reject) => {
    const url = new URL(ANS_URL + '/cf/producer/v1/resource-events');
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port    : url.port || (url.protocol === 'https:' ? 443 : 80),
      path    : url.pathname + url.search,
      method  : 'POST',
      headers : {
        'Content-Type'  : 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization' : `Bearer ${ANS_OAUTH}`
      }
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end',  () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function notifyInspectionOverdue(bridgeId, bridgeName, daysPast) {
  return sendNotification({
    category: 'InspectionOverdue',
    subject : `Bridge ${bridgeId} inspection overdue by ${daysPast} days`,
    body    : `Bridge ${bridgeName} (${bridgeId}) has not been inspected for ${daysPast} days. Schedule an inspection immediately.`,
    priority: daysPast > 730 ? 'HIGH' : 'MEDIUM',
    tags    : { bridgeId, bridgeName, daysPast: String(daysPast) }
  });
}

async function notifyGazetteExpiry(restrictionId, bridgeId, daysUntilExpiry) {
  return sendNotification({
    category: 'GazetteExpiry',
    subject : `Gazette authority expiring in ${daysUntilExpiry} days — ${bridgeId}`,
    body    : `Restriction ${restrictionId} on bridge ${bridgeId}: gazette authority expires in ${daysUntilExpiry} days. Renew immediately.`,
    priority: daysUntilExpiry <= 14 ? 'HIGH' : 'MEDIUM',
    tags    : { bridgeId, restrictionId, daysUntilExpiry: String(daysUntilExpiry) }
  });
}

async function notifyDefectEscalation(defectId, bridgeId, severity) {
  return sendNotification({
    category: 'DefectEscalation',
    subject : `Severity ${severity} defect created — Bridge ${bridgeId}`,
    body    : `Defect ${defectId} with severity ${severity} has been recorded on bridge ${bridgeId}. Immediate action required.`,
    priority: severity >= 4 ? 'HIGH' : 'MEDIUM',
    tags    : { bridgeId, defectId, severity: String(severity) }
  });
}

async function notifyWorkOrderComplete(actionRef, bridgeId) {
  return sendNotification({
    category: 'WorkOrderComplete',
    subject : `Work order ${actionRef} completed — Bridge ${bridgeId}`,
    body    : `Maintenance action ${actionRef} on bridge ${bridgeId} has been marked as complete.`,
    priority: 'LOW',
    tags    : { bridgeId, actionRef }
  });
}

module.exports = { sendNotification, notifyInspectionOverdue, notifyGazetteExpiry, notifyDefectEscalation, notifyWorkOrderComplete };
