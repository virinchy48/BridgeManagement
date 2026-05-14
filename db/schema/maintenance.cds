namespace bridge.management;

using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges }      from './bridge-entity';
using { bridge.management.BridgeDefects } from './defects';
using { bridge.management.MaintenanceActionType } from './enum-types';
using { bridge.management.MaintenancePriority }   from './enum-types';
using { bridge.management.MaintenanceStatus }     from './enum-types';

entity BridgeMaintenanceActions : cuid, managed {
  actionRef           : String(40);                          // Auto MA-NNNN
  bridge              : Association to Bridges;
  bridgeRef           : String(40);                          // Value-help key
  linkedDefect        : Association to BridgeDefects;
  actionType          : MaintenanceActionType default 'Repair';
  priority            : MaintenancePriority   default 'P3 Routine';
  status              : MaintenanceStatus     default 'Planned';
  actionTitle         : String(120) @mandatory;
  workDescription     : LargeString;
  assignedTo          : String(111);
  organisation        : String(255);
  scheduledDate       : Date;
  completedDate       : Date;
  estimatedCostAUD    : Decimal(15,2) @Measures.ISOCurrency: 'AUD';
  actualCostAUD       : Decimal(15,2) @Measures.ISOCurrency: 'AUD';
  contractReference   : String(80);
  standardsReference  : String(80);
  safetyRequirements  : LargeString;
  completionNotes     : LargeString;
  reviewDueDate       : Date;
  active              : Boolean default true;
}

annotate BridgeMaintenanceActions with @(cds.persistence.indexes: [
  { name: 'idx_ma_bridge',   columns: ['bridge_ID'] },
  { name: 'idx_ma_status',   columns: ['status'] },
  { name: 'idx_ma_priority', columns: ['priority', 'status'] }
]);

extend entity Bridges with {
  maintenanceActions    : Association to many BridgeMaintenanceActions
                            on maintenanceActions.bridge = $self;
  virtual predictiveRiskFlag     : String(10);   // 'HIGH' | 'MEDIUM' | 'LOW' | null
  virtual daysSinceInspection    : Integer;
  virtual maintenanceActionCount : Integer;
}
