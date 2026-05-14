sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Input",
  "sap/m/TextArea",
  "sap/m/Button",
  "sap/m/VBox",
  "sap/m/Label"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Input, TextArea, Button, VBox, Label) {
  "use strict"

  const ENTITY_LABELS = {
    AssetClasses: "Asset Classes",
    States: "States",
    Regions: "Regions",
    StructureTypes: "Structure Types",
    DesignLoads: "Design Loads",
    PostingStatuses: "Posting Statuses",
    CapacityStatuses: "Capacity Statuses",
    ConditionStates: "Condition States",
    ScourRiskLevels: "Scour Risk Levels",
    PbsApprovalClasses: "PBS Approval Classes",
    ConditionSummaries: "Condition Summaries",
    StructuralAdequacyTypes: "Structural Adequacy Types",
    RestrictionTypes: "Restriction Types",
    RestrictionStatuses: "Restriction Statuses",
    VehicleClasses: "Vehicle Classes",
    RestrictionCategories: "Restriction Categories",
    RestrictionUnits: "Restriction Units",
    RestrictionDirections: "Restriction Directions",
    InspectionTypes: "Inspection Types",
    ConditionTrends: "Condition Trends",
    SurfaceTypes: "Surface Types",
    SubstructureTypes: "Substructure Types",
    FoundationTypes: "Foundation Types",
    WaterwayTypes: "Waterway Types",
    FatigueDetailCategories: "Fatigue Detail Categories",
    DefectCodes: "Defect Codes",
    ProvisionTypes: "Provision Types",
    RepairsProposalTypes: "Repairs Proposal Types"
  }

  // Entities that use `description` instead of `name`/`descr` (not sap.common.CodeList standard)
  const DESCRIPTION_FIELD_ENTITIES = new Set(["DefectCodes", "ProvisionTypes", "RepairsProposalTypes"])


  const BASE = "/odata/v4/admin"

  return Controller.extend("BridgeManagement.bmsadmin.controller.LookupValues", {

    onInit: function () {
      this._model = new JSONModel({
        entities: Object.entries(ENTITY_LABELS).map(([name, label]) => ({ name, label })),
        rows: [],
        allRows: [],
        entity: "",
        showInactive: false,
        busy: false
      })
      this.getView().setModel(this._model, "lookup")
      this._csrfToken = null
      this._searchTerm = ""
    },

    onNavBack: function () {
      sap.ui.core.UIComponent.getRouterFor(this).navTo("changeDocuments")
    },

    onEntityChange: function (oEvent) {
      var entity = oEvent.getSource().getSelectedKey()
      this._model.setProperty("/entity", entity)
      this._model.setProperty("/rows", [])
      this._model.setProperty("/allRows", [])
      this._searchTerm = ""
      if (entity) this._loadValues(entity)
    },

    onShowInactiveChange: function () {
      this._applyFilter()
    },

    onSearch: function (oEvent) {
      this._searchTerm = oEvent.getParameter("query") || ""
      this._applyFilter()
    },

    _applyFilter: function () {
      var allRows = this._model.getProperty("/allRows")
      var showInactive = this._model.getProperty("/showInactive")
      var search = (this._searchTerm || "").toLowerCase()
      var filtered = allRows.filter(function (r) {
        if (!showInactive && !r.active) return false
        if (search && !r.code.toLowerCase().includes(search) && !(r.label || "").toLowerCase().includes(search)) return false
        return true
      })
      this._model.setProperty("/rows", filtered)
    },

    _loadValues: async function (entity) {
      this._model.setProperty("/busy", true)
      try {
        var resp = await fetch(BASE + "/" + entity + "?$orderby=code asc")
        if (!resp.ok) throw new Error(await resp.text())
        var data = await resp.json()
        var rows = (data.value || []).map(function (r) {
          return {
            code: r.code,
            label: r.name || r.description || r.code,
            descr: r.descr || "",
            active: r.active !== false
          }
        })
        this._model.setProperty("/allRows", rows)
        this._applyFilter()
      } catch (e) {
        MessageBox.error("Failed to load values: " + e.message)
      } finally {
        this._model.setProperty("/busy", false)
      }
    },

    _getCsrfToken: async function () {
      if (this._csrfToken) return this._csrfToken
      var resp = await fetch(BASE + "/", { method: "HEAD", headers: { "X-CSRF-Token": "Fetch" } })
      this._csrfToken = resp.headers.get("X-CSRF-Token") || "unsafe"
      return this._csrfToken
    },

    _patch: async function (entity, code, body) {
      var token = await this._getCsrfToken()
      var resp = await fetch(BASE + "/" + entity + "(code='" + encodeURIComponent(code) + "')", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(body)
      })
      if (!resp.ok) throw new Error(await resp.text())
      return resp.status === 204 ? {} : await resp.json()
    },

    _post: async function (entity, body) {
      var token = await this._getCsrfToken()
      var resp = await fetch(BASE + "/" + entity, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(body)
      })
      if (!resp.ok) throw new Error(await resp.text())
      return await resp.json()
    },

    onDeactivateValue: async function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext("lookup")
      var code = ctx.getProperty("code")
      var entity = this._model.getProperty("/entity")
      MessageBox.confirm('Deactivate "' + code + '" from ' + entity + '?', {
        onClose: async (action) => {
          if (action !== MessageBox.Action.OK) return
          try {
            await this._patch(entity, code, { active: false })
            var allRows = this._model.getProperty("/allRows")
            var row = allRows.find(function (r) { return r.code === code })
            if (row) row.active = false
            this._model.setProperty("/allRows", allRows)
            this._applyFilter()
            MessageToast.show('"' + code + '" deactivated')
          } catch (e) {
            MessageBox.error("Failed: " + e.message)
          }
        }
      })
    },

    onReactivateValue: async function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext("lookup")
      var code = ctx.getProperty("code")
      var entity = this._model.getProperty("/entity")
      try {
        await this._patch(entity, code, { active: true })
        var allRows = this._model.getProperty("/allRows")
        var row = allRows.find(function (r) { return r.code === code })
        if (row) row.active = true
        this._model.setProperty("/allRows", allRows)
        this._applyFilter()
        MessageToast.show('"' + code + '" reactivated')
      } catch (e) {
        MessageBox.error("Failed: " + e.message)
      }
    },

    onAddValue: function () {
      var entity = this._model.getProperty("/entity")
      if (!entity) { MessageToast.show("Select a lookup entity first"); return }
      this._openEditDialog(null, entity)
    },

    onEditValue: function (oEvent) {
      var ctx = oEvent.getSource().getBindingContext("lookup")
      var row = ctx.getObject()
      var entity = this._model.getProperty("/entity")
      this._openEditDialog(row, entity)
    },

    _openEditDialog: function (row, entity) {
      var isNew = !row
      var codeInput = new Input({ value: isNew ? "" : row.code, enabled: isNew, placeholder: "e.g. NSW" })
      var labelInput = new Input({ value: isNew ? "" : row.label, placeholder: "Display name" })
      var descrArea = new TextArea({ value: isNew ? "" : row.descr, placeholder: "Optional description", rows: 2, width: "100%" })

      var dialog = new Dialog({
        title: isNew ? "Add Value to " + entity : 'Edit "' + row.code + '"',
        contentWidth: "30rem",
        content: [
          new VBox({ items: [
            new Label({ text: "Code *", labelFor: codeInput }),
            codeInput,
            new Label({ text: "Label" }),
            labelInput,
            new Label({ text: "Description" }),
            descrArea
          ]}).addStyleClass("sapUiSmallMargin")
        ],
        buttons: [
          new Button({
            text: isNew ? "Add" : "Save",
            type: "Emphasized",
            press: async () => {
              var code = codeInput.getValue().trim()
              var label = labelInput.getValue().trim()
              var descr = descrArea.getValue().trim()
              if (!code) { codeInput.setValueState("Error"); return }
              codeInput.setValueState("None")
              try {
                if (isNew) {
                  var body = { code: code, name: label || code, descr: descr || null, active: true }
                  if (DESCRIPTION_FIELD_ENTITIES.has(entity)) { body.description = label || code; delete body.name; delete body.descr }
                  await this._post(entity, body)
                  var allRows = this._model.getProperty("/allRows")
                  allRows.push({ code: code, label: label || code, descr: descr, active: true })
                  this._model.setProperty("/allRows", allRows)
                } else {
                  var setBody = { name: label || row.label, descr: descr || null }
                  if (DESCRIPTION_FIELD_ENTITIES.has(entity)) { setBody.description = label || row.label; delete setBody.name; delete setBody.descr }
                  await this._patch(entity, code, setBody)
                  var allRows = this._model.getProperty("/allRows")
                  var r = allRows.find(function (x) { return x.code === code })
                  if (r) { r.label = label || code; r.descr = descr }
                  this._model.setProperty("/allRows", allRows)
                }
                this._applyFilter()
                MessageToast.show(isNew ? '"' + code + '" added' : '"' + code + '" updated')
                dialog.close()
              } catch (e) {
                MessageBox.error("Failed: " + e.message)
              }
            }
          }),
          new Button({ text: "Cancel", press: function () { dialog.close() } })
        ],
        afterClose: function () { dialog.destroy() }
      })
      this.getView().addDependent(dialog)
      dialog.open()
    },

    onShowHelp: function () {
      var sHtml = [
        "<p><strong>Purpose:</strong> Lookup values are the dropdown options that appear throughout BMS forms — for example, the list of restriction types, ",
        "defect categories, structure types, and material codes.</p>",
        "<p><strong>How to use:</strong> Select an entity type from the dropdown (e.g. Structure Types). The table shows all the current values for that lookup. ",
        "Each value has a Code (stored in the database), a Label (shown to users), and an optional Description.</p>",
        "<p><strong>Adding a value:</strong> Click Add Value, enter the code, label, and description, then click Save.</p>",
        "<p><strong>Deactivating a value:</strong> Click the Deactivate button on any row to hide that option from forms. ",
        "The value is not deleted — it remains on existing records but will not appear in new dropdowns.</p>",
        "<p><strong>Reactivating a value:</strong> Click Reactivate to restore a previously deactivated option.</p>",
        "<p><strong>Important:</strong> Do not change the Code of an existing lookup value. Codes are stored on bridge and restriction records — ",
        "changing a code can make existing records appear with a blank field.</p>"
      ].join("");
      this._openInfoDialog("Lookup Values — Help", sHtml);
    },

    _openInfoDialog: function (title, html) {
      this.byId("infoDialog").setTitle(title);
      this.byId("infoDialogHtml").setHtmlText(html);
      this.byId("infoDialog").open();
    },

    onInfoDialogClose: function () {
      this.byId("infoDialog").close();
    }
  })
})
