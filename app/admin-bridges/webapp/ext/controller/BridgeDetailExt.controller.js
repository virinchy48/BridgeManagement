// Controller extension — FE4 calls lifecycle methods (onInit, onAfterRendering) from here.
// Press handlers live in BridgeDetailExt.js (plain object, AMD-required by FE4 directly).
sap.ui.define([], function () {
  "use strict";
  return {
    onAfterRendering: function () {
      // Force-load CustomAttributesInit so its _boot + MutationObserver wire up
      // even when core:require in the lazily-rendered fragment hasn't fired yet.
      sap.ui.require(
        ["BridgeManagement/adminbridges/ext/controller/CustomAttributesInit"],
        function (CAInit) {
          if (CAInit && typeof CAInit.onContextChange === "function") {
            CAInit.onContextChange();
          }
        }
      );
    }
  };
});
