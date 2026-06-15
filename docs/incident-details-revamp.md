Product Prompt — Incident Detail Page (/incidents/:id)
Objective
Build a single-page view that gives any authorized user the complete picture of one incident — from what happened and who was involved, through the full investigation trail, every message exchanged, and what action was taken — without leaving the page.

Page Sections
1. Incident Header (top of page)

The identity and urgency of the incident at a glance:

Reference number (e.g. INC-A3F9C1) — prominent, copyable
Incident type (e.g. Accident, Breakdown, Theft, Fire)
Status badge — color-coded:
Reported → grey
Under Investigation → blue
Action Required → orange
Action Taken → teal
Pending Resolution → yellow
Resolved → green
Closed → dark grey
Escalated → red
Dismissed / Cancelled → muted
Priority badge (Normal, High, Critical) — color-coded
Date and time of occurrence
Reported date
2. Incident Overview Card

Core facts about what happened:

Description (full text)
Location — street, city, state (with a map pin if coords are available)
Victim name
Witness name(s)
Media — photo/video gallery if attachments exist
3. Involved Parties Card

Three sub-sections in a horizontal layout:

Vehicle — make, model, color, registration number, thumbnail image; link to vehicle detail page
Driver — name, avatar, role; link to driver profile
Reported By — name, avatar, role
4. Workflow Status & Actions

The most interactive section of the page. Shows the current status clearly and presents only the next valid actions as buttons — contextual based on current status:

Current Status	Available Actions
Reported	Investigate, Dismiss, Cancel
Under Investigation	Action Required, Escalate, Cancel
Action Required	Action Taken, Cancel
Action Taken	Pending Resolution
Pending Resolution	Resolve
Resolved	Close
Escalated	Investigate
Closed / Dismissed / Cancelled	— (no actions)
Each action button opens a confirmation modal with:

A summary of the transition being made
An optional reason/note field (required for: Dismiss, Cancel, Escalate)
Confirm and Cancel buttons
If a linked maintenance job exists, show it here as a card with a link — otherwise show a Link Maintenance Job button (calls POST /{incident}/link-job).

5. Conversation Thread

A chat-style panel showing the full message history for this incident:

Each message shows: sender name, role, avatar, timestamp, and message body
System messages (auto-generated on status transitions, e.g. "Status changed from Reported to Under Investigation by John Doe") rendered differently — smaller, muted, with an icon
Internal messages (visible to staff only) marked with a lock icon
Compose box at the bottom — any participant can post a new message
Participants list shown as avatars at the top of the panel
6. Audit / History Timeline

A vertical timeline of every status transition ever made on this incident:

Each entry: from status → to status, who triggered it, their role, timestamp
If a reason was provided (for dismiss/escalate/cancel), show it as a quote below the entry
Most recent at the top
Read-only
Stats Bar (inline summary strip)
A narrow row between the header and the main content:

Time since reported (e.g. "3 days ago")
Time to current status (e.g. "Under investigation for 1 day")
Total messages in conversation
Number of workflow transitions made
Role-Based Visibility
Role	Can See	Can Act
Fleet Manager / Admin / Owner	Everything	All workflow transitions, post messages
Dispatcher	Full detail + conversation	Post messages, investigate
Compliance	Full detail + history	Escalate, post messages
Driver	Own incidents only	View only, post messages
Finance	Overview + linked jobs	View only
Mechanic	Overview + linked job	View only
UX Requirements
All data loads on one page — no navigation away to see conversation, history, or linked jobs
Workflow action buttons update the status badge and history timeline optimistically — no full page reload
If coords are available, render a small embedded map in the overview card showing the incident location pin
Media gallery supports full-screen lightbox view
If the incident is Escalated, display a prominent red banner at the top of the page
If the incident is Closed, Dismissed, or Cancelled, show a read-only banner and hide all action buttons
Mobile-responsive — header, overview, and conversation thread must be usable on a tablet
API Calls This Page Makes
Data	Endpoint
Incident details	GET /v1/incidents/:id
Workflow history	GET /v1/incidents/:id/history
Conversation + messages	GET /v1/incidents/:id/conversation
Post a message	POST /v1/incidents/:id/messages
Investigate	POST /v1/incidents/:id/investigate
Action required	POST /v1/incidents/:id/action-required
Action taken	POST /v1/incidents/:id/action-taken
Pending resolution	POST /v1/incidents/:id/pending-resolution
Resolve	POST /v1/incidents/:id/resolve
Close	POST /v1/incidents/:id/close
Escalate	POST /v1/incidents/:id/escalate
Dismiss	POST /v1/incidents/:id/dismiss
Cancel	POST /v1/incidents/:id/cancel
Link maintenance job	POST /v1/incidents/:id/link-job
Success Criteria
A user landing on this page should be able to answer all of the following without clicking away:

What happened, where, and when?
Who was involved — driver, vehicle, victim, witness?
What is the current investigation status and who last acted on it?
What has been communicated between all parties so far?
What is the complete audit trail of every status change?
Is there a maintenance job linked to this incident?
What is the next action I need to take right now?