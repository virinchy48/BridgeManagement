using {bridge.management as my} from '../db/schema';

service CatalogService {

  /** For displaying lists of Bridges */
  @readonly
  entity ListOfBridges as
    projection on Bridges {
      *,
      restriction.name as restrictionName,
      currency.symbol as currency,
    };

  /** For display in details pages */
  @readonly
  entity Bridges       as
    projection on my.Bridges {
      *,
      author.name as author,
      restriction.name  as restrictionName
    }
    excluding {
      createdBy,
      modifiedBy
    };

  @requires: 'authenticated-user'
  action submitUpdate(bridge: Bridges:ID, quantity: Integer) returns {
    stock : Integer
  };
}
