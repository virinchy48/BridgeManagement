sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/FormattedText"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, FormattedText) {
  "use strict";

  var BASE = "/mass-upload/api";

  return Controller.extend("BridgeManagement.bmsadmin.controller.MassUpload", {

    onInit: function () {
      this._model = new JSONModel({ errors: [] });
      this.getView().setModel(this._model);
      this._fileBuffer    = null;
      this._fileName      = null;
      this._loadDatasets();
    },

    // ── Load dataset list ───────────────────────────────────────────────────
    _loadDatasets: function () {
      fetch(BASE + "/datasets")
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(data => {
          var sel = this.byId("datasetSelect");
          sel.removeAllItems();
          (data.datasets || [{ key: "bridges", text: "Bridges" }]).forEach(function (ds) {
            sel.addItem(new sap.ui.core.Item({ key: ds.key || ds, text: ds.text || ds }));
          });
          if (sel.getItems().length) sel.setSelectedItem(sel.getItems()[0]);
        })
        .catch(function () { /* keep default "Bridges" item already rendered */ });
    },

    // ── Download template ───────────────────────────────────────────────────
    onDownloadTemplate: function () {
      window.location.href = BASE + "/template.xlsx";
    },

    // ── File picker ─────────────────────────────────────────────────────────
    onChooseFile: function () {
      var input = document.getElementById("bmsUploadInput");
      if (!input) return;
      input.onchange = this._onFileSelected.bind(this);
      input.click();
    },

    _onFileSelected: function (evt) {
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;
      this._fileName = file.name;
      this.byId("fileNameText").setText(file.name + " (" + this._formatBytes(file.size) + ")");
      var reader = new FileReader();
      reader.onload = function (e) {
        // Store as base64 (strip the data:*;base64, prefix)
        var b64 = (e.target.result || "").split(",")[1] || "";
        this._fileBuffer = b64;
        this.byId("validateBtn").setEnabled(true);
        this.byId("uploadBtn").setEnabled(true);
        this.byId("resultsPanel").setVisible(false);
        this._model.setProperty("/errors", []);
      }.bind(this);
      reader.readAsDataURL(file);
      // Reset so same file can be re-selected
      evt.target.value = "";
    },

    _formatBytes: function (bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / 1048576).toFixed(1) + " MB";
    },

    // ── Validate only ───────────────────────────────────────────────────────
    onValidate: function () {
      this._callApi("/validate", false);
    },

    // ── Upload ──────────────────────────────────────────────────────────────
    onUpload: function () {
      if (!this._fileBuffer) { MessageToast.show("Please choose a file first."); return; }
      MessageBox.confirm(
        "Upload and upsert bridge records from \"" + this._fileName + "\"?\n\nExisting bridges (matched by Bridge ID) will be updated. New Bridge IDs will be created.",
        {
          title: "Confirm Upload",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          onClose: function (action) {
            if (action === MessageBox.Action.OK) this._callApi("/upload", true);
          }.bind(this)
        }
      );
    },

    _callApi: function (endpoint, isUpload) {
      var dataset = this.byId("datasetSelect").getSelectedKey() || "bridges";
      this.byId("progressPanel").setVisible(true);
      this.byId("progressText").setText((isUpload ? "Uploading" : "Validating") + " " + this._fileName + "…");
      this.byId("resultsPanel").setVisible(false);
      this.byId("validateBtn").setEnabled(false);
      this.byId("uploadBtn").setEnabled(false);

      fetch(BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fileName: this._fileName, contentBase64: this._fileBuffer, dataset: dataset })
      })
        .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
        .then(function (res) {
          this.byId("progressPanel").setVisible(false);
          this.byId("validateBtn").setEnabled(true);
          this.byId("uploadBtn").setEnabled(true);
          if (!res.ok) {
            var msg = (res.data && res.data.error && res.data.error.message) || ("HTTP " + res.status);
            MessageBox.error("Upload failed: " + msg);
            return;
          }
          this._showResults(res.data, isUpload);
        }.bind(this))
        .catch(function (e) {
          this.byId("progressPanel").setVisible(false);
          this.byId("validateBtn").setEnabled(true);
          this.byId("uploadBtn").setEnabled(true);
          MessageBox.error("Network error: " + e.message);
        }.bind(this));
    },

    _showResults: function (data, isUpload) {
      var total    = data.total    || 0;
      var inserted = data.inserted || 0;
      var updated  = data.updated  || 0;
      var skipped  = data.skipped  || 0;
      var errors   = data.errors   || [];

      this.byId("numTotal").setValue(String(total));
      this.byId("numInserted").setValue(String(inserted));
      this.byId("numUpdated").setValue(String(updated));
      this.byId("numSkipped").setValue(String(skipped));
      this.byId("numErrors").setValue(String(errors.length));

      var enriched = errors.map(function (e) {
        return {
          rowNumber:    e.row || e.rowNumber || "-",
          severity:     e.severity || "Error",
          severityState: (e.severity || "error").toLowerCase() === "warning" ? "Warning" : "Error",
          field:        e.field || "",
          message:      e.message || String(e)
        };
      });
      this._model.setProperty("/errors", enriched);

      var panelTitle = isUpload ? "Upload Results" : "Validation Results";
      var summaryText = total + " rows — " + (isUpload ? inserted + " inserted, " + updated + " updated, " + skipped + " skipped, " : "") + errors.length + " error(s)";
      this.byId("resultsPanelTitle").setText(panelTitle);
      this.byId("resultsSummaryText").setText(summaryText);
      this.byId("resultsPanel").setVisible(true);

      if (isUpload && errors.length === 0) {
        MessageToast.show("Upload complete: " + inserted + " inserted, " + updated + " updated.");
      } else if (isUpload && errors.length > 0) {
        MessageToast.show("Upload finished with " + errors.length + " error(s). See table below.");
      }
    },

    // ── Dataset change ──────────────────────────────────────────────────────
    onDatasetChange: function () {
      this._fileBuffer = null;
      this._fileName   = null;
      this.byId("fileNameText").setText("No file selected");
      this.byId("validateBtn").setEnabled(false);
      this.byId("uploadBtn").setEnabled(false);
      this.byId("resultsPanel").setVisible(false);
    },

    // ── Help dialog ─────────────────────────────────────────────────────────
    onShowHelp: function () {
      var sHtml = [
        "<p><strong>Mass Upload — How It Works</strong></p>",
        "<p><strong>1. Download the template</strong></p>",
        "<p>Click <em>Download Template (.xlsx)</em> to get the column structure. Do not rename or reorder the columns.</p>",
        "<p><strong>2. Fill in your data</strong></p>",
        "<p>Each row is one bridge record. The <code>bridgeId</code> column is the unique key — if a row's Bridge ID already exists in BMS, that record is <strong>updated</strong>. If it does not exist, a new bridge is <strong>created</strong>.</p>",
        "<p><strong>3. Validate before uploading</strong></p>",
        "<p>Use <em>Validate Only</em> to check your file for errors without making any changes to the database. Fix any errors shown in the results table, then upload.</p>",
        "<p><strong>4. Upload</strong></p>",
        "<p>Click <em>Upload</em> to commit the data. The results panel shows how many rows were inserted, updated, skipped, and any errors by row.</p>",
        "<p><strong>File limits</strong></p>",
        "<ul><li>Formats: .xlsx, .xls, .csv</li>",
        "<li>Max file size: 50 MB</li>",
        "<li>Max rows per file: 50,000</li></ul>",
        "<p><strong>Tip</strong></p>",
        "<p>All uploads are audit-logged — the Change Documents page records every field change made via mass upload, attributed to your user account.</p>"
      ].join("");
      var oDialog = new Dialog({
        title: "Mass Upload — Help",
        contentWidth: "520px",
        contentHeight: "420px",
        content: [new FormattedText({ htmlText: sHtml, width: "100%" }).addStyleClass("sapUiSmallMargin")],
        endButton: new Button({ text: "Close", press: function () { oDialog.close(); } }),
        afterClose: function () { oDialog.destroy(); }
      });
      oDialog.open();
    }
  });
});
