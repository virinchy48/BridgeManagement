sap.ui.define([
  'sap/ui/core/mvc/Controller',
  'sap/ui/model/json/JSONModel',
  'sap/m/MessageToast'
], function (Controller, JSONModel, MessageToast) {
  'use strict'

  return Controller.extend('BridgeManagement.useraccess.controller.Main', {

    onInit: function () {
      this._model = new JSONModel({ users: [], filtered: [] })
      this.getView().setModel(this._model)
      this._loadSummary()
      this._loadActivity()
    },

    _loadSummary: function () {
      fetch('/access/api/summary')
        .then(r => r.json())
        .then(data => {
          const view = this.getView()
          view.byId('numTotalUsers').setValue(String(data.totalUsers || 0))
          view.byId('numActiveToday').setValue(String(data.activeToday || 0))
          view.byId('numActiveWeek').setValue(String(data.activeThisWeek || 0))
        })
        .catch(() => {
          MessageToast.show('Could not load access summary.')
        })
    },

    _loadActivity: function () {
      fetch('/access/api/activity')
        .then(r => r.json())
        .then(data => {
          const users = (data.users || []).map(u => this._enrichUser(u))
          this._model.setProperty('/users', users)
          this._model.setProperty('/filtered', users)
          this._updateUserCount(users.length)
        })
        .catch(() => {
          MessageToast.show('Could not load user activity.')
        })
    },

    _enrichUser: function (user) {
      const now = Date.now()
      const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : null
      const diffMs = lastSeen ? now - lastSeen : null

      let lastSeenDisplay = 'Unknown'
      if (diffMs !== null) {
        const minutes = Math.floor(diffMs / 60000)
        const hours = Math.floor(diffMs / 3600000)
        const days = Math.floor(diffMs / 86400000)
        if (minutes < 60) {
          lastSeenDisplay = minutes <= 1 ? 'Just now' : minutes + ' minutes ago'
        } else if (hours < 24) {
          lastSeenDisplay = hours === 1 ? '1 hour ago' : hours + ' hours ago'
        } else {
          lastSeenDisplay = days === 1 ? '1 day ago' : days + ' days ago'
        }
      }

      let activityStatus = 'Inactive'
      let activityState = 'Error'
      if (diffMs !== null) {
        if (diffMs < 86400000) {
          activityStatus = 'Active Today'
          activityState = 'Success'
        } else if (diffMs < 7 * 86400000) {
          activityStatus = 'Active This Week'
          activityState = 'Warning'
        }
      }

      return Object.assign({}, user, {
        lastSeenDisplay: lastSeenDisplay,
        activityStatus: activityStatus,
        activityState: activityState
      })
    },

    onSearch: function (oEvent) {
      const term = (oEvent.getParameter('newValue') || '').toLowerCase().trim()
      const users = this._model.getProperty('/users') || []
      const filtered = term
        ? users.filter(u => (u.userId || '').toLowerCase().includes(term) ||
            (u.displayName || '').toLowerCase().includes(term))
        : users
      this._model.setProperty('/filtered', filtered)
      this._updateUserCount(filtered.length)
    },

    onRefresh: function () {
      this._loadSummary()
      this._loadActivity()
      MessageToast.show('Refreshed.')
    },

    onTilePress: function () {
      // no-op — tiles are informational only
    },

    _updateUserCount: function (count) {
      const countText = this.getView().byId('userCount')
      if (countText) {
        countText.setText(count + ' user' + (count !== 1 ? 's' : ''))
      }
    }
  })
})
