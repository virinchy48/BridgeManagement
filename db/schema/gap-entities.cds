using { bridge.management.Bridges } from './bridge-entity';
using { bridge.management.BridgeInspections } from './defects';
using {
  cuid,
  managed
} from '@sap/cds/common';

namespace bridge.management;

entity BridgeInspectionElements : cuid, managed {
  inspection          : Association to BridgeInspections @mandatory;
  bridge              : Association to Bridges;
  elementType         : String(50) @mandatory;
  conditionState1Qty  : Decimal(10,3);
  conditionState2Qty  : Decimal(10,3);
  conditionState3Qty  : Decimal(10,3);
  conditionState4Qty  : Decimal(10,3);
  conditionState1Pct  : Decimal(5,2);
  conditionState2Pct  : Decimal(5,2);
  conditionState3Pct  : Decimal(5,2);
  conditionState4Pct  : Decimal(5,2);
  elementHealthRating : Decimal(4,2);
  unit                : String(20);
  comments            : LargeString;
}

entity BridgeCarriageways : cuid, managed {
  bridge                  : Association to Bridges @mandatory;
  roadNumber              : String(40);
  roadRankCode            : String(20);
  roadClassCode           : String(20);
  carriageCode            : String(20);
  minWidthM               : Decimal(9,2);
  maxWidthM               : Decimal(9,2);
  laneCount               : Integer;
  speedLimitKmh           : Integer;
  surfaceCondition        : String(20);
  guardrailType           : String(40);
  verticalClearanceM      : Decimal(9,2);
  prescribedDirFrom       : String(80);
  prescribedDirTo         : String(80);
  distanceFromStartKm     : Decimal(9,3);
  linkForInspection       : String(255);
  comments                : LargeString;
}

entity BridgeContacts : cuid, managed {
  bridge          : Association to Bridges @mandatory;
  contactGroup    : String(60);
  primaryContact  : String(111);
  organisation    : String(111);
  position        : String(111);
  phone           : String(40);
  mobile          : String(40);
  address         : String(255);
  email           : String(111);
  comments        : LargeString;
}

entity BridgeMehComponents : cuid, managed {
  bridge            : Association to Bridges @mandatory;
  componentType     : String(50);
  name              : String(111);
  make              : String(60);
  model             : String(60);
  serialNumber      : String(60);
  isElectrical      : Boolean;
  isMechanical      : Boolean;
  isHydraulic       : Boolean;
  inspFrequency     : String(40);
  locationStored    : String(111);
  shelfLifeYears      : Integer;
  s4EquipmentNumber   : String(18);
  installationDate    : Date;
  lastServiceDate     : Date;
  nextServiceDue      : Date;
  condition           : String(20);
  criticality         : String(20);
  warranteeExpiry     : Date;
  attributes          : LargeString;
  comments            : LargeString;
}

extend entity Bridges with {
  inspectionElements  : Composition of many BridgeInspectionElements on inspectionElements.bridge = $self;
  carriageways        : Composition of many BridgeCarriageways on carriageways.bridge = $self;
  contacts            : Composition of many BridgeContacts on contacts.bridge = $self;
  mehComponents       : Composition of many BridgeMehComponents on mehComponents.bridge = $self;
}
