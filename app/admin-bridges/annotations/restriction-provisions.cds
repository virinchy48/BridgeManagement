using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  RestrictionProvisions — standalone provision codes on Restrictions
////////////////////////////////////////////////////////////////////////////
annotate AdminService.RestrictionProvisions with {
  ID             @UI.Hidden;
  restriction    @UI.Hidden;
  createdAt      @UI.Hidden; createdBy @UI.Hidden; modifiedAt @UI.Hidden; modifiedBy @UI.Hidden;
  provisionCode  @title: 'Code'
    @Common.Text: provisionCode
    @Common.ValueList: {
      CollectionPath: 'ProvisionTypes',
      Parameters: [
        { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: provisionCode, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: description,   ValueListProperty: 'description' },
      ]
    };
  description    @title: 'Provision Description';
  sortOrder      @title: 'Sort Order';
  active         @UI.Hidden;
};

annotate AdminService.RestrictionProvisions with @(
  Capabilities.InsertRestrictions.Insertable: true,
  Capabilities.UpdateRestrictions.Updatable : true,
  Capabilities.DeleteRestrictions.Deletable : true,
  UI: {
    HeaderInfo: { TypeName: 'Provision', TypeNamePlural: 'Provisions', Title: { Value: provisionCode } },
    LineItem: [
      { Value: sortOrder,     Label: '#' },
      { Value: provisionCode, Label: 'Code' },
      { Value: description,   Label: 'Description' },
    ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Provision', Target: '@UI.FieldGroup#ProvDetails' }
    ],
    FieldGroup#ProvDetails: { Data: [
      { Value: sortOrder },
      { Value: provisionCode },
      { Value: description },
    ]},
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeRestrictionProvisions — permit provisions on bridge restriction postings
////////////////////////////////////////////////////////////////////////////
annotate AdminService.BridgeRestrictionProvisions with {
  ID              @UI.Hidden;
  restriction     @UI.Hidden;
  createdAt       @UI.Hidden; createdBy @UI.Hidden; modifiedAt @UI.Hidden; modifiedBy @UI.Hidden;
  provisionNumber @title: 'No.';
  provisionType   @title: 'Type';
  provisionText   @title: 'Provision Text' @mandatory @UI.MultiLineText;
  vehicleClasses  @title: 'Vehicle Classes';
  timeOfDay       @title: 'Time of Day';
  seasonalPeriod  @title: 'Seasonal Period';
  effectiveFrom   @title: 'Effective From';
  effectiveTo     @title: 'Effective To';
  approvedBy      @title: 'Approved By';
  legalReference  @title: 'Legal Reference';
};

annotate AdminService.BridgeRestrictionProvisions with @(
  Capabilities.InsertRestrictions.Insertable: true,
  Capabilities.UpdateRestrictions.Updatable : true,
  Capabilities.DeleteRestrictions.Deletable : true,
  UI: {
    HeaderInfo: { TypeName: 'Provision', TypeNamePlural: 'Provisions',
                  Title: { Value: provisionNumber }, Description: { Value: provisionType } },
    LineItem: [
      { Value: provisionNumber, Label: 'No.' },
      { Value: provisionType,   Label: 'Type' },
      { Value: provisionText,   Label: 'Provision Text' },
      { Value: vehicleClasses,  Label: 'Vehicle Classes' },
      { Value: effectiveFrom,   Label: 'From' },
      { Value: effectiveTo,     Label: 'To' },
    ],
    Facets: [
      { $Type: 'UI.ReferenceFacet', Label: 'Provision Details', Target: '@UI.FieldGroup#BrProvDetails' }
    ],
    FieldGroup#BrProvDetails: { Data: [
      { Value: provisionNumber },
      { Value: provisionType },
      { Value: provisionText },
      { Value: vehicleClasses },
      { Value: timeOfDay },
      { Value: seasonalPeriod },
      { Value: effectiveFrom },
      { Value: effectiveTo },
      { Value: approvedBy },
      { Value: legalReference },
    ]},
  }
);

