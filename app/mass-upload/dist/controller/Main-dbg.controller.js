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
      document.body.classList.add("massUploadFullBleed");

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
        uploadWarnings: [],
        uploadWarningsTitle: "",
        lastMessage: "",
        skippedMessage: "",
        hasUploadResults: false
      });
      this.getView().setModel(model, "view");
      this._invisibleMessage = InvisibleMessage.getInstance();
      this._file = null;
      this._loadDatasets();
    },

    onExit: function () {
      document.body.classList.remove("massUploadFullBleed");
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

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Upload failed (HTTP ${response.status}). The server returned an unexpected response. Please try again or contact your administrator.`);
        }

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error?.message || payload.message || "Upload failed");
        }

        model.setProperty("/uploadSummaries", payload.summaries || []);
        model.setProperty("/lastMessage", payload.message || "Upload complete.");

        const skipped = payload.skipped || [];
        if (skipped.length) {
          const names = skipped.map((s) => s.label || s.name).join(", ");
          model.setProperty("/skippedMessage",
            `${skipped.length} dataset(s) were not found in the uploaded file and were skipped: ${names}. ` +
            "Check that the sheet names in your file exactly match these dataset names and re-upload."
          );
        } else {
          model.setProperty("/skippedMessage", "");
        }

        const warnings = payload.warnings || [];
        if (warnings.length) {
          model.setProperty("/uploadWarnings", warnings);
          model.setProperty("/uploadWarningsTitle",
            `${warnings.length} issue(s) found during upload — affected rows were skipped or fields were cleared. ` +
            "Review the details below and correct your data before re-uploading those rows."
          );
        } else {
          model.setProperty("/uploadWarnings", []);
          model.setProperty("/uploadWarningsTitle", "");
        }

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
      if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
        this.byId("dropZone").toggleStyleClass("is-dragover", false);
        MessageBox.warning("Only CSV (.csv) and Excel (.xlsx) files are supported for upload.");
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
        ? "Download the full workbook template with all datasets, dropdown source sheets, a DropdownExamples guide (allowed values in sequence), and mandatory field markers."
        : `Download the full CSV template for ${datasetLabel || "the selected dataset"} with all supported columns, current values as the editing baseline, and required fields marked with *.`);
      model.setProperty("/selectedTemplateActionText", isAll
        ? "Download Template CSV"
        : "Download Template CSV");
      model.setProperty("/selectedMandatoryHint", this._getDatasetMandatoryHint(selectedDataset, isAll));
      model.setProperty("/uploadFormatText", isAll
        ? "CSV and Excel (.xlsx) formats are supported. Use the Excel workbook template for All — it validates every dataset sheet together. For a single dataset, CSV or Excel both work."
        : "CSV (.csv) and Excel (.xlsx) formats are supported. For CSV, ensure the column headers match the downloaded template exactly.");
      model.setProperty("/uploadScopeText", isAll ? "Validation scope: all supported sheets" : `Validation scope: ${datasetLabel || "selected dataset"} only`);
      model.setProperty("/canUpload", !!this._file);
      if (!this._file) {
        model.setProperty("/uploadReadyText", "No file selected");
      }
    },

    _getDatasetMandatoryHint: function (dataset, isAll) {
      if (!dataset) {
        return "";
      }
      if (isAll) {
        return "Bridges required: bridgeId, bridgeName, state, assetOwner, latitude, longitude. "
          + "Bridges optional: conditionRating (1-10), condition (GOOD|FAIR|POOR|CRITICAL), postingStatus (UNRESTRICTED|POSTED|CLOSED). "
          + "Restrictions required: restrictionRef, restrictionCategory, restrictionType, restrictionStatus. "
          + "All dropdown sheets require: code. Optional: name, descr.";
      }
      if (dataset.name === "Bridges") {
        return "Required: bridgeId, bridgeName, state, assetOwner, latitude, longitude. "
          + "Optional: conditionRating (1-10), condition (GOOD|FAIR|POOR|CRITICAL), postingStatus (UNRESTRICTED|POSTED|CLOSED), "
          + "assetClass, route, routeNumber, region, lga, location, managingAuthority, structureType, yearBuilt, designLoad, designStandard, "
          + "clearanceHeight, spanLength, material, spanCount, totalLength, deckWidth, numberOfLanes, structuralAdequacyRating, "
          + "scourRisk, seismicZone, floodImpacted (true|false), highPriorityAsset (true|false), remarks.";
      }
      if (dataset.name === "Restrictions") {
        return "Required: restrictionRef, restrictionCategory, restrictionType, restrictionStatus. "
          + "Optional: bridgeRef, name, descr, restrictionValue, restrictionUnit, appliesToVehicleClass, "
          + "grossMassLimit, axleMassLimit, heightLimit, widthLimit, lengthLimit, speedLimit, "
          + "permitRequired (true|false), escortRequired (true|false), temporary (true|false), active (true|false), "
          + "effectiveFrom (YYYY-MM-DD), effectiveTo (YYYY-MM-DD), direction, enforcementAuthority, "
          + "approvedBy, legalReference, remarks.";
      }
      if (dataset.name === "AssetClasses") {
        return "Required: code. Optional: name (e.g. Beam Bridge, Box Culvert, Arch Bridge), descr.";
      }
      if (dataset.name === "States") {
        return "Required: code (e.g. NSW, VIC, QLD). Optional: name (full state name), descr.";
      }
      if (dataset.name === "Regions") {
        return "Required: code. Optional: name (e.g. Northern, Southern, Western, Eastern), descr.";
      }
      if (dataset.name === "StructureTypes") {
        return "Required: code. Optional: name (e.g. Concrete, Steel, Timber, Composite), descr.";
      }
      if (dataset.name === "DesignLoads") {
        return "Required: code. Optional: name (e.g. T44, M1600, SM1600), descr.";
      }
      if (dataset.name === "PostingStatuses") {
        return "Required: code (e.g. UNRESTRICTED, POSTED, CLOSED). Optional: name, descr.";
      }
      if (dataset.name === "ConditionStates") {
        return "Required: code (e.g. GOOD, FAIR, POOR, CRITICAL). Optional: name, descr.";
      }
      if (dataset.name === "ScourRiskLevels") {
        return "Required: code (e.g. LOW, MEDIUM, HIGH, VERY_HIGH). Optional: name, descr.";
      }
      if (dataset.name === "PbsApprovalClasses") {
        return "Required: code (e.g. CLASS_1, CLASS_2, CLASS_3). Optional: name, descr.";
      }
      if (dataset.name === "RestrictionTypes") {
        return "Required: code (e.g. MASS, HEIGHT, WIDTH, LENGTH, SPEED). Optional: name, descr.";
      }
      if (dataset.name === "RestrictionStatuses") {
        return "Required: code (e.g. ACTIVE, INACTIVE, PENDING). Optional: name, descr.";
      }
      if (dataset.name === "VehicleClasses") {
        return "Required: code (e.g. LIGHT, HEAVY, OVERSIZE). Optional: name, descr.";
      }
      if (dataset.name === "RestrictionCategories") {
        return "Required: code (e.g. Permanent, Temporary, Seasonal). Optional: name, descr.";
      }
      if (dataset.name === "RestrictionUnits") {
        return "Required: code (e.g. tonne, m, km/h). Optional: name, descr.";
      }
      if (dataset.name === "RestrictionDirections") {
        return "Required: code (e.g. BOTH, NORTHBOUND, SOUTHBOUND, EASTBOUND, WESTBOUND). Optional: name, descr.";
      }
      return `Required and optional fields for ${dataset.label || dataset.name} are marked with * in the downloaded CSV template header row.`;
    },

    _getDatasetDescription: function (dataset) {
      if (dataset.name === "Bridges") {
        return "Upload bridge asset records. Existing bridges are matched by bridgeId and updated. New bridgeIds create new records.";
      }
      if (dataset.name === "Restrictions") {
        return "Upload restriction records. Existing restrictions are matched by restrictionRef or ID and updated.";
      }
      if (dataset.name === "AssetClasses") {
        return "Manage bridge asset class dropdown values (e.g. Beam Bridge, Arch Bridge, Culvert).";
      }
      if (dataset.name === "States") {
        return "Manage Australian state/territory dropdown values used on bridge records.";
      }
      if (dataset.name === "Regions") {
        return "Manage region dropdown values for geographic grouping of bridge assets.";
      }
      if (dataset.name === "StructureTypes") {
        return "Manage bridge structure type dropdown values (e.g. Concrete, Steel, Timber).";
      }
      if (dataset.name === "DesignLoads") {
        return "Manage design load dropdown values (e.g. T44, M1600, SM1600).";
      }
      if (dataset.name === "PostingStatuses") {
        return "Manage posting status dropdown values (UNRESTRICTED, POSTED, CLOSED).";
      }
      if (dataset.name === "ConditionStates") {
        return "Manage bridge condition state dropdown values (GOOD, FAIR, POOR, CRITICAL).";
      }
      if (dataset.name === "ScourRiskLevels") {
        return "Manage scour risk level dropdown values (LOW, MEDIUM, HIGH, VERY_HIGH).";
      }
      if (dataset.name === "PbsApprovalClasses") {
        return "Manage PBS approval class dropdown values used on bridge records.";
      }
      if (dataset.name === "RestrictionTypes") {
        return "Manage restriction type dropdown values (e.g. MASS, HEIGHT, WIDTH, SPEED).";
      }
      if (dataset.name === "RestrictionStatuses") {
        return "Manage restriction status dropdown values (e.g. ACTIVE, INACTIVE, PENDING).";
      }
      if (dataset.name === "VehicleClasses") {
        return "Manage vehicle class dropdown values used on restriction records.";
      }
      if (dataset.name === "RestrictionCategories") {
        return "Manage restriction category dropdown values (e.g. Permanent, Temporary, Seasonal).";
      }
      if (dataset.name === "RestrictionUnits") {
        return "Manage restriction unit dropdown values (e.g. tonne, m, km/h).";
      }
      if (dataset.name === "RestrictionDirections") {
        return "Manage restriction direction dropdown values (e.g. BOTH, NORTHBOUND, SOUTHBOUND).";
      }
      return dataset.description;
    }
  });
});
