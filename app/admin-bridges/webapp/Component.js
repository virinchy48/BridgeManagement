sap.ui.define([
    "sap/fe/core/AppComponent",
    "sap/ui/model/json/JSONModel",
    "./fe-shims/NavServicePatch"
], function (AppComponent, JSONModel) {
    "use strict";

    var GIS_SCRIPT = "/admin-bridges/webapp/ext/controller/gisMapInit.js";
    var NUMERIC_GUARD_SCRIPT = "/admin-bridges/webapp/ext/controller/NumericInputGuard.js";
    var RESTRICTIONS_VALIDATION_SCRIPT = "/admin-bridges/webapp/ext/controller/RestrictionsValidation.js";
    var CUSTOM_ATTRS_SCRIPT = "/admin-bridges/webapp/ext/controller/CustomAttributesInit.js";

    function loadScript(id, src) {
        if (document.getElementById(id)) return;
        var script = document.createElement("script");
        script.id = id;
        script.src = src;
        document.head.appendChild(script);
    }

    function startGIS() {
        loadScript("_gis_script", GIS_SCRIPT);
        var obs = new MutationObserver(function () {
            var el = document.getElementById("gisMapCanvas");
            if (el && !el._gisReady) {
                el._gisReady = true;
                setTimeout(function () { window._gisInit && window._gisInit(); }, 200);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    function startCustomAttributes() {
        loadScript("_ca_script", CUSTOM_ATTRS_SCRIPT);
    }

    function startNumericInputGuard() {
        loadScript("_bms_numeric_guard_script", NUMERIC_GUARD_SCRIPT);
    }

    function startRestrictionsValidation() {
        loadScript("_bms_restrictions_validation_script", RESTRICTIONS_VALIDATION_SCRIPT);
    }

    // CUSTOM: feature flag polling — tab visibility binding not achievable via CDS annotation alone.
    // All flags start false (safe default) until the response arrives from /system/api/features.
    // Tabs/sections bind to {featureFlags>/flagKey} — zero DOM manipulation required.
    function initFeatureFlags(oComponent) {
        var oModel = new JSONModel({
            bhiBsiAssessment:            false,
            bhiBsiOrgComparison:         false,
            bhiBsiScourPoa:              false,
            bhiBsiCertificationWorkflow: false,
            bhiBsiAdminWeightConfig:     false
        });
        oComponent.setModel(oModel, "featureFlags");

        fetch("/system/api/features", { credentials: "include" })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
            .then(function (data) {
                var oUpdate = {};
                (data.flags || []).forEach(function (f) {
                    oUpdate[f.flagKey] = f.enabled;
                });
                oModel.setData(oUpdate);
            })
            .catch(function (err) {
                // Feature flags unavailable — all remain false (safe default).
                // App continues normally; BHI/BSI tabs stay hidden.
                console.warn("[BMS] Feature flags unavailable — defaulting all to false:", err);
            });
    }

    return AppComponent.extend("BridgeManagement.adminbridges.Component", {
        metadata: { manifest: "json" },
        init: function () {
            AppComponent.prototype.init.apply(this, arguments);
            startGIS();
            startCustomAttributes();
            startNumericInputGuard();
            startRestrictionsValidation();
            initFeatureFlags(this);
        }
    });
});
