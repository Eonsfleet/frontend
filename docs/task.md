# EonsFleet Frontend Implementation Plan

- [x] **Phase 1: Auth & Shell**
  - [x] Bootstrap project (Next.js 14, Tailwind, etc.)
  - [x] Environment variables setup
  - [x] Root layout with providers (React Query, Sonner, etc.)
  - [x] Login page and authentication state (Zustand)
  - [x] Portal layout (AppShell) with role-aware Sidebar
  - [x] Forgot password & Reset password flow (OTP verification)
  - [x] Integrate real backend Login JSON Response

- [x] **Phase 2: Dashboard**
  - [x] Role-scoped dashboard layout
  - [x] KPI summary StatCards
  - [x] Active trips map snapshot
  - [x] Vehicle status donut chart
  - [x] Upcoming maintenance table & recent incidents feed

- [x] **Phase 3: Fleet Management (Vehicles & Drivers)**
  - [x] Vehicles list view
  - [x] Vehicle detail page (Overview, Location, History, etc.)
  - [x] Drivers list view
  - [x] Driver detail page and assignment operations

- [x] **Phase 4: Trip Management**
  - [x] Trip list view
  - [x] Trip creation wizard
  - [x] Trip detail page (Events, Route, Checkpoints, POD)
  - [x] Trip status management

- [x] **Phase 5: Maintenance**
  - [x] Basic maintenance schedule list and logs
  - [x] Maintenance job board (Kanban)
  - [x] Advanced maintenance workflows and details
  - [x] Maintenance alerts and work order creation

- [x] **Phase 6: Geofencing**
  - [x] Geofence list view
  - [x] Interactive Leaflet map editor (draw circle/polygon)
  - [x] Geofence detail and vehicle association

- [x] **Phase 7: Incidents**
  - [x] Incident list view
  - [x] Incident creation and 9-state workflow engine UI
  - [x] Incident detail page (Timeline, Conversation, Actions)

- [x] **Phase 8: Fuel Management**
  - [x] Fuel expense tracker and approval workflow
  - [x] Fuel card management
  - [x] Fuel reconciliation and theft detection
  - [x] Fuel and IFTA reports

- [ ] **Phase 9: Analytics & Reports**
  - [ ] Analytics hub and specialized sub-pages (Fleet, Drivers, Fuel, etc.)
  - [ ] Scheduled reports management
  - [ ] Report export functionality

- [x] **Phase 10: Billing & Subscriptions**
  - [x] Current plan overview
  - [x] Plan comparison and upgrade flow (Paystack integration)
  - [x] Invoice list and PDF viewer

- [/] **Phase 11: Notifications**
  - [x] Real-time notification bell and inbox
  - [x] Notification channel preferences module
  - [ ] Notification rules and groups configuration

- [/] **Phase 12: Webhooks & Integrations**
  - [ ] Webhook list view
  - [ ] Create/Edit webhook endpoint form
  - [ ] Webhook delivery log and test fire

- [x] **Phase 13: Vendor & Workshop Portal**
  - [x] Vendor directory and invite flow
  - [x] Workshop job board (Kanban)
  - [x] Vendor metrics and job management

- [x] **Phase 14: Settings & Administration**
  - [x] Organization settings
  - [x] User and role management
  - [x] API keys and cluster management
  - [x] User profile page
