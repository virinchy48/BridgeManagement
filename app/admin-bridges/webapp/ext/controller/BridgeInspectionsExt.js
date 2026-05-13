sap.ui.define([
  "sap/fe/core/PageController",
  "BridgeManagement/adminbridges/ext/controller/BatchElementEntryExt"
], function (PageController, BatchElementEntryExt) {
  "use strict";

  return PageController.extend("BridgeManagement.adminbridges.ext.controller.BridgeInspectionsExt", {

    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
    },

    onOpenBatchElementEntry: function (oEvent) {
      return BatchElementEntryExt.onOpenBatchElementEntry.call(this, oEvent);
    }

  });
});
