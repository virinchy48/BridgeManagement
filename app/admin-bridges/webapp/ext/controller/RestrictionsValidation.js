(function () {
    "use strict";

    var NUMERIC_TYPES = ["Mass Limit", "Speed Restriction", "Dimension Limit"];
    var NUMERIC_UNITS = ["km/h", "m", "t"];
    var DECIMAL_PATTERN = /^-?(?:\d+|\d*\.\d*)?$/;

    function getBindingContext(input) {
        try {
            var ctrlId = input.id.replace(/-inner$/, "").replace(/-placeholder$/, "");
            var ctrl = sap.ui.getCore().byId(ctrlId);
            if (ctrl) return ctrl.getBindingContext && ctrl.getBindingContext();
        } catch (e) {}
        return null;
    }

    function requiresNumeric(ctx) {
        if (!ctx) return false;
        var type = ctx.getProperty("restrictionType") || "";
        var unit = ctx.getProperty("restrictionUnit") || "";
        return NUMERIC_TYPES.indexOf(type) !== -1 || NUMERIC_UNITS.indexOf(unit) !== -1;
    }

    function nextValue(input, event) {
        var value = input.value || "";
        var start = input.selectionStart == null ? value.length : input.selectionStart;
        var end   = input.selectionEnd   == null ? value.length : input.selectionEnd;
        return value.slice(0, start) + (event.data || "") + value.slice(end);
    }

    function applyGuard(input) {
        if (input._bmsRestrictionValueGuard) return;
        input._bmsRestrictionValueGuard = true;

        input.addEventListener("beforeinput", function (event) {
            if (!event.data) return;
            if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") return;
            var ctx = getBindingContext(input);
            if (!requiresNumeric(ctx)) return;
            if (!DECIMAL_PATTERN.test(nextValue(input, event))) event.preventDefault();
        });

        input.addEventListener("paste", function (event) {
            var ctx = getBindingContext(input);
            if (!requiresNumeric(ctx)) return;
            var pasted = event.clipboardData && event.clipboardData.getData("text");
            if (pasted == null) return;
            var value = input.value || "";
            var start = input.selectionStart == null ? value.length : input.selectionStart;
            var end   = input.selectionEnd   == null ? value.length : input.selectionEnd;
            var candidate = value.slice(0, start) + pasted + value.slice(end);
            if (DECIMAL_PATTERN.test(candidate)) return;
            event.preventDefault();
        });
    }

    function scan() {
        document.querySelectorAll("input[id*='restrictionValue']").forEach(applyGuard);
    }

    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}());
