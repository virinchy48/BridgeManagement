sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/core/InvisibleMessage",
  "sap/ui/core/library"
], function (Controller, JSONModel, MessageBox, MessageToast, InvisibleMessage, coreLibrary) {
  "use strict";

  const InvisibleMessageMode = coreLibrary.InvisibleMessageMode;

  return Controller.extend("BridgeManagement.massupload.controller.Main", {
    _ALL_DATASETS_KEY: "All",

    onInit: function () {
      const model = new JSONModel({
        busy: false,
        datasets: [],
        selectedDataset: this._ALL_DATASETS_KEY,
        selectedDatasetLabel: "",
        selectedDatasetDescription: "",
        selectedDatasetTemplateText: "",
        selectedDatasetFormat: "",
        selectedDatasetValidation: "",
        selectedTemplateActionText: "",
        selectedSelectionMode: "",
        selectedTemplateIncludes: "",
        selectedTemplateAdvice: "",
        selectedUploadAdvice: "",
        selectedMandatoryHint: "",
        uploadReadyText: "No file selected",
        uploadFormatText: "",
        uploadScopeText: "",
        canUpload: false,
        fileName: "",
        uploadSummaries: [],
        lastMessage: "",
        hasUploadResults: false
      });
      this.getView().setModel(model, "view");
      this._invisibleMessage = InvisibleMessage.getInstance();
      this._file = null;
      this._loadDatasets();
    },

    onAfterRendering: function () {
      const dropZone = this.byId("dropZone");
      if (!dropZone) {
        return;
      }

      const dropDomRef = dropZone.getDomRef();
      if (!dropDomRef || dropDomRef.dataset.massUploadBound === "true") {
        return;
      }

      dropDomRef.dataset.massUploadBound = "true";
      dropDomRef.addEventListener("dragenter", this._onDropZoneDragEnter.bind(this));
      dropDomRef.addEventListener("dragover", this._onDropZoneDragOver.bind(this));
      dropDomRef.addEventListener("dragleave", this._onDropZoneDragLeave.bind(this));
      dropDomRef.addEventListener("drop", this._onDropZoneDrop.bind(this));
      dropDomRef.addEventListener("click", this._openFileDialog.bind(this));
      dropDomRef.addEventListener("keydown", this._onDropZoneKeyDown.bind(this));
      dropDomRef.setAttribute("tabindex", "0");
      dropDomRef.setAttribute("role", "button");
    },

    onRefresh: function () {
      this._loadDatasets();
    },

    onDatasetChange: function (oEvent) {
      this._getViewModel().setProperty("/selectedDataset", oEvent.getSource().getSelectedKey());
      this._updateSelectedDatasetContext();
    },

    onDownloadWorkbook: function () {
      window.open("/mass-upload/api/template.xlsx", "_blank");
    },

    onDownloadSelectedTemplate: function () {
      const dataset = this._getViewModel().getProperty("/selectedDataset");
      if (dataset === this._ALL_DATASETS_KEY) {
        this.onDownloadWorkbook();
        return;
      }
      this.onDownloadCsv();
    },

    onDownloadCsv: function () {
      const dataset = this._getViewModel().getProperty("/selectedDataset");
      if (!dataset) {
        MessageBox.warning("Select a dataset before downloading a CSV template.");
        return;
      }
      if (dataset === this._ALL_DATASETS_KEY) {
        this.onDownloadWorkbook();
        return;
      }
      const url = `/mass-upload/api/template.csv?dataset=${encodeURIComponent(dataset)}`;
      window.open(url, "_blank");
    },

    onFileChange: function (oEvent) {
      const files = oEvent.getParameter("files") || [];
      this._setSelectedFile(files[0] || null);
    },

    onUpload: async function () {
      if (!this._file) {
        MessageBox.warning("Choose a CSV or Excel file to upload.");
        return;
      }

      const model = this._getViewModel();
      model.setProperty("/busy", true);

      try {
        const contentBase64 = await this._readFileAsBase64(this._file);
        const response = await fetch("/mass-upload/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileName: this._file.name,
            dataset: model.getProperty("/selectedDataset"),
            contentBase64
          })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error?.message || payload.message || "Upload failed");
        }

        model.setProperty("/uploadSummaries", payload.summaries || []);
        model.setProperty("/lastMessage", payload.message || "Upload complete.");
        model.setProperty("/hasUploadResults", !!(payload.message || (payload.summaries || []).length));
        this._setSelectedFile(null);
        this.byId("fileUploader").clear();
        MessageToast.show("Mass upload completed");
      } catch (error) {
        MessageBox.error(error.message || "Upload failed");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    _loadDatasets: async function () {
      const model = this._getViewModel();
      model.setProperty("/busy", true);

      try {
        const response = await fetch("/mass-upload/api/datasets");
        const payload = await response.json();
        model.setProperty("/datasets", [{
          name: this._ALL_DATASETS_KEY,
          label: "All",
          description: "Download the workbook template and validate all supported sheets together."
        }].concat((payload.datasets || []).map((dataset) => ({
          ...dataset,
          description: this._getDatasetDescription(dataset)
        }))));

        if (!model.getProperty("/datasets").some((dataset) => dataset.name === model.getProperty("/selectedDataset"))) {
          const defaultDataset = model.getProperty("/datasets").find((dataset) => dataset.name === "Bridges");
          model.setProperty("/selectedDataset", defaultDataset ? defaultDataset.name : this._ALL_DATASETS_KEY);
        }
        this._updateSelectedDatasetContext();
      } catch (error) {
        MessageBox.error(error.message || "Failed to load upload datasets.");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    _readFileAsBase64: function (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
          const result = event.target.result || "";
          const parts = String(result).split(",");
          resolve(parts[parts.length - 1] || "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },

    _getViewModel: function () {
      return this.getView().getModel("view");
    },

    _setSelectedFile: function (file) {
      this._file = file || null;
      const model = this._getViewModel();
      model.setProperty("/fileName", this._file ? this._file.name : "");
      model.setProperty("/canUpload", !!this._file);
      model.setProperty("/uploadReadyText", this._file ? this._file.name : "No file selected");
      this._toggleDropzoneState(!!this._file);
    },

    _toggleDropzoneState: function (hasFile) {
      const dropZone = this.byId("dropZone");
      if (!dropZone) {
        return;
      }
      dropZone.toggleStyleClass("is-dragover", false);
      dropZone.toggleStyleClass("has-file", hasFile);
    },

    _openFileDialog: function () {
      const uploader = this.byId("fileUploader");
      const domRef = uploader && uploader.getFocusDomRef();
      if (domRef) {
        domRef.click();
      }
    },

    _onDropZoneKeyDown: function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._openFileDialog();
      }
    },

    _onDropZoneDragEnter: function (event) {
      event.preventDefault();
      this.byId("dropZone").toggleStyleClass("is-dragover", true);
    },

    _onDropZoneDragOver: function (event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      this.byId("dropZone").toggleStyleClass("is-dragover", true);
    },

    _onDropZoneDragLeave: function (event) {
      const currentTarget = event.currentTarget;
      const relatedTarget = event.relatedTarget;
      if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
        return;
      }
      this.byId("dropZone").toggleStyleClass("is-dragover", false);
    },

    _onDropZoneDrop: function (event) {
      event.preventDefault();
      const files = event.dataTransfer?.files || [];
      const file = files[0] || null;
      if (!file) {
        this.byId("dropZone").toggleStyleClass("is-dragover", false);
        return;
      }

      const lowerName = (file.name || "").toLowerCase();
      if (!lowerName.endsWith(".csv")) {
        this.byId("dropZone").toggleStyleClass("is-dragover", false);
        MessageBox.warning("Only CSV files are supported for this upload.");
        return;
      }

      this._setSelectedFile(file);
      this._invisibleMessage.announce(`Selected file ${file.name}`, InvisibleMessageMode.Assertive);
    },

    _updateSelectedDatasetContext: function () {
      const model = this._getViewModel();
      const datasets = model.getProperty("/datasets") || [];
      const selectedKey = model.getProperty("/selectedDataset");
      const selectedDataset = datasets.find((dataset) => dataset.name === selectedKey) || datasets[0] || null;
      const isAll = selectedDataset?.name === this._ALL_DATASETS_KEY;
      const datasetLabel = selectedDataset?.label || "";

      model.setProperty("/selectedDatasetLabel", datasetLabel);
      model.setProperty("/selectedDatasetDescription", selectedDataset?.description || "");
      model.setProperty("/selectedDatasetTemplateText", isAll
        ? "Download the full CSV template with all supported columns and a sample row."
        : `Download the full CSV template for ${datasetLabel || "the selected dataset"} with all supported columns and a sample row.`);
      model.setProperty("/selectedDatasetFormat", isAll ? "CSV template (.csv)" : "CSV template (.csv)");
      model.setProperty("/selectedDatasetValidation", isAll
        ? "Upload validates every supported sheet found in the workbook."
        : `Upload validates the selected ${datasetLabel || "dataset"} only.`);
      model.setProperty("/selectedTemplateActionText", isAll
        ? "Download Template CSV"
        : "Download Template CSV");
      model.setProperty("/selectedSelectionMode", isAll ? "All datasets" : "Single dataset");
      model.setProperty("/selectedTemplateIncludes", isAll
        ? "Workbook includes Bridges, Restrictions, dropdown source sheets, and the DropdownExamples guide."
        : `${datasetLabel || "Dataset"} template includes the selected dataset columns and current values as the editing baseline.`);
      model.setProperty("/selectedTemplateAdvice", isAll
        ? "Use this when multiple dropdowns or mixed bridge/restriction records need to be prepared together."
        : "Use this when one dataset needs a fast CSV edit and a narrower validation path.");
      model.setProperty("/selectedUploadAdvice", isAll
        ? "Best for coordinated bulk updates. Workbook upload checks each included supported sheet."
        : `Best for targeted updates. Keep the selected dataset aligned with the file you upload for ${datasetLabel || "this dataset"}.`);
      model.setProperty("/selectedMandatoryHint", isAll
        ? "Required: bridgeId, name, state, assetOwner, latitude, longitude. Optional: conditionRating (1-10), condition (GOOD|FAIR|POOR|CRITICAL), postingStatus (UNRESTRICTED|POSTED|CLOSED)."
        : `Required and optional fields for ${datasetLabel || "the selected dataset"} are included in the downloaded template header row.`);
      model.setProperty("/uploadFormatText", "CSV format required. If you have an Excel file, open it and save as CSV (File → Save As → CSV) before uploading.");
      model.setProperty("/uploadScopeText", isAll ? "Validation scope: all supported sheets" : `Validation scope: ${datasetLabel || "selected dataset"} only`);
      model.setProperty("/canUpload", !!this._file);
      if (!this._file) {
        model.setProperty("/uploadReadyText", "No file selected");
      }
    },

    _getDatasetDescription: function (dataset) {
      if (dataset.name === "Bridges") {
        return "Upload bridge asset records. Existing bridges are matched by bridgeId and updated. New bridgeIds create new records.";
      }
      if (dataset.name === "Restrictions") {
        return "Upload restriction records. Existing restrictions are matched by restrictionRef or ID and updated.";
      }
      return dataset.description;
    }
  });
});
