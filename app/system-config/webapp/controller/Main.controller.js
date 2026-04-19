sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/IconTabFilter",
  "sap/ui/core/IconColor"
], function (Controller, JSONModel, MessageToast, MessageBox, IconTabFilter) {
  "use strict";

  return Controller.extend("BridgeManagement.systemconfig.controller.Main", {

    onInit: function () {
      this._dirty = new Map();
      this._currentCategory = null;
      this._loadConfigs();
    },

    _loadConfigs: function () {
      var that = this;
      fetch("/system/api/config")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var configs = data.configs || [];
          var model = that.getView().getModel();
          model.setProperty("/configs", configs);

          // Group by category
          var categoryOrder = [];
          var seen = {};
          configs.forEach(function (c) {
            if (!seen[c.category]) {
              seen[c.category] = true;
              categoryOrder.push(c.category);
            }
          });
          model.setProperty("/categories", categoryOrder);

          // Build IconTabBar tabs
          var tabBar = that.byId("categoryTabs");
          tabBar.removeAllItems();
          categoryOrder.forEach(function (cat, idx) {
            var count = configs.filter(function (c) { return c.category === cat; }).length;
            var tab = new IconTabFilter({
              text: cat,
              count: String(count),
              key: cat
            });
            tabBar.addItem(tab);
            if (idx === 0) {
              that._currentCategory = cat;
            }
          });

          // Show first category
          if (categoryOrder.length > 0) {
            tabBar.setSelectedKey(categoryOrder[0]);
            that._filterByCategory(categoryOrder[0]);
          }
        })
        .catch(function (err) {
          MessageToast.show("Failed to load configuration: " + err.message);
        });
    },

    _filterByCategory: function (category) {
      var model = this.getView().getModel();
      var all = model.getProperty("/configs") || [];
      var filtered = all.filter(function (c) { return c.category === category; });
      model.setProperty("/filtered", filtered);
      this._currentCategory = category;
    },

    onCategoryChange: function (oEvent) {
      var key = oEvent.getParameter("selectedKey");
      this._filterByCategory(key);
    },

    formatBoolValue: function (value) {
      return value === "true" || value === "1" || value === true;
    },

    onCheckBoxChange: function (oEvent) {
      var oCheckBox = oEvent.getSource();
      var oContext = oCheckBox.getBindingContext();
      if (!oContext) return;

      var key = oContext.getProperty("configKey");
      var newVal = oEvent.getParameter("selected") ? "true" : "false";

      // Update model
      var model = this.getView().getModel();
      var filtered = model.getProperty("/filtered");
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].configKey === key) {
          filtered[i].value = newVal;
          break;
        }
      }
      model.setProperty("/filtered", filtered);
      this._dirty.set(key, newVal);
      this.byId("saveBtn").setEnabled(true);
    },

    onValueChange: function (oEvent) {
      var oInput = oEvent.getSource();
      var oContext = oInput.getBindingContext();
      if (!oContext) return;

      var key = oContext.getProperty("configKey");
      var newVal = oEvent.getParameter("value");

      this._dirty.set(key, newVal);
      this.byId("saveBtn").setEnabled(true);
    },

    onSaveChanges: function () {
      if (this._dirty.size === 0) {
        MessageToast.show("No changes to save.");
        return;
      }

      var that = this;
      var promises = [];
      this._dirty.forEach(function (value, key) {
        promises.push(
          fetch("/system/api/config/" + encodeURIComponent(key), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: value })
          }).then(function (res) {
            if (!res.ok) {
              return res.json().then(function (e) {
                throw new Error(e.error?.message || "Failed to save " + key);
              });
            }
            return res.json();
          })
        );
      });

      Promise.all(promises)
        .then(function () {
          var count = that._dirty.size;
          that._dirty.clear();
          that.byId("saveBtn").setEnabled(false);
          MessageToast.show(count + " setting(s) saved successfully.");
          // Sync changes back to configs array
          that._loadConfigs();
        })
        .catch(function (err) {
          MessageBox.error("Save failed: " + err.message);
        });
    },

    onResetDefaults: function () {
      var that = this;
      MessageBox.confirm(
        "Reset all settings in the current category to their default values?",
        {
          title: "Reset to Defaults",
          onClose: function (action) {
            if (action !== MessageBox.Action.OK) return;

            var model = that.getView().getModel();
            var filtered = model.getProperty("/filtered") || [];
            var toReset = filtered.filter(function (c) {
              return !c.isReadOnly && c.value !== c.defaultValue;
            });

            if (toReset.length === 0) {
              MessageToast.show("All settings are already at their default values.");
              return;
            }

            var promises = toReset.map(function (c) {
              return fetch("/system/api/config/" + encodeURIComponent(c.configKey), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: c.defaultValue })
              }).then(function (res) {
                if (!res.ok) return res.json().then(function (e) {
                  throw new Error(e.error?.message || "Failed to reset " + c.configKey);
                });
                return res.json();
              });
            });

            Promise.all(promises)
              .then(function () {
                that._dirty.clear();
                that.byId("saveBtn").setEnabled(false);
                MessageToast.show(toReset.length + " setting(s) reset to defaults.");
                that._loadConfigs();
              })
              .catch(function (err) {
                MessageBox.error("Reset failed: " + err.message);
              });
          }
        }
      );
    }
  });
});
