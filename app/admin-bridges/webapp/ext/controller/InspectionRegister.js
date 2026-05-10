sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
  "use strict";

  var SERVICE = "/odata/v4/admin";

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getHost(control) {
    var current = control;
    while (current && !(current.isA && current.isA("sap.m.VBox"))) {
      current = current.getParent && current.getParent();
    }
    return current || control;
  }

  function getModel(host) {
    var model = host.getModel("inspectionRegister");
    if (!model) {
      model = new JSONModel({
        busy: false,
        bridgeId: null,
        inspections: [],
        selectedDefects: [],
        showDefects: false,
        canEdit: false,
        isOffline: false,
        offlineText: ""
      });
      host.setModel(model, "inspectionRegister");
    }
    return model;
  }

  // Reuses same key-extraction pattern as gisMapInit.js:15–23
  function getBridgeKeyPredicate() {
    var bridgeKeyMatch = (window.location.hash || "").match(/Bridges\(ID=(\d+),IsActiveEntity=(true|false)\)/);
    if (!bridgeKeyMatch) return null;
    return "ID=" + bridgeKeyMatch[1] + ",IsActiveEntity=" + bridgeKeyMatch[2];
  }

  function getBridgeIdFromHash() {
    var m = (window.location.hash || "").match(/Bridges\(ID=(\d+)/);
    return m ? m[1] : null;
  }

  function resolveBridgeId(host) {
    var ctx = host.getBindingContext && host.getBindingContext();
    if (ctx) {
      var id = ctx.getProperty && ctx.getProperty("ID");
      if (id != null) return String(id);
    }
    return getBridgeIdFromHash();
  }

  // Reuses CSRF pattern from Attachments.js:mutate()
  async function getCsrfToken() {
    var resp = await fetch(SERVICE + "/$metadata", { method: "HEAD", headers: { "x-csrf-token": "fetch" } });
    return resp.headers.get("x-csrf-token") || "";
  }

  async function mutate(url, method, body) {
    var token = await getCsrfToken();
    var resp = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": token
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!resp.ok) {
      var err = await resp.json().catch(function () { return { error: { message: resp.statusText } }; });
      throw new Error((err.error && err.error.message) || resp.statusText);
    }
    return resp.status !== 204 ? resp.json() : null;
  }

  // ── Formatters ─────────────────────────────────────────────────────────────

  function formatDate(isoStr) {
    if (!isoStr) return "";
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatCurrency(amount) {
    if (amount == null || amount === "") return "";
    return "$" + Number(amount).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function mapInspection(insp) {
    var defects = (insp.defects || []);
    return {
      ID: insp.ID,
      inspectionDate: insp.inspectionDate,
      inspectionDateFormatted: formatDate(insp.inspectionDate),
      inspectionType: insp.inspectionType,
      inspector: insp.inspector,
      inspectorCompany: insp.inspectorCompany,
      inspectionStandard: insp.inspectionStandard,
      inspectionScope: insp.inspectionScope,
      s4InspectionOrderRef: insp.s4InspectionOrderRef || "",
      s4OrderDeepLink: insp.s4InspectionOrderRef
        ? "#Equipment-change?Order=" + insp.s4InspectionOrderRef
        : "",
      defectCount: defects.length,
      criticalDefects: defects.filter(function (d) { return d.severity >= 3; }).length,
      _rawDefects: defects
    };
  }

  function mapDefect(d) {
    return {
      ID: d.ID,
      defectId: d.defectId,
      defectType: d.defectType,
      bridgeElement: d.bridgeElement,
      severity: d.severity,
      urgency: d.urgency,
      remediationStatus: d.remediationStatus || "Open",
      estimatedRepairCostFormatted: formatCurrency(d.estimatedRepairCost),
      s4SyncStatus: d.s4SyncStatus || "NOT_SYNCED",
      s4NotificationId: d.s4NotificationId || ""
    };
  }

  // ── Scope helper — reads userScopes model set by BridgeDetailExt.js ────────

  function canEdit(host) {
    var view = host;
    while (view && !(view.isA && view.isA("sap.ui.core.mvc.View"))) {
      view = view.getParent && view.getParent();
    }
    if (!view) return false;
    var scopeModel = view.getModel("userScopes");
    return scopeModel ? (scopeModel.getProperty("/canInspect") || false) : false;
  }

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadInspections(host) {
    var model = getModel(host);
    var bridgeId = resolveBridgeId(host);
    if (!bridgeId) return;

    model.setProperty("/busy", true);
    model.setProperty("/isOffline", false);

    try {
      var url = SERVICE + "/Bridges(ID=" + bridgeId + ",IsActiveEntity=true)/inspections"
        + "?$expand=defects"
        + "&$orderby=inspectionDate desc"
        + "&$top=50";

      var resp = await fetch(url);
      if (!resp.ok) throw new Error(resp.statusText);
      var data = await resp.json();
      var inspections = (data.value || []).map(mapInspection);

      model.setProperty("/inspections", inspections);
      model.setProperty("/bridgeId", bridgeId);
      model.setProperty("/canEdit", canEdit(host));
      model.setProperty("/showDefects", false);
      model.setProperty("/selectedDefects", []);
    } catch (e) {
      // Offline / unavailable: show banner with last-known data timestamp
      model.setProperty("/isOffline", true);
      model.setProperty("/offlineText", "Offline — inspection data unavailable (" + new Date().toLocaleTimeString("en-AU") + ")");
    } finally {
      model.setProperty("/busy", false);
    }
  }

  // ── Add Inspection dialog ──────────────────────────────────────────────────

  var _oAddDialog = null;

  function openAddInspectionDialog(host, view) {
    var dialogModel = new JSONModel({
      bridge_ID: resolveBridgeId(host),
      inspectionDate: new Date().toISOString().split("T")[0],
      inspectionType: "RoutineVisual",
      inspector: "",
      inspectorAccreditationNumber: "",
      inspectorAccreditationLevel: "",
      inspectorCompany: "",
      inspectionStandard: "",
      inspectionScope: "Full",
      weatherConditions: "",
      inspectionNotes: ""
    });

    // Dialog lazy-init pattern from CaptureCondition.js:56–63
    if (!_oAddDialog) {
      _oAddDialog = new sap.m.Dialog({
        title: "Add Inspection Record",
        contentWidth: "32rem",
        content: [
          new sap.m.SimpleForm({
            layout: "ColumnLayout",
            editable: true,
            content: [
              new sap.m.Label({ text: "Inspection Date", required: true }),
              new sap.m.DatePicker({ value: "{addInspection>/inspectionDate}", valueFormat: "yyyy-MM-dd", displayFormat: "dd MMM yyyy", width: "100%" }),
              new sap.m.Label({ text: "Inspection Type", required: true }),
              new sap.m.Select({
                selectedKey: "{addInspection>/inspectionType}",
                items: [
                  new sap.ui.core.Item({ key: "RoutineVisual", text: "Routine Visual" }),
                  new sap.ui.core.Item({ key: "Principal", text: "Principal" }),
                  new sap.ui.core.Item({ key: "Underwater", text: "Underwater" }),
                  new sap.ui.core.Item({ key: "Special", text: "Special" }),
                  new sap.ui.core.Item({ key: "Damage", text: "Damage" })
                ],
                width: "100%"
              }),
              new sap.m.Label({ text: "Inspector", required: true }),
              new sap.m.Input({ value: "{addInspection>/inspector}", width: "100%" }),
              new sap.m.Label({ text: "Inspector Company" }),
              new sap.m.Input({ value: "{addInspection>/inspectorCompany}", width: "100%" }),
              new sap.m.Label({ text: "Accreditation Number" }),
              new sap.m.Input({ value: "{addInspection>/inspectorAccreditationNumber}", width: "100%" }),
              new sap.m.Label({ text: "Inspection Standard" }),
              new sap.m.Input({ value: "{addInspection>/inspectionStandard}", placeholder: "e.g. TfNSW-BIM §3.1", width: "100%" }),
              new sap.m.Label({ text: "Scope" }),
              new sap.m.Select({
                selectedKey: "{addInspection>/inspectionScope}",
                items: [
                  new sap.ui.core.Item({ key: "Full", text: "Full" }),
                  new sap.ui.core.Item({ key: "Partial", text: "Partial" }),
                  new sap.ui.core.Item({ key: "Drive-by", text: "Drive-by" })
                ],
                width: "100%"
              }),
              new sap.m.Label({ text: "Weather Conditions" }),
              new sap.m.Input({ value: "{addInspection>/weatherConditions}", width: "100%" }),
              new sap.m.Label({ text: "Notes" }),
              new sap.m.TextArea({ value: "{addInspection>/inspectionNotes}", rows: 3, width: "100%" })
            ]
          })
        ],
        buttons: [
          new sap.m.Button({
            text: "Save",
            type: "Emphasized",
            press: function () {
              saveInspection(host, _oAddDialog.getModel("addInspection").getData())
                .then(function () {
                  _oAddDialog.close();
                  MessageToast.show("Inspection record saved");
                  loadInspections(host);
                })
                .catch(function (e) {
                  MessageBox.error("Could not save inspection: " + e.message);
                });
            }
          }),
          new sap.m.Button({ text: "Cancel", press: function () { _oAddDialog.close(); } })
        ]
      });
      view.addDependent(_oAddDialog);
    }

    _oAddDialog.setModel(dialogModel, "addInspection");
    _oAddDialog.open();
  }

  async function saveInspection(host, data) {
    if (!data.inspectionDate || !data.inspectionType || !data.inspector) {
      throw new Error("Date, Type and Inspector are required.");
    }
    await mutate(SERVICE + "/BridgeInspections", "POST", {
      bridge_ID: Number(data.bridge_ID),
      inspectionDate: data.inspectionDate,
      inspectionType: data.inspectionType,
      inspector: data.inspector,
      inspectorCompany: data.inspectorCompany,
      inspectorAccreditationNumber: data.inspectorAccreditationNumber,
      inspectionStandard: data.inspectionStandard,
      inspectionScope: data.inspectionScope,
      weatherConditions: data.weatherConditions,
      inspectionNotes: data.inspectionNotes
    });
  }

  // ── Public API (bound to core:require namespace) ───────────────────────────

  return {
    onContextChange: function (oEvent) {
      var host = getHost(oEvent.getSource());
      loadInspections(host);
    },

    onRefresh: function (oEvent) {
      var host = getHost(oEvent.getSource());
      loadInspections(host);
    },

    onInspectionSelect: function (oEvent) {
      var host = getHost(oEvent.getSource());
      var model = getModel(host);
      var item = oEvent.getParameter("listItem");
      if (!item) {
        model.setProperty("/showDefects", false);
        model.setProperty("/selectedDefects", []);
        return;
      }
      var ctx = item.getBindingContext("inspectionRegister");
      var rawDefects = ctx ? ctx.getProperty("_rawDefects") : [];
      model.setProperty("/selectedDefects", (rawDefects || []).map(mapDefect));
      model.setProperty("/showDefects", true);
    },

    onAddInspection: function (oEvent) {
      var host = getHost(oEvent.getSource());
      var view = host;
      while (view && !(view.isA && view.isA("sap.ui.core.mvc.View"))) {
        view = view.getParent && view.getParent();
      }
      openAddInspectionDialog(host, view);
    },

    onViewInspection: function (oEvent) {
      // Navigates to BridgeInspectionsDetails ObjectPage for the selected row
      var item = oEvent.getSource().getParent();
      var ctx = item && item.getBindingContext("inspectionRegister");
      if (!ctx) return;
      var inspId = ctx.getProperty("ID");
      var bridgeId = ctx.getProperty("bridge_ID") || resolveBridgeId(getHost(oEvent.getSource()));
      // Use cross-app navigation via FLP if available, otherwise hash navigation
      if (sap.ushell && sap.ushell.Container) {
        sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
          target: { shellHash: "Bridges(ID=" + bridgeId + ",IsActiveEntity=true)/inspections(" + inspId + ",IsActiveEntity=true)" }
        });
      } else {
        window.location.hash = "Bridges(ID=" + bridgeId + ",IsActiveEntity=true)/inspections(" + inspId + ",IsActiveEntity=true)";
      }
    },

    onCapturePhoto: function (oEvent) {
      var host = getHost(oEvent.getSource());
      var bridgeId = resolveBridgeId(host);
      if (!bridgeId) { MessageToast.show("Bridge not loaded — cannot attach photo."); return; }

      // Programmatic file input with camera capture (FileUploader doesn't support capture attr)
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";   // rear camera on mobile/tablet
      input.style.display = "none";
      document.body.appendChild(input);

      input.addEventListener("change", function () {
        if (!input.files || !input.files[0]) {
          document.body.removeChild(input);
          return;
        }
        var file = input.files[0];
        document.body.removeChild(input);

        var reader = new FileReader();
        reader.onload = function (e) {
          var b64 = e.target.result.split(",")[1];
          getCsrfToken().then(function (token) {
            return fetch("/admin-bridges/api/bridges/" + bridgeId + "/attachments", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-csrf-token": token },
              body: JSON.stringify({
                fileName: file.name,
                mediaType: file.type,
                content: b64,
                documentType: "InspectionPhoto"
              })
            });
          }).then(function (resp) {
            if (!resp.ok) throw new Error(resp.statusText);
            MessageToast.show("Photo uploaded successfully.");
          }).catch(function (err) {
            MessageBox.error("Photo upload failed: " + err.message);
          });
        };
        reader.readAsDataURL(file);
      });

      input.click();
    },

    onAddDefect: function (oEvent) {
      MessageToast.show("Defect recording: navigate to Inspection record to add defects.");
    }
  };
});
