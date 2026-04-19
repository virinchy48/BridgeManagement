using { BridgeManagementService } from './service';

annotate BridgeManagementService with @requires: ['Admin','BridgeManager','Inspector','Operator','Viewer'];

annotate BridgeManagementService.Bridges with @restrict: [
    { grant: ['READ'],                              to: ['Admin','BridgeManager','Inspector','Operator','Viewer'] },
    { grant: ['CREATE','UPDATE','DELETE'],          to: ['Admin','BridgeManager'] },
    { grant: ['changeCondition','closeForTraffic','reopenForTraffic','addRestriction'], to: ['Admin','BridgeManager'] }
];

annotate BridgeManagementService.Restrictions with @restrict: [
    { grant: ['READ'],                              to: ['Admin','BridgeManager','Inspector','Operator','Viewer'] },
    { grant: ['CREATE','UPDATE','DELETE'],          to: ['Admin','BridgeManager','Inspector'] },
    { grant: ['disableRestriction','enableRestriction','createTemporaryRestriction'], to: ['Admin','BridgeManager','Inspector'] }
];

annotate BridgeManagementService.Lookups           with @restrict: [{ grant: '*', to: 'Admin' }];
annotate BridgeManagementService.AttributeDefinitions with @restrict: [{ grant: '*', to: 'Admin' }];
annotate BridgeManagementService.RoleConfigs       with @restrict: [{ grant: '*', to: 'Admin' }];
