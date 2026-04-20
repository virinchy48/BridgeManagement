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
      var sel = this.byId("datasetSelect");
      sel.removeAllItems();
      sel.addItem(new sap.ui.core.Item({ key: "All", text: "All Datasets (Excel only)" }));

      fetch(BASE + "/datasets")
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(data => {
          (data.datasets || []).forEach(function (ds) {
            sel.addItem(new sap.ui.core.Item({ key: ds.name, text: ds.label || ds.name }));
          });
          var bridgesItem = sel.getItems().find(function (i) { return i.getKey() === "Bridges"; });
          if (bridgesItem) sel.setSelectedItem(bridgesItem);
          else sel.setSelectedItem(sel.getItems()[0]);
        })
        .catch(function () {
          ["Bridges", "Restrictions", "AssetClasses", "States", "Regions"].forEach(function (name) {
            sel.addItem(new sap.ui.core.Item({ key: name, text: name }));
          });
        });
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
      var selItem = this.byId("datasetSelect").getSelectedItem();
      var datasetLabel = selItem ? selItem.getText() : "records";
      MessageBox.confirm(
        "Upload and upsert " + datasetLabel + " records from \"" + this._fileName + "\"?\n\nExisting entries (matched by their unique key) will be updated. New entries will be created.",
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
      var total = 0, inserted = 0, updated = 0, skipped = 0;
      var warnings = [];

      if (isUpload) {
        (data.summaries || []).forEach(function (s) {
          total    += (s.processed || 0);
          inserted += (s.inserted  || 0);
          updated  += (s.updated   || 0);
        });
        skipped  = (data.skipped  || []).length;
        warnings = (data.warnings || []).map(function (w) {
          return { rowNumber: "-", severity: "Warning", severityState: "Warning", field: "", message: String(w) };
        });
      } else {
        total   = data.totalCount  || 0;
        inserted = data.validCount || 0;
        skipped = data.errorCount  || 0;
        (data.previewRows || []).filter(function (r) { return r.statusState !== "Success"; }).forEach(function (r) {
          warnings.push({ rowNumber: r.rowNum || "-", severity: r.validText || "Error",
            severityState: r.statusState || "Error", field: "", message: r.message || "" });
        });
      }

      this.byId("numTotal").setValue(String(total));
      this.byId("numInserted").setValue(String(inserted));
      this.byId("numUpdated").setValue(String(updated));
      this.byId("numSkipped").setValue(String(skipped));
      this.byId("numErrors").setValue(String(warnings.length));
      this._model.setProperty("/errors", warnings);

      // P2-002: dynamic tile label — "Valid" during validate, "Inserted" during upload
      this.byId("tileInserted").setHeader(isUpload ? "Inserted" : "Valid");
      // P3-002: hide Updated tile during validate — it has no meaning for a dry run
      this.byId("tileUpdated").setVisible(!!isUpload);

      // P2-003: show truncation notice when preview is capped
      var truncStrip = this.byId("truncationStrip");
      if (!isUpload && data.previewTruncated) {
        truncStrip.setText("Showing first 10 rows only. Fix these errors and re-validate to see remaining issues.");
        truncStrip.setVisible(true);
      } else {
        truncStrip.setVisible(false);
      }

      var panelTitle = isUpload ? "Upload Results" : "Validation Results";
      var summaryText;
      if (isUpload) {
        var datasetCount = (data.summaries || []).length;
        summaryText = total + " rows across " + datasetCount + " dataset(s) — " +
          inserted + " inserted, " + updated + " updated, " + skipped + " skipped";
        if (warnings.length) summaryText += ", " + warnings.length + " warning(s)";
      } else {
        summaryText = total + " rows validated — " + inserted + " valid, " + skipped + " error(s)";
      }
      this.byId("resultsPanelTitle").setText(panelTitle);
      this.byId("resultsSummaryText").setText(summaryText);
      this.byId("resultsPanel").setVisible(true);

      // P3-005: keep upload disabled when validate found errors
      if (!isUpload && skipped > 0) {
        this.byId("uploadBtn").setEnabled(false);
      }

      if (isUpload && warnings.length === 0) {
        MessageToast.show("Upload complete: " + inserted + " inserted, " + updated + " updated.");
      } else if (isUpload) {
        MessageToast.show("Upload finished with " + warnings.length + " warning(s). See table below.");
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
        "<p>Click <em>Download Template (.xlsx)</em> to get a single workbook covering <strong>all datasets</strong>: every lookup table, Bridges, and Restrictions. Lookup columns have in-cell dropdowns so you can pick valid values directly in Excel.</p>",
        "<p><strong>2. Fill in your data</strong></p>",
        "<p>For bridges, <code>bridgeId</code> is the unique key — matching rows are updated, new IDs are created. For restrictions use <code>restrictionRef</code>. For lookup tables use <code>code</code>.</p>",
        "<p><strong>3. Choose a dataset</strong></p>",
        "<p>Select <em>All Datasets</em> to process the full workbook in one upload, or pick a specific dataset to upload only that sheet.</p>",
        "<p><strong>4. Validate before uploading</strong></p>",
        "<p>Use <em>Validate Only</em> to check for errors without touching the database. Fix any issues, then upload.</p>",
        "<p><strong>5. Upload</strong></p>",
        "<p>Click <em>Upload</em> to commit. Results show inserts, updates, skips, and warnings per dataset.</p>",
        "<p><strong>File limits</strong></p>",
        "<ul><li>Formats: .xlsx, .csv (CSV = one dataset at a time)</li>",
        "<li>Max file size: 50 MB</li></ul>",
        "<p><strong>Audit trail</strong></p>",
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
