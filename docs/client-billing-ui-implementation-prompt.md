# Client-Facing Billing & Subscription UI/UX Implementation Prompt

This document is a self-contained brief for implementing the customer-facing (organization/tenant-side) user interface for EonsFleet's billing and subscription system. It assumes no prior familiarity with this codebase. It covers what to build, from the perspective of an organization's own users (not backoffice/admin staff), and the exact shape of every API request and response the UI will talk to.

The backend for everything described here is already built, tested, and merged. This prompt is for the frontend/UI layer and its integration with these existing APIs only. Do not design or modify backend behavior — treat the API contracts below as fixed.

A companion document (`docs/backoffice-billing-ui-implementation-prompt.md`) covers the internal admin/backoffice side of this same system (plan catalog management, refunds, PoC approvals, etc.) — that is a separate audience and separate set of endpoints from this one.

---

## 1. Context

- Every organization (tenant) using EonsFleet has exactly one active subscription at a time, to one plan, with an optional set of addons.
- New signups always start on a **14-day free trial** automatically — there is no "skip the trial" path in self-registration. Individual accounts trial the "Nano" plan; corporate accounts trial the "Starter" plan.
- A trial can be converted to a paid plan at any time before or after it expires.
- Changing plans **replaces** the current subscription with a new one rather than editing it in place — the old subscription is marked cancelled and a new one takes over, with credit given for unused time remaining.
- Money amounts are always Naira (major units, e.g. `4500` meaning ₦4,500) at the API boundary. Internally the backend stores integer kobo, but every request payload and response value you will send or receive is already in Naira — never divide or multiply by 100 yourself.
- Paying for a plan (new subscription or plan change) goes through a payment gateway (Paystack or Flutterwave, chosen server-side based on the organization's country) — the API gives you back a checkout URL to redirect the user to; the subscription only becomes active after the user completes payment there and the provider notifies the backend asynchronously.
- Invoices are generated per billing transaction and can be viewed and downloaded as PDF.
- There is also an older, separate **per-asset subscription** system (billing individual vehicles/devices rather than the whole organization) still present in the API. It is being phased out — do not invest significant UI effort here; a simple read-only list/cancel screen is enough. See Section 4.6.

## 2. Who Uses This UI

Every screen in this document is for an organization's own authenticated users (the `client` guard) — the people who signed up for or work at a customer company, not EonsFleet's internal staff. Within an organization, roles like `owner`/`administrator` are assigned at registration, but the endpoints described here are not further role-gated beyond "belongs to this organization" unless stated otherwise.

## 3. Conventions Used Throughout This Document

**Base path:** every endpoint below is prefixed with `/v1`.

**Authentication:** every endpoint (except registration and login/OTP, which are out of scope for this document) requires a valid client bearer token, and the request's `Origin` header must be the customer-facing app origin so the backend resolves the `client` guard and the correct organization (tenant) automatically. You never need to pass an organization ID explicitly on authenticated requests except where a form field explicitly asks for one.

**The success response shape is consistent across this entire client-facing surface:**
```json
{
  "message": "success",
  "data": { ... },
  "status": 200
}
```
Note the redundant `status` field duplicating the HTTP status code inside the body itself.

**The `message` string's exact wording and casing is not consistent across endpoints** — most endpoints in this document fall back to a plain lowercase `"success"` when the controller doesn't pass an explicit message, but a few pass an explicit message (sometimes capitalized "Success", sometimes a specific sentence like "Trial converted to paid subscription."). Each endpoint below shows its actual, verified message — don't assume a shared constant string across the whole API.

**One consistent error shape is used everywhere**, regardless of what went wrong (validation failure, permission denied, not found, business-rule violation):

```json
{
  "message": "Subscription does not belong to your organization.",
  "errors": [
    {
      "status": "403",
      "code": "FORBIDDEN",
      "title": "Access Denied",
      "detail": "Subscription does not belong to your organization."
    }
  ]
}
```

- `message` is always a single human-readable summary — safe to show directly in a toast/alert.
- `errors` is always an array (even when there's only one problem) — for field-level validation errors, each entry includes a `source.pointer` you can match to the specific form field.
- `status` inside each error entry is a **string**, not a number.
- Common `code` values: `VALIDATION_ERROR` (per-field form validation), `BUSINESS_RULE_VIOLATION` (a business rule was violated, HTTP 422), `FORBIDDEN` (403), `NOT_FOUND` / `RESOURCE_NOT_FOUND` (404), `UNAUTHENTICATED` (401).

**Resource envelope:** most list/show responses wrap each record as `{ "id": ..., "attributes": { ... }, "relationships": { ... } }` (a JSON:API-flavored shape). Watch for the specific exceptions called out per-endpoint below.

**Pagination:** two different pagination shapes exist depending on the endpoint — see each endpoint's notes. Don't assume they're identical.

---

## 4. Pages to Build

### 4.1 Plans & Addons (public-within-app browsing)
- A plan comparison/pricing page listing every available plan: name, description, monthly price, yearly price, vehicle limit, user limit, admin limit, and which core/advanced feature modules and addons each plan includes.
- An addon list (for attaching to a new or existing subscription).
- This is read-only browsing — no action here, just the catalog. See Section 5.1 for the response shape.

### 4.2 Current Subscription / Billing Dashboard
- A "my subscription" summary screen: current plan, status (trial/active/canceled/etc.), whether currently on a trial and when it ends, unlocked feature modules, and recent transaction history.
- If the organization has no subscription at all yet, handle a clean empty state — the API returns `null` data for this, not an error.
- **Do not build any UI element showing whether the organization is a PoC/Trial/Production account type, or its billing status (active/suspended/cancelled) as a distinct concept from subscription status** — that information is not exposed via any client-facing endpoint today. See Section 6.

### 4.3 Subscribe / Start a Paid Plan
- A checkout flow: pick a plan, pick monthly or yearly billing, optionally attach addons, then redirect the user to the payment provider's hosted checkout page.
- After the provider redirect returns the user to your app (via the `redirect_url` you supply), show a "processing payment" state — the subscription does not become active instantly; it activates once the backend's webhook handler confirms the payment, which may take a few seconds after redirect. Poll or re-fetch the current subscription rather than assuming success the instant the user lands back on your app.
- See Section 5.3 and the important payment-provider note in Section 6.

### 4.4 Convert Trial to Paid
- From the billing dashboard, when the organization is on a trial, an action to pick a plan and billing cycle and convert.
- **Important:** despite what this action sounds like, it does **not** go through the payment gateway at all — see Section 6 for a detailed explanation and how to handle it in the UI (do not build a payment-redirect flow for this specific action).

### 4.5 Change Plan
- From the billing dashboard, an action to switch to a different plan and/or billing cycle, with optional addon changes. Like subscribing fresh, this redirects to a payment provider checkout — the old subscription is credited for unused time and replaced by a new one once payment completes.
- **Important:** confirm with the backend team before relying on the redirect flow working for every organization — see the specific gap noted in Section 6 about the `redirect_url` field on this particular endpoint.

### 4.6 Cancel Subscription
- A cancel action from the billing dashboard, with a confirmation step explaining that organization data is retained for a period after cancellation (do not invent a specific number of days in your copy beyond what the backend tells you at cancel time — see the response message in Section 5.6).
- Handle: already-cancelled (422), and a subscription that isn't yours (403 — shouldn't be reachable through normal navigation, but handle it gracefully).

### 4.7 Invoices
- A paginated invoice list (filterable by status: issued, paid, void), an invoice detail view showing line items, tax, discount, credit applied, and amount due, and a PDF download/view action.
- Handle the specific case where a PDF hasn't been generated yet for an invoice (404 with a clear message) — don't treat this the same as a generic error; show "PDF not ready yet" rather than a broken-download error.

### 4.8 Transaction History
- A paginated payment transaction list (filterable by status), separate from the invoice list — transactions represent actual payment attempts/gateway charges, while invoices are the billing documents generated from them. Both are useful; don't conflate them into one screen.

### 4.9 Legacy Per-Asset Subscriptions (low priority)
- A simple read-only list of any per-asset (per-vehicle/per-device) subscriptions the organization has, with a cancel action and a small summary widget (counts by status, current monthly recurring spend). This is a legacy system being phased out — keep this screen minimal; do not build new capability on top of it.

---

## 5. API Reference

### 5.1 Plans & Addons

**GET `subscriptions/plans`** — list all plans. No parameters, no authentication required by the route itself, but it's typically shown inside the authenticated app.

Success (200):
```json
{
  "message": "success",
  "data": [
    {
      "id": 3,
      "attributes": {
        "name": "Starter",
        "description": "Best for small teams.",
        "price_monthly": 4500,
        "price_yearly": 54000,
        "has_custom_pricing": false,
        "vehicle_limit": 25,
        "user_limit": null,
        "admin_limit": null,
        "created_at": "2026-01-01 00:00:00",
        "updated_at": "2026-01-01 00:00:00"
      },
      "relationships": {
        "features": [
          { "title": "Live Tracking", "unit": null, "description": "Real-time GPS tracking." }
        ],
        "core_modules": [
          { "id": 1, "name": "Live Tracking", "slug": "live_tracking" }
        ],
        "advanced_capabilities": [
          { "id": 5, "name": "Route Optimization", "slug": "route_optimization" }
        ],
        "addons": [
          { "id": 4, "name": "Basic Reporting", "module": "basic_reporting", "price": 1500 }
        ]
      }
    }
  ],
  "status": 200
}
```
Note this plan shape (`PlansResource`) is **richer** than the one used elsewhere in the admin side of this system — it includes `core_modules`/`advanced_capabilities`/full `features` list, not just a bare feature/addon ID list. Don't assume the shape matches any other plan endpoint you may have seen documented elsewhere.

**GET `subscriptions/addons`** — list all addons.

Success (200):
```json
{
  "message": "success",
  "data": [
    { "id": 4, "attributes": { "name": "Basic Reporting", "price": 1500, "module": "basic_reporting" } }
  ],
  "status": 200
}
```

### 5.2 Current & Historical Subscriptions

**GET `subscriptions/organization/current`** — the authenticated organization's current subscription.

Success (200) — has a subscription:
```json
{
  "message": "success",
  "data": {
    "id": 91,
    "attributes": { "started_at": "2026-06-01T00:00:00Z", "ended_at": "2026-07-01T00:00:00Z", "organization_id": 42, "status": "trial" },
    "relationships": {
      "organization": { "...": "OrganizationResource" },
      "plan": {
        "id": 2, "name": "Nano", "vehicle_limit": 5, "user_limit": null, "admin_limit": null,
        "trial": true, "trial_ends_at": "2026-07-01T00:00:00Z",
        "core_modules": [{ "name": "Live Tracking", "slug": "live_tracking" }],
        "advanced_capabilities": []
      },
      "transactions": [ "...": "see 5.7" ]
    }
  },
  "status": 200
}
```
Success (200) — no subscription yet: `{ "message": "success", "data": null, "status": 200 }` — handle this as a clean "get started" empty state, not an error.

While `status` is `trial`, `core_modules`/`advanced_capabilities` list **every** feature module in the entire system, not just the plan's own features — this is intentional (trials unlock everything so the customer can evaluate the full product).

**GET `subscriptions/organization/`** — paginated list of all subscriptions the organization has ever had (history).

Success (200): `{ "message": "success", "data": { "subscriptions": [...], "paginate": { ... } }, "status": 200 }` — note the key is `paginate`, not `pagination`, on this specific endpoint (inconsistent with other list endpoints in this document — check the exact key name per endpoint, don't assume).

**GET `subscriptions/{id}`** — a specific subscription by ID (same detail shape as "current" above).

### 5.3 Subscribe (New Paid Subscription)

**POST `subscriptions/payments/initialize`**

Request body:
| Field | Type | Required | Notes |
|---|---|---|---|
| `organization_id` | integer | yes | the organization's identifier |
| `plan_id` | number | yes | |
| `billing_cycle` | string | yes | `monthly` or `yearly` |
| `addon_id` | array of integers | no | addon IDs to attach |
| `redirect_url` | string (URL) | yes | where the payment provider sends the user back after checkout |

Success (200):
```json
{
  "message": "success",
  "data": {
    "payment_url": "https://checkout.paystack.com/abc123",
    "reference": "TXN_a1b2c3d4",
    "public_key": "pk_test_xxxxxxxx"
  },
  "status": 200
}
```
Redirect the user's browser to `payment_url`. **The field is `payment_url`, not `authorization_url`** — some of this codebase's own internal docblocks use the wrong field name; go by this document and by direct inspection of the response, not by comments in the source. `public_key` is the payment provider's publishable key, useful if you're using the provider's client-side SDK/inline widget instead of a full redirect.

The subscription is created in the database immediately in an `inactive` status — it will not become `active` until the payment provider confirms payment via webhook, sometime after the user completes checkout. Poll `subscriptions/organization/current` or `subscriptions/{id}` after redirect to detect the transition.

Errors: standard 422 field validation (missing/invalid `plan_id`, `billing_cycle`, `redirect_url`, or an `organization_id` that doesn't exist).

### 5.4 Convert Trial to Paid

**POST `subscriptions/convert-trial`**

Request body: `plan_id` (integer, required, must exist), `billing_cycle` (string, required, `monthly` or `yearly`).

Success (200):
```json
{
  "message": "Trial converted to paid subscription.",
  "data": {
    "id": 91,
    "attributes": { "started_at": "...", "ended_at": "...", "organization_id": 42, "status": "active" },
    "relationships": { "organization": {}, "plan": {}, "transactions": [] }
  },
  "status": 200
}
```

**Read this carefully before building against this endpoint:** unlike Subscribe and Change Plan, this action does **not** initialize any payment at all. It directly flips the existing trial subscription's status to `active` on the chosen plan and price, with no charge, no transaction record, and no redirect. There is no `payment_url` in this response. This may be an intentional "convert now, we'll invoice you later" design, or it may be a gap where a payment step was meant to exist and is simply missing — flag this to the backend/product team before shipping a UI that promises the customer will be charged at this step, because as the backend currently behaves, they will not be charged here.

Build the UI for what actually happens: a direct confirmation ("Your trial will convert to the [Plan] plan immediately") rather than a payment redirect screen.

Error: 422 *"No active trial found for this organization."* if the organization's current subscription isn't in `trial` status.

### 5.5 Change Plan

**POST `subscriptions/change-plan`**

Request body:
| Field | Type | Required |
|---|---|---|
| `subscription_id` | integer | yes |
| `plan_id` | integer | yes |
| `billing_cycle` | string | yes |
| `addon_id` | array of integers | no |

Success (200): same `payment_url`/`reference`/`public_key` shape as Subscribe (Section 5.3) — this goes through the payment gateway too, crediting unused time from the current subscription against the new plan's price before charging the difference.

**Important gap — read before wiring this form:** this endpoint's request validation does **not** currently accept a `redirect_url` field at all, even though the underlying payment-initialization step needs one (Flutterwave specifically requires it to build the checkout link). If you send `redirect_url` in the request body, it will be silently dropped before it reaches the payment provider. Confirm with the backend team whether this needs to be added before relying on the redirect completing correctly for organizations routed to Flutterwave; do not assume it already works end-to-end.

### 5.6 Cancel Subscription

**POST `subscriptions/{id}/cancel`**

No request body.

Success (200):
```json
{
  "message": "Subscription cancelled successfully.",
  "data": {
    "id": 91,
    "attributes": { "started_at": "...", "ended_at": "...", "organization_id": 42, "status": "canceled" },
    "relationships": { "organization": {}, "plan": {}, "transactions": [] }
  },
  "status": 200
}
```

Errors: 403 *"Subscription does not belong to your organization."* (shouldn't occur through normal navigation); 422 *"Subscription is already canceled."*

### 5.7 Invoices

**GET `subscriptions/invoices`** — paginated. Query: `status` (`issued`/`paid`/`void`), `per_page` (max 100).

Success (200):
```json
{
  "message": "success",
  "data": {
    "data": [
      {
        "id": 501,
        "invoice_number": "INV-2026-000501",
        "billing_period_start": "2026-06-01",
        "billing_period_end": "2026-06-30",
        "subtotal": 4500,
        "vat": 337.5,
        "tax": 337.5,
        "tax_label": "VAT",
        "reference_currency": "NGN",
        "fx_rate": 1,
        "discount": 0,
        "credit_applied": 0,
        "amount_due": 4837.5,
        "total": 4837.5,
        "currency": "NGN",
        "status": "paid",
        "issued_at": "2026-06-01T00:05:00.000000Z",
        "pdf_available": true,
        "line_items": [
          { "id": 1, "description": "Starter plan — monthly", "quantity": 1, "unit_price": 4500, "total": 4500, "currency": "NGN" }
        ]
      }
    ],
    "meta": { "current_page": 1, "last_page": 3, "per_page": 15, "total": 42 }
  },
  "status": 200
}
```
Every money field here (`subtotal`, `vat`, `tax`, `discount`, `credit_applied`, `amount_due`, `total`, line item `unit_price`/`total`) is already in Naira — do not convert. `vat` is a deprecated alias of `tax`; use `tax`/`tax_label` for new UI, keep `vat` only if you need backward compatibility with something already reading it. This endpoint's pagination is the **raw Laravel resource-collection paginator shape** (`data`/`meta.current_page` etc.) — different from the `pagination`/`paginate` shapes used elsewhere in this document; do not reuse the same parsing logic across endpoints without checking each one.

**GET `subscriptions/invoices/{invoice}`** — single invoice, same shape as one list item above.

Error: 403 if the invoice doesn't belong to the authenticated organization (`abort(403, 'Access denied.')` — goes through the standard error envelope with `code: FORBIDDEN`).

**GET `subscriptions/invoices/{invoice}/pdf`** — streams the PDF inline (`Content-Type: application/pdf`) on success (200).

Error: 404 with `{"message": "PDF not yet generated"}` if no PDF has been generated for this invoice yet — this specific 404 does **not** follow the standard `errors` array envelope (it's a bare `message` key), so don't assume every 404 in this document has the same body shape; check this one specifically.

### 5.8 Transactions

**GET `subscriptions/transactions`** — paginated. Query: `status`, `per_page` (max 100).

Success (200):
```json
{
  "message": "success",
  "data": {
    "data": [
      {
        "id": "5001",
        "attributes": {
          "reference": "PSK_a1b2c3",
          "amount": 4500,
          "currency": "NGN",
          "payment_method": "card",
          "status": "successful",
          "paid_at": "2026-02-01T09:00:00Z",
          "created_at": "2026-02-01T08:59:50Z"
        },
        "relationships": {
          "organization": { "id": 42, "name": "Acme Fleet", "email": "support@acme.com", "identifier": "308219" },
          "subscription": { "id": 91, "billing_cycle": "monthly", "status": "active", "plan": { "id": 3, "name": "Starter" } }
        }
      }
    ],
    "meta": { "current_page": 1, "last_page": 2, "per_page": 15, "total": 23 }
  },
  "status": 200
}
```
Same raw-paginator shape caveat as invoices above. `amount` is Naira.

### 5.9 Legacy Per-Asset Subscriptions

**GET `subscriptions/assets`** — paginated. Query: `status` (`active`/`trialing`/`past_due`/`cancelled`/`expired`), `type` (`Vehicle`/`Device`), `per_page` (max 100).

**GET `subscriptions/assets/{id}`** — single asset subscription.

**GET `subscriptions/assets/summary`** — dashboard widget stats.

Success (200):
```json
{
  "message": "Success",
  "data": {
    "total": 12, "active": 10, "trialing": 0, "past_due": 1, "cancelled": 1, "expired": 0,
    "monthly_arr_kobo": 450000, "monthly_arr_naira": 4500
  },
  "status": 200
}
```
Note this one endpoint returns **both** a kobo and a Naira version of the same figure (`monthly_arr_kobo` and `monthly_arr_naira`) — use `monthly_arr_naira` for display; `monthly_arr_kobo` is exposed for completeness, not because you need to convert it yourself.

**POST `subscriptions/assets/{id}/cancel`** — cancel one asset subscription. Access continues until the current billing period ends.

Success (200): `{ "message": "Subscription cancelled. Access continues until 2026-08-01.", "data": { "...": "AssetSubscriptionResource" }, "status": 200 }`

Error: 422 *"Subscription is already cancelled or expired."*

---

## 6. Registration & Trial Start (Context Only)

Signing up is out of this document's core scope (it's an authentication flow, not a billing action), but it's where every trial begins, so the UI needs to know:

- **POST `register`** creates the user and organization together and **automatically starts the 14-day trial** — there is no separate "start trial" step and no way to sign up without one. Individual accounts trial the "Nano" plan; corporate accounts trial the "Starter" plan (or whichever plan is cheapest if that named plan doesn't exist in the current environment).
- Registration does **not** set a password. The response only contains `{ user_id, name, organization_id, email }`; the user must complete OTP verification and then set a password through separate endpoints before they can log in. Design the post-registration flow as: register → OTP verify → set password → login → land on the trial dashboard.
- **A verified gap to flag, not build around:** if organization creation fails internally for a reason like a duplicate organization name, the backend deliberately replaces that specific error with a generic *"Registration failed, please try again"* (HTTP 500) — the more useful original message is logged server-side but never reaches the response. In the normal case this rarely fires because the form's own field validation already rejects a duplicate `company.name` with a proper 422 before reaching this code path — but if you ever see a bare 500 on registration, know that it may well be a duplicate-name race condition dressed up as a generic server error, not necessarily an actual outage.

---

## 7. Error Scenarios Checklist

For every write action in this document, the UI must handle at minimum:
- **401** — session expired; redirect to login.
- **403** — the resource doesn't belong to the organization; this shouldn't be reachable through normal in-app navigation, but handle it gracefully (e.g. redirect to the relevant list screen) rather than a raw error page.
- **404** — the invoice/subscription/asset-subscription referenced no longer exists, or (invoices/pdf specifically) the PDF simply hasn't been generated yet — these are different situations, show different messages.
- **422** — validation or business-rule failure; the message and errors array are always populated with human-readable text — show it directly.
- **500** — generic failure; for registration specifically, see the caveat in Section 6.

---

## 8. Known Backend Gaps and Behavioral Surprises — Read Before Building

These are real, verified findings from reading the actual backend code, not assumptions. Do not build UI that assumes they're already solved — either request the backend change first, or scope the UI around the limitation and say so.

1. **`Convert Trial to Paid` does not process any payment.** It directly activates the subscription at the new plan's price with no charge, no transaction, no redirect. If the product intent was "charge the customer when they convert," this is missing — confirm before shipping copy that implies a charge happens here. See Section 5.4.
2. **`Change Plan`'s request validation silently drops `redirect_url`.** The payment-initialization step needs a redirect URL (Flutterwave requires it to build its checkout link), but `UpdateSubscriptionPlanRequest` doesn't accept that field, so it never reaches the provider even if the frontend sends it. This will likely break the plan-change checkout flow for organizations routed to Flutterwave specifically. See Section 5.5.
3. **No client-facing visibility into organization type (PoC/Trial/Production/Converted) or billing status (Active/Suspended/Cancelled) as distinct fields.** You cannot build a "you're on a PoC evaluation, N days left" banner, nor a "your account is suspended" banner distinct from subscription status, until these are added to a client-facing endpoint.
4. **The response field for a checkout redirect is `payment_url`, not `authorization_url`**, despite some of the backend's own inline documentation comments saying otherwise. Trust the verified shapes in this document over any comment you might see referenced elsewhere.
5. **Two different pagination shapes are used across this API surface** — a custom `{current, lastPage, total, perPage, next_page_url}` shape on subscription-history/asset-subscription lists (with the container key sometimes called `pagination` and sometimes `paginate`, inconsistently), versus Laravel's native resource-collection paginator shape (`data`/`meta.current_page`/etc.) on invoices and transactions. Do not write one shared pagination parser and assume it covers every list endpoint in this document.
6. **The invoice-PDF-not-ready 404 does not follow the standard error envelope** — it's a bare `{"message": "..."}", with no `errors` array. Handle it as a special case if your error-handling code otherwise assumes every error has an `errors` array.
7. **The per-asset subscription system is being phased out** (tracked in the backend team's own cleanup backlog) — avoid investing in it beyond the minimal read-only screen described in Section 4.9.
