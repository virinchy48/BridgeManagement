sap.ui.define(["sap/fe/core/AppComponent"], function (AppComponent) {
  "use strict";

  var NUMERIC_GUARD_SCRIPT = "/restrictions/webapp/ext/controller/NumericInputGuard.js";

  function startNumericInputGuard() {
    if (document.getElementById("_restriction_numeric_guard_script")) return;
    var script = document.createElement("script");
    script.id = "_restriction_numeric_guard_script";
    script.src = NUMERIC_GUARD_SCRIPT;
    document.head.appendChild(script);
  }

  return AppComponent.extend("BridgeManagement.restrictions.Component", {
    metadata: { manifest: "json" },
    init: function () {
      AppComponent.prototype.init.apply(this, arguments);
      startNumericInputGuard();
    }
  });
});
