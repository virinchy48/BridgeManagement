sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
  "use strict";

  const BASE = "/odata/v4/admin";

  return Controller.extend("BridgeManagement.bmsadmin.controller.DemoData", {

    onInit: function () {
      this._csrfToken = null;
      this.onCheckStatus();
    },

    // ── CSRF token ──────────────────────────────────────────────────────────
    _getCsrfToken: function () {
      if (this._csrfToken) return Promise.resolve(this._csrfToken);
      return fetch(BASE + "/Bridges?$top=0", {
        method: "HEAD",
        headers: { "X-CSRF-Token": "Fetch" }
      }).then(r => {
        this._csrfToken = r.headers.get("X-CSRF-Token") || "unsafe";
        return this._csrfToken;
      });
    },

    _mutate: function (url) {
      return this._getCsrfToken().then(token => {
        return fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token
          },
          body: "{}"
        });
      });
    },

    // ── Status check ────────────────────────────────────────────────────────
    onCheckStatus: function () {
      const statusCtrl = this.byId("demoStatus");
      if (statusCtrl) {
        statusCtrl.setText("Checking…");
        statusCtrl.setState("None");
      }
      fetch(BASE + "/Bridges?$filter=startswith(bridgeId,'DEMO-')&$count=true&$top=0&$select=ID")
        .then(r => r.json())
        .then(data => {
          const count = data["@odata.count"] || 0;
          if (!statusCtrl) return;
          if (count > 0) {
            statusCtrl.setText("Demo data is active (" + count + " demo bridge" + (count !== 1 ? "s" : "") + " found)");
            statusCtrl.setState("Success");
          } else {
            statusCtrl.setText("No demo data found");
            statusCtrl.setState("Warning");
          }
        })
        .catch(() => {
          if (statusCtrl) {
            statusCtrl.setText("Unable to check status");
            statusCtrl.setState("Error");
          }
        });
    },

    // ── Activate ────────────────────────────────────────────────────────────
    onActivateDemoData: function () {
      const activateBtn = this.byId("activateBtn");
      if (activateBtn) activateBtn.setEnabled(false);
      this._mutate(BASE + "/loadDemoData")
        .then(r => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(data => {
          const result = data.value || data;
          MessageToast.show(result.message || "Demo data activated.");
          this.onCheckStatus();
        })
        .catch(err => {
          MessageBox.error("Failed to activate demo data: " + err.message);
        })
        .finally(() => {
          if (activateBtn) activateBtn.setEnabled(true);
        });
    },

    // ── Clear ────────────────────────────────────────────────────────────────
    onClearDemoData: function () {
      MessageBox.confirm(
        "This will permanently delete all demo bridges (DEMO-NSW-001, DEMO-VIC-001, DEMO-QLD-001) and all their child records across every tile.\n\nAre you sure?",
        {
          title: "Clear Demo Data",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.CANCEL,
          onClose: (action) => {
            if (action !== MessageBox.Action.OK) return;
            const clearBtn = this.byId("clearBtn");
            if (clearBtn) clearBtn.setEnabled(false);
            this._mutate(BASE + "/clearDemoData")
              .then(r => {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
              })
              .then(data => {
                const result = data.value || data;
                this._csrfToken = null;
                MessageToast.show(result.message || "Demo data cleared.");
                this.onCheckStatus();
              })
              .catch(err => {
                MessageBox.error("Failed to clear demo data: " + err.message);
              })
              .finally(() => {
                if (clearBtn) clearBtn.setEnabled(true);
              });
          }
        }
      );
    },

    onShowHelp: function () {
      var sHtml = [
        "<p><strong>Purpose:</strong> Load a set of sample bridges and related records so that new users can explore BMS without affecting real bridge data.</p>",
        "<p><strong>Activate:</strong> Click Activate Demo Data to load 3 sample bridges (one from NSW, VIC, and QLD) with inspections, defects, restrictions, ",
        "and risk assessments pre-populated.</p>",
        "<p><strong>Clear:</strong> Click Clear Demo Data to remove all demo records. This only removes records with a DEMO- prefix — your real bridge data is never affected.</p>",
        "<p><strong>When to use:</strong> During training sessions, stakeholder demonstrations, or when testing new workflows on a fresh environment.</p>",
        "<p><strong>Important:</strong> Demo mode does not affect production data. All demo records are clearly labelled with a DEMO- prefix so they are easily distinguishable.</p>"
      ].join("");
      this._openInfoDialog("Demo Data — Help", sHtml);
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
