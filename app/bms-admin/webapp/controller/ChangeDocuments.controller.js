sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  var FIELD_LABELS = {
    bridgeId: "Bridge ID", bridgeName: "Bridge Name", state: "State", region: "Region",
    lga: "LGA", route: "Route", routeNumber: "Route Number", location: "Location",
    latitude: "Latitude", longitude: "Longitude",
    assetClass: "Asset Class", assetOwner: "Asset Owner", managingAuthority: "Managing Authority",
    structureType: "Structure Type", material: "Material", yearBuilt: "Year Built",
    designLoad: "Design Load", designStandard: "Design Standard", spanCount: "Span Count",
    spanLength: "Span Length (m)", totalLength: "Total Length (m)", deckWidth: "Deck Width (m)",
    clearanceHeight: "Clearance Height (m)", numberOfLanes: "Number of Lanes",
    condition: "Condition", conditionRating: "Condition Rating", conditionStandard: "Condition Standard",
    conditionSummary: "Condition Summary", conditionAssessor: "Assessed By",
    conditionReportRef: "Report Reference", conditionNotes: "Condition Notes",
    structuralAdequacy: "Structural Adequacy", structuralAdequacyRating: "Structural Adequacy Rating",
    postingStatus: "Posting Status", status: "Status", scourRisk: "Scour Risk",
    lastInspectionDate: "Last Inspection Date", seismicZone: "Seismic Zone",
    scourDepthLastMeasured: "Scour Depth Last Measured (m)",
    floodImmunityAriYears: "Flood Immunity ARI (years)", floodImpacted: "Flood Impacted",
    highPriorityAsset: "High Priority Asset", asBuiltDrawingReference: "As-Built Drawing Reference",
    remarks: "Remarks",
    nhvrAssessed: "NHVR Assessed", nhvrAssessmentDate: "NHVR Assessment Date",
    nhvrReferenceUrl: "NHVR Reference URL", loadRating: "Load Rating (t)",
    pbsApprovalClass: "PBS Approval Class", importanceLevel: "Importance Level",
    averageDailyTraffic: "Average Daily Traffic (ADT)",
    heavyVehiclePercent: "Heavy Vehicle Percentage (%)", gazetteReference: "Gazette Reference",
    freightRoute: "Freight Route", overMassRoute: "Over Mass Route",
    hmlApproved: "HML Approved", bDoubleApproved: "B-Double Approved",
    dataSource: "Data Source", sourceReferenceUrl: "Source Reference URL",
    openDataReference: "Open Data Reference", sourceRecordId: "Source Record ID", isActive: "Active",
    restrictionRef: "Reference", bridgeRef: "Bridge Reference", bridge_ID: "Bridge",
    restrictionCategory: "Category", restrictionType: "Restriction Type",
    restrictionValue: "Value", restrictionUnit: "Unit", restrictionStatus: "Status",
    active: "Active", temporary: "Temporary", appliesToVehicleClass: "Applies to Vehicle Class",
    direction: "Direction", effectiveFrom: "Effective From", effectiveTo: "Effective To",
    grossMassLimit: "Gross Mass Limit (t)", axleMassLimit: "Axle Mass Limit (t)",
    heightLimit: "Height Limit (m)", widthLimit: "Width Limit (m)", lengthLimit: "Length Limit (m)",
    speedLimit: "Speed Limit (km/h)", permitRequired: "Permit Required", escortRequired: "Escort Required",
    approvedBy: "Approved By", approvalReference: "Approval Reference",
    legalReference: "Gazette / Legal Reference", issuingAuthority: "Issuing Authority",
    enforcementAuthority: "Enforcement Authority",
    temporaryFrom: "Temporary From", temporaryTo: "Temporary To", temporaryReason: "Temporary Reason",
    name: "Name", descr: "Description",
    capacityType: "Capacity Type", capacityStatus: "Capacity Status", ratingMethod: "Rating Method",
    ratingFactor: "Rating Factor", minClearancePosted: "Min. Clearance Posted",
    grossCombined: "Gross Combined (t)", steerAxleLimit: "Steer Axle Limit (t)",
    singleAxleLimit: "Single Axle Limit (t)", tandemGroupLimit: "Tandem Group Limit (t)",
    triAxleGroupLimit: "Tri-Axle Group Limit (t)", lane1Clearance: "Lane 1 Clearance (m)",
    lane2Clearance: "Lane 2 Clearance (m)", carriagewayWidth: "Carriageway Width (m)",
    trafficableWidth: "Trafficable Width (m)", laneWidth: "Lane Width (m)",
    consumedLife: "Consumed Life (%)", designLife: "Design Life (years)", pbsClass: "PBS Class",
    assessmentDate: "Assessment Date", assessmentType: "Assessment Type", assessor: "Assessor",
    scourCriticalDepth: "Scour Critical Depth (m)", currentScourDepth: "Current Scour Depth (m)",
    floodClosureLevel: "Flood Closure Level (m)", measuredDepth: "Measured Scour Depth (m)",
    notes: "Notes",
    ID: "Record ID", createdAt: "Created At", createdBy: "Created By",
    modifiedAt: "Modified At", modifiedBy: "Modified By"
  };

  function fmtDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  }

  function objectTypeState(type) {
    switch ((type || "").toLowerCase()) {
      case "bridge":            return "Success";
      case "restriction":       return "Warning";
      case "bridgerestriction": return "Warning";
      case "bridgecapacity":    return "Information";
      case "scourassessment":   return "Information";
      default:                  return "None";
    }
  }

  function sourceState(source) {
    switch ((source || "").toLowerCase()) {
      case "odata":      return "Success";
      case "massedit":   return "Warning";
      case "massupload": return "Error";
      default:           return "None";
    }
  }

  return Controller.extend("BridgeManagement.bmsadmin.controller.ChangeDocuments", {

    onInit: function () {
      this._s1Model = new JSONModel({ items: [] });
      this._s2Model = new JSONModel({ items: [] });
      this.getView().setModel(this._s1Model, "s1");
      this.getView().setModel(this._s2Model, "s2");
      this._rawRows      = [];
      this._activeBatchKey = null;
    },

    // ── Section 1: Record Changes ─────────────────────────────────────────

    onSearchRecords: function () {
      var view = this.getView();
      view.setBusy(true);
      this._activeBatchKey = null;
      this.byId("s2ContextStrip").setVisible(false);

      var params = new URLSearchParams();
      var ot = this.byId("s1ObjectType").getSelectedKey();
      var src = this.byId("s1Source").getSelectedKey();
      var usr = (this.byId("s1User").getValue() || "").trim();
      var from = this.byId("s1DateFrom").getValue();
      var to   = this.byId("s1DateTo").getValue();
      if (ot)   params.set("objectType", ot);
      if (src)  params.set("source", src);
      if (usr)  params.set("user", usr);
      if (from) params.set("from", from);
      if (to)   params.set("to", to);

      fetch("/audit/api/changes?" + params.toString(), { credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          view.setBusy(false);
          var rows = data.changes || [];
          var needle = (this.byId("s1ObjectId").getValue() || "").trim().toLowerCase();
          if (needle) {
            rows = rows.filter(function (r) {
              return (r.objectName || "").toLowerCase().includes(needle) ||
                     (r.objectId   || "").toLowerCase().includes(needle);
            });
          }
          this._rawRows = rows;
          this._renderS1(rows);
          this._s2Model.setProperty("/items", []);
          this.byId("s2Count").setText("");
        }.bind(this))
        .catch(function (err) {
          view.setBusy(false);
          MessageBox.error("Failed to load changes: " + err.message);
        });
    },

    _renderS1: function (rows) {
      var batchMap = new Map();
      rows.forEach(function (r) {
        var key = r.batchId || [r.objectType, r.objectId, r.changedAt, r.changedBy].join("|");
        if (!batchMap.has(key)) {
          batchMap.set(key, {
            batchKey:       key,
            batchId:        r.batchId,
            changedAt:      r.changedAt,
            changedAtDisplay: fmtDate(r.changedAt),
            changedBy:      r.changedBy,
            objectType:     r.objectType,
            objectTypeState: objectTypeState(r.objectType),
            objectName:     r.objectName,
            objectId:       r.objectId,
            fieldCount:     0,
            changeSource:   r.changeSource,
            sourceState:    sourceState(r.changeSource)
          });
        }
        batchMap.get(key).fieldCount++;
      });

      var records = Array.from(batchMap.values()).sort(function (a, b) {
        return (b.changedAt || "").localeCompare(a.changedAt || "");
      });
      this._s1Model.setProperty("/items", records);

      var uniqueUsers = new Set(rows.map(function (r) { return r.changedBy; })).size;
      var lastChange  = records.length ? records[0].changedAtDisplay : "";

      this.byId("s1Count").setText(records.length + " change event(s)  ·  " + rows.length + " field change(s)");
      this.byId("emptyState").setVisible(!records.length);

      this.byId("kpiStrip").setVisible(records.length > 0);
      this.byId("kpiRecords").setNumber(String(records.length));
      this.byId("kpiFields").setNumber(String(rows.length));
      this.byId("kpiUsers").setNumber(String(uniqueUsers));
      this.byId("kpiLastChange").setNumber(lastChange);
    },

    onClearS1: function () {
      this.byId("s1ObjectType").setSelectedKey("");
      this.byId("s1Source").setSelectedKey("");
      this.byId("s1User").setValue("");
      this.byId("s1ObjectId").setValue("");
      this.byId("s1DateFrom").setValue("");
      this.byId("s1DateTo").setValue("");
      this._s1Model.setProperty("/items", []);
      this._rawRows = [];
      this._activeBatchKey = null;
      this.byId("s1Count").setText("");
      this.byId("kpiStrip").setVisible(false);
      this.byId("s2ContextStrip").setVisible(false);
      this._s2Model.setProperty("/items", []);
      this.byId("s2Count").setText("");
      this.byId("emptyState").setVisible(true);
    },

    // ── Section 1 → Section 2 drill-down ─────────────────────────────────

    onRecordPress: function (oEvent) {
      var item = oEvent.getParameter("listItem") || oEvent.getSource();
      var ctx  = item.getBindingContext("s1");
      if (!ctx) return;
      var record = ctx.getObject();
      this._activeBatchKey = record.batchKey;

      var fieldRows = this._rawRows.filter(function (r) {
        var key = r.batchId || [r.objectType, r.objectId, r.changedAt, r.changedBy].join("|");
        return key === record.batchKey;
      });

      this._renderS2(fieldRows);

      this.byId("s2CtxType").setText(record.objectType);
      this.byId("s2CtxType").setState(record.objectTypeState);
      this.byId("s2CtxName").setText(record.objectName || record.objectId);
      this.byId("s2CtxDate").setText("· " + record.changedAtDisplay + "  by  " + record.changedBy);
      this.byId("s2ContextStrip").setVisible(true);
    },

    onClearS1Selection: function () {
      this._activeBatchKey = null;
      this.byId("s2ContextStrip").setVisible(false);
      this._renderS2(this._rawRows);
    },

    // ── Section 2: Attribute Changes ─────────────────────────────────────

    onSearchAttributes: function () {
      if (this._activeBatchKey) {
        var fieldRows = this._rawRows.filter(function (r) {
          var key = r.batchId || [r.objectType, r.objectId, r.changedAt, r.changedBy].join("|");
          return key === this._activeBatchKey;
        }.bind(this));
        this._renderS2(this._applyS2Filters(fieldRows));
      } else {
        this._renderS2(this._applyS2Filters(this._rawRows));
      }
    },

    _applyS2Filters: function (rows) {
      var fieldName = (this.byId("s2FieldName").getValue() || "").trim().toLowerCase();
      var oldVal    = (this.byId("s2OldValue").getValue()  || "").trim().toLowerCase();
      var newVal    = (this.byId("s2NewValue").getValue()  || "").trim().toLowerCase();
      var usr       = (this.byId("s2User").getValue()      || "").trim().toLowerCase();
      var from      = this.byId("s2DateFrom").getValue();
      var to        = this.byId("s2DateTo").getValue();

      return rows.filter(function (r) {
        if (fieldName && !(r.fieldName || "").toLowerCase().includes(fieldName) &&
                         !(FIELD_LABELS[r.fieldName] || "").toLowerCase().includes(fieldName)) return false;
        if (oldVal && !(r.oldValue || "").toLowerCase().includes(oldVal)) return false;
        if (newVal && !(r.newValue || "").toLowerCase().includes(newVal)) return false;
        if (usr    && !(r.changedBy || "").toLowerCase().includes(usr))   return false;
        if (from   && r.changedAt && r.changedAt.slice(0, 10) < from)     return false;
        if (to     && r.changedAt && r.changedAt.slice(0, 10) > to)       return false;
        return true;
      });
    },

    _renderS2: function (rows) {
      var enriched = rows.map(function (r) {
        return {
          changedAt:       r.changedAt,
          changedAtDisplay: fmtDate(r.changedAt),
          changedBy:       r.changedBy,
          objectType:      r.objectType,
          objectName:      r.objectName,
          fieldName:       r.fieldName,
          fieldLabel:      FIELD_LABELS[r.fieldName] || r.fieldName,
          oldValue:        r.oldValue || "",
          newValue:        r.newValue || "",
          changeSource:    r.changeSource,
          sourceState:     sourceState(r.changeSource),
          batchId:         r.batchId
        };
      });
      this._s2Model.setProperty("/items", enriched);
      this.byId("s2Count").setText(enriched.length + " attribute change(s)");
    },

    onClearS2: function () {
      this.byId("s2FieldName").setValue("");
      this.byId("s2OldValue").setValue("");
      this.byId("s2NewValue").setValue("");
      this.byId("s2User").setValue("");
      this.byId("s2DateFrom").setValue("");
      this.byId("s2DateTo").setValue("");
      if (this._activeBatchKey) {
        var fieldRows = this._rawRows.filter(function (r) {
          var key = r.batchId || [r.objectType, r.objectId, r.changedAt, r.changedBy].join("|");
          return key === this._activeBatchKey;
        }.bind(this));
        this._renderS2(fieldRows);
      } else {
        this._renderS2(this._rawRows);
      }
    },

    // ── Refresh ───────────────────────────────────────────────────────────

    onRefresh: function () {
      if (this._rawRows.length) {
        this.onSearchRecords();
      }
    },

    // ── Export ────────────────────────────────────────────────────────────

    onExportCsv: function () {
      var items = this._s2Model.getProperty("/items") || [];
      if (!items.length) {
        items = this._s1Model.getProperty("/items") || [];
        if (!items.length) { MessageToast.show("No data to export."); return; }
        var FIELDS  = ["changedAtDisplay","changedBy","objectType","objectName","objectId","fieldCount","changeSource"];
        var HEADERS = ["Changed At","Changed By","Object Type","Record Name","Record ID","Fields Changed","Source"];
        this._downloadCsv(items, FIELDS, HEADERS, "BMS_RecordChanges");
        return;
      }
      var FIELDS  = ["changedAtDisplay","changedBy","objectType","objectName","fieldLabel","oldValue","newValue","changeSource","batchId"];
      var HEADERS = ["Changed At","Changed By","Object Type","Record Name","Field","Old Value","New Value","Source","Batch ID"];
      this._downloadCsv(items, FIELDS, HEADERS, "BMS_AttributeChanges");
    },

    _downloadCsv: function (items, fields, headers, filename) {
      function esc(v) {
        var s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n") ? '"' + s.replace(/"/g, '""') + '"' : s;
      }
      var csv = [headers.join(",")].concat(items.map(function (row) {
        return fields.map(function (f) { return esc(row[f]); }).join(",");
      })).join("\n");
      var a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
        download: filename + "_" + new Date().toISOString().slice(0, 10) + ".csv"
      });
      a.click();
      URL.revokeObjectURL(a.href);
      MessageToast.show("Export downloaded.");
    },

    // ── Help ──────────────────────────────────────────────────────────────

    onShowHelp: function () {
      var html = [
        "<h4>Overview</h4>",
        "<p>The Change Document Report provides a complete audit trail of every field-level change in BMS.</p>",
        "<h4>Section 1 — Record Changes</h4>",
        "<p>Shows which records were modified. Each row is one <em>change event</em> (a single save operation). ",
        "The <strong>Fields Changed</strong> count shows how many attributes were modified in that event. ",
        "Click any row to load its attribute details in Section 2.</p>",
        "<h4>Section 2 — Attribute Changes</h4>",
        "<p>Shows field-level before and after values. The <strong>Before</strong> column (red) shows the old value; ",
        "<strong>After</strong> (green) shows what it was changed to. ",
        "Use the Section 2 filters to narrow by field name, value content, user, or date — either for the selected record or across all loaded data.</p>",
        "<h4>Change Sources</h4>",
        "<ul><li><strong>OData:</strong> edited in a Fiori form</li>",
        "<li><strong>Mass Edit:</strong> changed via the in-app grid editor</li>",
        "<li><strong>Mass Upload:</strong> imported via CSV or Excel</li></ul>",
        "<h4>Export</h4>",
        "<p>Click <strong>Export</strong> to download Section 2 attribute changes as CSV (or Section 1 record summary if Section 2 is empty).</p>"
      ].join("");
      this._openInfoDialog("Change Document Report — Help", html);
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
