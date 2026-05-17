using { AdminService } from '../../../srv/admin-service';
using from '../../common';

////////////////////////////////////////////////////////////////////////////
//  BridgeDocuments — managed via custom Attachments section (read-only OData)
////////////////////////////////////////////////////////////////////////////

annotate AdminService.BridgeDocuments with {
  ID             @UI.Hidden;
  bridge         @UI.Hidden;
  content        @UI.Hidden;  // blob served via /admin-bridges/api — never via OData
  createdAt      @UI.Hidden;  createdBy @UI.Hidden;  modifiedAt @UI.Hidden;  modifiedBy @UI.Hidden;
  linkedEntityId @UI.Hidden;
  active         @UI.Hidden;
  title           @title: 'Title';
  documentType    @title: 'Document Type';
  documentUrl     @title: 'External URL';
  documentDate    @title: 'Document Date';
  fileName        @title: 'File Name';
  mediaType       @title: 'Media Type';
  fileSize        @title: 'File Size (bytes)';
  description     @title: 'Description'   @UI.MultiLineText;
  uploadedBy      @title: 'Uploaded By'   @Common.FieldControl: #ReadOnly;
  linkedEntity    @title: 'Linked To';
  referenceNumber @title: 'Reference Number';
  issuedBy        @title: 'Issued By';
  expiryDate      @title: 'Expiry Date';
  remarks         @title: 'Remarks'  @UI.MultiLineText;
};

annotate AdminService.BridgeDocuments with @(
  Common.Label : 'Attachments',
  Capabilities.InsertRestrictions.Insertable : false,
  Capabilities.UpdateRestrictions.Updatable  : false,
  Capabilities.DeleteRestrictions.Deletable  : true,
  UI: {
    HeaderInfo: {
      TypeName      : 'Attachment',
      TypeNamePlural: 'Attachments',
      Title         : { Value: title },
      Description   : { Value: fileName }
    },
    LineItem: [
      {Value: documentType,    Label: 'Type'},
      {Value: fileName,        Label: 'File Name'},
      {Value: fileSize,        Label: 'Size (bytes)'},
      {Value: description,     Label: 'Description'},
      {Value: uploadedBy,      Label: 'Uploaded By'},
      {Value: documentDate,    Label: 'Date'},
      {Value: expiryDate,      Label: 'Expiry'},
      {Value: referenceNumber, Label: 'Reference'},
      {$Type: 'UI.DataFieldWithUrl',
       Label: 'Download',
       Value: fileName,
       Url: { $edmJson: { $Apply: ['/admin-bridges/api/documents/', { $Path: 'ID' }, '/content'], $Function: 'odata.concat' } }},
    ],
    Facets: [
      {$Type: 'UI.ReferenceFacet', Label: 'Attachment Details', Target: '@UI.FieldGroup#AttachmentDetails'}
    ],
    FieldGroup#AttachmentDetails: {
      Data: [
        {Value: documentType,    Label: 'Document Type'},
        {Value: title,           Label: 'Title'},
        {Value: fileName,        Label: 'File Name'},
        {Value: mediaType,       Label: 'Media Type'},
        {Value: fileSize,        Label: 'File Size (bytes)'},
        {Value: description,     Label: 'Description'},
        {Value: linkedEntity,    Label: 'Linked To'},
        {Value: uploadedBy,      Label: 'Uploaded By'},
        {Value: documentUrl,     Label: 'External URL'},
        {Value: referenceNumber, Label: 'Reference Number'},
        {Value: issuedBy,        Label: 'Issued By'},
        {Value: documentDate,    Label: 'Document Date'},
        {Value: expiryDate,      Label: 'Expiry Date'},
        {Value: remarks,         Label: 'Remarks'},
      ]
    },
  }
);

////////////////////////////////////////////////////////////////////////////
//  BridgeAttributes — editable EAV sub-table on Bridge Details T6
