namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity AlertsAndNotifications : cuid, managed {
    bridge            : Association to Bridges @mandatory;
    alertType         : String(40)  @mandatory;

    entityType        : String(40);
    entityId          : String(40);
    entityDescription : String(300);

    alertTitle        : String(200) @mandatory;
    alertDescription  : LargeString;
    severity          : String(20)  default 'Warning';
    priority          : Integer     @assert.range: [1, 5];

    triggeredDate     : DateTime    @mandatory;
    dueDate           : Date;

    status            : String(20)  default 'Open';
    acknowledgedBy    : String(111);
    acknowledgedDate  : DateTime;
    acknowledgementNote : String(300);

    resolvedBy        : String(111);
    resolvedDate      : DateTime;
    resolutionNote    : LargeString;
    resolutionProof   : String(255);

    escalatedToRole   : String(60);
    escalatedDate     : DateTime;

    suppressedUntil   : Date;
    suppressionReason : String(300);
    suppressedBy      : String(111);

    emailNotificationSent : Boolean default false;
    emailSentTo           : String(1000);
    emailSentDate         : DateTime;

    notes : LargeString;
}

annotate AlertsAndNotifications with @(cds.persistence.indexes: [
    { name: 'idx_alert_bridge',   columns: ['bridge_ID'] },
    { name: 'idx_alert_type',     columns: ['alertType'] },
    { name: 'idx_alert_status',   columns: ['status'] },
    { name: 'idx_alert_severity', columns: ['severity'] }
]);

entity KPISnapshots : managed {
    key snapshotDate       : Date;
    key snapshotType       : String(20);
    key state              : String(40);
    totalBridges           : Integer;
    activeBridges          : Integer;
    criticalCondition      : Integer;
    highPriority           : Integer;
    overdueInspections     : Integer;
    activeRestrictions     : Integer;
    openAlerts             : Integer;
    avgConditionRating     : Decimal(4,2);
    highRiskCount          : Integer;
    lrcExpiringCount       : Integer;
    nhvrExpiringCount      : Integer;
}

extend entity Bridges with {
    alerts : Composition of many AlertsAndNotifications on alerts.bridge = $self;
}
