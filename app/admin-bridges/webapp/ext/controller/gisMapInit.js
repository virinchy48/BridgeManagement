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

    function getBridgeKeyPredicate() {
        // Bridge.ID is an Integer — hash looks like: /Bridges(ID=42,IsActiveEntity=false)
        var bridgeKeyMatch = (window.location.hash || "").match(/Bridges\(ID=(\d+),IsActiveEntity=(true|false)\)/);
        if (!bridgeKeyMatch) return null;
        return "ID=" + bridgeKeyMatch[1] + ",IsActiveEntity=" + bridgeKeyMatch[2];
    }

    function getId() {
        var bridgeKeyMatch = (window.location.hash || "").match(/Bridges\(ID=(\d+)/);
        return bridgeKeyMatch ? bridgeKeyMatch[1] : null;
    }

    function readBridge(select) {
        var keyPredicate = getBridgeKeyPredicate();
        if (!keyPredicate) return Promise.reject(new Error("No bridge ID in URL"));
        return fetch(SERVICE + "/Bridges(" + keyPredicate + ")?$select=" + select)
            .then(function (bridgeResponse) {
                if (!bridgeResponse.ok) throw new Error("Bridge location is not available for this draft.");
                return bridgeResponse.json();
            });
    }

    window._gisInit = function () {
        var el = document.getElementById("gisMapCanvas");
        if (!el) return;
        if (!getBridgeKeyPredicate()) { setCoord("No bridge ID in URL"); return; }
        readBridge("latitude,longitude,bridgeName,bridgeId,state,postingStatus")
            .then(draw)
            .catch(function (error) { setCoord("Error: " + error.message); });
    };

    function draw(bridgeLocation) {
        var lat = parseFloat(bridgeLocation.latitude), lng = parseFloat(bridgeLocation.longitude);
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
            if (_map) { try { _map.remove(); } catch (error) {} _map = null; }
            var map = window.L.map(canv, { zoomControl: true, scrollWheelZoom: false });
            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                { attribution: "\u00a9 OpenStreetMap", maxZoom: 19 }).addTo(map);
            var colour = STATUS_COLOR[bridgeLocation.postingStatus] || "#0a6ed1";
            window.L.circleMarker([lat, lng],
                { radius: 10, color: "#fff", weight: 2, fillColor: colour, fillOpacity: 0.9 })
                .bindPopup("<b>" + (bridgeLocation.bridgeName || "") + "</b><br><small>" +
                           (bridgeLocation.bridgeId || "") + " \u00b7 " + (bridgeLocation.state || "") + "</small>")
                .addTo(map);
            map.setView([lat, lng], 14);
            _map = map;
        });
    }

    function loadLeaflet(cb) {
        if (window.L) { cb(); return; }
        if (!document.getElementById("_gis_css")) {
            var leafletStylesheet = document.createElement("link");
            leafletStylesheet.id = "_gis_css"; leafletStylesheet.rel = "stylesheet"; leafletStylesheet.href = LEAFLET + "/leaflet.css";
            document.head.appendChild(leafletStylesheet);
        }
        var leafletScript = document.createElement("script");
        leafletScript.src = LEAFLET + "/leaflet.js";
        leafletScript.onload = function () {
            if (window.L && window.L.Icon && window.L.Icon.Default)
                window.L.Icon.Default.mergeOptions({
                    iconUrl:       LEAFLET + "/images/marker-icon.png",
                    iconRetinaUrl: LEAFLET + "/images/marker-icon-2x.png",
                    shadowUrl:     LEAFLET + "/images/marker-shadow.png"
                });
            cb();
        };
        leafletScript.onerror = function () {
            var fallbackLeafletScript = document.createElement("script");
            fallbackLeafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            fallbackLeafletScript.onload = cb;
            document.head.appendChild(fallbackLeafletScript);
        };
        document.head.appendChild(leafletScript);
    }

    function setCoord(html) {
        var coordinateBar = document.getElementById("gisCoordBar");
        if (coordinateBar) coordinateBar.innerHTML = "\uD83D\uDCCD " + html;
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
        if (!getBridgeKeyPredicate()) return;
        readBridge("latitude,longitude")
            .then(function (bridgeLocation) {
                if (bridgeLocation.latitude && bridgeLocation.longitude) {
                    var bridgeCoordinates = bridgeLocation.latitude + ", " + bridgeLocation.longitude;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(bridgeCoordinates).then(function () {
                            try { sap.m.MessageToast.show("Copied: " + bridgeCoordinates); } catch (error) {}
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
