using { AdminService } from '../../../srv/admin-service';
using from '../../common';


////////////////////////////////////////////////////////////////////////////
//  BridgeMaintenanceActions — Work Orders
////////////////////////////////////////////////////////////////////////////
annotate AdminService.BridgeMaintenanceActions with {
  ID              @UI.Hidden;
  bridge          @UI.Hidden;
  bridge_ID       @UI.Hidden;
  createdAt       @UI.Hidden; createdBy @UI.Hidden; modifiedAt @UI.Hidden; modifiedBy @UI.Hidden;
  actionRef       @Core.Computed @Common.FieldControl: #ReadOnly @title: 'Work Order Ref';
  bridgeRef       @title: 'Bridge ID'
    @Common.Text: bridge.bridgeName
    @Common.TextArrangement: #TextSeparate
    @Common.ValueList: {
      CollectionPath: 'Bridges',
      Parameters: [
        {$Type: 'Common.ValueListParameterInOut',  LocalDataProperty: bridgeRef,    ValueListProperty: 'bridgeId'},
        {$Type: 'Common.ValueListParameterOut',    LocalDataProperty: bridge_ID,    ValueListProperty: 'ID'},
        {$Type: 'Common.ValueListParameterOut',    LocalDataProperty: bridge.bridgeName, ValueListProperty: 'bridgeName'},
      ]
    };
  actionTitle     @title: 'Title' @mandatory;
  actionType      @title: 'Action Type';
  priority        @title: 'Priority';
  status          @title: 'Status';
  assignedTo      @title: 'Assigned To';
  organisation    @title: 'Organisation';
  scheduledDate   @title: 'Scheduled Date';
  completedDate   @title: 'Completed Date';
  estimatedCostAUD @title: 'Est. Cost (AUD)';
  actualCostAUD   @title: 'Actual Cost (AUD)';
  contractReference @title: 'Contract Ref';
  standardsReference @title: 'Standards Ref';
  workDescription @title: 'Work Description' @UI.MultiLineText;
  safetyRequirements @title: 'Safety Requirements' @UI.MultiLineText;
  completionNotes @title: 'Completion Notes' @UI.MultiLineText;
  reviewDueDate   @title: 'Review Due';
  linkedDefect    @title: 'Linked Defect'
    @Common.Text: linkedDefect.defectId
    @Common.ValueList: {
      CollectionPath: 'BridgeDefects',
      Parameters: [
        {$Type: 'Common.ValueListParameterOut', LocalDataProperty: linkedDefect_ID, ValueListProperty: 'ID'},
        {$Type: 'Common.ValueListParameterOut', LocalDataProperty: linkedDefect.defectId, ValueListProperty: 'defectId'},
      ]
    };
  active          @UI.Hidden;
};

annotate AdminService.BridgeMaintenanceActions with @(
  Common.Label: 'Work Orders',
  Capabilities.InsertRestrictions.Insertable: true,
  Capabilities.UpdateRestrictions.Updatable : true,
  Capabilities.DeleteRestrictions.Deletable : false,
  UI: {
    HeaderInfo: {
      TypeName      : 'Work Order',
      TypeNamePlural: 'Work Orders',
      Title         : { Value: actionRef },
      Description   : { Value: actionTitle }
    },
    SelectionFields: [bridgeRef, status, priority, actionType, scheduledDate],
    LineItem: [
      { Value: actionRef,    Label: 'Ref' },
      { Value: bridgeRef,    Label: 'Bridge ID' },
      { Value: bridge.bridgeName, Label: 'Bridge' },
      { Value: actionTitle,  Label: 'Title' },
      { Value: actionType,   Label: 'Type' },
      { Value: priority,     Label: 'Priority' },
      { Value: status,       Label: 'Status' },
      { Value: assignedTo,   Label: 'Assigned To' },
      { Value: scheduledDate, Label: 'Scheduled' },
      { Value: estimatedCostAUD, Label: 'Est. Cost (AUD)' },
    ],
    Facets: [
      { $Type: 'UI.CollectionFacet', Label: 'Work Order Details', ID: 'MaintenanceDetails', Facets: [
        { $Type: 'UI.ReferenceFacet', Label: 'Identity',          Target: '@UI.FieldGroup#WoIdentity' },
        { $Type: 'UI.ReferenceFacet', Label: 'Assignment & Cost', Target: '@UI.FieldGroup#WoAssignment' },
        { $Type: 'UI.ReferenceFacet', Label: 'Work Description',  Target: '@UI.FieldGroup#WoDescription' },
      ]},
    ],
    FieldGroup#WoIdentity: { Data: [
      { Value: actionRef },
      { Value: bridgeRef },
      { Value: linkedDefect.defectId },
      { Value: actionType },
      { Value: priority },
      { Value: status },
      { Value: scheduledDate },
      { Value: completedDate },
      { Value: reviewDueDate },
    ]},
    FieldGroup#WoAssignment: { Data: [
      { Value: assignedTo },
      { Value: organisation },
      { Value: estimatedCostAUD },
      { Value: actualCostAUD },
      { Value: contractReference },
      { Value: standardsReference },
    ]},
    FieldGroup#WoDescription: { Data: [
      { Value: actionTitle },
      { Value: workDescription },
      { Value: safetyRequirements },
      { Value: completionNotes },
    ]},
  }
);
