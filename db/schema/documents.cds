namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity BridgeDocuments : cuid, managed {
  bridge              : Association to Bridges;
  linkedEntity        : String(100);    // 'BridgeInspections' | 'BridgeDefects' | null (bridge-level)
  linkedEntityId      : String(36);     // UUID of linked inspection or defect record
  documentType        : String(60);     // 'Inspection Report','Photo','Drawing','Certificate','Other'
  title               : String(111);
  documentUrl         : String(500);
  fileName            : String(255);
  mediaType           : String(100);
  fileSize            : Integer;
  description         : String(500);
  uploadedBy          : String(111);
  @Core.MediaType: mediaType
  @Core.ContentDisposition.Filename: fileName
  @Core.ContentDisposition.Type: 'attachment'
  content             : LargeBinary;
  referenceNumber     : String(111);
  issuedBy            : String(111);
  documentDate        : Date;
  expiryDate          : Date;
  remarks             : LargeString;
  active              : Boolean default true;
}
