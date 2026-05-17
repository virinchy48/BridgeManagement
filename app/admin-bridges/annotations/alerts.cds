using { AdminService } from '../../../srv/admin-service';
using from '../../common';

// ── AlertsAndNotifications — expert council full treatment ────────────────
// Alerts are system-generated (Insertable: false). End users acknowledge/resolve.
// Manager: severity + due date must be prominent in list
// Inspector: entityType + entityDescription tells them what to look at
// Data Steward: resolution proof and resolution note required before closing
annotate AdminService.AlertsAndNotifications with {
  ID              @UI.Hidden;
  createdAt       @UI.Hidden;  createdBy       @UI.Hidden;
  modifiedAt      @UI.Hidden;  modifiedBy      @UI.Hidden;
  bridge @(
    Common.Text            : bridge.bridgeName,
    Common.TextArrangement : #TextOnly,
    title                  : 'Bridge',
    Common.FieldControl    : #ReadOnly,
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
  alertTitle          @title: 'Alert Title'            @Common.FieldControl: #ReadOnly;
  alertType           @title: 'Alert Type'             @Common.FieldControl: #ReadOnly;
  alertDescription    @title: 'Alert Description'      @Common.FieldControl: #ReadOnly  @UI.MultiLineText;
  entityType          @title: 'Related Record Type'    @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Entity that triggered this alert (e.g. LoadRatingCertificate, Inspection)';
  entityId            @title: 'Related Record ID'      @Common.FieldControl: #ReadOnly;
  entityDescription   @title: 'Related Record'         @Common.FieldControl: #ReadOnly;
  severity            @title: 'Severity'               @Common.FieldControl: #ReadOnly  @Common.QuickInfo: 'Critical / Warning / Info';
  priority            @title: 'Priority (1=Highest–5=Lowest)' @Common.FieldControl: #ReadOnly;
  triggeredDate       @title: 'Triggered Date/Time'    @Common.FieldControl: #ReadOnly;
  dueDate             @title: 'Due Date';
  status              @title: 'Status';
  acknowledgedBy      @title: 'Acknowledged By'        @Common.FieldControl: #ReadOnly;
  acknowledgedDate    @title: 'Acknowledged Date/Time' @Common.FieldControl: #ReadOnly;
  acknowledgementNote @title: 'Acknowledgement Note'   @UI.MultiLineText;
  resolvedBy          @title: 'Resolved By'            @Common.FieldControl: #ReadOnly;
  resolvedDate        @title: 'Resolved Date/Time'     @Common.FieldControl: #ReadOnly;
  resolutionNote      @title: 'Resolution Note'        @UI.MultiLineText  @Common.QuickInfo: 'Describe what action was taken to resolve this alert';
  resolutionProof     @title: 'Resolution Proof (URL)' @UI.IsURL;
  escalatedToRole     @title: 'Escalated To Role'      @Common.FieldControl: #ReadOnly;
  escalatedDate       @title: 'Escalated Date/Time'    @Common.FieldControl: #ReadOnly;
  suppressedUntil     @title: 'Suppressed Until';
  suppressionReason   @title: 'Suppression Reason'     @UI.MultiLineText;
  suppressedBy        @title: 'Suppressed By'          @Common.FieldControl: #ReadOnly;
  emailNotificationSent @title: 'Email Sent'           @Common.FieldControl: #ReadOnly;
  emailSentTo         @title: 'Email Recipients'       @Common.FieldControl: #ReadOnly;
  emailSentDate       @title: 'Email Sent Date/Time'   @Common.FieldControl: #ReadOnly;
  notes               @title: 'Notes'  @UI.MultiLineText;
};

annotate AdminService.AlertsAndNotifications with @(
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : true,
  Capabilities.DeleteRestrictions.Deletable  : false,
  UI.SelectionFields: [bridge_ID, alertType, severity, status, dueDate, entityType],
  UI.HeaderInfo: {
    TypeName      : 'Alert',
    TypeNamePlural: 'Alerts & Notifications',
    Title         : {Value: alertTitle},
    Description   : {Value: alertType},
  },
  UI.LineItem: [
    {Value: bridge.bridgeId,    Label: 'Bridge ID'},
    {Value: bridge.bridgeName,  Label: 'Bridge'},
    {Value: alertTitle,         Label: 'Alert'},
    {Value: alertType,          Label: 'Type'},
    {Value: entityType,         Label: 'Related To'},
    {Value: entityDescription,  Label: 'Record'},
    {Value: severity,           Label: 'Severity'},
    {Value: priority,           Label: 'Priority'},
    {Value: status,             Label: 'Status'},
    {Value: triggeredDate,      Label: 'Triggered'},
    {Value: dueDate,            Label: 'Due'},
    {Value: acknowledgedBy,     Label: 'Acknowledged By'},
  ],
  UI.Facets: [
    {
      $Type : 'UI.CollectionFacet', Label: 'Alert Details', ID: 'AlertDetails',
      Facets: [
        {$Type: 'UI.ReferenceFacet', Label: 'Alert',               Target: '@UI.FieldGroup#AlertSummary'},
        {$Type: 'UI.ReferenceFacet', Label: 'Acknowledgement',     Target: '@UI.FieldGroup#AlertAcknowledgement'},
        {$Type: 'UI.ReferenceFacet', Label: 'Resolution',          Target: '@UI.FieldGroup#AlertResolution'},
        {$Type: 'UI.ReferenceFacet', Label: 'Escalation',          Target: '@UI.FieldGroup#AlertEscalation'},
        {$Type: 'UI.ReferenceFacet', Label: 'Email Notifications', Target: '@UI.FieldGroup#AlertEmail'},
      ]
    },
  ],
  UI.FieldGroup#AlertSummary: {
    Label: 'Alert',
    Data: [
      {Value: bridge_ID,          Label: 'Bridge'},
      {Value: alertTitle,         Label: 'Alert Title'},
      {Value: alertType,          Label: 'Alert Type'},
      {Value: alertDescription,   Label: 'Description'},
      {Value: severity,           Label: 'Severity'},
      {Value: priority,           Label: 'Priority (1=Highest–5=Lowest)'},
      {Value: triggeredDate,      Label: 'Triggered Date/Time'},
      {Value: dueDate,            Label: 'Due Date'},
      {Value: status,             Label: 'Status'},
      {Value: entityType,         Label: 'Related Record Type'},
      {Value: entityId,           Label: 'Related Record ID'},
      {Value: entityDescription,  Label: 'Related Record Description'},
    ]
  },
  UI.FieldGroup#AlertAcknowledgement: {
    Label: 'Acknowledgement',
    Data: [
      {Value: acknowledgedBy,       Label: 'Acknowledged By'},
      {Value: acknowledgedDate,     Label: 'Acknowledged Date/Time'},
      {Value: acknowledgementNote,  Label: 'Acknowledgement Note'},
    ]
  },
  UI.FieldGroup#AlertResolution: {
    Label: 'Resolution',
    Data: [
      {Value: resolvedBy,      Label: 'Resolved By'},
      {Value: resolvedDate,    Label: 'Resolved Date/Time'},
      {Value: resolutionNote,  Label: 'Resolution Note'},
      {Value: resolutionProof, Label: 'Resolution Proof (URL)'},
      {Value: notes,           Label: 'Notes'},
    ]
  },
  UI.FieldGroup#AlertEscalation: {
    Label: 'Escalation & Suppression',
    Data: [
      {Value: escalatedToRole,   Label: 'Escalated To Role'},
      {Value: escalatedDate,     Label: 'Escalated Date/Time'},
      {Value: suppressedUntil,   Label: 'Suppressed Until'},
      {Value: suppressionReason, Label: 'Suppression Reason'},
      {Value: suppressedBy,      Label: 'Suppressed By'},
    ]
  },
  UI.FieldGroup#AlertEmail: {
    Label: 'Email Notifications',
    Data: [
      {Value: emailNotificationSent, Label: 'Email Sent'},
      {Value: emailSentTo,           Label: 'Recipients'},
      {Value: emailSentDate,         Label: 'Sent Date/Time'},
    ]
  },
);

