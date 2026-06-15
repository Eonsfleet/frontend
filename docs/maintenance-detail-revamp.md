Product Prompt — Maintenance Schedule Detail Page (/maintenances/schedules/:id)
Objective
Build a single-page view that gives any authorized user a complete, actionable picture of one maintenance schedule — from its metadata and current status, through every work log, checklist, part, and attachment — without leaving the page.

Page Sections
1. Schedule Header (top of page)

Display the core identity of the schedule at a glance:

Reference number (e.g. MS-2026-0009) — prominent, copyable
Service type (e.g. Corrective, Preventive)
Status badge — color-coded (Upcoming, In Progress, Completed, Cancelled, Overdue)
Priority badge (Normal, High, Critical)
Vehicle — make, model, registration number, with a link to the vehicle detail page
Due date — highlight in red if past due
Created date
Description / Notes
2. Schedule Configuration Card

Collapsible section showing how the schedule was set up:

Schedule type (Time-based / Odometer-based)
Recurring? Yes/No — if yes: interval value + unit (e.g. every 2 months)
End date / occurrence limit (if set)
Estimated cost
Service duration
Next due date
Expected odometer reading (for odometer-based schedules)
Notifications enabled: Yes/No
3. Assignment & Vendor Card

Assigned vendor (name, business type) — with a CTA to assign/reassign vendor inline if not yet assigned
Assigned technician (name, avatar, role) — if applicable
Assigned by (who created/assigned the schedule)
4. Checklists

A checklist panel listing all items attached to this schedule:

Each checklist item shown with name, description, and completion status (Pending / Done)
Overall progress bar (e.g. 3/5 items completed)
Read-only view — items are checked off from within the active Work Log, not here
5. Work Logs Timeline

The central activity section. Each log entry is a card showing:

Log reference / ticket ID
Status (Pending, In Progress, Completed, Verified, Cancelled)
Assigned technician
Vendor
Priority
Date created and last updated
Workflow action buttons — contextual based on current status:
Pending → Assign
Assigned → Start
In Progress → Complete, Update Progress, Cancel
Completed → Verify, Cancel
Expand each log card to reveal:

Progress tracker — percentage complete + notes
Parts used — table of part name, quantity, unit price, subtotal; total cost at bottom; + Add Part button (when in progress)
Attachments — photo/document thumbnails with upload button (when in progress or completed)
6. Stats Bar (inline summary)

A narrow row of summary numbers below the header:

Total logs
Open logs
Completed logs
Total parts cost (sum across all logs)
Days until due (or days overdue)
Role-Based Visibility
Role	Can See	Can Act
Fleet Manager / Admin / Owner	Everything	Assign vendor, assign technician, cancel
Mechanic	Logs assigned to them	Start, complete, update progress, add parts, upload attachments
Dispatcher	Schedule + logs	View only
Vendor	Their own logs	View only
Finance	Schedule + cost summary	View only
UX Requirements
All data loads on one page — no navigation required to see checklists, logs, parts, or attachments
Workflow action buttons (Assign, Start, Complete, Verify) trigger a confirmation modal with an optional reason/note field
Status badges update optimistically on action — no full page reload
If the schedule is recurring, show a "View Series" link that opens a filtered list of all occurrences in the same series
Empty states: if no logs exist yet, show a prompt to assign a vendor; if no parts, show "No parts recorded yet"
Mobile-responsive — the header, stats bar, and log cards must be usable on a tablet
API Calls This Page Makes
Data	Endpoint
Schedule details	GET /v1/maintenances/schedule/:id
Checklists	GET /v1/maintenances/schedule/:id/checklists
Work logs	GET /v1/maintenances/logs/:id
Parts per log	GET /v1/maintenances/logs/:log/parts
Assign vendor	PUT /v1/maintenances/schedule/:id/assign-vendor
Assign job	POST /v1/maintenances/logs/:log/assign
Start job	POST /v1/maintenances/logs/:log/start
Complete job	POST /v1/maintenances/logs/:log/complete
Verify job	POST /v1/maintenances/logs/:log/verify
Cancel job	POST /v1/maintenances/logs/:log/cancel
Update progress	PATCH /v1/maintenances/logs/:log/progress
Add part	POST /v1/maintenances/logs/:log/parts
Remove part	DELETE /v1/maintenances/logs/:log/parts/:part
Upload attachment	POST /v1/maintenances/logs/:log/attachments
Success Criteria
A user landing on this page should be able to answer all of the following without clicking away:

What is this schedule for, and is it overdue?
Who is the vendor and technician?
What checklist items need to be completed?
What work has been done so far, and what is the current status?
What parts were used and how much did they cost?
What is the next action I need to take?