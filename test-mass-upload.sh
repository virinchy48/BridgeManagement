#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test-mass-upload.sh — Test mass create + update for BMS upload endpoints
#
# Usage:
#   ./test-mass-upload.sh                        # run all tests (localhost:4004)
#   ./test-mass-upload.sh --host https://my.app  # run against deployed app
#   ./test-mass-upload.sh --test bridges-only    # run one test
#
# Requires: curl, jq
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${HOST:-http://localhost:4004}"
SVC="$HOST/BridgeManagementService"
DATA_DIR="$(dirname "$0")/repo/db/data"
BRIDGES_CSV="$DATA_DIR/mass-upload-bridges-australia.csv"
RESTRICTIONS_CSV="$DATA_DIR/mass-upload-restrictions-australia.csv"

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --host) HOST="$2"; SVC="$HOST/BridgeManagementService"; shift 2 ;;
        --test) ONLY_TEST="$2"; shift 2 ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
pass() { echo -e "${GREEN}  ✓ PASS${NC}  $1"; }
fail() { echo -e "${RED}  ✗ FAIL${NC}  $1"; FAILED=$((FAILED+1)); }
info() { echo -e "${YELLOW}  →${NC}  $1"; }
header() { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

FAILED=0
PASSED=0

run_test() {
    local name="$1"; local fn="$2"
    if [[ -n "${ONLY_TEST:-}" && "$name" != *"$ONLY_TEST"* ]]; then return; fi
    echo -e "\n  ${BOLD}TEST:${NC} $name"
    if $fn; then pass "$name"; PASSED=$((PASSED+1))
    else fail "$name"; fi
}

# POST an OData action — $1=action $2=JSON body, echoes response
post_action() {
    curl -s -X POST "$SVC/$1" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "$2"
}

# GET an OData entity — $1=path (e.g. "Bridges?\$top=5"), echoes response
get_entity() {
    curl -s "$SVC/$1" -H "Accept: application/json"
}

# ─────────────────────────────────────────────────────────────────────────────
header "1. PRE-FLIGHT — server reachability"

test_server_alive() {
    local resp
    resp=$(curl -s -o /dev/null -w "%{http_code}" "$SVC/Bridges?\$top=1")
    [[ "$resp" == "200" ]] || { info "HTTP $resp — is 'cds watch' running?"; return 1; }
}
run_test "server_alive" test_server_alive

# ─────────────────────────────────────────────────────────────────────────────
header "2. MASS CREATE — upload 56 bridges (first run creates all)"

test_mass_create_bridges() {
    local csv_content
    csv_content=$(cat "$BRIDGES_CSV")

    # Escape for JSON: replace backslash then double-quote then newlines
    local escaped
    escaped=$(printf '%s' "$csv_content" | python3 -c "
import sys, json
print(json.dumps(sys.stdin.read()))
")

    local resp
    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    echo "$resp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
v = d.get('value', d)
print(f'  processed={v[\"processed\"]}  succeeded={v[\"succeeded\"]}  failed={v[\"failed\"]}')
if v['failed'] > 0:
    print('  errors:', v.get('errors','')[:300])
" 2>/dev/null || { info "Response: $(echo "$resp" | head -c 200)"; return 1; }

    local succeeded
    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['succeeded'])" 2>/dev/null || echo "0")
    [[ "$succeeded" -ge 50 ]] || { info "Only $succeeded succeeded — expected ≥50"; return 1; }
}
run_test "mass_create_56_bridges" test_mass_create_bridges

# ─────────────────────────────────────────────────────────────────────────────
header "3. VERIFY CREATED — check bridges exist in DB"

test_verify_nsw_bridges() {
    local resp count
    resp=$(get_entity "Bridges?\$filter=state eq 'NSW'&\$count=true&\$top=1")
    count=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('@odata.count',0))" 2>/dev/null || echo "0")
    info "NSW bridges in DB: $count"
    [[ "$count" -ge 20 ]] || return 1
}
run_test "verify_nsw_bridges_created" test_verify_nsw_bridges

test_verify_specific_bridge() {
    local resp
    resp=$(get_entity "Bridges?\$filter=bridgeId eq 'BRG-NSW-005'")
    local name lat lng struct
    name=$(echo "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0]['name'] if v else 'NOT FOUND')" 2>/dev/null || echo "NOT FOUND")
    lat=$(echo  "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0].get('latitude','') if v else '')" 2>/dev/null || echo "")
    lng=$(echo  "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0].get('longitude','') if v else '')" 2>/dev/null || echo "")
    struct=$(echo "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0].get('structureType','') if v else '')" 2>/dev/null || echo "")
    info "BRG-NSW-005: name='$name'  lat=$lat  lng=$lng  type='$struct'"
    [[ "$name" == "Sydney Harbour Bridge" ]] || return 1
    [[ -n "$lat" ]] || { info "latitude missing — structureType field check: $struct"; return 1; }
    [[ -n "$struct" ]] || { info "structureType not saved — handler mapping issue"; return 1; }
}
run_test "verify_sydney_harbour_bridge_fields" test_verify_specific_bridge

test_verify_hml_flags() {
    local resp count
    resp=$(get_entity "Bridges?\$filter=hmlApproved eq true&\$count=true&\$top=1")
    count=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('@odata.count',0))" 2>/dev/null || echo "0")
    info "Bridges with hmlApproved=true: $count"
    [[ "$count" -ge 15 ]] || return 1
}
run_test "verify_hml_approved_flags_saved" test_verify_hml_flags

# ─────────────────────────────────────────────────────────────────────────────
header "4. MASS UPDATE — re-upload same file (idempotent update test)"

test_mass_update_bridges() {
    local csv_content escaped resp succeeded failed
    csv_content=$(cat "$BRIDGES_CSV")
    escaped=$(printf '%s' "$csv_content" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['succeeded'])" 2>/dev/null || echo "0")
    failed=$(echo "$resp"    | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['failed'])"    2>/dev/null || echo "1")
    info "Re-upload: succeeded=$succeeded  failed=$failed"
    # All should succeed again (idempotent UPDATE path)
    [[ "$succeeded" -ge 50 && "$failed" -eq 0 ]] || return 1
}
run_test "mass_update_idempotent" test_mass_update_bridges

test_version_incremented() {
    local resp version
    resp=$(get_entity "Bridges?\$filter=bridgeId eq 'BRG-NSW-005'&\$select=bridgeId,name,version")
    version=$(echo "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0].get('version','?') if v else '?')" 2>/dev/null || echo "?")
    info "BRG-NSW-005 version after 2 uploads: $version"
    [[ "$version" -ge 2 ]] || return 1
}
run_test "version_incremented_on_update" test_version_incremented

# ─────────────────────────────────────────────────────────────────────────────
header "5. PARTIAL UPDATE — modify a single bridge's condition"

test_partial_condition_update() {
    # Upload a one-row CSV that changes Tasman Bridge to condition=POOR rating=4
    local patch_csv="bridgeId,name,state,conditionRatingTfnsw,conditionRating,condition,postingStatus,latitude,longitude,isActive
BRG-TAS-004,Tasman Bridge,TAS,4,4,POOR,UNDER REVIEW,-42.865000,147.342500,true"

    local escaped resp succeeded
    escaped=$(printf '%s' "$patch_csv" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['succeeded'])" 2>/dev/null || echo "0")
    info "Patch upload: succeeded=$succeeded"
    [[ "$succeeded" -eq 1 ]] || return 1

    # Verify the change
    local cond
    resp=$(get_entity "Bridges?\$filter=bridgeId eq 'BRG-TAS-004'&\$select=bridgeId,conditionRatingTfnsw,postingStatus")
    cond=$(echo "$resp" | python3 -c "import sys,json; v=json.load(sys.stdin)['value']; print(v[0].get('conditionRatingTfnsw','?') if v else '?')" 2>/dev/null || echo "?")
    info "BRG-TAS-004 conditionRatingTfnsw after patch: $cond"
    [[ "$cond" -eq 4 ]] || return 1
}
run_test "partial_update_single_bridge" test_partial_condition_update

# ─────────────────────────────────────────────────────────────────────────────
header "6. VALIDATION — bad rows should fail cleanly (not crash)"

test_validation_missing_name() {
    local bad_csv="bridgeId,name,state,latitude,longitude
BRG-BAD-001,,NSW,-33.86,151.21"
    local escaped resp failed
    escaped=$(printf '%s' "$bad_csv" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    failed=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('failed',0))" 2>/dev/null || echo "0")
    info "Row with missing name: failed=$failed"
    [[ "$failed" -eq 1 ]] || return 1
}
run_test "validation_missing_name_fails" test_validation_missing_name

test_validation_mixed_good_bad() {
    # 3 rows: 1 good, 1 missing name, 1 good — partial success expected
    local mixed_csv="bridgeId,name,state,latitude,longitude
BRG-TEST-001,Test Bridge One,NSW,-33.86,151.21
BRG-TEST-002,,NSW,-33.87,151.22
BRG-TEST-003,Test Bridge Three,NSW,-33.88,151.23"
    local escaped resp succeeded failed
    escaped=$(printf '%s' "$mixed_csv" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('succeeded',0))" 2>/dev/null || echo "0")
    failed=$(echo "$resp"    | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('failed',0))"    2>/dev/null || echo "0")
    info "Mixed batch: succeeded=$succeeded  failed=$failed (expect 2 ok, 1 fail)"
    [[ "$succeeded" -eq 2 && "$failed" -eq 1 ]] || return 1
}
run_test "validation_partial_success_batch" test_validation_mixed_good_bad

# ─────────────────────────────────────────────────────────────────────────────
header "7. MASS CREATE RESTRICTIONS (run after bridges are loaded)"

test_mass_create_restrictions() {
    local csv_content escaped resp succeeded failed
    csv_content=$(cat "$RESTRICTIONS_CSV")
    escaped=$(printf '%s' "$csv_content" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    resp=$(post_action "massUploadRestrictions" "{\"csvData\": $escaped}")
    echo "$resp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
v = d.get('value', d)
print(f'  processed={v[\"processed\"]}  succeeded={v[\"succeeded\"]}  failed={v[\"failed\"]}')
if v['failed'] > 0:
    print('  errors:', v.get('errors','')[:400])
" 2>/dev/null || { info "Response: $(echo "$resp" | head -c 200)"; return 1; }

    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['succeeded'])" 2>/dev/null || echo "0")
    failed=$(echo "$resp"    | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v['failed'])"    2>/dev/null || echo "1")
    # All 26 restrictions should link to bridges uploaded in test 2
    [[ "$succeeded" -ge 24 && "$failed" -eq 0 ]] || { info "succeeded=$succeeded failed=$failed"; return 1; }
}
run_test "mass_create_26_restrictions" test_mass_create_restrictions

test_restriction_bridge_link() {
    # Verify that restrictions are linked to the bridge
    local resp count
    resp=$(get_entity "Bridges?\$filter=bridgeId eq 'BRG-NSW-003'&\$expand=restrictions")
    count=$(echo "$resp" | python3 -c "
import sys, json
v = json.load(sys.stdin).get('value', [])
restr = v[0].get('restrictions', []) if v else []
print(len(restr))
" 2>/dev/null || echo "0")
    info "Hampden Bridge (BRG-NSW-003) restriction count: $count"
    [[ "$count" -ge 2 ]] || return 1
}
run_test "verify_restriction_bridge_link" test_restriction_bridge_link

# ─────────────────────────────────────────────────────────────────────────────
header "8. MASS DOWNLOAD — round-trip check"

test_mass_download() {
    local resp record_count
    resp=$(post_action "massDownloadBridges" '{"state":"NSW"}')
    record_count=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('recordCount',0))" 2>/dev/null || echo "0")
    info "Download NSW bridges: recordCount=$record_count"
    [[ "$record_count" -ge 20 ]] || return 1

    # Verify the downloaded CSV has the right headers
    local csv_data has_struct_type
    csv_data=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('csvData',''))" 2>/dev/null || echo "")
    has_struct_type=$(echo "$csv_data" | head -1 | grep -c "structureType" || echo "0")
    info "Download CSV includes structureType header: $([[ $has_struct_type -gt 0 ]] && echo yes || echo no)"
    [[ "$has_struct_type" -gt 0 ]] || return 1
}
run_test "mass_download_nsw_bridges" test_mass_download

# ─────────────────────────────────────────────────────────────────────────────
header "9. MAP DATA — verify lat/lng present for map display"

test_map_coordinates() {
    local resp
    resp=$(get_entity "Bridges?\$filter=state eq 'NSW' and latitude ne null&\$count=true&\$top=1")
    local count
    count=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('@odata.count',0))" 2>/dev/null || echo "0")
    info "NSW bridges with coordinates: $count"
    [[ "$count" -ge 20 ]] || return 1
}
run_test "map_coordinates_present" test_map_coordinates

# ─────────────────────────────────────────────────────────────────────────────
header "10. CLEANUP — remove test bridges created in test 6"

test_cleanup_test_bridges() {
    local csv_del escaped resp succeeded
    # Upload test bridges with isActive=false to soft-deactivate
    csv_del="bridgeId,name,state,latitude,longitude,isActive
BRG-TEST-001,Test Bridge One,NSW,-33.86,151.21,false
BRG-TEST-003,Test Bridge Three,NSW,-33.88,151.23,false"
    escaped=$(printf '%s' "$csv_del" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
    resp=$(post_action "massUploadBridges" "{\"csvData\": $escaped}")
    succeeded=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('value',d); print(v.get('succeeded',0))" 2>/dev/null || echo "0")
    info "Deactivated $succeeded test bridges"
    [[ "$succeeded" -eq 2 ]] || return 1
}
run_test "cleanup_test_bridges" test_cleanup_test_bridges

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
TOTAL=$((PASSED + FAILED))
if [[ "$FAILED" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}  ALL $TOTAL TESTS PASSED${NC}"
else
    echo -e "${RED}${BOLD}  $FAILED/$TOTAL TESTS FAILED${NC}"
    exit 1
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
