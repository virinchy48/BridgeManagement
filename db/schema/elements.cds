namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity BridgeElements : cuid, managed {
    bridge               : Association to Bridges @mandatory;
    elementId            : String(40)  @mandatory;
    elementType          : String(40)  @mandatory;
    elementCode          : String(40);
    elementQuantity      : Decimal(10,3);
    elementUnit          : String(20);
    parentElement        : Association to BridgeElements;
    elementName          : String(111) @mandatory;

    spanNumber           : Integer;
    pierNumber           : Integer;
    position             : String(100);

    currentConditionRating : Integer @assert.range: [1, 5];
    conditionRatingDate    : Date;
    conditionRatingNotes   : String(500);
    conditionTrend         : String(20);

    lastRatedDate          : Date;
    nextDueDate            : Date;
    ratingFrequencyMonths  : Integer;

    material               : String(60);
    yearConstructed        : Integer;
    yearLastRehabbed       : Integer;

    maintenanceRequired    : Boolean default false;
    urgencyLevel           : String(20);
    estimatedRepairCost    : Decimal(12,2);

    s4EquipmentNumber      : String(18);
    notes                  : LargeString;
}

annotate BridgeElements with @(cds.persistence.indexes: [
    { name: 'idx_elem_bridge', columns: ['bridge_ID'] },
    { name: 'idx_elem_type',   columns: ['elementType'] },
    { name: 'idx_elem_cond',   columns: ['currentConditionRating'] }
]);

extend entity Bridges with {
    elements : Association to many BridgeElements on elements.bridge = $self;
}
