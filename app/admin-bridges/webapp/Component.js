sap.ui.define([
    "sap/fe/core/AppComponent",
    "./fe-shims/NavServicePatch"
], function (AppComponent) {
    "use strict";

    var GIS_SCRIPT = "/admin-bridges/webapp/ext/controller/gisMapInit.js";

    function startGIS() {
        if (!document.getElementById("_gis_script")) {
            var s = document.createElement("script");
            s.id = "_gis_script";
            s.src = GIS_SCRIPT;
            document.head.appendChild(s);
        }
        var obs = new MutationObserver(function () {
            var el = document.getElementById("gisMapCanvas");
            if (el && !el._gisReady) {
                el._gisReady = true;
                setTimeout(function () { window._gisInit && window._gisInit(); }, 200);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    return AppComponent.extend("BridgeManagement.adminbridges.Component", {
        metadata: { manifest: "json" },
        init: function () {
            AppComponent.prototype.init.apply(this, arguments);
            startGIS();
        }
    });
});
