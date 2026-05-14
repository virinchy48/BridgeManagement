sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  var BASE = "/system/api/features";

  return Controller.extend("BridgeManagement.bmsadmin.controller.FeatureFlags", {

    onInit: function () {
      this.getView().setModel(new JSONModel({ flags: [] }), "flags");
      this.getView().setModel(new JSONModel({ canManage: false }), "userScopes");
      Promise.all([this._loadFlags(), this._checkScopes()]);
    },

    _loadFlags: function () {
      var oModel = this.getView().getModel("flags");
      fetch(BASE, { credentials: "include" })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (data) { oModel.setProperty("/flags", data.flags || []); })
        .catch(function (err) { MessageToast.show("Failed to load feature flags: " + err); });
    },

    _checkScopes: function () {
      var oModel = this.getView().getModel("userScopes");
      fetch("/system/api/user-info", { credentials: "include" })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (data) {
          var scopes = data.scopes || [];
          oModel.setProperty("/canManage", scopes.indexOf("config_manager") >= 0 || scopes.indexOf("admin") >= 0);
        })
        .catch(function () { oModel.setProperty("/canManage", false); });
    },

    onRefreshFlags: function () { this._loadFlags(); },

    onToggleFlag: function (oEvent) {
      var oBtn    = oEvent.getSource();
      var flagKey = oBtn.data("flagKey");
      var bCurrentlyEnabled = oBtn.data("enabled");
      var sLabel  = oBtn.data("label");
      var bNewValue = !bCurrentlyEnabled;

      // CUSTOM: warn when disabling the master flag — children will cascade-disable
      var sMsg;
      if (!bNewValue && (flagKey === "bhiBsiAssessment")) {
        sMsg = "Disabling '" + sLabel + "' will also disable all dependent BHI/BSI flags " +
               "(Org Comparison, Scour PoA, Certification Workflow, Admin Weight Config).\n\n" +
               "Continue?";
      } else if (bNewValue) {
        sMsg = "Enable '" + sLabel + "'?";
      } else {
        sMsg = "Disable '" + sLabel + "'?";
      }

      MessageBox.confirm(sMsg, {
        title: bNewValue ? "Enable Feature" : "Disable Feature",
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            this._setFlag(flagKey, bNewValue, sLabel);
          }
        }.bind(this)
      });
    },

    _getCsrfToken: function () {
      return fetch(BASE, {
        method: "HEAD",
        credentials: "include",
        headers: { "X-CSRF-Token": "Fetch" }
      }).then(function (res) {
        return res.headers.get("X-CSRF-Token");
      });
    },

    _setFlag: function (flagKey, bNewValue, sLabel) {
      var oView = this.getView();
      this._getCsrfToken().then(function (token) {
        return fetch(BASE + "/" + encodeURIComponent(flagKey), {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: JSON.stringify({ enabled: bNewValue })
        });
      }).then(function (res) {
        if (!res.ok) {
          return res.json().then(function (e) {
            throw new Error(e.error || e.message || ("HTTP " + res.status));
          });
        }
        return res.json();
      }).then(function (data) {
        var sToast = "'" + sLabel + "' " + (bNewValue ? "enabled" : "disabled") + ".";
        if (data.cascadeDisabled && data.cascadeDisabled.length > 0) {
          sToast += " Also disabled: " + data.cascadeDisabled.join(", ") + ".";
        }
        MessageToast.show(sToast);

        // Sync the Component-level featureFlags model so tabs update immediately
        var oComponent = oView.getController().getOwnerComponent();
        var oFfModel   = oComponent.getModel("featureFlags");
        if (oFfModel) {
          oFfModel.setProperty("/" + flagKey, bNewValue);
          if (data.cascadeDisabled) {
            data.cascadeDisabled.forEach(function (k) { oFfModel.setProperty("/" + k, false); });
          }
        }

        // Reload table
        oView.getController()._loadFlags();
      }).catch(function (err) {
        MessageBox.error("Failed to update flag: " + err.message);
      });
    },

    onShowHelp: function () {
      var sHtml = [
        "<p><strong>Purpose:</strong> Feature flags control which advanced assessment capabilities are visible to users. ",
        "This lets your organisation turn new features on and off without a system update.</p>",
        "<p><strong>How it works:</strong> Each flag in the table represents a feature. Toggle the switch to enable or disable it. ",
        "Changes take effect immediately for all users — no page reload required.</p>",
        "<p><strong>BHI/BSI Assessment (master switch):</strong> This is the main switch for the Bridge Health Index and Bridge Sufficiency Index assessment modules. ",
        "Turning this off will also automatically disable all related sub-features (Org Comparison, Scour PoA, Certification Workflow, Weight Config).</p>",
        "<p><strong>Who can change flags:</strong> Only users with the Configuration Manager or Administrator role can toggle flags on this screen. ",
        "If you cannot toggle a flag, ask your BMS administrator to grant you the Config Manager role.</p>",
        "<p><strong>When to use:</strong> Enable new features after your organisation has completed training and testing in the staging environment. ",
        "Disable features that are not relevant to your bridge portfolio.</p>"
      ].join("");
      this._openInfoDialog("Feature Flags — Help", sHtml);
    },

    _openInfoDialog: function (title, html) {
      this.byId("infoDialog").setTitle(title);
      this.byId("infoDialogHtml").setHtmlText(html);
      this.byId("infoDialog").open();
    },

    onInfoDialogClose: function () {
      this.byId("infoDialog").close();
    }

  });
});
