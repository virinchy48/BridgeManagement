sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
  "use strict";

  var _csrfToken = null;

  function getCsrfToken() {
    if (_csrfToken) return Promise.resolve(_csrfToken);
    return fetch("/admin-bridges/api/documents", { method: "HEAD", credentials: "same-origin" })
      .then(function (r) {
        _csrfToken = r.headers.get("x-csrf-token") || r.headers.get("X-CSRF-Token") || "bms-csrf-v1";
        return _csrfToken;
      })
      .catch(function () {
        _csrfToken = "bms-csrf-v1";
        return _csrfToken;
      });
  }

  function mutate(url, method, body) {
    return getCsrfToken().then(function (token) {
      var opts = {
        method: method,
        credentials: "same-origin",
        headers: { "X-CSRF-Token": token }
      };
      if (body !== undefined) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
      return fetch(url, opts);
    });
  }

  function getHost(control) {
    var current = control;
    while (current && !(current.isA && current.isA("sap.m.VBox"))) {
      current = current.getParent && current.getParent();
    }
    return current || control;
  }

  function getModel(host) {
    var model = host.getModel("inspDocs");
    if (!model) {
      model = new JSONModel({ busy: false, inspectionId: null, items: [] });
      host.setModel(model, "inspDocs");
    }
    return model;
  }

  function getInspectionId(host) {
    var ctx = host.getBindingContext && host.getBindingContext();
    if (!ctx) return null;
    var id = ctx.getProperty && ctx.getProperty("ID");
    return id != null ? String(id) : null;
  }

  function formatSize(size) {
    var bytes = Number(size || 0);
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function formatDate(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var result = String(e.target.result || "");
        resolve(result.split(",").pop() || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function loadDocs(host) {
    var model = getModel(host);
    var inspectionId = getInspectionId(host);
    if (!inspectionId) return;

    model.setProperty("/inspectionId", inspectionId);
    model.setProperty("/busy", true);
    try {
      var url = "/admin-bridges/api/documents?linkedEntity=BridgeInspections&linkedEntityId=" + encodeURIComponent(inspectionId);
      var resp = await fetch(url, { credentials: "same-origin" });
      var payload = await resp.json().catch(function () { return { documents: [] }; });
      if (!resp.ok) throw new Error(payload.error || "Failed to load documents");
      var items = (payload.documents || []).map(function (d) {
        return Object.assign({}, d, {
          fileSizeText: formatSize(d.fileSize),
          createdAtText: formatDate(d.createdAt)
        });
      });
      model.setProperty("/items", items);
    } catch (e) {
      MessageBox.error(e.message || "Failed to load documents");
    } finally {
      model.setProperty("/busy", false);
    }
  }

  return {
    onContextChange: function (event) {
      var host = getHost(event.getSource());
      var inspectionId = getInspectionId(host);
      if (!inspectionId) {
        var self = this;
        setTimeout(function () { self.onContextChange(event); }, 600);
        return;
      }
      loadDocs(host);
    },

    onFileChange: async function (event) {
      var uploader = event.getSource();
      var host = getHost(uploader);
      var model = getModel(host);
      var inspectionId = getInspectionId(host) || model.getProperty("/inspectionId");
      if (!inspectionId) {
        MessageBox.error("Cannot determine inspection — please refresh the page.");
        return;
      }

      var files = event.getParameter("files") || [];
      var file = files[0];
      if (!file) {
        var domRef = uploader.getFocusDomRef && uploader.getFocusDomRef();
        if (domRef && domRef.files && domRef.files[0]) file = domRef.files[0];
      }
      if (!file) return;

      model.setProperty("/busy", true);
      try {
        var base64 = await readFileAsBase64(file);
        var body = {
          linkedEntity: "BridgeInspections",
          linkedEntityId: inspectionId,
          fileName: file.name,
          mediaType: file.type || "application/octet-stream",
          fileSize: file.size,
          contentBase64: base64
        };

        var resp = await mutate("/admin-bridges/api/documents", "POST", body);
        var payload = await resp.json().catch(function () { return {}; });
        if (!resp.ok) throw new Error(payload.error || "Upload failed");

        MessageToast.show("Document uploaded successfully");
        await loadDocs(host);
      } catch (e) {
        MessageBox.error(e.message || "Upload failed");
      } finally {
        model.setProperty("/busy", false);
      }
    },

    onDownload: function (event) {
      var item = event.getSource().getBindingContext("inspDocs").getObject();
      if (item.downloadUrl) {
        window.open(item.downloadUrl, "_blank");
      } else if (item.ID) {
        window.open("/admin-bridges/api/documents/" + item.ID + "/content?download=true", "_blank");
      }
    },

    onDelete: function (event) {
      var item = event.getSource().getBindingContext("inspDocs").getObject();
      var host = getHost(event.getSource());
      MessageBox.confirm("Delete '" + item.fileName + "'?", {
        onClose: async function (action) {
          if (action !== MessageBox.Action.OK) return;
          try {
            var resp = await mutate("/admin-bridges/api/documents/" + item.ID, "DELETE");
            if (!resp.ok) throw new Error("Delete failed");
            MessageToast.show("Document deleted");
            await loadDocs(host);
          } catch (e) {
            MessageBox.error(e.message || "Delete failed");
          }
        }
      });
    }
  };
});
