using { BridgeManagementService } from './service';

annotate BridgeManagementService with @requires: ['view', 'manage', 'admin'];

annotate BridgeManagementService.Bridges with @restrict: [
    { grant: ['READ'],                                                               to: ['view','manage','admin'] },
    { grant: ['CREATE','UPDATE'],                                                    to: ['manage','admin'] },
    { grant: ['DELETE'],                                                             to: ['admin'] },
    { grant: ['changeCondition','closeForTraffic','reopenForTraffic','addRestriction'], to: ['manage','admin'] }
];

annotate BridgeManagementService.Restrictions with @restrict: [
    { grant: ['READ'],                                                                   to: ['view','manage','admin'] },
    { grant: ['CREATE','UPDATE'],                                                        to: ['manage','admin'] },
    { grant: ['DELETE'],                                                                 to: ['admin'] },
    { grant: ['disableRestriction','enableRestriction','createTemporaryRestriction'],    to: ['manage','admin'] }
];

annotate BridgeManagementService.Lookups            with @restrict: [{ grant: '*', to: 'admin' }];
annotate BridgeManagementService.AttributeDefinitions with @restrict: [{ grant: '*', to: 'admin' }];
annotate BridgeManagementService.RoleConfigs        with @restrict: [{ grant: '*', to: 'admin' }];
