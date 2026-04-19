using { sap } from '@sap/cds/common';

extend sap.common.Currencies with {
  numcode  : Integer;
  exponent : Integer; //> e.g. 2 --> 1 Dollar = 10^2 Cent
  minor    : String; //> e.g. 'Cent'
}
