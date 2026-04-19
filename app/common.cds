using { BridgeManagementService as srv } from '../srv/service';
annotate srv.Bridges with @(
    Common.SemanticKey: [bridgeId]
);
annotate srv.Restrictions with @(
    Common.SemanticKey: [ID]
);
