sap.ui.define([
  "sap/fe/core/PageController",
  "sap/m/MessageToast"
], function (PageController, MessageToast) {
  "use strict";

  return PageController.extend("BridgeManagement.adminbridges.ext.controller.BridgeInspectionsExt", {

    onOpenBatchElementEntry: function () {
      MessageToast.show("Batch element entry is not yet available in this release.");
    }

  });
});
