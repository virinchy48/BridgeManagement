(function () {
    var SERVICE  = "/odata/v4/admin";
    var APP_PATH = "/admin-bridges/webapp";
    var MAP_APP  = "";  // set to "/map-view/webapp/index.html" when deployed

    var LEAFLET = APP_PATH + "/lib/leaflet";
    var STATUS_COLOR = {
        Unrestricted: "#107e3e",
        Restricted:   "#e9730c",
        "Under Review": "#c35500",
        Closed:        "#bb0000"
    };
    var _map = null;

    function getId() {
        // Bridge.ID is an Integer — hash looks like: /Bridges(ID=42,IsActiveEntity=true)
        var m = (window.location.hash || "").match(/Bridges\(ID=(\d+)/);
        return m ? m[1] : null;
    }

    window._gisInit = function () {
        var el = document.getElementById("gisMapCanvas");
        if (!el) return;
        var id = getId();
        if (!id) { setCoord("No bridge ID in URL"); return; }
        fetch(SERVICE + "/Bridges(ID=" + id + ",IsActiveEntity=true)" +
              "?$select=latitude,longitude,bridgeName,bridgeId,state,postingStatus")
            .then(function (r) { return r.json(); })
            .then(draw)
            .catch(function (e) { setCoord("Error: " + e.message); });
    };

    function draw(d) {
        var lat = parseFloat(d.latitude), lng = parseFloat(d.longitude);
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
            var map = window.L.map(canv, { zoomControl: true, scrollWheelZoom: false });
            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                { attribution: "\u00a9 OpenStreetMap", maxZoom: 19 }).addTo(map);
            var colour = STATUS_COLOR[d.postingStatus] || "#0a6ed1";
            window.L.circleMarker([lat, lng],
                { radius: 10, color: "#fff", weight: 2, fillColor: colour, fillOpacity: 0.9 })
                .bindPopup("<b>" + (d.bridgeName || "") + "</b><br><small>" +
                           (d.bridgeId || "") + " \u00b7 " + (d.state || "") + "</small>")
                .addTo(map);
            map.setView([lat, lng], 14);
            _map = map;
        });
    }

    function loadLeaflet(cb) {
        if (window.L) { cb(); return; }
        if (!document.getElementById("_gis_css")) {
            var l = document.createElement("link");
            l.id = "_gis_css"; l.rel = "stylesheet"; l.href = LEAFLET + "/leaflet.css";
            document.head.appendChild(l);
        }
        var s = document.createElement("script");
        s.src = LEAFLET + "/leaflet.js";
        s.onload = function () {
            if (window.L && window.L.Icon && window.L.Icon.Default)
                window.L.Icon.Default.mergeOptions({
                    iconUrl:       LEAFLET + "/images/marker-icon.png",
                    iconRetinaUrl: LEAFLET + "/images/marker-icon-2x.png",
                    shadowUrl:     LEAFLET + "/images/marker-shadow.png"
                });
            cb();
        };
        s.onerror = function () {
            var s2 = document.createElement("script");
            s2.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            s2.onload = cb;
            document.head.appendChild(s2);
        };
        document.head.appendChild(s);
    }

    function setCoord(html) {
        var e = document.getElementById("gisCoordBar");
        if (e) e.innerHTML = "\uD83D\uDCCD " + html;
    }

    window._gisOpen = function () {
        var id = getId();
        if (id && MAP_APP) {
            window.open(MAP_APP + "?highlightId=" + encodeURIComponent(id), "_blank", "noopener,noreferrer");
        } else if (id) {
            // Fiori shell hash navigation fallback
            window.location.hash = "Map-display?bridgeId=" + id;
        }
    };

    window._gisCopy = function () {
        var id = getId();
        if (!id) return;
        fetch(SERVICE + "/Bridges(ID=" + id + ",IsActiveEntity=true)?$select=latitude,longitude")
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.latitude && d.longitude) {
                    var t = d.latitude + ", " + d.longitude;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(t).then(function () {
                            try { sap.m.MessageToast.show("Copied: " + t); } catch (e) {}
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
