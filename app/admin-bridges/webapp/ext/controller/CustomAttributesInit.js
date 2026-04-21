(function () {
  'use strict';

  var API_BASE = '/attributes/api';
  var OBJECT_TYPE = 'bridge';

  // ── State ────────────────────────────────────────────────────────────────

  var _s = {
    groups: [],          // all groups from config
    values: {},          // flat map key → value
    selectedKey: null,   // internalKey of selected group
    editMode: false,
    loaded: false,
    loadedForId: null,
    searchQuery: ''
  };

  // ── Utilities ─────────────────────────────────────────────────────────────

  function getBridgeId() {
    var m = (window.location.hash || '').match(/Bridges\(ID=(\d+)/);
    return m ? m[1] : null;
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function displayVal(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return String(v);
  }

  function filledCount(group) {
    return (group.attributes || []).filter(function (a) {
      return _s.values[a.internalKey] != null && _s.values[a.internalKey] !== '';
    }).length;
  }

  function hasAnyValue(group) { return filledCount(group) > 0; }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderClassList() {
    var q = _s.searchQuery.toLowerCase();
    var assigned = _s.groups.filter(function (g) { return hasAnyValue(g); });
    var available = _s.groups.filter(function (g) { return !hasAnyValue(g); });
    if (q) {
      var filt = function (g) { return g.name.toLowerCase().indexOf(q) !== -1; };
      assigned = assigned.filter(filt);
      available = available.filter(filt);
    }

    var html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';

    // Search
    html += '<div style="padding:8px 10px;border-bottom:1px solid #e5e5e5">'
          + '<div style="display:flex;align-items:center;background:#f5f6f7;border:1px solid #d9d9d9;border-radius:4px;padding:5px 8px;gap:6px">'
          + '<span style="color:#8696a9;font-size:13px">&#9906;</span>'
          + '<input id="ca-class-search" type="text" placeholder="Search classes…" value="' + esc(_s.searchQuery) + '" '
          + 'style="border:none;background:transparent;font-size:13px;color:#32363a;outline:none;width:100%" '
          + 'oninput="window._caSearch(this.value)"/>'
          + '</div></div>';

    html += '<div style="flex:1;overflow-y:auto;padding:6px 0">';

    // Assigned section
    if (assigned.length) {
      html += '<div style="padding:4px 10px 2px;font-size:11px;font-weight:600;color:#8696a9;text-transform:uppercase;letter-spacing:.06em">Assigned (' + assigned.length + ')</div>';
      assigned.forEach(function (g) { html += renderClassItem(g, true); });
    }

    // Available section
    if (available.length) {
      var label = assigned.length ? 'Available' : 'All Classes';
      html += '<div style="padding:' + (assigned.length ? '10px' : '4px') + ' 10px 2px;font-size:11px;font-weight:600;color:#8696a9;text-transform:uppercase;letter-spacing:.06em">' + label + ' (' + available.length + ')</div>';
      available.forEach(function (g) { html += renderClassItem(g, false); });
    }

    if (!assigned.length && !available.length) {
      html += '<div style="padding:24px 12px;text-align:center;color:#8696a9;font-size:13px">No classes match</div>';
    }

    html += '</div></div>';
    return html;
  }

  function renderClassItem(group, isAssigned) {
    var isSelected = _s.selectedKey === group.internalKey;
    var filled = filledCount(group);
    var total = (group.attributes || []).length;
    var bg = isSelected ? '#e8f1fb' : 'transparent';
    var border = isSelected ? 'border-left:3px solid #0a6ed1' : 'border-left:3px solid transparent';
    return '<div onclick="window._caSelectGroup(\'' + esc(group.internalKey) + '\')" '
         + 'style="cursor:pointer;padding:9px 12px 9px 10px;' + border + ';background:' + bg + ';transition:background .1s">'
         + '<div style="display:flex;align-items:center;gap:6px">'
         + '<span style="flex:1;font-size:13px;font-weight:' + (isSelected ? '600' : '400') + ';color:#32363a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(group.name) + '</span>'
         + (isAssigned
            ? '<span style="font-size:11px;background:#e8f1fb;color:#0a6ed1;border-radius:10px;padding:1px 7px;white-space:nowrap">' + filled + '/' + total + '</span>'
            : '<span style="font-size:11px;color:#c0c0c0">' + total + ' attrs</span>')
         + '</div></div>';
  }

  function renderCharacteristics() {
    if (!_s.selectedKey) {
      return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#8696a9;text-align:center;padding:40px">'
           + '<div style="font-size:36px;margin-bottom:12px">&#9783;</div>'
           + '<div style="font-size:14px;font-weight:600;color:#556b82;margin-bottom:6px">Select a class</div>'
           + '<div style="font-size:13px">Choose a class from the list to view and edit its characteristics.</div>'
           + '</div>';
    }
    var group = _s.groups.find(function (g) { return g.internalKey === _s.selectedKey; });
    if (!group) return '';
    var attrs = group.attributes || [];

    var html = '<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">';

    // Header
    html += '<div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid #e5e5e5;background:#fafafa;flex-shrink:0">'
          + '<div style="flex:1">'
          + '<div style="font-size:15px;font-weight:600;color:#32363a">' + esc(group.name) + '</div>'
          + '<div style="font-size:12px;color:#8696a9;margin-top:1px">' + filledCount(group) + ' of ' + attrs.length + ' characteristics filled</div>'
          + '</div>';
    if (!_s.editMode) {
      html += '<button onclick="window._caEdit()" style="padding:5px 14px;background:#0a6ed1;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer">Edit</button>';
    } else {
      html += '<button onclick="window._caSave()" style="padding:5px 14px;background:#107e3e;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;margin-right:6px">Save</button>'
            + '<button onclick="window._caCancel()" style="padding:5px 14px;background:transparent;color:#0a6ed1;border:1px solid #0a6ed1;border-radius:4px;font-size:13px;cursor:pointer">Cancel</button>';
    }
    html += '</div>';

    // Attributes grid
    html += '<div style="flex:1;overflow-y:auto;padding:16px">';
    if (!attrs.length) {
      html += '<div style="color:#8696a9;font-size:13px">No characteristics defined for this class.</div>';
    } else {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px 24px">';
      attrs.forEach(function (attr) {
        var val = _s.values[attr.internalKey];
        html += '<div>';
        html += '<label style="display:block;font-size:12px;color:#6a7a8b;font-weight:500;margin-bottom:3px">'
              + esc(attr.name)
              + (attr.required ? ' <span style="color:#bb0000">*</span>' : '')
              + (attr.unit ? ' <span style="color:#aaa;font-weight:400">(' + esc(attr.unit) + ')</span>' : '')
              + '</label>';
        if (_s.editMode) {
          html += renderInput(attr, val);
        } else {
          var dv = displayVal(val);
          html += '<div style="font-size:14px;color:' + (dv ? '#32363a' : '#c0c0c0') + ';min-height:20px;padding:4px 0;border-bottom:1px solid #f0f0f0">'
                + (dv ? esc(dv) : '—') + '</div>';
        }
        if (attr.helpText) {
          html += '<div style="font-size:11px;color:#aaa;margin-top:2px">' + esc(attr.helpText) + '</div>';
        }
        html += '<div style="font-size:11px;margin-top:2px">'
              + '<a href="#" onclick="window._caHistory(\'' + esc(attr.internalKey) + '\',\'' + esc(attr.name) + '\');return false;" '
              + 'style="color:#0a6ed1;text-decoration:none">History</a></div>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function renderInput(attr, val) {
    var v = val != null ? val : '';
    var id = 'ca-input-' + attr.internalKey;
    var base = 'id="' + id + '" style="width:100%;padding:6px 8px;border:1px solid #c0c0c0;border-radius:4px;font-size:13px;box-sizing:border-box"';
    if (attr.dataType === 'Boolean') {
      return '<select ' + base + '><option value="">—</option>'
           + '<option value="true"' + (v === true || v === 'true' ? ' selected' : '') + '>Yes</option>'
           + '<option value="false"' + (v === false || v === 'false' ? ' selected' : '') + '>No</option>'
           + '</select>';
    }
    if (attr.dataType === 'SingleSelect') {
      var opts = '<option value="">—</option>';
      (attr.allowedValues || []).forEach(function (av) {
        opts += '<option value="' + esc(av.value) + '"' + (String(v) === av.value ? ' selected' : '') + '>' + esc(av.label || av.value) + '</option>';
      });
      return '<select ' + base + '>' + opts + '</select>';
    }
    if (attr.dataType === 'Date') {
      return '<input type="date" value="' + esc(v) + '" ' + base + '/>';
    }
    if (attr.dataType === 'Integer' || attr.dataType === 'Decimal') {
      return '<input type="number" value="' + esc(v) + '" '
           + (attr.minValue != null ? 'min="' + attr.minValue + '" ' : '')
           + (attr.maxValue != null ? 'max="' + attr.maxValue + '" ' : '')
           + base + '/>';
    }
    return '<input type="text" value="' + esc(v) + '" ' + base + '/>';
  }

  // ── Main render ──────────────────────────────────────────────────────────

  function render() {
    var root = document.getElementById('ca-bridge-root');
    if (!root) return;

    var html = '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;display:flex;height:480px;font-family:72,\'72full\',Arial,Helvetica,sans-serif">'

    // Left: class list
    + '<div style="width:240px;min-width:200px;border-right:1px solid #e5e5e5;display:flex;flex-direction:column;flex-shrink:0;background:#fafafa">'
    + renderClassList()
    + '</div>'

    // Right: characteristics
    + '<div style="flex:1;overflow:hidden;display:flex;flex-direction:column">'
    + renderCharacteristics()
    + '</div>'

    + '</div>';

    root.innerHTML = html;
    root._caPopulated = true;
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  function load(id) {
    var root = document.getElementById('ca-bridge-root');
    if (!root) return;
    root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:120px;color:#8696a9;font-size:13px;font-family:72,Arial,sans-serif">Loading…</div>';
    root._caPopulated = true;

    Promise.all([
      fetch(API_BASE + '/config?objectType=' + OBJECT_TYPE).then(function (r) { return r.json(); }),
      fetch(API_BASE + '/values/' + OBJECT_TYPE + '/' + id).then(function (r) { return r.json(); })
    ]).then(function (results) {
      _s.groups = results[0].groups || [];
      _s.values = results[1].values || {};
      _s.editMode = false;
      _s.loaded = true;
      _s.loadedForId = id;
      // Auto-select first assigned group, or first group
      var assigned = _s.groups.filter(hasAnyValue);
      _s.selectedKey = assigned.length ? assigned[0].internalKey : (_s.groups[0] ? _s.groups[0].internalKey : null);
      render();
    }).catch(function () {
      var r = document.getElementById('ca-bridge-root');
      if (r) { r.innerHTML = '<div style="padding:1rem;color:#bb0000;font-size:13px">Failed to load custom attributes.</div>'; r._caPopulated = true; }
    });
  }

  function collectValues() {
    var group = _s.groups.find(function (g) { return g.internalKey === _s.selectedKey; });
    if (!group) return {};
    var out = {};
    (group.attributes || []).forEach(function (a) {
      var el = document.getElementById('ca-input-' + a.internalKey);
      if (el) out[a.internalKey] = el.value === '' ? null : el.value;
    });
    return out;
  }

  // ── Public handlers ───────────────────────────────────────────────────────

  window._caSelectGroup = function (key) {
    if (_s.editMode) {
      if (!confirm('Discard unsaved changes?')) return;
      _s.editMode = false;
    }
    _s.selectedKey = key;
    render();
  };

  window._caSearch = function (q) {
    _s.searchQuery = q;
    // Re-render only the list panel to avoid wiping edit inputs
    var listEl = document.querySelector('#ca-bridge-root > div > div:first-child');
    if (listEl) listEl.innerHTML = renderClassList();
  };

  window._caEdit = function () { _s.editMode = true; render(); };
  window._caCancel = function () { _s.editMode = false; render(); };

  window._caSave = function () {
    var id = getBridgeId();
    if (!id) return;
    var values = collectValues();
    fetch(API_BASE + '/values/' + OBJECT_TYPE + '/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: values })
    }).then(function (r) { return r.json(); }).then(function (result) {
      if (result.errors) { alert('Validation errors:\n' + result.errors.join('\n')); return; }
      Object.assign(_s.values, values);
      _s.editMode = false;
      render();
      try { sap.m.MessageToast.show('Characteristics saved.'); } catch (_) {}
    }).catch(function () { alert('Failed to save.'); });
  };

  window._caHistory = function (key, label) {
    var id = getBridgeId();
    if (!id) return;
    fetch(API_BASE + '/history/' + OBJECT_TYPE + '/' + id + '/' + key)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rows = data.history || [];
        if (!rows.length) { alert('No history for ' + label); return; }
        var msg = label + ' — Change History\n\n';
        rows.forEach(function (e) {
          var ov = e.oldValueText != null ? e.oldValueText : e.oldValueInteger != null ? e.oldValueInteger : e.oldValueDecimal != null ? e.oldValueDecimal : e.oldValueDate != null ? e.oldValueDate : e.oldValueBoolean != null ? (e.oldValueBoolean ? 'Yes' : 'No') : '—';
          var nv = e.newValueText != null ? e.newValueText : e.newValueInteger != null ? e.newValueInteger : e.newValueDecimal != null ? e.newValueDecimal : e.newValueDate != null ? e.newValueDate : e.newValueBoolean != null ? (e.newValueBoolean ? 'Yes' : 'No') : '—';
          msg += (e.changedAt || '').slice(0, 16).replace('T', ' ') + '  ' + (e.changedBy || '') + '\n  ' + ov + '  →  ' + nv + '\n\n';
        });
        alert(msg);
      });
  };

  window._caInit = function () {
    var id = getBridgeId();
    var root = document.getElementById('ca-bridge-root');
    if (id && root) { load(id); }
  };

  // ── Resilience: re-render when UI5 clears the div ────────────────────────

  var _obs = new MutationObserver(function () {
    var root = document.getElementById('ca-bridge-root');
    if (!root || root._caPopulated) return;
    var id = getBridgeId();
    if (!id) return;
    if (_s.loaded && _s.loadedForId === id) { render(); } else { load(id); }
  });
  _obs.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', function () {
    var id = getBridgeId();
    if (!id) return;
    if (id !== _s.loadedForId) { _s.loaded = false; _s.loadedForId = null; }
    var root = document.getElementById('ca-bridge-root');
    if (root) { root._caPopulated = false; load(id); }
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  (function _boot(n) {
    var id = getBridgeId();
    var root = document.getElementById('ca-bridge-root');
    if (id && root) { load(id); return; }
    if (n < 20) setTimeout(function () { _boot(n + 1); }, 300);
  }(0));

}());
