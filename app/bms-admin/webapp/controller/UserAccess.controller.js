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

    onTileInfo: function (oEvent) {
      var sKey = oEvent.getSource().data("tileKey");
      var oInfo = {
        totalUsers: {
          title: "Total Users",
          html: "<p><strong>Total Users</strong> shows the count of all distinct users who have ever made an API call to BMS.</p>" +
                "<p>This includes both active and inactive users. Role assignment is managed in SAP BTP Cockpit.</p>"
        },
        activeToday: {
          title: "Active Today",
          html: "<p><strong>Active Today</strong> counts users who have made at least one API request in the last 24 hours.</p>" +
                "<p>A green indicator means healthy recent usage. This is updated in real time on refresh.</p>"
        },
        activeWeek: {
          title: "Active This Week",
          html: "<p><strong>Active This Week</strong> counts users seen in the last 7 days (but not necessarily today).</p>" +
                "<p>Users active today are also included in this count. Shown in amber to indicate recent but not current activity.</p>"
        }
      };
      var oEntry = oInfo[sKey] || { title: "Info", html: "<p>No additional information available.</p>" };
      this._openInfoDialog(oEntry.title, oEntry.html);
    },

    _updateUserCount: function (count) {
      const userCountText = this.byId("userCount");
      if (userCountText) userCountText.setText(count + " user" + (count !== 1 ? "s" : ""));
    },

    onShowHelp: function () {
      var sHtml = [
        "<h4>Purpose</h4>",
        "<p>This page shows who has accessed BMS and their recent activity: API calls, last seen timestamp, and total action count. ",
        "It is a monitoring view; <strong>role assignment is managed in SAP BTP Cockpit</strong>, not here.</p>",
        "<h4>KPI Tiles</h4>",
        "<ul>",
        "<li><strong>Total Users:</strong> all distinct users who have ever accessed BMS.</li>",
        "<li><strong>Active Today:</strong> users seen in the last 24 hours.</li>",
        "<li><strong>Active This Week:</strong> users seen in the last 7 days.</li>",
        "</ul>",
        "<h4>Activity Table</h4>",
        "<p>The <strong>Recent User Activity</strong> table shows up to 200 users ordered by last seen. Each row shows:</p>",
        "<ul>",
        "<li><strong>User ID:</strong> the SAP BTP identity (email or principal).</li>",
        "<li><strong>Last Seen:</strong> timestamp of their most recent API request.</li>",
        "<li><strong>Last Action Path:</strong> the API endpoint they last accessed.</li>",
        "<li><strong>Total Actions:</strong> total number of API calls recorded for this user.</li>",
        "<li><strong>Status:</strong> Active (seen today), Recent (this week), or Inactive.</li>",
        "</ul>",
        "<h4>Searching</h4>",
        "<p>Use the <strong>Search user</strong> box to filter by User ID in real time. The count updates to show how many users match.</p>",
        "<h4>Note on Role Management</h4>",
        "<p>To grant or revoke BMS access roles, open <strong>SAP BTP Cockpit → Security → Role Collections</strong> and assign the BMS role collections to users or groups.</p>"
      ].join("");
      this._openInfoDialog("User Access & Activity: Help", sHtml);
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
