(function () {
    var SERVICE  = "/odata/v4/admin";
    var APP_PATH = "/admin-bridges/webapp";

    var LEAFLET = APP_PATH + "/lib/leaflet";
    var STATUS_COLOR = {
        Unrestricted: "#107e3e",
        Restricted:   "#e9730c",
        "Under Review": "#c35500",
        Closed:        "#bb0000"
    };
    var _map = null;
    var _resizeObserver = null;

    function getBridgeKeyPredicate() {
        var m = (window.location.hash || "").match(/Bridges\(ID=(\d+),IsActiveEntity=(true|false)\)/);
        if (!m) return null;
        return "ID=" + m[1] + ",IsActiveEntity=" + m[2];
    }

    function getId() {
        var m = (window.location.hash || "").match(/Bridges\(ID=(\d+)/);
        return m ? m[1] : null;
    }

    function readBridge(select) {
        var keyPredicate = getBridgeKeyPredicate();
        if (!keyPredicate) return Promise.reject(new Error("No bridge ID in URL"));
        return fetch(SERVICE + "/Bridges(" + keyPredicate + ")?$select=" + select)
            .then(function (r) {
                if (!r.ok) throw new Error("Bridge location is not available for this draft.");
                return r.json();
            });
    }

    window._gisInit = function () {
        var el = document.getElementById("gisMapCanvas");
        if (!el) return;
        var openBtn = document.getElementById("gisOpenBtn");
        if (openBtn && !openBtn._bmsWired) { openBtn._bmsWired = true; openBtn.addEventListener("click", window._gisOpen); }
        var copyBtn = document.getElementById("gisCopyBtn");
        if (copyBtn && !copyBtn._bmsWired) { copyBtn._bmsWired = true; copyBtn.addEventListener("click", window._gisCopy); }
        if (!getBridgeKeyPredicate()) { setCoord("No bridge ID in URL"); return; }
        readBridge("latitude,longitude,bridgeName,bridgeId,state,postingStatus")
            .then(draw)
            .catch(function (err) { setCoord("Error: " + err.message); });
    };

    function draw(data) {
        var lat = parseFloat(data.latitude), lng = parseFloat(data.longitude);
        var noEl = document.getElementById("gisNoCoords");
        var canv = document.getElementById("gisMapCanvas");
        if (isNaN(lat) || isNaN(lng)) {
            setCoord("No coordinates for this record");
            if (noEl) noEl.style.display = "flex";
            if (canv) canv.style.display = "none";
            return;
        }
        setCoord("<strong>Lat:</strong> " + lat.toFixed(6) + " &nbsp; <strong>Lng:</strong> " + lng.toFixed(6));
        if (noEl) noEl.style.display = "none";
        if (canv) canv.style.display = "block";
        loadLeaflet(function () {
            if (_map) { try { _map.remove(); } catch (e) {} _map = null; }
            if (_resizeObserver) { try { _resizeObserver.disconnect(); } catch (e) {} _resizeObserver = null; }
            var map = window.L.map(canv, { zoomControl: true, scrollWheelZoom: false });
            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
            var colour = STATUS_COLOR[data.postingStatus] || "#0a6ed1";
            window.L.circleMarker([lat, lng],
                { radius: 10, color: "#fff", weight: 2, fillColor: colour, fillOpacity: 0.9 })
                .bindPopup("<b>" + (data.bridgeName || "") + "</b><br><small>" +
                           (data.bridgeId || "") + " · " + (data.state || "") + "</small>")
                .addTo(map);
            map.setView([lat, lng], 14);
            _map = map;

            // ResizeObserver fires exactly when the container gets non-zero dimensions
            // (FE4 lazy-renders custom sections; container may be 0×0 at Leaflet init time)
            if (typeof ResizeObserver !== "undefined") {
                _resizeObserver = new ResizeObserver(function (entries) {
                    var e = entries[0];
                    if (e && e.contentRect.width > 0 && e.contentRect.height > 0) {
                        if (_map) _map.invalidateSize();
                    }
                });
                _resizeObserver.observe(canv);
            } else {
                // Fallback for browsers without ResizeObserver
                setTimeout(function () { if (_map) _map.invalidateSize(); }, 400);
                setTimeout(function () { if (_map) _map.invalidateSize(); }, 1200);
            }
        });
    }

    function loadLeaflet(cb) {
        if (window.L) { cb(); return; }
        if (!document.getElementById("_gis_css")) {
            var link = document.createElement("link");
            link.id = "_gis_css"; link.rel = "stylesheet"; link.href = LEAFLET + "/leaflet.css";
            document.head.appendChild(link);
        }
        var script = document.createElement("script");
        script.src = LEAFLET + "/leaflet.js";
        script.onload = function () {
            if (window.L && window.L.Icon && window.L.Icon.Default)
                window.L.Icon.Default.mergeOptions({
                    iconUrl:       LEAFLET + "/images/marker-icon.png",
                    iconRetinaUrl: LEAFLET + "/images/marker-icon-2x.png",
                    shadowUrl:     LEAFLET + "/images/marker-shadow.png"
                });
            cb();
        };
        script.onerror = function () {
            var fb = document.createElement("script");
            fb.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            fb.onload = cb;
            document.head.appendChild(fb);
        };
        document.head.appendChild(script);
    }

    function setCoord(html) {
        var bar = document.getElementById("gisCoordBar");
        if (bar) bar.innerHTML = "📍 " + html;
    }

    window._gisOpen = function () {
        var id = getId();
        if (!id) return;
        try {
            var nav = sap.ushell.Container.getService("CrossApplicationNavigation");
            nav.toExternal({ target: { semanticObject: "Map", action: "display" }, params: { bridgeId: id } });
        } catch (e) {
            var base = window.location.origin + window.location.pathname;
            window.location.href = base + "?bridgeId=" + encodeURIComponent(id) + "#Map-display";
        }
    };

    window._gisCopy = function () {
        if (!getBridgeKeyPredicate()) return;
        readBridge("latitude,longitude")
            .then(function (data) {
                if (data.latitude && data.longitude) {
                    var coords = data.latitude + ", " + data.longitude;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(coords).then(function () {
                            try { sap.m.MessageToast.show("Copied: " + coords); } catch (e) {}
                        });
                    }
                }
            });
    };

    window.addEventListener("hashchange", function () {
        if (window.location.hash.indexOf("/Bridges(") !== -1) {
            var el = document.getElementById("gisMapCanvas");
            if (el) { el._gisReady = false; setTimeout(window._gisInit, 600); }
        }
    });

    window._gisInit();
}());
