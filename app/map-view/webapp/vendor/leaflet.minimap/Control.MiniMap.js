(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['leaflet'], factory);
  } else if (typeof module !== 'undefined') {
    module.exports = factory(require('leaflet'));
  } else {
    factory(window.L);
  }
}(function (L) {
  'use strict';

  var MiniMap = L.Control.extend({
    options: {
      position: 'bottomright',
      width: 150,
      height: 120,
      zoomLevelOffset: -5,
      zoomAnimation: false,
      toggleDisplay: true,
      minimized: false,
      aimingRectOptions: { color: '#ef4444', weight: 2, fill: false, opacity: 0.8 },
      strings: { hideText: '▼', showText: '▲' }
    },

    initialize: function (layer, options) {
      L.Util.setOptions(this, options);
      this._layer = layer;
    },

    onAdd: function (map) {
      this._mainMap = map;
      this._container = L.DomUtil.create('div', 'leaflet-control-minimap');
      this._container.style.cssText = [
        'width:' + this.options.width + 'px',
        'height:' + this.options.height + 'px',
        'background:#fff',
        'border:2px solid rgba(0,0,0,0.2)',
        'border-radius:4px',
        'overflow:hidden',
        'position:relative',
        'box-shadow:0 2px 8px rgba(0,0,0,0.15)'
      ].join(';');

      this._mapDiv = L.DomUtil.create('div', '', this._container);
      this._mapDiv.style.cssText = 'width:100%;height:100%';

      if (this.options.toggleDisplay) {
        this._toggle = L.DomUtil.create('a', 'leaflet-control-minimap-toggle', this._container);
        this._toggle.href = '#';
        this._toggle.title = 'Toggle minimap';
        this._toggle.style.cssText = [
          'position:absolute', 'bottom:2px', 'right:2px',
          'width:18px', 'height:18px',
          'background:rgba(255,255,255,0.9)',
          'border:1px solid #ccc',
          'border-radius:3px',
          'text-align:center',
          'line-height:16px',
          'font-size:10px',
          'cursor:pointer',
          'text-decoration:none',
          'color:#333',
          'z-index:999'
        ].join(';');
        this._toggle.innerHTML = this.options.strings.hideText;
        L.DomEvent.on(this._toggle, 'click', this._toggleMap, this);
      }

      L.DomEvent.disableClickPropagation(this._container);
      L.DomEvent.disableScrollPropagation(this._container);

      return this._container;
    },

    addTo: function (map) {
      L.Control.prototype.addTo.call(this, map);
      this._miniMap = new L.Map(this._mapDiv, {
        attributionControl: false,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: false
      });

      this._layer.addTo(this._miniMap);
      this._aimingRect = L.rectangle(this._mainMap.getBounds(), this.options.aimingRectOptions).addTo(this._miniMap);
      this._mainMap.on('moveend', this._onMainMapMoved, this);
      this._onMainMapMoved();
      return this;
    },

    onRemove: function () {
      if (this._miniMap) {
        this._miniMap.remove();
      }
      if (this._mainMap) {
        this._mainMap.off('moveend', this._onMainMapMoved, this);
      }
    },

    _onMainMapMoved: function () {
      if (!this._miniMap) return;
      var zoom = Math.max(1, this._mainMap.getZoom() + this.options.zoomLevelOffset);
      this._miniMap.setView(this._mainMap.getCenter(), zoom);
      this._aimingRect.setBounds(this._mainMap.getBounds());
    },

    _toggleMap: function (e) {
      L.DomEvent.stop(e);
      if (this._mapDiv.style.display === 'none') {
        this._mapDiv.style.display = '';
        this._container.style.width = this.options.width + 'px';
        this._container.style.height = this.options.height + 'px';
        this._toggle.innerHTML = this.options.strings.hideText;
        if (this._miniMap) { this._miniMap.invalidateSize(); this._onMainMapMoved(); }
      } else {
        this._mapDiv.style.display = 'none';
        this._container.style.width = '24px';
        this._container.style.height = '24px';
        this._toggle.innerHTML = this.options.strings.showText;
      }
    }
  });

  L.Control.MiniMap = MiniMap;
  L.control.minimap = function (layer, options) { return new MiniMap(layer, options); };
  return MiniMap;
}));
