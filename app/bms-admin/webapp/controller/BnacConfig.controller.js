sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.BnacConfig", {

    onInit: function () {
      this._envModel  = new JSONModel({ environments: [] });
      this._histModel = new JSONModel({ history: [] });
      this.getView().setModel(this._envModel,  "envModel");
      this.getView().setModel(this._histModel, "histModel");
      this._selectedFile = null;
      this._loadEnvs();
      this._loadHistory();

      // Native file input (cannot declare in XML view)
      const fi = document.createElement("input");
      fi.type = "file"; fi.id = "bnacFileInput"; fi.accept = ".csv"; fi.style.display = "none";
      document.body.appendChild(fi);
    },

    _loadEnvs: function () {
      fetch("/bnac/api/environments", { credentials: "same-origin" })
        .then(r => r.json())
        .then(d => this._envModel.setData({ environments: d.environments || [] }))
        .catch(e => MessageBox.error("Failed to load environments: " + e.message));
    },

    onRefreshEnvs: function () { this._loadEnvs(); this._loadHistory(); },
    onAddEnv:      function () { this._openEnvDialog(null); },

    onEditEnv: function (oEvent) {
      this._openEnvDialog(oEvent.getSource().getBindingContext("envModel").getObject());
    },

    onDeleteEnv: function (oEvent) {
      const env = oEvent.getSource().getBindingContext("envModel").getObject().environment;
      MessageBox.confirm("Delete environment \"" + env + "\"?", {
        onClose: action => {
          if (action !== MessageBox.Action.OK) return;
          fetch("/bnac/api/environments/" + encodeURIComponent(env), { method: "DELETE", credentials: "same-origin" })
            .then(() => { MessageToast.show("Deleted."); this._loadEnvs(); })
            .catch(e => MessageBox.error(e.message));
        }
      });
    },

    _openEnvDialog: function (existing) {
      this._envDialogIsEdit = !!existing;
      this._envDialogEnvKey = existing ? existing.environment : null;
      this.getView().setModel(new JSONModel({
        environment: existing ? existing.environment : "",
        baseUrl:     existing ? (existing.baseUrl     || "") : "",
        description: existing ? (existing.description || "") : "",
        active:      existing ? existing.active !== false : true
      }), "dlgEnv");
      var dlg = this.byId("envDialog");
      dlg.setTitle(this._envDialogIsEdit ? "Edit Environment" : "Add Environment");
      this.byId("dlgEnvKey").setEditable(!this._envDialogIsEdit);
      dlg.open();
    },

    onEnvDialogSave: function () {
      var data = this.getView().getModel("dlgEnv").getData();
      var env  = (data.environment || "").trim().toUpperCase();
      var url  = (data.baseUrl || "").trim();
      if (!env || !url) { MessageToast.show("Environment and Base URL are required."); return; }
      var body = { environment: env, baseUrl: url, description: (data.description || "").trim(), active: data.active };
      var req  = this._envDialogIsEdit
        ? fetch("/bnac/api/environments/" + encodeURIComponent(this._envDialogEnvKey), { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) })
        : fetch("/bnac/api/environments",                                               { method: "POST",  headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
      req.then(r => r.json()).then(d => {
        if (d.error) { MessageBox.error(d.error.message); return; }
        MessageToast.show("Saved.");
        this.byId("envDialog").close();
        this._loadEnvs();
      }).catch(e => MessageBox.error(e.message));
    },

    onEnvDialogClose: function () {
      this.byId("envDialog").close();
    },

    onBrowse: function () {
      const fi = document.getElementById("bnacFileInput");
      fi.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        this._selectedFile = file;
        this.byId("fileNameDisplay").setValue(file.name);
        this.byId("uploadBtn").setEnabled(true);
      };
      fi.click();
    },

    onUpload: function () {
      if (!this._selectedFile) { MessageToast.show("Please select a CSV file first."); return; }
      const env  = this.byId("envSelect").getSelectedKey();
      const file = this._selectedFile;
      const reader = new FileReader();
      reader.onload = e => {
        const base64 = btoa(e.target.result);
        this.getView().setBusy(true);
        fetch("/bnac/api/upload", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ fileName: file.name, contentBase64: base64, environment: env })
        })
        .then(r => r.json())
        .then(d => {
          this.getView().setBusy(false);
          if (d.error) { MessageBox.error(d.error.message); return; }
          const strip = this.byId("uploadResult");
          strip.setType(d.failed > 0 ? "Warning" : "Success");
          strip.setText("Upload complete: " + d.success + " succeeded, " + d.failed + " failed out of " + d.total + " rows.");
          strip.setVisible(true);
          this.byId("uploadBtn").setEnabled(false);
          this.byId("fileNameDisplay").setValue("");
          this._selectedFile = null;
          document.getElementById("bnacFileInput").value = "";
          this._loadHistory();
        })
        .catch(e => { this.getView().setBusy(false); MessageBox.error(e.message); });
      };
      reader.readAsBinaryString(file);
    },

    _loadHistory: function () {
      fetch("/bnac/api/history", { credentials: "same-origin" })
        .then(r => r.json())
        .then(d => {
          const rows = (d.history || []).map(h => ({
            ...h,
            loadedAtDisplay: h.loadedAt ? new Date(h.loadedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : "",
            failedState: (h.failed || 0) > 0 ? "Error" : "None"
          }));
          this._histModel.setData({ history: rows });
        })
        .catch(e => console.error("History load failed:", e));
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>This page manages the connection between BMS and BNAC (Bridge Network Asset Condition) systems: configure environment URLs and upload the mapping between BMS Bridge IDs and BNAC Object IDs.</p>",
        "<h4>Step 1: Configure Environments</h4>",
        "<ol>",
        "<li>Click <strong>Add Environment</strong> to add a BNAC environment (e.g. DEV, UAT, PROD).</li>",
        "<li>Enter the environment name, base URL, and a description.</li>",
        "<li>Toggle <strong>Active</strong> to mark which environment is used for generating deep-links.</li>",
        "</ol>",
        "<h4>Step 2: Upload ID Mappings</h4>",
        "<ol>",
        "<li>Prepare a CSV file with two columns: <em>bridgeId</em> and <em>bnacObjectId</em>. Include a header row.</li>",
        "<li>Select the target environment from the dropdown and drop the CSV onto the upload area.</li>",
        "<li>Review the upload result summary (total, success, failed rows).</li>",
        "</ol>",
        "<h4>Upload History</h4>",
        "<p>The <strong>Load History</strong> table records every CSV upload with timestamp, user, environment, and row counts.</p>",
        "<h4>How Deep-Links Work</h4>",
        "<p>Once a mapping is uploaded, the Bridge detail page shows an <strong>Open in BNAC</strong> button. The link is built as: <em>baseUrl + bnacObjectId</em>.</p>"
      ].join("");
      this._openInfoDialog("BNAC Integration: Help", sHtml);
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
