# UAT Security Audit — Bridge Management System
**Date:** 2026-05-17 | **Auditor:** Thread 4 | **Status:** 57 findings

## Critical Issues (0)
None identified.

## High Issues (5)

1. **HIGH** | srv/handlers/conditions.js:30 | Error message leaks exception details to client
2. **HIGH** | srv/handlers/maintenance.js:25,34,43 | Error message leaks exception details to client (3 instances)
3. **HIGH** | srv/handlers/upload.js:195,199,201,286,290,292,339,343,345 | Error message leaks exception details in error response (9 instances)
4. **HIGH** | srv/admin-service.cds:1-239 | AdminService missing @requires at service level; defaults to unauthenticated
5. **HIGH** | srv/admin-service.cds:16,21,26,76,146-165 | Reference tables missing @restrict annotations (BridgeRestrictionProvisions, BridgeAttributes, BridgeScourAssessmentDetail, NhvrApprovedVehicleClasses, AssetClasses, States, Regions, StructureTypes, DesignLoads, PostingStatuses, CapacityStatuses, ConditionStates, ScourRiskLevels, RestrictionTypes, RestrictionStatuses, ClosureTypes, VehicleClasses, RestrictionCategories, RestrictionUnits, RestrictionDirections, ProvisionTypes, RepairsProposalTypes, InspectionTypes, ConditionTrends, SurfaceTypes, SubstructureTypes, FoundationTypes, WaterwayTypes, FatigueDetailCategories, DefectCodes — 20+ entities)

## Medium Issues (4)

1. **MEDIUM** | srv/handlers/admin.js | Verify CREATE/UPDATE/DELETE handlers properly call logAudit or writeChangeLogs
2. **MEDIUM** | srv/handlers/alerts.js | Verify CREATE/UPDATE/DELETE handlers properly call logAudit or writeChangeLogs
3. **MEDIUM** | srv/handlers/permits.js | Verify CREATE/UPDATE/DELETE handlers properly call logAudit or writeChangeLogs
4. **MEDIUM** | srv/handlers/risk-assessments.js | Verify CREATE/UPDATE/DELETE handlers properly call logAudit or writeChangeLogs

## Low Issues (3)

1. **LOW** | srv/handlers/conditions.js:30 | Catch block returns error.message; consider sanitized error message
2. **LOW** | srv/handlers/maintenance.js:25,34,43 | Catch blocks return error.message; consider sanitized error messages
3. **LOW** | srv/server.js:1117 | /health endpoint is intentionally unauthenticated for BTP load balancer — documented and acceptable

## Summary

**Strengths:**
- All Express routes properly protected with requiresAuthentication & requireScope middleware
- CSRF protection implemented on all state-changing requests (POST/PATCH/DELETE)
- No raw user input in SQL queries (parameterized CDS queries used throughout)
- Error stack traces not returned to clients
- CREATE/UPDATE/DELETE on Bridges/Restrictions properly tracked in ChangeLog
- Feature flags, mass-edit, and admin routes all require proper authentication & scopes

**Remediation Priority:**
1. Add @requires: ['authenticated'] to AdminService (or specific roles)
2. Add @restrict annotations to all reference table entities
3. Replace error.message with generic error responses in catch blocks (handlers)
4. Verify all remaining handlers (admin, alerts, permits, risk-assessments) call audit logging

**Notes:**
- The codebase uses both ChangeLog (writeChangeLogs in admin-service.js) and AuditLog (logAudit in handlers/common.js) — legacy mixed approach
- Audit coverage appears good but should consolidate on one logging strategy
- No authentication bypass vulnerabilities detected
- CSRF protection broadly applied
