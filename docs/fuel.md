# Fuel Management — Frontend Design & API Reference

> **Module gate:** Growth+ plan (`org.subscription:fuel`)
> **Role:** Product Designer → Frontend Engineer handoff
> **Base URL:** `/v1` (all routes require `Authorization: Bearer {token}` and `X-Request-Type: client`)
> **Money convention:** cost fields ending in `_kobo` are integers — divide by 100 for Naira display.

---

## 0. Deliverables Overview

| Section | What it covers |
|---------|----------------|
| 8.1 Fuel Expenses | Manual expense tracker + approval workflow |
| 8.2 Fuel Card Management | Provider CRUD + card transaction import |
| 8.3 Reconciliation | Match card charges to expense records; approve / dispute |
| 8.4 Reports | IFTA compliance, theft summary, cost analysis |
| 8.5 Live Fuel Monitor *(new)* | Real-time vehicle fuel levels from GPS devices |

---

## 8.1 Fuel Expenses

### 8.1.1 Screen Layout

**Purpose:** Fleet managers log, review, and approve manual fuel purchase records.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [+ Log Expense]   Search: [____________]   Status: [All ▾]          │
│  Vehicle: [All ▾]  Driver: [All ▾]  Date: [Start] → [End]  [Export] │
├────┬────────────┬───────────────┬────────┬─────────┬────────┬────────┤
│ ID │ Date       │ Vehicle       │ Driver │ Vol (L) │ Cost ₦ │ Status │
├────┼────────────┼───────────────┼────────┼─────────┼────────┼────────┤
│ 42 │ 2026-03-08 │ LND-123-XY   │ Chukwu │  35.0   │ 26,775 │ ⏳ Pending │
│    │            │               │        │         │        │ [✓ Approve] [✗ Reject] │
├────┼────────────┼───────────────┼────────┼─────────┼────────┼────────┤
│ 41 │ 2026-03-07 │ ABJ-567-ZZ   │ Aminu  │  50.0   │ 36,250 │ ✅ Approved │
│    │            │               │        │         │        │ Source: Card │
└────┴────────────┴───────────────┴────────┴─────────┴────────┴────────┘
```

**List columns:**

| Column | Source field | Notes |
|--------|-------------|-------|
| Date | `attributes.entry_date` | |
| Vehicle | `relationships.vehicle.registration_number` | |
| Driver | `relationships.driver.name` | |
| Volume (L) | `attributes.volume` | |
| Cost (₦) | `attributes.amount` | `volume × cost_per_volume` |
| Status | `attributes.status` | badge; see colour table below |
| Source | `attributes.source` | `manual` or `card` badge |
| Actions | — | context-sensitive per status |

**Status badge colours:**

| Status | Badge |
|--------|-------|
| `pending_approval` | Amber `⏳` |
| `approved` | Green `✅` |
| `rejected` | Red `✗` |
| `reimbursed` | Blue `💳` |

**Approval workflow (roles: `fleet_manager`, `administrator`):**
- `pending_approval` → **Approve** button → calls approve endpoint
- `pending_approval` / `rejected` → **Reject** button → opens reason modal → calls reject endpoint
- Approved/reimbursed records: actions hidden; show approver name + timestamp in tooltip

---

### 8.1.2 API: List Fuel Expenses

```
GET /v1/fuel-expenses
```

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
| `q` | string | — | Search across vehicle, driver, reference |
| `status` | string | — | `pending_approval` \| `approved` \| `rejected` \| `reimbursed` |
| `vehicle_id` | int | — | Filter by vehicle |
| `user_id` | int | — | Filter by driver |
| `start_date` | date | — | `YYYY-MM-DD` |
| `end_date` | date | — | `YYYY-MM-DD` |
| `per_page` | int | 10 | Max 100 |
| `sortBy` | string | `entry_date` | `entry_date` \| `created_at` |
| `orderBy` | string | `desc` | `asc` \| `desc` |

**Sample response `200`:**
```json
{
  "message": "success",
  "data": {
    "fuel_expenses": [
      {
        "id": 42,
        "attributes": {
          "volume": 35.0,
          "cost_per_volume": 765.0,
          "amount": 26775.0,
          "currency": "NGN",
          "purchase_from": "Total Energy Station VI",
          "reference_number": "REF-00042",
          "status": "pending_approval",
          "entry_date": "2026-03-08",
          "approved_at": null
        },
        "relationships": {
          "vehicle": {
            "id": 14,
            "registration_number": "LND-123-XY",
            "make": "Toyota",
            "model": "Hilux"
          },
          "driver": {
            "id": 7,
            "name": "Chukwuemeka Obi",
            "email": "c.obi@fleet.com"
          }
        }
      }
    ],
    "pagination": {
      "total": 93,
      "per_page": 10,
      "current_page": 1,
      "last_page": 10
    }
  },
  "status": 200
}
```

---

### 8.1.3 API: Create Fuel Expense

```
POST /v1/fuel-expenses
```

**Body:**
```json
{
  "vehicle_id": 14,
  "user_id": 7,
  "cost_per_volume": 765.00,
  "volume": 35.0,
  "status": "pending_approval",
  "purchase_from": "Total Energy Station VI",
  "reference_number": "REF-00042",
  "entry_date": "2026-03-08"
}
```

**Validation errors** follow custom pointer format — do NOT read `errors.{field}`:
```json
{
  "errors": [
    {
      "status": "422",
      "detail": "The volume field is required.",
      "source": { "pointer": "/data/attributes/volume" }
    }
  ]
}
```

---

### 8.1.4 API: Approve / Reject

```
POST /v1/fuel-expenses/{id}/approve
POST /v1/fuel-expenses/{id}/reject
```

**Body for reject:**
```json
{ "reason": "Receipt not attached." }
```

**Sample response `200` (approve):**
```json
{
  "message": "Fuel expense approved",
  "data": {
    "id": 42,
    "attributes": {
      "status": "approved",
      "approved_at": "2026-03-08T11:05:00+01:00"
    },
    "relationships": {
      "vehicle": { "id": 14, "registration_number": "LND-123-XY" },
      "driver":  { "id": 7,  "name": "Chukwuemeka Obi" }
    }
  },
  "status": 200
}
```

**Business rules (surface as toasts):**
- Can only approve from `pending_approval` or `rejected`
- Can only reject from `pending_approval`
- API returns `422` with `errors[0].detail` for violations

---

### 8.1.5 API: Update / Delete

```
PUT    /v1/fuel-expenses/{id}
DELETE /v1/fuel-expenses/{id}   → 204 No Content
```

---

### 8.1.6 API: Export CSV

```
GET /v1/fuel-expenses/export
```

Trigger a browser download (`Content-Disposition: attachment`). Supports the same filters as the list endpoint. Columns: id, vehicle, registration, driver, volume, cost_per_volume, amount, currency, status, purchase_from, reference_number, entry_date, approved_at.

---

### 8.1.7 API: Expense Metrics

```
GET /v1/fuel-expenses/metrics
```

**Sample response `200`:**
```json
{
  "data": {
    "total_volume": 3820.5,
    "total_cost": 2750000.00,
    "average_cost_per_liter": 720.12,
    "pending_count": 7,
    "approved_count": 84
  }
}
```

Use for KPI cards at the top of the Expenses screen.

---

## 8.2 Fuel Card Management

> **Architecture note — who does what:**
> - **Backoffice / superadmin (admin guard):** Creates and manages global provider integrations (OVH, Total, GenericCsv) — API keys, webhook secrets, sync credentials. This is a platform-level operation done by the EonsFleet team, not the client.
> - **Client portal (client guard — this document):** Fleet admin / fleet manager sets up their *organization's fuel card account* — virtual account number, which vehicles to enrol, contact details. They pick from provider types already configured by superadmin.

Two sub-tabs: **Account Setup** and **Transactions**.

---

### 8.2.1 Account Setup Sub-tab

Shown when no account exists: a blank-state wizard. Once created: account summary + enrolled vehicles list.

**Blank state:**
```
┌────────────────────────────────────────────────────────┐
│  No Fuel Card Account                                  │
│                                                        │
│  Set up your organization's fuel card account to       │
│  start tracking card transactions automatically.       │
│                                                        │
│  [Set Up Fuel Card Account]                            │
└────────────────────────────────────────────────────────┘
```

**Setup form (modal or full-page wizard):**
```
Step 1 — Choose Provider
  ○ OVH Fleet Card
  ○ TotalEnergies Fleet Card
  ○ Generic CSV Import

Step 2 — Account Details
  Account name:        [EonsFleet Total Card      ]
  Virtual acct no.:   [VAN-00193  ] (optional if not yet issued)
  Contact name:       [Chukwuemeka Obi            ]
  Contact email:      [c.obi@fleet.com            ]
  Contact phone:      [+2348012345678             ]

Step 3 — Enrol Vehicles
  [Select vehicles from org vehicle list]
  ✅ LND-123-XY  Toyota Hilux
  ✅ ABJ-567-ZZ  Isuzu D-Max
  ☐  KAN-009-YY  Ford Ranger

  [Submit Request]
```

**Active account view:**
```
┌──────────────────────────────────────────────────────────┐
│  EonsFleet Total Card                  Status: ● Active  │
│  Provider: TotalEnergies                                 │
│  Virtual Acct: VAN-00193  Contact: c.obi@fleet.com       │
│                                          [Edit Account]  │
├──────────────────────────────────────────────────────────┤
│  Enrolled Vehicles (3)                 [+ Add Vehicles]  │
├─────────────────────────┬────────────┬───────────────────┤
│ Vehicle                 │ Card Status│ Card No.          │
├─────────────────────────┼────────────┼───────────────────┤
│ LND-123-XY Toyota Hilux │ Issued     │ ****4521          │
│ ABJ-567-ZZ Isuzu D-Max  │ Requested  │ —                 │
│ KAN-009-YY Ford Ranger  │ Requested  │ —                 │
│                         │            │      [Remove]     │
└─────────────────────────┴────────────┴───────────────────┘
```

**Account status badges:**

| Status | Badge |
|--------|-------|
| `pending` | Amber — awaiting platform activation |
| `active` | Green |
| `suspended` | Red |
| `rejected` | Red — show rejection reason |

**Vehicle card status:**

| Status | Meaning |
|--------|---------|
| `requested` | Card requested, not yet issued |
| `issued` | Physical/virtual card active |
| `blocked` | Card blocked by provider |

---

#### 8.2.1-A API: Get Available Provider Types

```
GET /v1/fuel-card/provider-types
```

No params. Returns the list of provider types configured by the platform.

**Sample response `200`:**
```json
{
  "data": {
    "provider_types": [
      { "slug": "ovh",         "label": "OVH Fleet Card" },
      { "slug": "total",       "label": "TotalEnergies Fleet Card" },
      { "slug": "generic_csv", "label": "Generic CSV Import" }
    ]
  }
}
```

Call this to populate the Step 1 provider selector.

---

#### 8.2.1-B API: Get Organization's Fuel Card Account

```
GET /v1/fuel-card/account
```

Returns the org's current account with enrolled vehicles. `404` if no account yet.

**Sample response `200`:**
```json
{
  "data": {
    "account": {
      "id": 1,
      "provider_type": "total",
      "account_name": "EonsFleet Total Card",
      "virtual_account_number": "VAN-00193",
      "contact_name": "Chukwuemeka Obi",
      "contact_email": "c.obi@fleet.com",
      "contact_phone": "+2348012345678",
      "vehicle_count_requested": 3,
      "status": "active",
      "activated_at": "2026-03-01T09:00:00+01:00",
      "rejection_reason": null,
      "requested_at": "2026-02-28T14:30:00+01:00",
      "requester": { "id": 7, "name": "Chukwuemeka Obi" },
      "vehicles": [
        {
          "id": 14,
          "registration_number": "LND-123-XY",
          "make": "Toyota",
          "model": "Hilux",
          "card_status": "issued",
          "card_number_last4": "4521",
          "assigned_at": "2026-02-28T14:30:00+01:00"
        },
        {
          "id": 17,
          "registration_number": "ABJ-567-ZZ",
          "make": "Isuzu",
          "model": "D-Max",
          "card_status": "requested",
          "card_number_last4": null,
          "assigned_at": "2026-02-28T14:30:00+01:00"
        }
      ],
      "metadata": null
    }
  }
}
```

---

#### 8.2.1-C API: Create Fuel Card Account (Submit Request)

```
POST /v1/fuel-card/account
```

**Body:**
```json
{
  "provider_type": "total",
  "account_name": "EonsFleet Total Card",
  "virtual_account_number": "VAN-00193",
  "contact_name": "Chukwuemeka Obi",
  "contact_email": "c.obi@fleet.com",
  "contact_phone": "+2348012345678",
  "vehicle_ids": [14, 17, 22],
  "metadata": { "billing_cycle": "monthly" }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `provider_type` | yes | `ovh` \| `total` \| `generic_csv` |
| `account_name` | yes | Friendly name |
| `vehicle_ids` | yes | Min 1 vehicle owned by the org |
| `virtual_account_number` | no | If already issued by provider |
| `contact_*` | no | Contact person details |
| `metadata` | no | Any extra provider-specific fields |

**Sample response `201`:**
```json
{
  "message": "Fuel card account request submitted successfully.",
  "data": {
    "account": {
      "id": 1,
      "status": "pending",
      "provider_type": "total",
      "account_name": "EonsFleet Total Card",
      "vehicle_count_requested": 3,
      "vehicles": [ ... ],
      "requested_at": "2026-03-08T11:30:00+01:00"
    }
  },
  "status": 201
}
```

After submission show a confirmation banner: *"Your fuel card account request has been submitted. The EonsFleet team will activate it shortly."*

---

#### 8.2.1-D API: Update Account Details

```
PUT /v1/fuel-card/account/{account_id}
```

All fields optional. Used to update contact info or virtual account number after activation.

**Body:**
```json
{
  "contact_name": "Aminu Danladi",
  "contact_email": "a.danladi@fleet.com",
  "virtual_account_number": "VAN-00193-B"
}
```

---

#### 8.2.1-E API: Add Vehicles to Account

```
POST /v1/fuel-card/account/{account_id}/vehicles
```

**Body:**
```json
{ "vehicle_ids": [25, 30] }
```

**Sample response `200`:**
```json
{
  "message": "Vehicles added to account.",
  "data": { "account": { "id": 1, "vehicle_count_requested": 5, "vehicles": [ ... ] } }
}
```

---

#### 8.2.1-F API: Remove Vehicle from Account

```
DELETE /v1/fuel-card/account/{account_id}/vehicles/{vehicle_id}
```

**Sample response `200`:**
```json
{ "message": "Vehicle removed from account." }
```

---

### 8.2.2 Card Transactions Sub-tab

Transactions flow in automatically once the account is active and the provider is syncing. The client can also ingest CSV exports manually.

```
┌──────────────────────────────────────────────────────────────────┐
│  [Ingest CSV/JSON]   Date: [Start]→[End]   Vehicle: [All ▾]      │
├────┬────────────┬──────────────┬──────────┬──────────┬───────────┤
│ ID │ Date       │ Merchant     │ Vol (L)  │ Amount   │ Status    │
├────┼────────────┼──────────────┼──────────┼──────────┼───────────┤
│ 12 │ 2026-03-07 │ Total Lekki  │  50.0    │ ₦36,250  │ Unmatched │
│    │            │ ****4521     │          │          │ [Link Vehicle] [→ Expense] │
├────┼────────────┼──────────────┼──────────┼──────────┼───────────┤
│ 11 │ 2026-03-06 │ OVH Ikeja    │  40.0    │ ₦29,000  │ Matched   │
│    │            │ ****9812     │          │          │ Linked: ABJ-567-ZZ │
└────┴────────────┴──────────────┴──────────┴──────────┴───────────┘
```

---

#### 8.2.2-A API: List Card Transactions

```
GET /v1/fuel-card/transactions
```

| Query param | Type | Description |
|-------------|------|-------------|
| `vehicle_id` | int | Filter by vehicle |
| `start_date` | date | `YYYY-MM-DD` |
| `end_date` | date | `YYYY-MM-DD` |
| `per_page` | int | Default 15 |

**Sample response `200`:**
```json
{
  "data": {
    "fuel_card_transactions": [
      {
        "id": "12",
        "attributes": {
          "external_id": "TOTAL-20260307-00112",
          "card_number_last4": "4521",
          "merchant_name": "Total Lekki Phase 1",
          "amount": 36250.00,
          "volume_liters": 50.0,
          "currency": "NGN",
          "transaction_date": "2026-03-07",
          "jurisdiction_code": "NG-LA",
          "vehicle_id": null,
          "fuel_expense_id": null,
          "status": "unmatched",
          "provider": "total"
        },
        "relationships": {}
      }
    ],
    "pagination": { "total": 48, "per_page": 15, "current_page": 1, "last_page": 4 }
  }
}
```

---

#### 8.2.2-B API: Link Transaction to Vehicle

```
POST /v1/fuel-card/transactions/{id}/link-vehicle
```

**Body:** `{ "vehicle_id": 14 }`

**Sample response `200`:**
```json
{
  "message": "Vehicle linked",
  "data": { "fuel_card_transaction": { "id": "12", "attributes": { "vehicle_id": 14 } } }
}
```

---

#### 8.2.2-C API: Create Expense from Card Transaction

```
POST /v1/fuel-card/transactions/{id}/create-expense
```

No body. Returns `400` if expense already exists for this transaction.

**Sample response `201`:**
```json
{
  "message": "Expense created successfully",
  "data": { "expense": { "id": 55, "attributes": { "volume": 50.0, "status": "pending_approval" } } },
  "status": 201
}
```

---

#### 8.2.2-D API: Ingest Card Data (CSV / JSON)

```
POST /v1/fuel-card/ingest
Content-Type: multipart/form-data
```

| Field | Required | Description |
|-------|----------|-------------|
| `file` | if no `transactions` | CSV or JSON, max 10 MB |
| `transactions` | if no `file` | Array of transaction objects |
| `provider` | optional | `ovh` \| `total` \| `generic_csv` |

**Sample response `200`:**
```json
{ "message": "Fuel card data ingested", "data": { "created": 14, "skipped": 2 } }
```

---

## 8.3 Reconciliation

**Purpose:** Match fuel card transactions (what was charged) against expense records (what was reported). Flag and resolve discrepancies.

```
┌──────────────────────────────────────────────────────────────────┐
│  Date: [Start]→[End]   Vehicle: [All ▾]   [▶ Run Auto-match]    │
│                                                                  │
│  Summary  ┌──────────┐  ┌────────────────┐  ┌────────────────┐  │
│           │ Matched  │  │ Unmatched Txns │  │Unmatched Exps. │  │
│           │    28    │  │       6        │  │       4        │  │
│           └──────────┘  └────────────────┘  └────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  DISCREPANCIES requiring review:                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Card: Total Lekki · 50 L · ₦36,250 · 2026-03-07          │   │
│  │ Expense: LND-123-XY · Chukwu · 35 L · ₦26,775           │   │
│  │ ⚠ Volume discrepancy: 30%                               │   │
│  │ [✓ Approve Match]  [⚐ Dispute]  [↔ Re-match]             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

### 8.3.1 API: Get Reconciliation Report

```
GET /v1/fuel-reconciliation/report
```

| Query param | Type | Description |
|-------------|------|-------------|
| `start_date` | date | Period start (`YYYY-MM-DD`) |
| `end_date` | date | Period end |
| `vehicle_id` | int | Optional vehicle filter |

**Sample response `200`:**
```json
{
  "data": {
    "period": { "start": "2026-03-01", "end": "2026-03-08" },
    "summary": {
      "matched_count": 28,
      "unmatched_transactions_count": 6,
      "unmatched_expenses_count": 4,
      "variance_flagged_count": 3
    },
    "matched": [
      {
        "id": 45,
        "attributes": {
          "type": "fill",
          "amount_liters": 50.0,
          "occurred_at": "2026-03-06T16:30:00+01:00",
          "fuel_expense_id": 41
        },
        "relationships": { "vehicle": { "id": 14, "registration_number": "LND-123-XY" } }
      }
    ],
    "unmatched_transactions": [],
    "unmatched_expenses": [],
    "variance_flagged": [
      {
        "transaction": { "id": 45, "attributes": { "amount_liters": 50.0 } },
        "expense": { "id": 42, "attributes": { "volume": 35.0 } },
        "variance_percent": 30.0,
        "device_liters": 50.0,
        "manual_liters": 35.0
      }
    ]
  }
}
```

> ⚠️ **Frontend gap:** Use `GET /fuel-reconciliation/report` for the full summary view, not just `discrepancies`. The report gives the complete picture (matched + unmatched + flagged).

---

### 8.3.2 API: Run Auto-reconciliation

```
POST /v1/fuel-reconciliation/run
```

| Query param | Type | Description |
|-------------|------|-------------|
| `start_date` | date | Default: 30 days ago |
| `end_date` | date | Default: today |
| `vehicle_id` | int | Optional |

**Sample response `200`:**
```json
{
  "message": "Reconciliation completed",
  "data": {
    "matched_count": 6,
    "unmatched_transactions_count": 2,
    "unmatched_expenses_count": 1,
    "matched": [
      {
        "transaction": { "id": 45, "attributes": { "amount_liters": 50.0 } },
        "expense": { "id": 41, "attributes": { "volume": 50.0 } },
        "variance_percent": 0.0
      }
    ]
  }
}
```

Show a loading spinner during the call; refresh the report view on success.

---

### 8.3.3 API: Get Discrepancies (Card-level quick view)

```
GET /v1/fuel-reconciliation/discrepancies
```

| Query param | Type | Description |
|-------------|------|-------------|
| `vehicle_id` | int | — |
| `start_date` | date | — |
| `end_date` | date | — |
| `per_page` | int | Default 15 |

**Sample response `200`:**
```json
{
  "data": {
    "discrepancies": [
      {
        "id": "12",
        "attributes": {
          "merchant_name": "Total Lekki Phase 1",
          "volume_liters": 50.0,
          "amount": 36250.00,
          "transaction_date": "2026-03-07",
          "vehicle_id": 14,
          "fuel_expense_id": 41,
          "status": "needs_review",
          "provider": "total"
        }
      }
    ],
    "pagination": { "total": 6, "per_page": 15, "current_page": 1, "last_page": 1 }
  }
}
```

---

### 8.3.4 API: Approve / Dispute / Manual Match (Card transactions)

```
POST /v1/fuel-card/transactions/{id}/approve
POST /v1/fuel-card/transactions/{id}/dispute
POST /v1/fuel-card/transactions/{id}/match
```

**Body for dispute:**
```json
{ "reason": "Volume does not match station receipt." }
```

**Body for match:**
```json
{ "fuel_transaction_id": 45 }
```

**Match response `200`:**
```json
{
  "message": "Transaction matched successfully",
  "data": {
    "transaction": { "id": "12", "attributes": { "status": "matched", "discrepancy_percent": 4.2 } },
    "matched_to": { "id": 45, "attributes": { "amount_liters": 50.0 } },
    "discrepancy_percent": 4.2
  }
}
```

---

### 8.3.5 API: Manual Link / Unlink Expense ↔ Device Transaction

```
POST /v1/fuel-expenses/{id}/link-transaction     body: { "fuel_transaction_id": 45 }
POST /v1/fuel-expenses/{id}/unlink-transaction   no body
```

---

## 8.4 Reports Tab

Three sub-tabs: **IFTA**, **Theft Summary**, **Cost Analysis**.

---

### 8.4.1 IFTA Compliance Report

**Purpose:** Quarterly fuel and distance summary by jurisdiction for tax filing.

```
┌────────────────────────────────────────────────────┐
│  Quarter: [Q1 ▾]   Year: [2026]   [Generate]       │
├────────────────────────────────────────────────────┤
│  Jurisdiction  │ Distance (km) │ Fuel Used (L)      │
│  NG-LA         │    12,400     │    1,560            │
│  NG-AB         │     4,300     │      620            │
│                                                    │
│  Note: Distance estimated from fuel consumption    │
└────────────────────────────────────────────────────┘
```

```
GET /v1/fuel/compliance/ifta-report?quarter=1&year=2026
```

Both `quarter` (1–4) and `year` are required.

**Sample response `200`:**
```json
{
  "message": "IFTA report",
  "data": {
    "quarter": 1,
    "year": 2026,
    "by_jurisdiction": [
      { "jurisdiction": "NG-LA", "distance_km": 12400, "fuel_liters": 1560.4 },
      { "jurisdiction": "NG-AB", "distance_km": 4300,  "fuel_liters": 620.0 }
    ],
    "distance_source": "fuel_based_estimate"
  }
}
```

---

### 8.4.2 Theft Summary Report

**Purpose:** List anomalous fuel drain events detected by GPS devices.

```
┌────────────────────────────────────────────────────────────────┐
│  Date: [Start]→[End]   [Download CSV]                          │
├──────────────────────────────────────────────────────────────  │
│  Total incidents: 4   Total lost: 72.5 L                       │
├──────────────┬──────────────┬──────────┬────────┬─────────────┤
│ Vehicle       │ Date & Time  │ Lost (L) │ Confid.│ Location   │
├──────────────┼──────────────┼──────────┼────────┼─────────────┤
│ LND-123-XY   │ 08 Mar 09:41 │   18.0   │  92%   │ Victoria Is │
└──────────────┴──────────────┴──────────┴────────┴─────────────┘
```

```
GET /v1/fuel/reports/theft-summary?start_date=2026-03-01&end_date=2026-03-08
```

**Sample response `200`:**
```json
{
  "message": "Theft summary report",
  "data": {
    "total_incidents": 4,
    "total_liters_lost": 72.5,
    "vehicles_affected": [14, 17],
    "incidents": [
      {
        "vehicle_id": 14,
        "registration_number": "LND-123-XY",
        "alert_id": 88,
        "liters_lost": 18.0,
        "confidence": 0.92,
        "occurred_at": "2026-03-08T09:41:00+01:00",
        "location": { "lat": 6.4541, "lng": 3.3947, "address": "Victoria Island, Lagos" }
      }
    ]
  }
}
```

---

### 8.4.3 Cost Analysis Report

**Purpose:** Breakdown of fuel spend by vehicle and driver.

> ⚠️ **Frontend gap:** `GET /v1/fuel/reports/cost-analysis` is implemented but the per-vehicle / per-driver breakdown shape should be verified with a live test call before building the table — the service layer may return additional or different fields than listed below.

```
┌────────────────────────────────────────────────────────────────┐
│  Date: [Start]→[End]                                           │
├──────────────────────────────────────────────────────────────  │
│  Total Spend: ₦2,750,000   Total Volume: 3,820.5 L             │
│  Avg Cost/L: ₦720.12                                           │
├──────────────────────────────┬──────────────┬──────────────────┤
│ Vehicle                      │ Volume (L)   │ Cost (₦)         │
├──────────────────────────────┼──────────────┼──────────────────┤
│ LND-123-XY  Toyota Hilux    │    720.5     │   519,962        │
│ ABJ-567-ZZ  Isuzu D-Max     │    540.0     │   389,880        │
└──────────────────────────────┴──────────────┴──────────────────┘
```

```
GET /v1/fuel/reports/cost-analysis?start_date=2026-03-01&end_date=2026-03-08
```

**Sample response `200`:**
```json
{
  "message": "Cost analysis report",
  "data": {
    "total_cost_kobo": 275000000,
    "total_volume_liters": 3820.5,
    "average_cost_per_liter_kobo": 71980,
    "by_vehicle": [
      {
        "vehicle_id": 14,
        "registration_number": "LND-123-XY",
        "make": "Toyota",
        "model": "Hilux",
        "total_cost_kobo": 51996200,
        "total_liters": 720.5
      }
    ]
  }
}
```

Money display: `total_cost_kobo / 100` → format as `₦ {value:,.2f}`.

---

## 8.5 Live Fuel Monitor *(GPS-device fuel levels)*

**Gate:** Only shown when the org has at least one device with `has_fuel = true`. If none, show empty state: *"No GPS devices with fuel monitoring configured."*

**Purpose:** Real-time fuel level for every fuel-capable vehicle — bridges GPS telemetry to the expense workflow.

```
┌─────────────────────────────────────────────────────────────────┐
│  Live Fuel Monitor         Search: [________]                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ ● ONLINE          │  │ ● OFFLINE        │                    │
│  │ LND-123-XY        │  │ ABJ-567-ZZ       │                    │
│  │ Toyota Hilux      │  │ Isuzu D-Max      │                    │
│  │                   │  │                  │                    │
│  │   [Gauge Arc 53%] │  │ [Grey Gauge]     │                    │
│  │   53% · 42.5 L    │  │  No data yet     │                    │
│  │   Tank: 80 L      │  │  Tank: 76 L      │                    │
│  │   10:22 AM        │  │  — offline —     │                    │
│  │                   │  │                  │                    │
│  │ [Detail] [⚠ 2]   │  │ [Detail]         │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

**Gauge colour thresholds:**

| Level | Colour |
|-------|--------|
| `> 75%` | Blue (full) |
| `25–75%` | Green (OK) |
| `10–25%` | Amber (low) |
| `< 10%` | Red (critical) |

---

### 8.5.1 API: List Fuel-Enabled Vehicles

```
GET /v1/fuel/vehicles
```

| Query param | Type | Default | Description |
|-------------|------|---------|-------------|
| `per_page` | int | 15 | Max 100 |
| `search` | string | — | Filter by plate, make, model |

**Sample response `200`:**
```json
{
  "data": {
    "vehicles": [
      {
        "id": 14,
        "attributes": {
          "registration_number": "LND-123-XY",
          "make": "Toyota",
          "model": "Hilux",
          "fuel_type": "diesel",
          "fuel_capacity": 80.0,
          "device_imei": "359670108990001",
          "device_online": true
        },
        "fuel_level": {
          "fuel_level_liters": 42.5,
          "fuel_level_percent": 53.13,
          "last_updated": "2026-03-08T10:22:00+01:00",
          "tank_capacity": 80.0,
          "data_quality_score": 0.95
        }
      },
      {
        "id": 17,
        "attributes": {
          "registration_number": "ABJ-567-ZZ",
          "make": "Isuzu",
          "model": "D-Max",
          "fuel_type": "diesel",
          "fuel_capacity": 76.0,
          "device_imei": "359670108990002",
          "device_online": false
        },
        "fuel_level": null
      }
    ],
    "pagination": { "total": 24, "per_page": 15, "current_page": 1, "last_page": 2 }
  }
}
```

`fuel_level: null` → device has never transmitted a reading; render grey gauge with *"Awaiting first reading"*.

---

### 8.5.2 API: Vehicle Current Fuel Level

```
GET /v1/fuel/vehicles/{vehicle_id}/current
```

Always returns vehicle metadata. `fuel_level` is `null` when no readings exist yet.

**Sample response `200`:**
```json
{
  "data": {
    "vehicle": {
      "id": 14,
      "registration_number": "LND-123-XY",
      "make": "Toyota",
      "model": "Hilux",
      "fuel_type": "diesel",
      "fuel_capacity": 80.0,
      "device_imei": "359670108990001",
      "device_has_fuel": true,
      "device_online": true
    },
    "fuel_level": {
      "fuel_level_liters": 42.5,
      "fuel_level_percent": 53.13,
      "last_updated": "2026-03-08T10:22:00+01:00",
      "tank_capacity": 80.0
    }
  }
}
```

---

### 8.5.3 API: Vehicle Fuel History (Chart Data)

```
GET /v1/fuel/vehicles/{vehicle_id}/history?start_date=2026-03-01&end_date=2026-03-08
```

**Sample response `200`:**
```json
{
  "data": {
    "history": [
      {
        "timestamp": "2026-03-01T08:00:00+01:00",
        "fuel_level_liters": 78.2,
        "fuel_level_percent": 97.75,
        "data_quality_score": 1.0
      },
      {
        "timestamp": "2026-03-08T10:22:00+01:00",
        "fuel_level_liters": 42.5,
        "fuel_level_percent": 53.13,
        "data_quality_score": 0.95
      }
    ]
  }
}
```

Plot `fuel_level_percent` on Y-axis. Mark points where `data_quality_score < 0.6` with a hollow circle or dotted segment to signal unreliable readings.

---

### 8.5.4 API: Vehicle Fuel Abnormalities

```
GET /v1/fuel/vehicles/{vehicle_id}/abnormalities
```

| Query param | Type | Description |
|-------------|------|-------------|
| `type` | string | `theft` \| `sudden_drop` \| `low_fuel` \| `refuel` \| `sensor_malfunction` |
| `status` | string | `active` \| `acknowledged` \| `resolved` \| `false_positive` |
| `start_date` | date | — |
| `end_date` | date | — |
| `per_page` | int | Default 15 |

**Sample response `200`:**
```json
{
  "data": {
    "abnormalities": [
      {
        "id": 88,
        "attributes": {
          "fuel_transaction_id": 45,
          "alert_time": "2026-03-08T09:41:00+01:00",
          "type": "theft",
          "previous_fuel_level": 42.0,
          "current_fuel_level": 24.0,
          "difference": 18.0,
          "unit": "L",
          "location": { "lat": 6.4541, "lng": 3.3947, "address": "Victoria Island, Lagos" },
          "confidence": 0.92,
          "status": "active",
          "acknowledged_by": null,
          "acknowledged_at": null,
          "resolved_by": null,
          "resolved_at": null,
          "resolution_notes": null
        },
        "relationships": {
          "vehicle": { "id": 14, "name": null, "registration_number": "LND-123-XY" }
        }
      }
    ],
    "pagination": { "total": 6, "per_page": 15, "current_page": 1, "last_page": 1 }
  }
}
```

**Alert type icons:**

| Type | Icon | Colour |
|------|------|--------|
| `theft` | 🔒 | Red |
| `sudden_drop` | ⬇ | Orange |
| `low_fuel` | ⚠ | Amber |
| `refuel` | ⛽ | Green |
| `sensor_malfunction` | 🔧 | Blue-grey |

---

## 8.6 Alert Actions (Shared)

Called from the Abnormalities tab (8.5.4) and any alert feed.

```
POST /v1/fuel-alerts/{id}/acknowledge
POST /v1/fuel-alerts/{id}/resolve
POST /v1/fuel-alerts/{id}/false-positive
```

**Body for resolve / false-positive (optional):**
```json
{ "notes": "Confirmed with driver. Tank accidentally siphoned at depot." }
```

**Sample response `200`:**
```json
{
  "message": "Alert acknowledged",
  "data": {
    "id": 88,
    "attributes": {
      "status": "acknowledged",
      "acknowledged_by": 3,
      "acknowledged_at": "2026-03-08T11:05:00+01:00"
    }
  }
}
```

**Business rules:** Only `active` can be acknowledged. `active` or `acknowledged` can be resolved or marked false-positive. API returns `422` on violation.

---

## 8.7 Settings

```
GET /v1/fuel-settings
PUT /v1/fuel-settings
```

**Body (PUT):**
```json
{
  "low_fuel_threshold_percent": 15,
  "low_fuel_alert_enabled": true,
  "sensor_malfunction_alert_enabled": true,
  "sensor_malfunction_invalid_count": 5,
  "alert_deduplication_hours": 24
}
```

---

## 9. Global UX Patterns

### 9.1 Real-time WebSocket Events

Subscribe via Laravel Echo / Reverb on channel `private-org.{org_id}`:

| Event | Payload | UI action |
|-------|---------|-----------|
| `FuelLevelUpdated` | `{ vehicle_id, fuel_level_liters, fuel_level_percent, recorded_at }` | Update gauge + timestamp in-place |
| `FuelAlertBroadcast` | `{ alert_id, vehicle_id, registration_number, type, difference, unit }` | Toast: *"🔴 Theft Detected — LND-123-XY lost 18 L"* |

---

### 9.2 Error Handling

| HTTP | Meaning | UI |
|------|---------|-----|
| 400 | Bad request | Toast with `message` |
| 401 | Unauthenticated | Redirect to login |
| 402 | Plan not subscribed | Growth+ upgrade modal |
| 403 | Permission denied | Toast: "You don't have permission" |
| 404 | Not found | Empty state + back button |
| 422 | Business rule violation | Toast: `errors[0].detail` |
| 500 | Server error | Generic error screen |

Validation errors use the custom pointer format — read `errors[n].source.pointer` and `errors[n].detail`, not `errors.{field}`:
```json
{ "errors": [{ "status": "422", "detail": "The volume field is required.", "source": { "pointer": "/data/attributes/volume" } }] }
```

---

### 9.3 Empty States

| Screen | Message |
|--------|---------|
| Live Monitor — no devices | "No GPS devices with fuel monitoring configured. Enable fuel support in Device settings." |
| Vehicle — no readings | "No fuel readings yet. Readings will appear once the device starts transmitting." |
| Abnormalities — no alerts | "No fuel abnormalities detected for this vehicle." |
| Expenses — no records | "No fuel expenses logged yet. Click '+ Log Expense' to get started." |
| Reconciliation — all clear | "Everything reconciled. No discrepancies found for this period." |

---

## 10. Frontend Gaps Summary

Confirmed implemented on the **backend** — not yet wired in `lib/api/fuel.ts`:

| # | Gap | Endpoint | Priority |
|---|-----|----------|----------|
| 1 | Fuel card account setup (entire new flow) | `GET/POST/PUT /fuel-card/account` + vehicle endpoints | High |
| 2 | Provider type picker | `GET /fuel-card/provider-types` | High |
| 3 | Link card txn to vehicle | `POST /fuel-card/transactions/{id}/link-vehicle` | High |
| 4 | Full reconciliation report | `GET /fuel-reconciliation/report` (use alongside `/discrepancies`) | Medium |
| 5 | Cost analysis drilldown | `GET /fuel/reports/cost-analysis` — verify response shape first | Medium |
| 6 | Fuel monitor endpoints | `GET /fuel/vehicles`, `/current`, `/history`, `/abnormalities` | Medium |

> **Removed from client portal (backoffice only):** `POST/PUT/DELETE /fuel-card-providers` — provider CRUD is managed by superadmin in the backoffice. The client portal exposes only `GET /fuel-card-providers` (read-only) for reference.

---

## 11. Complete Route Reference

### Client Portal Routes (this document)

| Method | Endpoint | Section |
|--------|----------|---------|
| `GET` | `/fuel-expenses` | 8.1.2 |
| `POST` | `/fuel-expenses` | 8.1.3 |
| `PUT` | `/fuel-expenses/{id}` | 8.1.5 |
| `DELETE` | `/fuel-expenses/{id}` | 8.1.5 |
| `POST` | `/fuel-expenses/{id}/approve` | 8.1.4 |
| `POST` | `/fuel-expenses/{id}/reject` | 8.1.4 |
| `GET` | `/fuel-expenses/export` | 8.1.6 |
| `GET` | `/fuel-expenses/metrics` | 8.1.7 |
| `GET` | `/fuel-card/provider-types` | 8.2.1-A ⚠️ gap |
| `GET` | `/fuel-card/account` | 8.2.1-B ⚠️ gap |
| `POST` | `/fuel-card/account` | 8.2.1-C ⚠️ gap |
| `PUT` | `/fuel-card/account/{id}` | 8.2.1-D ⚠️ gap |
| `POST` | `/fuel-card/account/{id}/vehicles` | 8.2.1-E ⚠️ gap |
| `DELETE` | `/fuel-card/account/{id}/vehicles/{vehicle_id}` | 8.2.1-F ⚠️ gap |
| `GET` | `/fuel-card/transactions` | 8.2.2-A |
| `POST` | `/fuel-card/transactions/{id}/link-vehicle` | 8.2.2-B ⚠️ gap |
| `POST` | `/fuel-card/transactions/{id}/create-expense` | 8.2.2-C |
| `POST` | `/fuel-card/ingest` | 8.2.2-D |
| `GET` | `/fuel-card-providers` | read-only reference |
| `GET` | `/fuel-reconciliation/report` | 8.3.1 ⚠️ gap |
| `POST` | `/fuel-reconciliation/run` | 8.3.2 |
| `GET` | `/fuel-reconciliation/discrepancies` | 8.3.3 |
| `POST` | `/fuel-card/transactions/{id}/approve` | 8.3.4 |
| `POST` | `/fuel-card/transactions/{id}/dispute` | 8.3.4 |
| `POST` | `/fuel-card/transactions/{id}/match` | 8.3.4 |
| `POST` | `/fuel-expenses/{id}/link-transaction` | 8.3.5 |
| `POST` | `/fuel-expenses/{id}/unlink-transaction` | 8.3.5 |
| `GET` | `/fuel/compliance/ifta-report` | 8.4.1 |
| `GET` | `/fuel/reports/theft-summary` | 8.4.2 |
| `GET` | `/fuel/reports/cost-analysis` | 8.4.3 ⚠️ gap |
| `GET` | `/fuel/vehicles` | 8.5.1 |
| `GET` | `/fuel/vehicles/{id}/current` | 8.5.2 |
| `GET` | `/fuel/vehicles/{id}/history` | 8.5.3 |
| `GET` | `/fuel/vehicles/{id}/abnormalities` | 8.5.4 |
| `POST` | `/fuel-alerts/{id}/acknowledge` | 8.6 |
| `POST` | `/fuel-alerts/{id}/resolve` | 8.6 |
| `POST` | `/fuel-alerts/{id}/false-positive` | 8.6 |
| `GET` | `/fuel-settings` | 8.7 |
| `PUT` | `/fuel-settings` | 8.7 |

### Backoffice Routes (admin guard — NOT in client portal)

| Method | Endpoint | Notes |
|--------|----------|-------|
| `POST` | `/fuel-card-providers` | Create provider integration |
| `PUT` | `/fuel-card-providers/{id}` | Update provider credentials |
| `DELETE` | `/fuel-card-providers/{id}` | Remove provider |
| `POST` | `/fuel-card-providers/{id}/sync` | On-demand sync |
| `POST` | `/fuel-card-providers/{id}/test-connection` | Test credentials |
| `GET` | `/fuel-card-providers/{id}/sync-status` | Sync health |
