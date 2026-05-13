sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("BridgeManagement.bmsadmin.controller.Help", {

    onInit: function () {
      this.getView().setModel(new JSONModel({
        userGuide: this._getUserGuideHtml(),
        operations: this._getOperationsHtml(),
        troubleshooting: this._getTroubleshootingHtml(),
        deployment: this._getDeploymentHtml()
      }), "view");
    },

    _getUserGuideHtml: function () {
      return [
        "<h2>Welcome to the Bridge Management System</h2>",
        "<p>The Bridge Management System (BMS) is the central platform for tracking bridge assets, their condition, load restrictions, inspections, permits, and risk assessments across the NSW bridge network. It is designed for use by Bridge Managers, Inspectors, Asset Managers, and administrators at Transport for NSW and participating local government organisations.</p>",
        "<p>Use the left-hand sidebar to move between sections of the BMS Administration area. From the main Fiori launchpad, click any tile to open that register directly.</p>",

        "<h3>Bridge Register</h3>",
        "<p>The Bridge Register is the master list of all bridges in the network. Each bridge has a unique Bridge ID in the format <strong>NSW-XXXX</strong>.</p>",
        "<ul>",
        "<li><strong>Creating a bridge:</strong> Click the <em>Create</em> button on the list report. Fill in the Name, Location, State, Structure Type, and Material. The Bridge ID is assigned automatically.</li>",
        "<li><strong>Condition Rating:</strong> This field is set via the <em>Inspect Now</em> button on the Bridge Details page — it cannot be edited directly. This ensures condition data is always linked to a formal inspection record.</li>",
        "<li><strong>Activating a bridge:</strong> New bridges start in Draft status. Click <em>Save</em> or <em>Activate</em> to publish the record and make it visible to other users.</li>",
        "<li><strong>Deactivating a bridge:</strong> Use the <em>Deactivate</em> action from the Bridge Details page. Deactivated bridges are hidden from operational lists but retained for audit purposes.</li>",
        "</ul>",

        "<h3>Bridge Inspections</h3>",
        "<p>Record each inspection event carried out on a bridge.</p>",
        "<ul>",
        "<li>Set the <strong>Inspection Date</strong>, <strong>Type</strong> (Routine, Principal, Detailed, or Special), and the <strong>Inspector Name</strong>.</li>",
        "<li>Principal and Detailed inspections require the inspector to hold an accreditation level of 3 or higher. The system will reject the record if the accreditation level entered does not meet the minimum requirement.</li>",
        "<li>Add element-level condition data via the <em>Inspection Elements</em> sub-table on the inspection record. Each element uses the CS1–CS4 scale: CS1 = Good/New, CS2 = Satisfactory, CS3 = Poor, CS4 = Failed.</li>",
        "<li>The <strong>Inspection Reference</strong> (INS-NNNN) is auto-generated — do not attempt to set it manually.</li>",
        "</ul>",

        "<h3>Bridge Defects</h3>",
        "<p>Log physical defects observed during inspections or ad-hoc site visits.</p>",
        "<ul>",
        "<li><strong>Severity scale:</strong> 1 = Low, 2 = Medium, 3 = High, 4 = Critical.</li>",
        "<li>Defects with severity 3 (High) or 4 (Critical) automatically create an Alert in the Alerts register.</li>",
        "<li>Link the defect to the inspection that found it using the <em>Linked Inspection</em> field (optional — defects can also be created independently).</li>",
        "<li>If the defect requires a load restriction, tick <strong>Requires Load Restriction</strong>. The system will automatically create a draft Restriction record linked to this defect.</li>",
        "<li>Defects cannot be permanently deleted — use the <em>Deactivate</em> action if a record was created in error. Defect records are legally admissible evidence under the Civil Liability Act 2002.</li>",
        "</ul>",

        "<h3>Risk Assessments</h3>",
        "<p>Assess the risk profile of a bridge using the TfNSW 5×5 risk matrix.</p>",
        "<ul>",
        "<li>Set <strong>Likelihood</strong> (1–5) and <strong>Consequence</strong> (1–5). The <strong>Inherent Risk Score</strong> (Likelihood × Consequence) is calculated automatically — do not override it.</li>",
        "<li>After documenting existing controls, set <strong>Residual Likelihood</strong> and <strong>Residual Consequence</strong>. The <strong>Residual Risk Score</strong> must be entered separately — it is not auto-defaulted from the inherent score.</li>",
        "<li>Risk levels: Low ≤ 4, Medium 5–9, High 10–14, Extreme ≥ 15.</li>",
        "<li>Risk records cannot be permanently deleted. Use <em>Deactivate</em> to retire a superseded assessment.</li>",
        "</ul>",

        "<h3>Load Restrictions</h3>",
        "<p>Record operational limits applied to a bridge.</p>",
        "<ul>",
        "<li>Restriction types: Unrestricted, Permit Required, Restricted, or Closed.</li>",
        "<li>Each restriction should reference the gazette authority and expiry date. Alerts are automatically raised 30 days before gazette expiry.</li>",
        "<li>A single bridge may have multiple active restrictions (e.g. a mass limit and a height limit).</li>",
        "</ul>",

        "<h3>Bridge Permits</h3>",
        "<p>Process permit applications from heavy vehicle operators seeking oversize/overmass access.</p>",
        "<ul>",
        "<li>Review the applicant's vehicle details (gross mass, height, width, length, vehicle class).</li>",
        "<li>Click <em>Approve</em> to grant the permit. Enter conditions of approval in the <strong>Conditions of Approval</strong> field before approving.</li>",
        "<li>Click <em>Reject Permit</em> to decline. Enter the reason in the response field.</li>",
        "<li>Permit status lifecycle: Pending → Approved or Rejected. Approved permits expire automatically when their <strong>Valid To</strong> date passes.</li>",
        "</ul>",

        "<h3>Load Rating Certificates</h3>",
        "<p>Store formal load rating certificates issued by structural engineers. Rating factors for vehicle classes T44, SM1600, HLP400, and others are stored per-certificate.</p>",
        "<ul>",
        "<li>Certificates that expire within 90 days automatically generate an Alert.</li>",
        "<li>When a new certificate supersedes an old one, use the <em>Deactivate</em> action on the old record and create a new active certificate.</li>",
        "</ul>",

        "<h3>Bridge Capacities</h3>",
        "<p>Record the assessed capacity of a bridge for specific load categories (e.g. Live Load, Dead Load, Seismic). Capacity records should reference the source standard (e.g. AS 5100).</p>",

        "<h3>Scour Assessments</h3>",
        "<p>Record hydraulic scour risk assessments. Set the Scour Risk level (Low/Medium/High/Extreme), depth estimates, and recommended treatment actions.</p>",

        "<h3>NHVR Route Assessments</h3>",
        "<p>Record the outcome of heavy vehicle route assessments carried out under the Heavy Vehicle National Law (HVNL). Set the assessment status and the approved vehicle classes via the <em>Approved Vehicle Classes</em> sub-table.</p>",

        "<h3>Condition Surveys</h3>",
        "<p>Record formal condition surveys (separate from routine inspections). Surveys follow a Draft → Submitted → Approved lifecycle.</p>",
        "<ul>",
        "<li>Click <em>Submit for Review</em> when the survey is complete. A qualified engineer must then click <em>Approve Survey</em> to finalise it.</li>",
        "<li>An approved survey automatically updates the parent bridge's Condition Rating field.</li>",
        "</ul>",

        "<h3>BMS Administration Screens</h3>",
        "<h4>Change Documents</h4>",
        "<p>A full audit trail of every data change made in BMS — who changed what field, when, and what the previous value was. Use the date filter and entity type filter to narrow results. Export to CSV for formal audit reporting.</p>",

        "<h4>Data Quality</h4>",
        "<p>Shows a completeness score (0–100%) for each bridge based on how many key fields are populated. Red bars indicate critical gaps such as missing condition rating or coordinates. Use this screen before each reporting cycle to identify bridges that need attention.</p>",

        "<h4>User Access</h4>",
        "<p>Lists all BMS users and their current roles. The five main roles are:</p>",
        "<ul>",
        "<li><strong>BMS_ADMIN</strong> — Full access including user management and system configuration.</li>",
        "<li><strong>BMS_BRIDGE_MANAGER</strong> — Create, edit, and approve bridge records, inspections, and restrictions.</li>",
        "<li><strong>BMS_INSPECTOR</strong> — Add inspection records and defects. Cannot approve or delete.</li>",
        "<li><strong>BMS_OPERATOR</strong> — Operational read access with the ability to edit restrictions.</li>",
        "<li><strong>BMS_VIEWER</strong> — Read-only access to all screens.</li>",
        "</ul>",
        "<p>Contact your IT administrator to add or change user role assignments in the SAP BTP cockpit.</p>",

        "<h4>System Config</h4>",
        "<p>Application-level settings. Most values can be left at their defaults after initial setup. Key settings include:</p>",
        "<ul>",
        "<li><strong>Inspection Reminder Days</strong> — How many days before an inspection due date to create a reminder alert.</li>",
        "<li><strong>Mass Edit Batch Size</strong> — Maximum number of bridge records that can be updated in a single mass edit operation.</li>",
        "<li><strong>App Maintenance Mode</strong> — Set to true during planned maintenance windows to show a banner to all users.</li>",
        "</ul>",

        "<h4>BNAC Config</h4>",
        "<p>Configure the link between BMS bridges and the Bridge National Asset Classification (BNAC) system. Enter the BNAC base URL and mapping rules here. Once configured, each bridge's BNAC link appears on its Details page under the External Systems tab.</p>",

        "<h4>GIS Config</h4>",
        "<p>Set up additional reference map layers that appear as overlays on the Bridge Map. Add WMS (Web Map Service) or XYZ tile layer URLs here. The OpenStreetMap base map is always on — these are additional overlays such as flood zones, road classifications, or catchment boundaries.</p>",

        "<h4>Attribute Configuration</h4>",
        "<p>Define and manage custom data fields (attributes) for bridges. Workflow:</p>",
        "<ol>",
        "<li>Create an <strong>Attribute Group</strong> (e.g. \"Seismic Data\", \"Heritage\").</li>",
        "<li>Add <strong>Attribute Definitions</strong> within the group (e.g. \"Seismic Zone\", \"Heritage Listing Number\").</li>",
        "<li>Set whether each attribute is required or optional, and whether it has allowed values (dropdown list).</li>",
        "<li>Once defined, the attribute fields appear on Bridge Detail pages under the <em>Custom Attributes</em> section.</li>",
        "</ol>",

        "<h4>Attribute Report</h4>",
        "<p>Shows which bridges have custom attributes populated and highlights gaps. Download as Excel for offline review.</p>",

        "<h4>Feature Flags</h4>",
        "<p>Turn advanced assessment features on or off without a deployment. Requires the Config Manager role. The main feature flag is <em>BHI/BSI Multi-Modal Assessment</em>, which enables the Bridge Health Index and Bridge Sufficiency Index calculations for multi-modal transport networks.</p>",

        "<h4>Lookup Values</h4>",
        "<p>Manage the dropdown options used in all BMS forms — structure types, material codes, inspection types, defect categories, and more. Add new values or deactivate obsolete ones. <strong>Do not change existing codes</strong> — codes are stored as foreign keys on existing records and changing them will break those references.</p>",

        "<h4>API Reference</h4>",
        "<p>Technical documentation for system integrators. Lists all OData endpoints, REST API paths, request/response shapes, and authentication requirements. Share this screen with developers building integrations against BMS.</p>",

        "<h3>Mass Upload</h3>",
        "<p>Access Mass Upload from the Fiori launchpad tile. Use it to import or update many records at once via Excel or CSV.</p>",
        "<ol>",
        "<li>Select the <strong>Dataset</strong> from the dropdown (e.g. Bridges, Restrictions, Inspections).</li>",
        "<li>Click <strong>Download Template</strong> to get a pre-formatted Excel file with the correct column headers and dropdown validation.</li>",
        "<li>Fill in the template. Required columns are marked with an asterisk (*).</li>",
        "<li>Click <strong>Choose File</strong> and select your completed file.</li>",
        "<li>Click <strong>Validate Only</strong> first to preview any errors before committing data.</li>",
        "<li>If validation passes, click <strong>Upload</strong> to insert or update records.</li>",
        "</ol>",
        "<p>Supported datasets: Bridges, Restrictions, Inspections, Defects, Risk Assessments, Load Ratings, Permits, Capacities, Scour Assessments, NHVR Route Assessments, and all lookup tables.</p>",
        "<p><strong>Note:</strong> CSV uploads require a specific dataset selection. Excel workbook uploads with multiple sheets can use the <em>All Datasets</em> option.</p>",

        "<h3>Network Reports</h3>",
        "<p>Access from the Bridge Register screen using the <em>Reports</em> tab. Shows network-level KPIs across the following sections:</p>",
        "<ul>",
        "<li><strong>Network Health</strong> — BSI score, condition rating distribution, age profile, structure type breakdown.</li>",
        "<li><strong>Risk Register</strong> — Risk counts by level: Extreme, High, Medium, Low.</li>",
        "<li><strong>Compliance &amp; NHVR</strong> — PBS route classification and NHVR assessment coverage percentages.</li>",
        "<li><strong>Defects Register</strong> — Active defect counts by severity and element type.</li>",
        "<li><strong>Maintenance Programme</strong> — Budget and treatment backlog by year.</li>",
        "</ul>",
        "<p>Export any chart or table using the download icon in the section header.</p>"
      ].join("");
    },

    _getOperationsHtml: function () {
      return [
        "<h2>Operations Manual</h2>",
        "<p>This section describes the routine operational procedures for BMS administrators and bridge managers. Follow these procedures to keep the bridge register accurate and the alert queue clear.</p>",

        "<h3>Daily Tasks</h3>",

        "<h4>Morning KPI Check</h4>",
        "<ol>",
        "<li>Open the BMS Dashboard tile from the Fiori launchpad.</li>",
        "<li>Check the <strong>Critical Bridges</strong> count (condition rating ≤ 3) and the <strong>Overdue Inspections</strong> count.</li>",
        "<li>Compare with yesterday's values. Any increase requires immediate review — click the tile to see which bridges are affected.</li>",
        "<li>Review the <strong>Open Alerts</strong> count. New alerts since yesterday should be triaged before starting other work.</li>",
        "</ol>",

        "<h4>Acknowledge New Alerts</h4>",
        "<ol>",
        "<li>Navigate to the <strong>Alerts &amp; Notifications</strong> tile.</li>",
        "<li>Filter by Status = Open. Review each new alert.</li>",
        "<li>For each alert: read the description, confirm the issue with the relevant bridge owner or engineer.</li>",
        "<li>Click <em>Acknowledge</em> and enter a brief note (e.g. \"Notified District Engineer, repair order raised — WO-23456\").</li>",
        "<li>Alerts that cannot be resolved immediately should be escalated to the responsible engineer and noted in the acknowledgement field.</li>",
        "</ol>",

        "<h4>Review Mass Upload Queue</h4>",
        "<p>If your organisation runs daily automated data feeds via the Mass Upload API:</p>",
        "<ol>",
        "<li>Open the <strong>Mass Upload</strong> screen.</li>",
        "<li>Check the results panel for any rows shown in amber (warnings) or red (errors).</li>",
        "<li>Download the row-level results and forward to the data owner for correction.</li>",
        "<li>Re-upload corrected rows using a targeted CSV for just the affected records.</li>",
        "</ol>",

        "<h3>Weekly Tasks</h3>",

        "<h4>Data Quality Review</h4>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → Data Quality</strong>.</li>",
        "<li>Review the completeness scores. The target is <strong>80% or above</strong> for all active bridges.</li>",
        "<li>Bridges below 60% completeness should have a data improvement ticket raised and assigned to the responsible district.</li>",
        "<li>Export the report to Excel and share with district managers monthly.</li>",
        "</ol>",

        "<h4>Inspection Diary</h4>",
        "<ol>",
        "<li>Open the <strong>Bridge Inspections</strong> tile.</li>",
        "<li>Filter by <em>Next Inspection Due</em> within the next 30 days.</li>",
        "<li>For each bridge without a scheduled inspection, assign an inspector and create a draft Inspection record to hold the date and type.</li>",
        "<li>Notify the assigned inspector by the usual channel (email / work order system).</li>",
        "</ol>",

        "<h4>Restriction Expiry Review</h4>",
        "<ol>",
        "<li>Open the <strong>Load Restrictions</strong> tile.</li>",
        "<li>Filter by <em>Gazette Expiry Date</em> within the next 14 days.</li>",
        "<li>For each restriction due to expire, contact the legal/policy team to renew gazette authority before expiry.</li>",
        "<li>If a restriction is being lifted, update its status to Inactive and record the reason.</li>",
        "</ol>",

        "<h3>Monthly Tasks</h3>",

        "<h4>KPI Snapshot Report</h4>",
        "<ol>",
        "<li>Navigate to <strong>Bridge Register → Reports → Network Health</strong>.</li>",
        "<li>Export the report to PDF using your browser's print function (File → Print → Save as PDF).</li>",
        "<li>Compare the <strong>Network Condition Index (NCI)</strong> month-on-month. Escalate if NCI drops more than 2% in a single month.</li>",
        "<li>File the PDF report in your document management system with the date and reviewer's name.</li>",
        "</ol>",

        "<h4>Permit Backlog</h4>",
        "<ol>",
        "<li>Open the <strong>Bridge Permits</strong> tile.</li>",
        "<li>Filter by Status = Pending and Applied Date more than 5 business days ago.</li>",
        "<li>For each overdue permit, notify the responsible engineer and record the follow-up in the permit's notes field.</li>",
        "</ol>",

        "<h4>Change Document Audit</h4>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → Change Documents</strong>.</li>",
        "<li>Set the date filter to the previous calendar month.</li>",
        "<li>Review for any unexpected changes to bridge condition ratings, restriction statuses, or user access configurations.</li>",
        "<li>Export to CSV and file with your monthly compliance record.</li>",
        "</ol>",

        "<h4>User Access Review</h4>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → User Access</strong>.</li>",
        "<li>Cross-reference the user list with your HR system. Remove BMS role collections from any staff who have left or changed roles.</li>",
        "<li>Confirm that no user has a higher role than required for their current duties (principle of least privilege).</li>",
        "</ol>",

        "<h3>Managing Alerts</h3>",
        "<p>The alert lifecycle has three stages:</p>",
        "<ul>",
        "<li><strong>Open</strong> — A new alert has been raised by the system (e.g. overdue inspection, expiring certificate, severe defect).</li>",
        "<li><strong>Acknowledged</strong> — You have reviewed the alert and entered an acknowledgement note explaining the action taken.</li>",
        "<li><strong>Resolved</strong> — The underlying issue is fixed. Click <em>Resolve</em>, enter resolution details, and optionally attach a proof URL (e.g. a link to a completed work order).</li>",
        "</ul>",
        "<p>Alert types and their triggers:</p>",
        "<ul>",
        "<li><strong>Inspection Overdue</strong> — Triggered automatically when a bridge has not been inspected within the configured interval (default 365 days).</li>",
        "<li><strong>Load Rating Expiry</strong> — Triggered 90 days before a Load Rating Certificate's expiry date.</li>",
        "<li><strong>Gazette Expiry</strong> — Triggered 30 days before a restriction's gazette authority expires.</li>",
        "<li><strong>Defect Escalation</strong> — Triggered immediately when a defect with severity 3 (High) or 4 (Critical) is saved.</li>",
        "</ul>",

        "<h3>Refreshing KPI Snapshots</h3>",
        "<p>Dashboard KPI tiles are updated from a snapshot table. Snapshots are automatically refreshed daily at 6:00 AM AEDT. To force an immediate refresh after a mass upload or bulk condition update:</p>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → System Config</strong>.</li>",
        "<li>Click the <em>Refresh KPI Snapshots</em> action button.</li>",
        "<li>Wait approximately 30 seconds, then refresh the Dashboard page.</li>",
        "</ol>",

        "<h3>Mass Update (Bulk Field Editing)</h3>",
        "<p>The Mass Edit screen allows you to update a single field across many bridge records at once — for example, changing the Managing Authority for a district.</p>",
        "<ol>",
        "<li>Open the <strong>Mass Edit</strong> tile from the Fiori launchpad.</li>",
        "<li>Filter the bridge list to the set you want to update.</li>",
        "<li>Select the field to change from the dropdown.</li>",
        "<li>Enter the new value.</li>",
        "<li>Review the diff preview (shows old → new for each record).</li>",
        "<li>Click <em>Save</em> to apply. All changes are logged in Change Documents.</li>",
        "</ol>"
      ].join("");
    },

    _getTroubleshootingHtml: function () {
      return [
        "<h2>Troubleshooting Guide</h2>",
        "<p>This section covers the most common problems reported by BMS users and the steps to resolve them.</p>",

        "<h3>Mass Upload Problems</h3>",

        "<h4>Problem: File is rejected immediately on upload</h4>",
        "<ol>",
        "<li>Check that the file is <strong>.xlsx</strong> or <strong>.csv</strong>. Files with extensions .xls, .xlsm, .pdf, or .zip are not accepted.</li>",
        "<li>Check that the correct <strong>Dataset</strong> is selected in the dropdown before uploading. A Bridges file uploaded under the Restrictions dataset will fail validation.</li>",
        "<li>If using a CSV file, you must select a specific dataset — the <em>All Datasets</em> option is only available for Excel workbooks with multiple sheets.</li>",
        "<li>If the file exceeds approximately 18 MB (raw file size), split it into batches of 5,000 rows.</li>",
        "</ol>",

        "<h4>Problem: Validate Only shows 'Column not recognised' errors</h4>",
        "<ol>",
        "<li>Download a fresh template from the <em>Download Template</em> button. Your file may have been created from an older template with different column names.</li>",
        "<li>Do not rename the column headers in the template. Column names must match exactly (including capitalisation).</li>",
        "<li>Check that you have not added extra columns to the right of the last required column — extra columns are ignored, but they may shift the recognised columns if the file was opened and re-saved in a non-Excel editor.</li>",
        "</ol>",

        "<h4>Problem: Upload succeeds but rows are showing as 'Skipped'</h4>",
        "<p>Rows are skipped (not inserted or updated) when a required key value cannot be matched in the database. Common causes:</p>",
        "<ul>",
        "<li>The Bridge ID in a Restrictions or Inspections upload does not match any existing bridge in the system. Create the bridge first, then upload the dependent records.</li>",
        "<li>A lookup value (e.g. structure type code) in the file does not match any active value in the Lookup Values table. Check the dropdown validation in the downloaded template for the valid options.</li>",
        "</ul>",

        "<h3>Bridge Register Problems</h3>",

        "<h4>Problem: Bridge Details page shows blank sections</h4>",
        "<ol>",
        "<li>Force a hard refresh: <strong>Cmd+Shift+R</strong> (Mac) or <strong>Ctrl+Shift+R</strong> (Windows). This clears the browser cache for the page.</li>",
        "<li>Check that the bridge record has been activated (not still in Draft status). Draft records show a Draft indicator at the top of the page.</li>",
        "<li>If blank sections persist after hard refresh and the bridge is active, try opening the record in a private/incognito window to rule out a cached state issue.</li>",
        "</ol>",

        "<h4>Problem: Inspect Now button is greyed out</h4>",
        "<ul>",
        "<li>The bridge must be in <strong>Active</strong> status (not Draft or Inactive). Check the status indicator at the top of the Bridge Details page.</li>",
        "<li>If the bridge is Active but the button is still greyed out, your user role may be Inspector or Viewer. The <em>Inspect Now</em> workflow requires the Bridge Manager role. Contact your administrator to confirm your role assignment.</li>",
        "</ul>",

        "<h4>Problem: Condition Rating not updating after inspection</h4>",
        "<ol>",
        "<li>After clicking <em>Inspect Now</em> and entering the condition data, you must click <strong>Save</strong> (or Activate the draft) at the top of the Bridge Details page.</li>",
        "<li>The condition rating on the Bridge record updates when the draft is activated, not when the inspection form is saved internally.</li>",
        "<li>If the rating still shows old data, refresh the page. If the bridge was open in another browser tab, close the old tab and reopen.</li>",
        "</ol>",

        "<h4>Problem: Cannot create a new bridge — form is blocked at the first step</h4>",
        "<p>This usually means a required field has a server-side validation error. Check:</p>",
        "<ul>",
        "<li>Bridge Name is filled in (mandatory).</li>",
        "<li>State is selected from the dropdown (mandatory).</li>",
        "<li>Latitude and Longitude are within the Australian bounding box (approximately −44 to −10 latitude, 112 to 154 longitude). Values outside this range are rejected.</li>",
        "</ul>",

        "<h3>Navigation and Loading Problems</h3>",

        "<h4>Problem: FLP tile shows 'App could not be opened'</h4>",
        "<ol>",
        "<li>Clear your browser cache: <strong>Ctrl+Shift+Del</strong> (Windows) or <strong>Cmd+Shift+Del</strong> (Mac). Clear cached images and files.</li>",
        "<li>Try opening the app in a private/incognito window.</li>",
        "<li>Check that your SAP BTP user account has the correct role collection (see User Access section above).</li>",
        "<li>If the error persists, contact your BMS administrator and provide the exact URL from your browser address bar — this helps identify whether the problem is a missing route definition or a permissions issue.</li>",
        "</ol>",

        "<h4>Problem: Screen loads but shows no data (empty list)</h4>",
        "<ul>",
        "<li>Check whether a filter is active. Some screens remember filter values between sessions. Click <em>Adapt Filters</em> and clear all active filters, then click <em>Go</em>.</li>",
        "<li>For screens that show only records linked to a bridge (e.g. Inspections, Defects), check whether the bridge filter is set correctly.</li>",
        "<li>If you have Viewer role and the screen shows zero records when you expect data, ask the Administrator to verify that the data exists and is Active (not Inactive/Deactivated).</li>",
        "</ul>",

        "<h3>Map Problems</h3>",

        "<h4>Problem: Map shows grey tiles with no background map</h4>",
        "<ul>",
        "<li>The BMS map requires outbound HTTPS access to <strong>*.tile.openstreetmap.org</strong>. If you are behind a corporate proxy or firewall, ask your IT team to allow this domain.</li>",
        "<li>Try zooming in or out and waiting 5 seconds for tiles to load. Tiles are loaded asynchronously by zoom level.</li>",
        "<li>In the Bridge Details page, the embedded map may appear grey until the tab containing it is clicked for the first time. Click the Physical Structure tab (which contains the map) to trigger the map initialisation.</li>",
        "</ul>",

        "<h4>Problem: Bridge pins are not appearing on the map</h4>",
        "<ul>",
        "<li>Check that the bridge records have Latitude and Longitude values set. Bridges without coordinates cannot be placed on the map.</li>",
        "<li>At national zoom levels (zoomed very far out), only a summary count bubble is shown. Zoom in to zoom level 8 or higher to see individual bridge pins.</li>",
        "<li>If using the Viewport Mode filter, the map only loads bridges within the visible area. Pan to your area of interest and wait for pins to load.</li>",
        "</ul>",

        "<h3>Alerts and Notifications Problems</h3>",

        "<h4>Problem: Alert not triggered for a severe defect</h4>",
        "<ul>",
        "<li>Defect alerts are triggered for severity <strong>3 (High)</strong> and <strong>4 (Critical)</strong>. Severity 1 (Low) and 2 (Medium) defects do not generate alerts.</li>",
        "<li>If a High or Critical defect was saved but no alert appeared, navigate to the Alerts screen and click <em>Refresh</em>. There may be a short delay (up to 10 seconds) after the defect is saved.</li>",
        "<li>Check whether an alert for the same defect already exists in an Acknowledged or Resolved status. Duplicate alerts are suppressed for the same defect.</li>",
        "</ul>",

        "<h4>Problem: Cannot resolve an alert — Resolve button is missing</h4>",
        "<ul>",
        "<li>The Resolve action is only available for alerts in Acknowledged status. If the alert is still Open, click <em>Acknowledge</em> first, then <em>Resolve</em>.</li>",
        "<li>Alerts raised by the system (e.g. inspection overdue) cannot be resolved until the underlying issue is addressed — for example, an inspection overdue alert is automatically resolved when a new inspection is saved for that bridge.</li>",
        "</ul>",

        "<h3>Custom Attributes Problems</h3>",

        "<h4>Problem: Custom attribute fields not appearing on the bridge form</h4>",
        "<ol>",
        "<li>Confirm that the attribute has been defined in <strong>BMS Admin → Attribute Configuration</strong>. The attribute must have a group, a definition, and be set to Active.</li>",
        "<li>After adding a new attribute definition, refresh your browser. The attribute field appears under the <em>Custom Attributes</em> section on the Bridge Details page.</li>",
        "<li>Required attributes (marked with a red asterisk) must be filled before the bridge can be activated. If you are seeing a block on activation, check whether a required custom attribute is missing.</li>",
        "</ol>",

        "<h3>Performance Problems</h3>",

        "<h4>Problem: List report is slow to load</h4>",
        "<ul>",
        "<li>Apply filters before clicking Go — loading all records without filters can be slow for large registers (e.g. 5,000+ bridges or 20,000+ inspection records).</li>",
        "<li>Use the <em>Adapt Filters</em> function to add state, date range, or status filters before loading data.</li>",
        "<li>If a specific screen is consistently slow (more than 10 seconds with filters applied), raise a support ticket with the screen name and the filters you used.</li>",
        "</ul>"
      ].join("");
    },

    _getDeploymentHtml: function () {
      return [
        "<h2>Deployment &amp; Security Guide</h2>",
        "<p>This section is for IT administrators responsible for deploying, managing access to, and maintaining the BMS application on SAP Business Technology Platform (BTP).</p>",

        "<h3>Deployment Overview</h3>",
        "<p>BMS runs on SAP BTP Cloud Foundry. The application is packaged as an MTA (Multi-Target Application) and consists of the following components:</p>",
        "<ul>",
        "<li><strong>BridgeManagement-srv</strong> — The backend CAP (Cloud Application Programming) service built on Node.js. Handles all OData and REST API endpoints.</li>",
        "<li><strong>BridgeManagement-db</strong> — The SAP HANA Cloud HDI (HANA Deployment Infrastructure) container. Holds all bridge data.</li>",
        "<li><strong>BridgeManagement-app-router</strong> — The SAP App Router. Handles authentication redirect to XSUAA, routes requests to backend or HTML5 repo, and enforces xs-app.json routing rules.</li>",
        "<li><strong>HTML5 Repository</strong> — Hosts the Fiori/UI5 frontend apps (admin panel, bridge register, map view, reports, etc.) as static artifacts.</li>",
        "<li><strong>XSUAA</strong> — SAP's authentication and authorization service. Manages OAuth2 tokens, scopes, and role collections.</li>",
        "</ul>",
        "<p>The application URL is: <strong>your-subdomain.cfapps.&lt;region&gt;.hana.ondemand.com</strong>. Your SAP BTP administrator provides the exact URL after deployment.</p>",

        "<h3>User Management and Roles</h3>",
        "<p>Users are provisioned via the SAP BTP Cockpit. BMS does not manage its own user database — all authentication is delegated to XSUAA.</p>",

        "<h4>Adding a User</h4>",
        "<ol>",
        "<li>Log in to the SAP BTP Cockpit and navigate to your subaccount.</li>",
        "<li>Go to <strong>Security → Users</strong>.</li>",
        "<li>Click <em>Add User</em> and enter the user's email address (must match their SAP BTP IDP account).</li>",
        "<li>Select the user and click <em>Assign Role Collection</em>.</li>",
        "<li>Assign the appropriate BMS role collection (see table below).</li>",
        "</ol>",

        "<h4>Available Role Collections</h4>",
        "<table style='border-collapse:collapse;width:100%'>",
        "<tr style='background:#f5f5f5'><th style='padding:8px;border:1px solid #ddd;text-align:left'>Role Collection</th><th style='padding:8px;border:1px solid #ddd;text-align:left'>Access Level</th><th style='padding:8px;border:1px solid #ddd;text-align:left'>Typical User</th></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_ADMIN</strong></td><td style='padding:8px;border:1px solid #ddd'>Full — all 9 scopes</td><td style='padding:8px;border:1px solid #ddd'>System administrators, BMS support team</td></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_BRIDGE_MANAGER</strong></td><td style='padding:8px;border:1px solid #ddd'>Create, edit, approve bridges and sub-records</td><td style='padding:8px;border:1px solid #ddd'>District bridge managers, asset managers</td></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_INSPECTOR</strong></td><td style='padding:8px;border:1px solid #ddd'>Add inspections, defects, and condition surveys</td><td style='padding:8px;border:1px solid #ddd'>Field inspectors, structural engineers</td></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_OPERATOR</strong></td><td style='padding:8px;border:1px solid #ddd'>Read + edit restrictions</td><td style='padding:8px;border:1px solid #ddd'>Operations staff, permit officers</td></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_VIEWER</strong></td><td style='padding:8px;border:1px solid #ddd'>Read-only across all screens</td><td style='padding:8px;border:1px solid #ddd'>Executives, external stakeholders</td></tr>",
        "<tr><td style='padding:8px;border:1px solid #ddd'><strong>BMS_CONFIG_MANAGER</strong></td><td style='padding:8px;border:1px solid #ddd'>View + manage feature flags and system config</td><td style='padding:8px;border:1px solid #ddd'>Technical leads, change managers</td></tr>",
        "</table>",

        "<h4>Removing a User</h4>",
        "<ol>",
        "<li>In the SAP BTP Cockpit, go to <strong>Security → Users</strong> and find the user.</li>",
        "<li>Select the BMS role collection(s) and click <em>Unassign Role Collection</em>.</li>",
        "<li>The user's historical records (audit trail, change documents) are preserved. Only their access to the application is removed.</li>",
        "</ol>",

        "<h3>Security Model</h3>",

        "<h4>Authentication</h4>",
        "<p>All BMS endpoints require XSUAA OAuth2 bearer token authentication. Unauthenticated requests return HTTP 401. The App Router handles the redirect to the XSUAA login page for browser-based users.</p>",

        "<h4>Authorisation</h4>",
        "<p>Access to specific operations is governed by XSUAA scopes:</p>",
        "<ul>",
        "<li><strong>admin</strong> — Full access including delete and admin-service endpoints.</li>",
        "<li><strong>manage</strong> — Create and edit bridge records and sub-domain entities.</li>",
        "<li><strong>inspect</strong> — Create and edit inspection records and defects.</li>",
        "<li><strong>operate</strong> — Read and edit restrictions.</li>",
        "<li><strong>view</strong> — Read-only access.</li>",
        "<li><strong>certify</strong> — Approve condition surveys and permits (requires qualified engineer).</li>",
        "<li><strong>config_manager</strong> — Write access to feature flags and system configuration.</li>",
        "<li><strong>executive_view</strong> — Read access to dashboard KPIs and network reports.</li>",
        "<li><strong>external_view</strong> — Read access to the public bridge portal.</li>",
        "</ul>",

        "<h4>CSRF Protection</h4>",
        "<p>All state-changing requests (POST, PATCH, DELETE) to BMS custom REST endpoints require a valid CSRF token in the <code>X-CSRF-Token</code> header. Browsers handling OData requests via the SAP OData model get this automatically. Custom integrations must fetch a token using a HEAD request with <code>X-CSRF-Token: Fetch</code> before submitting mutation requests.</p>",

        "<h4>Content Security Policy</h4>",
        "<p>BMS enforces HTTP Content Security Policy headers on all responses. The policy restricts scripts, styles, and connections to known-safe origins. External resources explicitly allowlisted include: OpenStreetMap tile servers, Leaflet CDN (unpkg.com), Leaflet CSS CDN (cdnjs.cloudflare.com), and approved government WMS endpoints (GA Surface Geology, NSW SixMaps). If you add new reference map layers in GIS Config, ensure the tile server domain is allowlisted by your BMS technical team.</p>",

        "<h4>Audit Log (Append-Only)</h4>",
        "<p>All data changes are logged in the Change Documents table (bridge.management.ChangeLog). This table is append-only — no role can modify or delete audit entries. The log captures: entity type, entity ID, field name, old value, new value, changed by, and changed at timestamp. The log is indexed for query performance and is available via the Change Documents screen and via OData export.</p>",

        "<h3>Data Backup and Recovery</h3>",

        "<h4>Automated Backups</h4>",
        "<p>HANA Cloud provides automated daily backups with a default 7-day retention period. Backups are managed by SAP and can be restored via the SAP BTP Cockpit by a BTP global administrator. Contact SAP Support (via a BTP cockpit ticket) to initiate a point-in-time restore.</p>",

        "<h4>Manual Export Before Major Changes</h4>",
        "<p>Before performing a large data migration or schema-changing upgrade, export all bridge data as a precaution:</p>",
        "<ol>",
        "<li>Navigate to <strong>Mass Upload</strong>.</li>",
        "<li>Use the export/download function for each dataset (Bridges, Restrictions, Inspections, etc.).</li>",
        "<li>Save the exported Excel files to a secure location outside BTP.</li>",
        "</ol>",

        "<h3>Maintenance Windows</h3>",

        "<h4>Before Maintenance</h4>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → System Config</strong>.</li>",
        "<li>Set <strong>appMaintenanceMode</strong> to <code>true</code>. A maintenance banner will appear for all users on their next page load.</li>",
        "<li>Notify users via email or your internal communication channel with the expected maintenance window duration.</li>",
        "<li>Stop any scheduled background jobs (e.g. KPI refresh tasks) if applicable.</li>",
        "</ol>",

        "<h4>After Maintenance</h4>",
        "<ol>",
        "<li>Verify the deployment is healthy by checking the <strong>/health</strong> endpoint: open <code>https://&lt;your-app-url&gt;/health</code> in a browser. The response should contain <code>status: \"ok\"</code>.</li>",
        "<li>Set <strong>appMaintenanceMode</strong> back to <code>false</code> in System Config.</li>",
        "<li>Trigger a KPI snapshot refresh via the <em>Refresh KPI Snapshots</em> action in System Config.</li>",
        "<li>Verify a representative sample of screens load correctly.</li>",
        "</ol>",

        "<h3>Upgrading BMS</h3>",
        "<p>All BMS upgrades are delivered as MTAR (MTA archive) files by the BMS technical team.</p>",
        "<ol>",
        "<li>Receive the MTAR file and release notes from the BMS technical team.</li>",
        "<li>Read the release notes for any pre-deployment steps (e.g. data migration scripts, lookup table additions).</li>",
        "<li>Place the system in maintenance mode (see above).</li>",
        "<li>Log in to your Cloud Foundry environment via the CF CLI and run: <code>cf deploy BridgeManagement_&lt;version&gt;.mtar</code></li>",
        "<li>The deployment is rolling and typically completes in 5–10 minutes. There is a brief window (~2 minutes) where users may be asked to re-authenticate.</li>",
        "<li>After deployment completes, verify the version number displayed in the BMS Admin shell header matches the expected version.</li>",
        "<li>Run the Data Quality report to confirm all data is intact.</li>",
        "<li>Remove maintenance mode.</li>",
        "</ol>",
        "<p><strong>Schema changes</strong>: If the upgrade includes new database columns or entities, the HANA HDI deployer applies them automatically during the cf deploy step. No manual SQL is required.</p>",

        "<h3>Incident Response</h3>",

        "<h4>Application Unavailable</h4>",
        "<ol>",
        "<li>Log in to the SAP BTP Cockpit and navigate to your Cloud Foundry space.</li>",
        "<li>Check the status of the <strong>BridgeManagement-srv</strong> application. A red or stopped status means the application has crashed.</li>",
        "<li>Click <em>Restart</em>. The application should be online within 60 seconds.</li>",
        "<li>If the restart fails, download the recent application logs from the cockpit and check for startup errors.</li>",
        "</ol>",

        "<h4>Data Appears Missing or Incorrect</h4>",
        "<ol>",
        "<li>Navigate to <strong>BMS Admin → Change Documents</strong> and filter by the relevant date range and entity type.</li>",
        "<li>Look for any bulk changes, deactivations, or deletions that were not expected.</li>",
        "<li>If records have been inadvertently deactivated, they can be reactivated using the <em>Reactivate</em> action on each entity (Bridges, Inspections, Defects, Risk Assessments).</li>",
        "<li>If data has been incorrectly modified, use the Change Documents old/new values to manually restore the correct values.</li>",
        "</ol>",

        "<h4>Suspected Security Incident</h4>",
        "<ol>",
        "<li>Immediately contact your SAP BTP global administrator to review XSUAA access logs.</li>",
        "<li>Download the full Change Documents export from BMS (covers all data changes by user and timestamp).</li>",
        "<li>Forward both logs to your organisation's security team for analysis.</li>",
        "<li>If a specific user account is suspected to be compromised, remove their BMS role collections in the BTP Cockpit immediately (does not affect their BTP login — only BMS access).</li>",
        "</ol>",

        "<h4>Emergency Contacts</h4>",
        "<ul>",
        "<li><strong>SAP BTP infrastructure issues</strong> (database outage, platform unavailability): Raise a P1 support ticket via the SAP BTP Cockpit → Support.</li>",
        "<li><strong>BMS application issues</strong> (bugs, data errors, access problems): Contact the BMS application owner listed in your organisation's service catalogue.</li>",
        "<li><strong>Security incidents</strong>: Follow your organisation's Cyber Security Incident Response Plan. BMS logs are available immediately from the Change Documents screen.</li>",
        "</ul>"
      ].join("");
    }

  });
});
