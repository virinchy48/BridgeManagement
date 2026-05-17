using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── BridgeElements — expert council full treatment ────────────────────────
// Inspector priority: condition rating + trend first; maintenance flag prominent
// Manager: urgency level + estimated repair cost visible in list
// End User: elementId mandatory, mandatory fields clear
// Data Steward: rating date + next due date always populated
annotate AdminService.BridgeElements with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  elementId              @Common.FieldControl: #Mandatory  @title: 'Element ID'  @Common.QuickInfo: 'Unique element identifier (e.g. E001, SPAN-1-DECK)';
  elementType            @Common.FieldControl: #Mandatory  @title: 'Element Type'  @Common.QuickInfo: 'Structural class — e.g. Deck, Beam, Abutment, Pier';
  elementName            @Common.FieldControl: #Mandatory  @title: 'Element Name';
  // ── HIGH priority additions (SIMS §3.2, AS 5100-7 §4.3) ─────────────────
  simsElementCode        @title: 'SIMS Element Code'        @Common.QuickInfo: 'SIMS §3.2 national element code — DEK (Deck), ABT (Abutment), PRM (Primary Member), BRG (Bearing), EXP (Expansion Joint), DRN (Drainage), GRD (Guardrail), FON (Foundation), PRA (Approach Pavement)';
  designWorkingLifeYears @title: 'Design Working Life (years)'  @Common.QuickInfo: 'AS 5100-7 §4.3 — element-level design working life; used for fatigue-sensitive member monitoring';
  spanNumber             @title: 'Span Number';
  pierNumber             @title: 'Pier Number';
  position               @title: 'Position / Location Description';
  currentConditionRating @title: 'Condition Rating (1–5)'  @Common.QuickInfo: '1=Good, 2=Satisfactory, 3=Fair, 4=Poor, 5=Failed — SIMS §4.3';
  conditionTrend         @title: 'Condition Trend'         @Common.QuickInfo: 'Improving / Stable / Deteriorating';
  conditionRatingDate    @title: 'Condition Rating Date';
  conditionRatingNotes   @title: 'Condition Rating Notes'  @UI.MultiLineText;
  lastRatedDate          @title: 'Last Rated Date';
  nextDueDate            @title: 'Next Rating Due';
  ratingFrequencyMonths  @title: 'Rating Frequency (months)';
  material               @title: 'Construction Material';
  yearConstructed        @title: 'Year Constructed';
  yearLastRehabbed       @title: 'Year Last Rehabilitated';
  maintenanceRequired    @title: 'Maintenance Required';
  urgencyLevel           @title: 'Urgency Level'  @Common.QuickInfo: 'Immediate / Short-term / Planned / Routine';
  estimatedRepairCost    @title: 'Estimated Repair Cost ($)';
  s4EquipmentNumber      @title: 'S/4HANA Equipment Number';
  notes                  @title: 'Notes'  @UI.MultiLineText;
};

annotate AdminService.BridgeElements with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, elementType, currentConditionRating, maintenanceRequired, urgencyLevel],
  UI.HeaderInfo: {
    TypeName      : 'Bridge Element',
    TypeNamePlural: 'Bridge Elements',
    Title         : {Value: elementName},
    Description   : {Value: elementId},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,        Label: 'Bridge ID'},
    {Value: bridge.bridgeName,      Label: 'Bridge'},
    {Value: elementId,              Label: 'Element ID'},
    {Value: elementType,            Label: 'Type'},
    {Value: elementName,            Label: 'Name'},
    {Value: currentConditionRating, Label: 'Condition (1–5)'},
    {Value: conditionTrend,         Label: 'Trend'},
    {Value: maintenanceRequired,    Label: 'Maint. Req.'},
    {Value: urgencyLevel,           Label: 'Urgency'},
    {Value: estimatedRepairCost,    Label: 'Est. Repair ($)'},
    {Value: nextDueDate,            Label: 'Next Rating Due'},
    {Value: s4EquipmentNumber,      Label: 'S/4 Equipment'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Element Details', ID: 'ElementDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Identity & Location', Target: '@UI.FieldGroup#ElemIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Condition & Rating',  Target: '@UI.FieldGroup#ElemCondition'},
        {$Type: 'UI.ReferenceFacet', Label: 'Maintenance',         Target: '@UI.FieldGroup#ElemMaintenance'},
        {$Type: 'UI.ReferenceFacet', Label: 'Integration',         Target: '@UI.FieldGroup#ElemIntegration'},
      ]
    },
  ],
  UI.FieldGroup#ElemIdentity: {
    Label: 'Identity & Location',
    Data: [
      {Value: bridge_ID,              Label: 'Bridge'},
      {Value: elementId,              Label: 'Element ID'},
      {Value: simsElementCode,        Label: 'SIMS Element Code'},
      {Value: elementType,            Label: 'Element Type'},
      {Value: elementName,            Label: 'Element Name'},
      {Value: material,               Label: 'Construction Material'},
      {Value: designWorkingLifeYears, Label: 'Design Working Life (years)'},
      {Value: yearConstructed,        Label: 'Year Constructed'},
      {Value: yearLastRehabbed,       Label: 'Year Last Rehabilitated'},
      {Value: spanNumber,             Label: 'Span Number'},
      {Value: pierNumber,             Label: 'Pier Number'},
      {Value: position,               Label: 'Position / Location'},
    ]
  },
  UI.FieldGroup#ElemCondition: {
    Label: 'Condition & Rating (SIMS §4.3)',
    Data: [
      {Value: currentConditionRating, Label: 'Condition Rating (1–5)'},
      {Value: conditionTrend,         Label: 'Trend'},
      {Value: conditionRatingDate,    Label: 'Rating Date'},
      {Value: conditionRatingNotes,   Label: 'Rating Notes'},
      {Value: lastRatedDate,          Label: 'Last Rated Date'},
      {Value: nextDueDate,            Label: 'Next Rating Due'},
      {Value: ratingFrequencyMonths,  Label: 'Rating Frequency (months)'},
    ]
  },
  UI.FieldGroup#ElemMaintenance: {
    Label: 'Maintenance',
    Data: [
      {Value: maintenanceRequired,  Label: 'Maintenance Required'},
      {Value: urgencyLevel,         Label: 'Urgency Level'},
      {Value: estimatedRepairCost,  Label: 'Estimated Repair Cost ($)'},
      {Value: notes,                Label: 'Notes'},
    ]
  },
  UI.FieldGroup#ElemIntegration: {
    Label: 'S/4HANA Integration',
    Data: [
      {Value: s4EquipmentNumber, Label: 'S/4HANA Equipment Number'},
    ]
  },
);


// ── BridgeCarriageways — expert council full treatment ────────────────────
// Manager priority: lane count + clearance first (safety limits)
// Inspector: prescribedDirFrom/To for traffic management context
// Data Steward: roadNumber + carriageCode are primary identifiers
annotate AdminService.BridgeCarriageways with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  roadNumber           @title: 'Road Number';
  roadRankCode         @title: 'Road Rank Code'            @Common.QuickInfo: 'e.g. State Highway, Regional Road, Local Road';
  roadClassCode        @title: 'Road Class Code';
  carriageCode         @title: 'Carriageway Code'          @Common.QuickInfo: 'Unique identifier for this carriageway on the bridge';
  laneCount            @title: 'Lane Count'                @Common.QuickInfo: 'Number of traffic lanes on this carriageway';
  minWidthM            @title: 'Minimum Width (m)'         @Common.QuickInfo: 'Narrowest point of carriageway — safety critical';
  maxWidthM            @title: 'Maximum Width (m)';
  verticalClearanceM   @title: 'Vertical Clearance (m)'   @Common.QuickInfo: 'Height restriction above road surface — safety critical for HVs';
  prescribedDirFrom    @title: 'Traffic Direction From';
  prescribedDirTo      @title: 'Traffic Direction To';
  distanceFromStartKm  @title: 'Distance from Route Start (km)';
  linkForInspection    @title: 'Inspection Link URL'       @UI.IsURL;
  comments             @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeCarriageways with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, roadNumber, carriageCode, laneCount],
  UI.HeaderInfo: {
    TypeName      : 'Carriageway',
    TypeNamePlural: 'Carriageways',
    Title         : {Value: carriageCode},
    Description   : {Value: bridge.bridgeName},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,      Label: 'Bridge ID'},
    {Value: bridge.bridgeName,    Label: 'Bridge'},
    {Value: roadNumber,           Label: 'Road Number'},
    {Value: carriageCode,         Label: 'Carriageway Code'},
    {Value: laneCount,            Label: 'Lanes'},
    {Value: minWidthM,            Label: 'Min Width (m)'},
    {Value: maxWidthM,            Label: 'Max Width (m)'},
    {Value: verticalClearanceM,   Label: 'Vert. Clearance (m)'},
    {Value: roadRankCode,         Label: 'Road Rank'},
    {Value: distanceFromStartKm,  Label: 'Distance (km)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Carriageway', ID: 'CarriagewayDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Road Identity',   Target: '@UI.FieldGroup#CarrRoad'},
        {$Type: 'UI.ReferenceFacet', Label: 'Geometry',        Target: '@UI.FieldGroup#CarrGeometry'},
        {$Type: 'UI.ReferenceFacet', Label: 'Traffic & Notes', Target: '@UI.FieldGroup#CarrTraffic'},
      ]
    },
  ],
  UI.FieldGroup#CarrRoad: {
    Label: 'Road Identity',
    Data: [
      {Value: bridge_ID,          Label: 'Bridge'},
      {Value: roadNumber,         Label: 'Road Number'},
      {Value: roadRankCode,       Label: 'Road Rank Code'},
      {Value: roadClassCode,      Label: 'Road Class Code'},
      {Value: carriageCode,       Label: 'Carriageway Code'},
      {Value: distanceFromStartKm, Label: 'Distance from Route Start (km)'},
    ]
  },
  UI.FieldGroup#CarrGeometry: {
    Label: 'Geometry (Safety Critical)',
    Data: [
      {Value: laneCount,           Label: 'Lane Count'},
      {Value: minWidthM,           Label: 'Minimum Width (m)'},
      {Value: maxWidthM,           Label: 'Maximum Width (m)'},
      {Value: verticalClearanceM,  Label: 'Vertical Clearance (m)'},
    ]
  },
  UI.FieldGroup#CarrTraffic: {
    Label: 'Traffic & Inspection',
    Data: [
      {Value: prescribedDirFrom,   Label: 'Traffic Direction From'},
      {Value: prescribedDirTo,     Label: 'Traffic Direction To'},
      {Value: linkForInspection,   Label: 'Inspection Link'},
      {Value: comments,            Label: 'Comments'},
    ]
  },
);

// ── BridgeContacts — expert council full treatment ────────────────────────
// End User: phone + email first in list (quickest reference)
// Manager: contactGroup for routing notifications; organisation for escalation
annotate AdminService.BridgeContacts with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  contactGroup    @Common.FieldControl: #Mandatory  @title: 'Contact Group'  @Common.QuickInfo: 'e.g. Asset Owner, Maintaining Authority, Emergency Contact, Inspector';
  primaryContact  @Common.FieldControl: #Mandatory  @title: 'Contact Name';
  organisation    @title: 'Organisation';
  position        @title: 'Position / Role';
  phone           @title: 'Phone';
  mobile          @title: 'Mobile';
  email           @title: 'Email';
  address         @title: 'Address'  @UI.MultiLineText;
  comments        @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeContacts with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI.SelectionFields: [bridge_ID, contactGroup, primaryContact, email],
  UI.HeaderInfo: {
    TypeName      : 'Contact',
    TypeNamePlural: 'Contacts',
    Title         : {Value: primaryContact},
    Description   : {Value: contactGroup},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,  Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: contactGroup,     Label: 'Group'},
    {Value: primaryContact,   Label: 'Name'},
    {Value: organisation,     Label: 'Organisation'},
    {Value: position,         Label: 'Position'},
    {Value: phone,            Label: 'Phone'},
    {Value: mobile,           Label: 'Mobile'},
    {Value: email,            Label: 'Email'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Contact', ID: 'ContactDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Identity',        Target: '@UI.FieldGroup#ContactIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Contact Details', Target: '@UI.FieldGroup#ContactDetails'},
      ]
    },
  ],
  UI.FieldGroup#ContactIdentity: {
    Label: 'Identity',
    Data: [
      {Value: bridge_ID,      Label: 'Bridge'},
      {Value: contactGroup,   Label: 'Contact Group'},
      {Value: primaryContact, Label: 'Contact Name'},
      {Value: organisation,   Label: 'Organisation'},
      {Value: position,       Label: 'Position / Role'},
      {Value: comments,       Label: 'Comments'},
    ]
  },
  UI.FieldGroup#ContactDetails: {
    Label: 'Contact Details',
    Data: [
      {Value: phone,   Label: 'Phone'},
      {Value: mobile,  Label: 'Mobile'},
      {Value: email,   Label: 'Email'},
      {Value: address, Label: 'Address'},
    ]
  },
);

// ── BridgeMehComponents — expert council full treatment ───────────────────
// Inspector priority: componentType + inspFrequency first (what to inspect and when)
// Manager: shelfLifeYears + locationStored for procurement planning
// Data Steward: serialNumber for asset tracking; make/model for spare parts
annotate AdminService.BridgeMehComponents with {
  ID          @UI.Hidden;
  createdAt   @UI.Hidden;  createdBy   @UI.Hidden;
  modifiedAt  @UI.Hidden;  modifiedBy  @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  componentType   @Common.FieldControl: #Mandatory  @title: 'Component Type'      @Common.QuickInfo: 'e.g. Moveable Joint, Drainage, Scour Protection, Electrical Panel, Hydraulic Cylinder';
  name            @Common.FieldControl: #Mandatory  @title: 'Component Name';
  make            @title: 'Make / Manufacturer';
  model           @title: 'Model';
  serialNumber    @title: 'Serial Number'            @Common.QuickInfo: 'Manufacturer serial — used for warranty and spare parts tracking';
  isElectrical    @title: 'Electrical Component';
  isMechanical    @title: 'Mechanical Component';
  isHydraulic     @title: 'Hydraulic Component';
  inspFrequency   @title: 'Inspection Frequency'     @Common.QuickInfo: 'e.g. Monthly, Quarterly, Annual, 2-Year';
  locationStored  @title: 'Location / Storage Ref'   @Common.QuickInfo: 'Physical location on bridge or warehouse storage reference';
  shelfLifeYears  @title: 'Shelf Life (years)';
  attributes      @title: 'Additional Attributes (JSON)'  @UI.MultiLineText  @Common.QuickInfo: 'Flexible JSON field for component-specific properties';
  comments        @title: 'Comments'  @UI.MultiLineText;
};

annotate AdminService.BridgeMehComponents with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, componentType, name, isElectrical, isMechanical, isHydraulic],
  UI.HeaderInfo: {
    TypeName      : 'MEH Component',
    TypeNamePlural: 'MEH Components',
    Title         : {Value: name},
    Description   : {Value: componentType},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,  Label: 'Bridge ID'},
    {Value: bridge.bridgeName, Label: 'Bridge'},
    {Value: componentType,    Label: 'Type'},
    {Value: name,             Label: 'Name'},
    {Value: make,             Label: 'Make'},
    {Value: model,            Label: 'Model'},
    {Value: isElectrical,     Label: 'Electrical'},
    {Value: isMechanical,     Label: 'Mechanical'},
    {Value: isHydraulic,      Label: 'Hydraulic'},
    {Value: inspFrequency,    Label: 'Insp. Frequency'},
    {Value: locationStored,   Label: 'Location'},
    {Value: shelfLifeYears,   Label: 'Shelf Life (yrs)'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'MEH Component', ID: 'MehDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Component Identity',   Target: '@UI.FieldGroup#MehIdentity'},
        {$Type: 'UI.ReferenceFacet', Label: 'Type Classification',  Target: '@UI.FieldGroup#MehType'},
        {$Type: 'UI.ReferenceFacet', Label: 'Maintenance',          Target: '@UI.FieldGroup#MehMaintenance'},
        {$Type: 'UI.ReferenceFacet', Label: 'Additional Attributes', Target: '@UI.FieldGroup#MehAttributes'},
      ]
    },
  ],
  UI.FieldGroup#MehIdentity: {
    Label: 'Component Identity',
    Data: [
      {Value: bridge_ID,    Label: 'Bridge'},
      {Value: componentType, Label: 'Component Type'},
      {Value: name,          Label: 'Component Name'},
      {Value: make,          Label: 'Make / Manufacturer'},
      {Value: model,         Label: 'Model'},
      {Value: serialNumber,  Label: 'Serial Number'},
    ]
  },
  UI.FieldGroup#MehType: {
    Label: 'Type Classification',
    Data: [
      {Value: isElectrical, Label: 'Electrical Component'},
      {Value: isMechanical, Label: 'Mechanical Component'},
      {Value: isHydraulic,  Label: 'Hydraulic Component'},
    ]
  },
  UI.FieldGroup#MehMaintenance: {
    Label: 'Maintenance & Storage',
    Data: [
      {Value: inspFrequency,  Label: 'Inspection Frequency'},
      {Value: locationStored, Label: 'Location / Storage Ref'},
      {Value: shelfLifeYears, Label: 'Shelf Life (years)'},
      {Value: comments,       Label: 'Comments'},
    ]
  },
  UI.FieldGroup#MehAttributes: {
    Label: 'Additional Attributes',
    Data: [
      {Value: attributes, Label: 'Attributes (JSON)'},
    ]
  },
);

////////////////////////////////////////////////////////////////////////////
//  Action side-effects — force FE to re-read fields after deactivate/reactivate
//  so button visibility toggling (@UI.Hidden based on status) updates immediately
////////////////////////////////////////////////////////////////////////////

