sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.UserAccess", {

    onInit: function () {
      this._model = new JSONModel({ users: [], filtered: [] });
      this.getView().setModel(this._model);
      this._loadSummary();
      this._loadActivity();
    },

    _loadSummary: function () {
      fetch("/access/api/summary")
        .then(r => r.json())
        .then(data => {
          this.byId("numTotalUsers").setValue(String(data.totalUsers       || 0));
          this.byId("numActiveToday").setValue(String(data.activeToday     || 0));
          this.byId("numActiveWeek").setValue(String(data.activeThisWeek   || 0));
        })
        .catch(() => MessageToast.show("Could not load access summary."));
    },

    _loadActivity: function () {
      fetch("/access/api/activity")
        .then(r => r.json())
        .then(data => {
          const users = (data.users || []).map(u => this._enrichUser(u));
          this._model.setProperty("/users",    users);
          this._model.setProperty("/filtered", users);
          this._updateUserCount(users.length);
        })
        .catch(() => MessageToast.show("Could not load user activity."));
    },

    _enrichUser: function (user) {
      const now     = Date.now();
      const lastMs  = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : null;
      const diffMs  = lastMs ? now - lastMs : null;

      let lastSeenDisplay = "Unknown";
      if (diffMs !== null) {
        const min  = Math.floor(diffMs / 60000);
        const hr   = Math.floor(diffMs / 3600000);
        const days = Math.floor(diffMs / 86400000);
        if      (min  < 60) lastSeenDisplay = min  <= 1 ? "Just now"     : min  + " minutes ago";
        else if (hr   < 24) lastSeenDisplay = hr   === 1 ? "1 hour ago"  : hr   + " hours ago";
        else                lastSeenDisplay = days === 1 ? "1 day ago"   : days + " days ago";
      }

      let activityStatus = "Inactive", activityState = "Error";
      if (diffMs !== null) {
        if      (diffMs < 86400000)      { activityStatus = "Active Today";      activityState = "Success"; }
        else if (diffMs < 7 * 86400000)  { activityStatus = "Active This Week";  activityState = "Warning"; }
      }

      return Object.assign({}, user, { lastSeenDisplay, activityStatus, activityState });
    },

    onSearch: function (oEvent) {
      const term   = (oEvent.getParameter("newValue") || "").toLowerCase().trim();
      const users  = this._model.getProperty("/users") || [];
      const filtered = term
        ? users.filter(u => (u.userId || "").toLowerCase().includes(term) || (u.displayName || "").toLowerCase().includes(term))
        : users;
      this._model.setProperty("/filtered", filtered);
      this._updateUserCount(filtered.length);
    },

    onRefresh: function () {
      this._loadSummary();
      this._loadActivity();
      MessageToast.show("Refreshed.");
    },

    onTilePress: function () { /* informational only */ },

    _updateUserCount: function (count) {
      const t = this.byId("userCount");
      if (t) t.setText(count + " user" + (count !== 1 ? "s" : ""));
    }
  });
});
