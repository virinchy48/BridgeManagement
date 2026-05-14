sap.ui.define([
  "sap/fe/core/PageController",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (PageController, MessageToast, MessageBox) {
  "use strict";

  var API = "/admin-bridges/api/documents";

  function _getCsrfToken() {
    return fetch(API, { method: "HEAD", credentials: "include", headers: { "X-CSRF-Token": "Fetch" } })
      .then(function (r) { return r.headers.get("x-csrf-token") || "bms-csrf-v1"; })
      .catch(function () { return "bms-csrf-v1"; });
  }

  function _getContext(oEvent) {
    // FE4 header-action press: getSource() may be null — walk component registry
    var src = oEvent && oEvent.getSource && oEvent.getSource();
    var parent = src;
    while (parent) {
      if (parent.getBindingContext) {
        var ctx = parent.getBindingContext();
        if (ctx) return ctx;
      }
      parent = parent.getParent ? parent.getParent() : null;
    }
    var comps = sap.ui.core.Component.registry.all();
    var keys = Object.keys(comps);
    for (var i = 0; i < keys.length; i++) {
      var c = comps[keys[i]];
      var meta = c.getMetadata && c.getMetadata().getName();
      if (meta === "sap.fe.templates.ObjectPage.Component") {
        var root = c.getRootControl && c.getRootControl();
        if (root) {
          var ctx2 = root.getBindingContext && root.getBindingContext();
          if (ctx2) return ctx2;
        }
      }
    }
    return null;
  }

  return PageController.extend("BridgeManagement.adminbridges.ext.controller.BridgeInspectionsExt", {

    onUploadDocument: function (oEvent) {
      var oCtx = _getContext(oEvent);
      if (!oCtx) { MessageToast.show("No record loaded — save the record before uploading documents."); return; }

      var entityId   = oCtx.getProperty("ID");
      var bridge_ID  = oCtx.getProperty("bridge_ID");
      // Detect entity type from context path (e.g. /BridgeInspections(...) or /BridgeDefects(...))
      var path = oCtx.getPath ? oCtx.getPath() : "";
      var linkedEntity = path.indexOf("BridgeDefects") !== -1 ? "BridgeDefects" : "BridgeInspections";

      if (!entityId) { MessageToast.show("Record ID not available — activate the draft first."); return; }

      // Programmatic file input (same pattern as bridge-level attachments)
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip";
      input.style.display = "none";
      document.body.appendChild(input);

      var self = this;
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        document.body.removeChild(input);
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
          var b64 = e.target.result.split(",")[1];
          _getCsrfToken().then(function (token) {
            return fetch(API, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
              body: JSON.stringify({
                linkedEntity: linkedEntity,
                linkedEntityId: entityId,
                bridge_ID: bridge_ID || null,
                title: file.name,
                fileName: file.name,
                mediaType: file.type || "application/octet-stream",
                documentType: "Other",
                contentBase64: b64
              })
            });
          }).then(function (r) { return r.json(); }).then(function (result) {
            if (result.error) { MessageBox.error("Upload failed: " + result.error); return; }
            MessageToast.show("Document uploaded: " + file.name);
            // Refresh the binding so the documents sub-table reloads
            var model = self.getView && self.getView() && self.getView().getModel();
            if (model && model.refresh) model.refresh();
          }).catch(function (err) {
            MessageBox.error("Upload error: " + (err.message || "Unknown error"));
          });
        };
        reader.readAsDataURL(file);
      });

      input.click();
    },

    onOpenBatchElementEntry: function () {
      MessageToast.show("Batch element entry is not yet available in this release.");
    }

  });
});
