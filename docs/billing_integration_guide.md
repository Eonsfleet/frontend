# EonsFleet: Subscription & Billing Integration Guide

This guide details the endpoints and logic required to build the Subscription Management and Billing UI.

---

## 1. Subscription Plans
Display available tiers (Starter, Growth, Enterprise).

- **Endpoint**: `GET /api/v1/subscriptions/plans`
- **Response Sample**:
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "Starter",
        "description": "Perfect for small fleets",
        "price_monthly": 5000,
        "price_yearly": 50000,
        "vehicle_limit": 5,
        "user_limit": 2
      },
      "relationships": {
        "core_modules": [{ "name": "Fleet Management", "slug": "fleet_management" }],
        "advanced_capabilities": []
      }
    }
  ]
}
```

---

## 2. Organization Subscription History
Show the current and past subscriptions for the organization.

- **Endpoint**: `GET /api/v1/subscriptions/organization/`
- **Response Sample**:
```json
{
  "message": "Success",
  "data": {
    "subscriptions": [
      {
        "id": 10,
        "attributes": {
          "started_at": "2026-01-01",
          "ended_at": "2026-02-01",
          "status": "expired"
        },
        "relationships": {
          "plan": { "id": 1, "name": "Starter" }
        }
      }
    ],
    "paginate": { "current_page": 1, "total": 1 }
  }
}
```

---

## 3. Invoices & Billing
List and download invoices as PDFs.

- **Endpoint**: `GET /api/v1/subscriptions/invoices`
- **Download PDF**: `GET /api/v1/subscriptions/invoices/{id}/pdf`
- **Response Sample (List)**:
```json
{
  "message": "Success",
  "data": {
    "data": [
      {
        "id": 1,
        "invoice_number": "INV-2026-001",
        "total": 5000,
        "currency": "NGN",
        "status": "paid",
        "issued_at": "2026-03-01T12:00:00Z",
        "pdf_available": true
      }
    ],
    "meta": { "current_page": 1, "last_page": 1 }
  }
}
```

---

## 4. Upgrade / Downgrade Logic

When a user clicks **Upgrade** or **Downgrade**, use the following endpoint:

- **Endpoint**: `POST /api/v1/subscriptions/change-plan`
- **Payload**:
```json
{
  "subscription_id": 12,
  "plan_id": 2,
  "billing_cycle": "monthly",
  "redirect_url": "https://yourapp.com/billing/callback"
}
```

### A. Initialization Response
This is what the API returns immediately when you call [subscribe](file:///var/www/eonsfleet/app/Services/SubscriptionService.php#34-105) or `change-plan`.
```json
{
  "message": "Success",
  "data": {
    "payment_url": "https://checkout.paystack.com/0p123abc456",
    "reference": "EONS-TXN-88776655",
    "public_key": "pk_test_a1b2c3d4e5f6g7h8i9j0"
  }
}
```

### B. Final Success Response (Polling / Current State)
Once the payment is verified via webhook/redirect, the subscription becomes `active`. The frontend should poll or fetch the current subscription to confirm.
- **Endpoint**: `GET /api/v1/subscriptions/organization/current`
- **Response Sample**:
```json
{
  "message": "Success",
  "data": {
    "id": 15,
    "attributes": {
      "started_at": "2026-03-08 11:55:00",
      "ended_at": "2026-04-07 11:55:00",
      "status": "active"
    },
    "relationships": {
      "plan": {
        "id": 2,
        "name": "Growth",
        "vehicle_limit": 50,
        "user_limit": 10
      }
    }
  }
}
```

### What happens behind the scenes?
1.  **Proration (Pending Balance)**: The backend calculates the value of the "unused time" on the current active subscription.
    *   *Example*: If you paid $100 and are halfway through the month, you have a $50 "Pending Balance".
2.  **Credit Application**: This balance is subtracted from the price of the new plan.
3.  **Payment Initialization**:
    *   If the new plan is more expensive (**Upgrade**), the system returns a Paystack/Flutterwave `authorization_url` for the difference.
    *   If the balance covers the new plan (**Downgrade**), the transaction amount is $0 (or very low), and the user just completes the process to manifest the change.
4.  **Activation**: Once the payment is confirmed via the `redirect_url` and webhook, the old subscription is marked as `ended` and the new one becomes `active`.
5.  **Entitlement Refresh**: The system automatically flushes the cache, so the user instantly gets access to the new features and increased limits (e.g., more vehicles).

---

## Pro-Tips for Frontend:
1.  **Current Status**: Always fetch `GET /api/v1/subscriptions/organization/current` on the Billing dashboard to show the user exactly what they are paying for right now.
2.  **Addons**: Remember that `GET /api/v1/subscriptions/addons` provides optional extras (like extra vehicles) that can be added during the [subscribe](file:///var/www/eonsfleet/app/Services/SubscriptionService.php#34-105) or `change-plan` process.
