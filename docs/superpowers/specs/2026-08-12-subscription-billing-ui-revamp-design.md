# Client-Facing Subscription & Billing UI Revamp — Design

## Context

A previous session left an in-progress, uncommitted revamp of the client-facing (organization/tenant) billing UI on branch `sandbox`, guided by `docs/client-billing-ui-implementation-prompt.md`. That doc turned out to be stale — it documents the API contract as it existed *before* the July 2026 billing rebuild (verified: it's untracked in git, matches deleted code almost line-for-line, including a `change-plan` endpoint and `payment_url` field that no longer exist for the client guard). This design supersedes it with the actual `production` contract.

Two live, competing billing surfaces exist in the app today:

- `/subscription/*` — newer. Invoices (`invoices/page.tsx`, `invoices/[id]/page.tsx`) and Payments (`payments/page.tsx`) are already solid and correctly wired to the real API — no changes needed there. Dashboard (`page.tsx`) and Plan (`plan/page.tsx`) are mid-repair and still wrong in several ways (see below).
- `/billing`, `/billing/upgrade` — older, visually distinct (bold uppercase/italic vs. `/subscription`'s clean modern style), reachable from every `UpgradeGate` paywall and from the Sidebar's locked-nav-item fallback. Built on fully mocked data: `getPaymentMethods`/`addPaymentMethod`/`submitBillingRequest`/`addVehiclesBeyondCapacity` are in-memory fakes with no backing endpoint. `components/layout/AppShell.tsx` renders a raw card-number/expiry/CVC form app-wide for suspended orgs to "reactivate," which calls the fake mock and just flips local Zustand state — no real charge happens.
- `/billing/assets` — a third page, calling `/subscriptions/assets*` endpoints that were fully removed from the backend in a July 2026 migration (`drop_legacy_asset_subscription_tables`). Not fake — just dead.

Decision: retire `/billing`, `/billing/upgrade`, `/billing/assets` entirely and consolidate everything into `/subscription/*`, which becomes the one billing surface in the app.

This spec is paired with a backend spec (`2026-08-12-subscription-payment-gateway-reinstatement-design.md`, in the backend repo) that reinstates a real payment-gateway checkout step for `subscribe`/`convertToProduction`/`purchaseCapacity`/`upgrade`. This frontend work assumes that backend fix lands (or lands in parallel) — the checkout redirect flows described below depend on it.

## Verified real API contracts (production branch)

Superseding the stale spec doc:

- **No unified `change-plan`.** Separate `POST subscriptions/upgrade` / `POST subscriptions/downgrade`, each taking only `plan_id`. No `billing_cycle`, no `redirect_url` accepted by either.
- **`convert-trial` doesn't exist** (deleted 2026-07-30). Its closest living equivalent is `POST subscriptions/poc/convert` (`plan_id`, `billing_cycle`, `vehicle_ids`).
- **`subscribe`** (`POST subscriptions/payments/initialize`) needs `organization_id`, `plan_id`, `billing_cycle`, `vehicle_ids` (real fleet vehicle IDs — this is asset-based billing, there's no "just pick a plan" without picking assets).
- **Plan catalog pricing fields** are `vehicle_price_monthly`/`vehicle_price_yearly` (major units), not `price_monthly`/`price_yearly`. `PlansResource` has **no `vehicle_limit`** at all — there's no seat cap in this billing model, only per-asset pricing.
- **`SubscriptionDetailResource`** (current-subscription/show): `price`, `billing_cycle`, `vehicle_count`, `payment_state`, `is_payment_restricted`, `trial_ends_at` all live directly on `attributes`. `relationships.plan` carries `vehicle_limit`/`user_limit`/`admin_limit`/`core_modules`/`advanced_capabilities` only — no nested price or trial info.
- **No client-facing addon-attach endpoint exists at all** — `addon_id` isn't accepted by any subscription write request. Addons stay read-only browsing (`GET subscriptions/addons`).
- **`purchaseCapacity`** (`quantity`, integer) and **`reduceCapacity`** (`quantity` = new total desired capacity, not a delta) are real, working, client-guard endpoints with zero UI anywhere today.
- **`cancelSubscription`** (`POST subscriptions/{id}/cancel`) is real and already implemented in `lib/api/billing.ts`, but is never called from any page.

## Design

### Route changes

- Delete `app/(portal)/billing/page.tsx`, `app/(portal)/billing/upgrade/page.tsx`, `app/(portal)/billing/assets/page.tsx` and their route folders.
- `components/shared/UpgradeGate.tsx`: "Upgrade Plan" button → `/subscription/plan`.
- `components/layout/Sidebar.tsx`: locked-nav-item fallback href → `/subscription/plan`.
- `app/(portal)/layout.tsx`: expired-trial `router.replace('/billing')` → `/subscription`; `TRIAL_EXPIRED_ALLOWED_PATHS` (in `hooks/useAccessControl`) gains `/subscription` prefix in place of `/billing`.

### Data layer (`lib/api/billing.ts`)

- Rewrite `OrganizationSubscription`/`SubscriptionApiResponse` parsing to the verified `SubscriptionDetailResource` shape above.
- Rewrite `SubscriptionPlan`/`PlansResource` types: `vehicle_price_monthly`/`vehicle_price_yearly`, drop `vehicle_limit`/`price_monthly`/`price_yearly` fields that don't exist on this resource.
- `upgradeSubscription`/`downgradeSubscription`: keep the existing `/subscriptions/upgrade`/`/subscriptions/downgrade` routes (this part of the prior work was already correct), fix the request body to send only `plan_id`.
- Add `subscribeToPlan()` (`POST subscriptions/payments/initialize` with `organization_id`/`plan_id`/`billing_cycle`/`vehicle_ids`) and `convertPocToProduction()` (`POST subscriptions/poc/convert`), both typed to return `{ payment_url, reference, public_key }` once the backend fix ships alongside the existing invoice fields.
- Delete: `PaymentMethod*`/`getPaymentMethods`/`addPaymentMethod`/`removePaymentMethod` (fake), `BillingChangeRequest*`/`submitBillingRequest`/`getBillingRequests` (fake), `addVehiclesBeyondCapacity` (fake), all `AssetSubscription*` types/functions (dead endpoints — backing tables/routes removed from the backend).
- Wire up (already exist, never called): `cancelSubscription`, `purchaseCapacity`, `reduceCapacity`.

### Dashboard (`app/(portal)/subscription/page.tsx`)

Keep the current clean layout/structure; fix the data it reads to match the corrected `OrganizationSubscription` type above. Add: an `is_payment_restricted` banner (real field, already exposed by the backend) and a Cancel entry point.

### Plan & Capacity page (`app/(portal)/subscription/plan/page.tsx`)

One page, mode-aware action panel, keyed off the current subscription's real state:

- **No subscription** (`current === null`) → **Subscribe** mode: plan grid (with monthly/yearly toggle) + a vehicle multi-select (new component, modeled on the existing `app/(portal)/fuel/components/VehicleMultiSelect.tsx` pattern but backed by `lib/api/vehicles.ts`'s real fleet endpoint, not the fuel-scoped one) → confirm → `subscribeToPlan()` → redirect to `payment_url`. Edge case: an org with zero vehicles yet (e.g. brand new signup) sees an empty picker with no way to proceed — show "Add a vehicle to your fleet before subscribing" with a link to the vehicles page instead of a dead-end empty select.
- **POC/trial subscription** → **Convert** mode: same plan+cycle+vehicle-picker shape → `convertPocToProduction()` → redirect to `payment_url`.
- **Active production subscription** → **Change plan** mode: plan grid only, no cycle picker (can't be changed post-signup via any client endpoint) and no vehicle picker (`upgrade`/`downgrade` take only `plan_id`) → confirm → `upgradeSubscription()`/`downgradeSubscription()` chosen by comparing prices, same as the existing (correct) logic → for upgrade, redirect to `payment_url` when the response includes one (a $0 proration returns none).
- **Add / Reduce capacity**: separate card, quantity stepper, not part of the plan grid — different action shape (`quantity`-based, not plan-based). `purchaseCapacity()` redirects to `payment_url`; `reduceCapacity()` shows the returned `affected_groups` breakdown (each with `reduced_by`/`new_quantity`/`effective_at`) since it can span multiple billing groups.
- **Cancel**: confirmation dialog using the backend's actual response message verbatim — no invented retention-period copy.
- **Post-redirect return state**: `/subscription/plan?checkout=pending&reference=...` polls `getOrganizationSubscription()` (short interval, bounded retry count) until the subscription leaves `PendingActivation`/the relevant transaction settles, rather than assuming success the instant the user lands back in the app.

### `components/layout/AppShell.tsx`

Remove the card-number/expiry/CVC reactivation form entirely. Replace with a banner (reads `is_payment_restricted` off the real subscription object) linking to `/subscription`. No payment-card fields anywhere in this app's own UI, ever — real payment always happens on the provider's hosted checkout page.

### Cross-cutting: `UpgradeGate` copy (small, deliberately bounded fix)

`UpgradeGate.tsx`'s lock/unlock decision already reads real capability slugs from the real API and is correct. Its *copy* ("This is a Growth Feature") is driven by a `PlanTier` (`starter`/`growth`/`enterprise`) guessed from a substring match against the plan name — stale since the real catalog is Basic/Standard/Professional/Enterprise. Fix: stop naming a specific tier; show generic "Upgrade your plan to unlock this feature" copy instead. This does **not** extend to re-deciding which of the 11 pages currently passing `requiredPlan="growth"`/`"enterprise"` should require which real plan — that's a separate, larger feature-gating audit, explicitly out of scope here.

## Non-goals

- Addon selection/attach UI (no backing write endpoint exists for the client guard).
- Billing-cycle change on an existing subscription (no endpoint supports it).
- Re-auditing which real plan tier gates which of the 11 unrelated `UpgradeGate` call sites (reports/geofences/notifications/analytics/fuel/incidents) — flagged, not fixed, in this pass.
- Any UI for per-asset (legacy) subscriptions — the backing system was fully removed from the backend.

## Error handling

Per the (still-accurate, contract-details-aside) checklist in the old spec doc §7: 401 → redirect to login; 403 → redirect to the relevant list screen rather than a raw error page; 404 on invoice PDF → "PDF not ready yet" (bare `{"message": ...}` shape, not the standard `errors` array — already handled correctly in the existing invoice pages); 422 → show the backend's `message`/`errors` directly; failed checkout-initialization (per the backend spec's failure-handling addition) → "couldn't start checkout, try again" rather than a silent stuck state.

## Testing

- Type-check (`tsc`)/lint clean after the `lib/api/billing.ts` rewrite.
- Manual walkthrough (dev server) of: no-subscription → Subscribe → redirect → return-and-poll; POC → Convert; active org → Upgrade and Downgrade; Add capacity; Reduce capacity (multi-group breakdown); Cancel; suspended-org banner; every `UpgradeGate` paywall across the 11 consuming pages still correctly locks/unlocks (copy changed, mechanism untouched) and its "Upgrade Plan" button lands on `/subscription/plan`.
