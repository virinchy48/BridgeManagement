using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── BridgeDefects — fully standalone; inspection link is optional ─────────
annotate AdminService.BridgeDefects with {
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #Mandatory,
    Common.ValueList: {
      CollectionPath : 'Bridges',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridge_ID,     ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeName' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'bridgeId' }
      ]
    }
  );
  inspection @(
    Common.Text            : inspection.inspectionRef,
    Common.TextArrangement : #TextOnly,
    title                  : 'Linked Inspection (optional)',
    Common.ValueList: {
      CollectionPath : 'BridgeInspections',
      SearchSupported: true,
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: inspection_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionRef' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionDate' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'inspectionType' }
      ]
    }
  );
  defectId                @Core.Computed  @Common.FieldControl: #ReadOnly  @title: 'Defect ID (auto-generated)';
  deteriorationMechanism  @title: 'Deterioration Mechanism';
  defectCode @(
    title: 'SIMS Defect Code',
    Common.ValueList: {
      CollectionPath: 'DefectCodes',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         ValueListProperty: 'code',            LocalDataProperty: defectCode },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'elementCategory' },
      ]
    },
    Common.ValueListWithFixedValues: false
  );
  bridgeElementRef        @title: 'Linked Element';
  s4SyncDate              @title: 'S/4 Sync Date';
  s4SyncError             @title: 'S/4 Sync Error'  @UI.MultiLineText;
  defectType              @title: 'Defect Type';
  defectDescription       @title: 'Description'              @UI.MultiLineText;
  bridgeElement           @title: 'Bridge Element';
  spanNumber              @title: 'Span Number';
  pierNumber              @title: 'Pier Number';
  face                    @title: 'Face';
  position                @title: 'Position';
  severity                @title: 'Severity (1=Low, 4=Critical)'
    @Common.QuickInfo: 'Structural damage magnitude — HOW BAD is the defect: 1=Low (cosmetic), 2=Medium (functional), 3=High (structural), 4=Critical (failure risk). See SIMS §6.2.';
  urgency                 @title: 'Urgency (repair timeline)'
    @Common.QuickInfo: 'HOW QUICKLY must repair occur — 1=Routine (>12 months), 2=Planned (3–12 months), 3=Urgent (1–3 months), 4=Emergency (immediate). Aligns with Maintenance Priority: urgency 4=P1, 3=P2, 2=P3, 1=P4.';
  dimensionLengthMm       @title: 'Length (mm)';
  dimensionWidthMm        @title: 'Width (mm)';
  dimensionDepthMm        @title: 'Depth (mm)';
  photoReferences         @title: 'Photo References'         @UI.MultiLineText;
  remediationStatus       @title: 'Remediation Status';
  estimatedRepairCost     @title: 'Estimated Repair Cost ($)';
  plannedRemediationDate  @title: 'Planned Remediation Date';
  actualRemediationDate   @title: 'Actual Remediation Date';
  remediationNotes        @title: 'Remediation Notes'        @UI.MultiLineText;
  // ── HIGH priority additions (SIMS §4.3, AGAM §5.3, TfNSW-BIM §4.4) ──────
  repairMethod            @title: 'Repair Method'                       @Common.QuickInfo: 'SIMS §4.3 — required field for work order generation';
  requiresLoadRestriction @title: 'Requires Load Restriction Review'    @Common.QuickInfo: 'TfNSW-BIM §4.4 — when true, triggers review of BridgeCapacities and LoadRatingCertificates';
  maintenancePriority     @title: 'Maintenance Priority (AGAM §5.3)'
    @Common.QuickInfo: 'AGAM §5.3 planning priority — P1 Emergency (=urgency 4), P2 Urgent (=urgency 3), P3 Routine (=urgency 2), P4 Planned (=urgency 1). Used by Work Orders tile for scheduling; set this to match the Urgency value.';
  s4NotificationId        @title: 'S/4 Notification ID';
  s4OrderId               @title: 'S/4 Order ID';
  s4SyncStatus            @title: 'S/4 Sync Status';
  notes                   @title: 'Notes'                    @UI.MultiLineText;
  active                  @title: 'Active'                   @UI.Hidden;
};
annotate AdminService.BridgeDefects with @(
  Capabilities.InsertRestrictions.Insertable : true,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, inspection_ID, severity, remediationStatus, defectType],
  UI.LineItem: [
    {Value: bridge.bridgeId,           Label: 'Bridge ID'},
    {Value: bridge.bridgeName,         Label: 'Bridge'},
    {Value: inspection.inspectionRef,  Label: 'Inspection Ref'},
    {Value: defectId,                  Label: 'Defect ID'},
    {Value: defectType,                Label: 'Type'},
    {Value: bridgeElement,             Label: 'Element'},
    {Value: severity,                  Label: 'Severity (1–4)'},
    {Value: urgency,                   Label: 'Urgency (1–4)'},
    {Value: remediationStatus,         Label: 'Status'},
    {Value: estimatedRepairCost,       Label: 'Est. Cost ($)'},
    {Value: photoReferences,           Label: 'Photo Refs'},
    {Value: s4SyncStatus,              Label: 'S/4 Sync'},
  ],
  UI.HeaderInfo: {
    TypeName      : 'Defect',
    TypeNamePlural: 'Defects',
    Title         : {Value: defectId},
    Description   : {Value: defectType},
  },
  UI.Facets: [
    { $Type: 'UI.CollectionFacet', Label: 'Defect Details', ID: 'DefectDetails', Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'General',      Target: '@UI.FieldGroup#DefectGeneral'},
      {$Type: 'UI.ReferenceFacet', Label: 'Location',     Target: '@UI.FieldGroup#DefectLocation'},
      {$Type: 'UI.ReferenceFacet', Label: 'Remediation',  Target: '@UI.FieldGroup#DefectRemediation'},
      {$Type: 'UI.ReferenceFacet', Label: 'S/4HANA Integration', Target: '@UI.FieldGroup#DefectS4Integration'},
    ]},
    { $Type: 'UI.CollectionFacet', Label: 'Documents', ID: 'DefDocuments', Facets: [
      {$Type: 'UI.ReferenceFacet', ID: 'DefDocumentsList', Label: 'Documents', Target: 'documents/@UI.LineItem'},
    ]},
  ],
  UI.FieldGroup#DefectGeneral: {
    Label: 'General',
    Data: [
      {Value: bridge_ID,             Label: 'Bridge'},
      {Value: inspection_ID,         Label: 'Linked Inspection (optional)'},
      {Value: defectId,              Label: 'Defect ID'},
      {Value: defectType,            Label: 'Defect Type'},
      {Value: deteriorationMechanism, Label: 'Deterioration Mechanism'},
      {Value: defectCode,            Label: 'SIMS Defect Code'},
      {Value: defectDescription,     Label: 'Description'},
      {Value: severity,              Label: 'Severity (1–4)'},
      {Value: urgency,               Label: 'Urgency (1–4)'},
      {Value: remediationStatus,     Label: 'Remediation Status'},
      {Value: photoReferences,       Label: 'Photo References'},
      {Value: notes,                 Label: 'Notes'},
    ]
  },
  UI.FieldGroup#DefectLocation: {
    Label: 'Location',
    Data: [
      {Value: bridgeElement,     Label: 'Bridge Element'},
      {Value: spanNumber,        Label: 'Span Number'},
      {Value: pierNumber,        Label: 'Pier Number'},
      {Value: face,              Label: 'Face'},
      {Value: position,          Label: 'Position'},
      {Value: dimensionLengthMm, Label: 'Length (mm)'},
      {Value: dimensionWidthMm,  Label: 'Width (mm)'},
      {Value: dimensionDepthMm,  Label: 'Depth (mm)'},
    ]
  },
  UI.FieldGroup#DefectRemediation: {
    Label: 'Remediation',
    Data: [
      {Value: maintenancePriority,    Label: 'Maintenance Priority (AGAM §5.3)'},
      {Value: requiresLoadRestriction, Label: 'Requires Load Restriction Review'},
      {Value: repairMethod,           Label: 'Repair Method'},
      {Value: estimatedRepairCost,    Label: 'Estimated Repair Cost'},
      {Value: plannedRemediationDate, Label: 'Planned Remediation Date'},
      {Value: actualRemediationDate,  Label: 'Actual Remediation Date'},
      {Value: remediationNotes,       Label: 'Remediation Notes'},
    ]
  },
  UI.FieldGroup#DefectS4Integration: {
    Label: 'S/4HANA Integration',
    Data: [
      {Value: s4NotificationId, Label: 'S/4 Notification ID'},
      {Value: s4OrderId,        Label: 'S/4 Order ID'},
      {Value: s4SyncStatus,     Label: 'S/4 Sync Status'},
      {Value: s4SyncDate,       Label: 'S/4 Sync Date'},
      {Value: s4SyncError,      Label: 'S/4 Sync Error'},
    ]
  },
  UI.Identification: [
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.deactivate',
      Label      : 'Deactivate',
      Criticality: #Negative,
      ![@UI.Hidden]: { $edmJson: { $Eq: [{ $Path: 'active' }, false] } }
    },
    {
      $Type      : 'UI.DataFieldForAction',
      Action     : 'AdminService.reactivate',
      Label      : 'Reactivate',
      Criticality: #Positive,
      ![@UI.Hidden]: { $edmJson: { $Ne: [{ $Path: 'active' }, false] } }
    }
  ],
);

annotate AdminService.BridgeDefects with actions {
  deactivate @Common.SideEffects: { TargetProperties: ['active'] };
  reactivate @Common.SideEffects: { TargetProperties: ['active'] };
};

annotate AdminService.BridgeDefects with {
  bridgeElementRef @(
    Common.Text: bridgeElementRef.elementName,
    Common.TextArrangement: #TextOnly,
    Common.ValueList: {
      CollectionPath: 'BridgeElements',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut',         LocalDataProperty: bridgeElementRef_ID, ValueListProperty: 'ID' },
        { $Type: 'Common.ValueListParameterDisplayOnly',                                         ValueListProperty: 'elementId' },
        { $Type: 'Common.ValueListParameterDisplayOnly',                                         ValueListProperty: 'elementType' },
        { $Type: 'Common.ValueListParameterDisplayOnly',                                         ValueListProperty: 'elementName' }
      ]
    }
  );
};

