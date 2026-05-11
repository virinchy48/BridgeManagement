namespace bridge.management;
using { cuid, managed } from '@sap/cds/common';
using { bridge.management.Bridges } from './bridge-entity';

entity LoadRatingCertificates : cuid, managed {
    bridge                  : Association to Bridges @mandatory;
    certificateNumber       : String(40)  @mandatory;
    certificateVersion      : Integer     default 1;
    status                  : String(20)  default 'Current';

    ratingStandard          : String(40)  @mandatory;
    ratingLevel             : String(20)  @mandatory;

    certifyingEngineer      : String(111) @mandatory;
    engineerQualification   : String(20)  @mandatory;
    engineerLicenseNumber   : String(40);
    engineerOrganisation    : String(111);

    rfT44    : Decimal(8,4);
    rfSM1600 : Decimal(8,4);
    rfHLP400 : Decimal(8,4);
    rfW80    : Decimal(8,4);
    rfA160   : Decimal(8,4);
    rfPBS1   : Decimal(8,4);
    rfPBS2   : Decimal(8,4);
    rfPBS3   : Decimal(8,4);
    rfPBS4   : Decimal(8,4);
    rfPBS5   : Decimal(8,4);
    rfHML    : Decimal(8,4);
    rfCML    : Decimal(8,4);

    dynamicLoadAllowance    : Decimal(5,3) default 1.4;
    governingMember         : String(255);
    governingFailureMode    : String(100);
    governingCapacityType   : String(40);

    fatigueSensitive        : Boolean default false;
    consumedLifePercent     : Decimal(5,2);
    remainingLifeYears      : Integer;
    detailCategory          : String(10);
    trafficSpectrumRef      : String(100);

    certificateIssueDate    : Date @mandatory;
    certificateExpiryDate   : Date @mandatory;
    nextReviewDate          : Date;
    expiryWarningDays       : Integer default 90;

    conditions              : LargeString;
    reportStorageRef        : String(500);
    previousCertId          : String(40);
    supersessionReason      : String(300);
    ratingBasis            : String(40);      // Austroads Guide | AS 5100 | Load Testing | Proof Loading
    jurisdictionApproval   : String(60);      // TfNSW, VicRoads, DPTI, etc. approval reference
    approvalDate           : Date;            // When jurisdiction approved this certificate
    notes                   : LargeString;
}

annotate LoadRatingCertificates with @(cds.persistence.indexes: [
    { name: 'idx_lrc_bridge',  columns: ['bridge_ID'] },
    { name: 'idx_lrc_status',  columns: ['status'] },
    { name: 'idx_lrc_expiry',  columns: ['certificateExpiryDate'] }
]);

extend entity Bridges with {
    loadRatingCertificates : Association to many LoadRatingCertificates
                             on loadRatingCertificates.bridge = $self;
}
