# Frontend Integration: Subscription & Feature Gating

This guide explains how to use the Subscription API to dynamically control UI visibility and enforce plan-based limits in the frontend.

## 1. The Entitlement Model
Instead of hardcoding "Starter" or "Enterprise" logic, the backend provides a **Flat Capability Model**. 
- **Core Modules**: Top-level features (e.g., Vehicles, Fuel).
- **Advanced Capabilities**: Granular premium features (e.g., Custom Roles, Fuel Card VA).

## 2. API Endpoint
**`GET /api/v1/subscriptions/organization/current`**
This is the single source of truth for the active session.

### Example Response:
```json
{
  "data": {
    "attributes": {
      "status": "active"
    },
    "relationships": {
      "plan": {
        "id": 3,
        "name": "Enterprise",
        "core_modules": [
          { "name": "Vehicles", "slug": "vehicles" },
          { "name": "Webhooks", "slug": "webhooks" }
        ],
        "advanced_capabilities": [
          { "name": "Custom Roles", "slug": "custom_roles" },
          { "name": "Fuel Card Va", "slug": "fuel_card_va" }
        ]
      }
    }
  }
}
```

## 3. UI Implementation
### Feature Gating
Collect all slugs into a simple array in your Auth or Subscription context:
```javascript
const userCapabilities = [...core_modules, ...advanced_capabilities].map(m => m.slug);

// Helper function
const canAccess = (featureSlug) => userCapabilities.includes(featureSlug);
```

**Usage in Components:**
- **Navigation**: Use `canAccess('fuel')` to show/hide the Fuel menu.
- **Settings**: Use `canAccess('custom_roles')` to hide the "Create Custom Role" button.
- **Upsell**: If `!canAccess('documents')`, show a locked icon or "Upgrade to Enterprise" tooltip.

### Handling Limits
The [plan](file:///var/www/eonsfleet/app/Models/OrganizationSubscriptionModel.php#33-40) object (available in `GET /api/v1/subscriptions/plans`) provides limits.
- `vehicle_limit`: (int or null)
- `user_limit`: (int or null)
- `admin_limit`: (int or null)

**Note**: `null` means **unlimited**.

## 4. Error Handling
- **403 Forbidden**: User attempted to access a route or perform an action not in their plan. Show an "Upgrade Plan" modal.
- **402 Payment Required**: The organization is in a "Dunning" state (e.g., payment failed). Redirect to the Billing/Subscription page.

## 5. Summary of Slugs
| Category | Slugs |
| :--- | :--- |
| **Core** | [vehicles](file:///var/www/eonsfleet/app/Models/Organization.php#77-81), [drivers](file:///var/www/eonsfleet/app/Models/Vehicle.php#96-100), [users](file:///var/www/eonsfleet/app/Models/Organization.php#64-68), [fuel](file:///var/www/eonsfleet/app/Models/FuelConsumption.php#78-85), `analytics`, [maintenance](file:///var/www/eonsfleet/app/Models/Organization.php#124-128), [incident](file:///var/www/eonsfleet/app/Services/Analytics/DriverPerformanceService.php#167-197), [workflow](file:///var/www/eonsfleet/app/Models/WorkflowHistory.php#36-40), [geofence](file:///var/www/eonsfleet/app/Models/Vehicle.php#136-145), `vendors`, `notifications`, `webhooks`, [trips](file:///var/www/eonsfleet/app/Http/Controllers/Api/v1/DriverController.php#90-106), `clusters`, [documents](file:///var/www/eonsfleet/app/Models/Vehicle.php#170-174) |
| **Advanced** | `custom_roles`, `fuel_card_va`, `notification_delegation` |
