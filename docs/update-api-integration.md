# EonsFleet API Endpoints Reference
**Complete Guide to Dashboard, Analytics, Reports, and Tracking APIs**

**Last Updated:** March 9, 2026
**Version:** 2.0
**Base URL:** `/api/v1`
**Authentication:** Bearer Token (OAuth2) required for all endpoints
**Content-Type:** `application/json`

---

## Table of Contents
1. [Dashboard Endpoints](#dashboard-endpoints)
2. [Analytics Endpoints](#analytics-endpoints)
3. [Reports Endpoints](#reports-endpoints)
4. [Geofencing Endpoints](#geofencing-endpoints)
5. [Live Tracking Endpoints](#live-tracking-endpoints)
6. [Error Codes Reference](#error-codes-reference)

---

## Dashboard Endpoints

### 1. Get Alerts
Retrieve critical and warning alerts across fuel, maintenance, and incidents.

**Endpoint:** `GET /dashboard/alerts`

**Query Parameters:**
```
- severity: string (optional, default: all)
  Values: "critical", "warning", "informational"
  Example: ?severity=critical,warning

- limit: integer (optional, default: 10, max: 50)
  Example: ?limit=20

- page: integer (optional, default: 1)
  Example: ?page=2

- type: string (optional)
  Values: "fuel", "maintenance", "incident", "device"
  Example: ?type=fuel,maintenance
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/dashboard/alerts?severity=critical,warning&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Alerts retrieved successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "type": "fuel_alert",
        "severity": "critical",
        "title": "Low Fuel Warning",
        "description": "Vehicle LND-123-XY fuel level below 10%",
        "vehicle_id": 5,
        "vehicle_registration": "LND-123-XY",
        "created_at": "2026-03-09T10:15:00Z",
        "updated_at": "2026-03-09T10:15:00Z",
        "meta": {
          "fuel_level_percent": 8,
          "fuel_level_liters": 4.2,
          "alert_type": "low_fuel"
        },
        "action_url": "/vehicles/5/fuel-management"
      },
      {
        "id": 2,
        "type": "maintenance_alert",
        "severity": "warning",
        "title": "Upcoming Maintenance",
        "description": "Vehicle ABJ-567-ZZ due for oil change in 3 days",
        "vehicle_id": 8,
        "vehicle_registration": "ABJ-567-ZZ",
        "created_at": "2026-03-08T14:30:00Z",
        "updated_at": "2026-03-08T14:30:00Z",
        "meta": {
          "service_type": "oil_change",
          "due_date": "2026-03-12",
          "days_remaining": 3
        },
        "action_url": "/maintenance/schedules/2"
      },
      {
        "id": 3,
        "type": "incident_alert",
        "severity": "critical",
        "title": "Geofence Breach",
        "description": "Vehicle KAN-009-YY breached geofence 'Warehouse Area'",
        "vehicle_id": 12,
        "vehicle_registration": "KAN-009-YY",
        "created_at": "2026-03-09T09:45:00Z",
        "updated_at": "2026-03-09T09:45:00Z",
        "meta": {
          "geofence_name": "Warehouse Area",
          "breach_type": "exit",
          "latitude": 6.5244,
          "longitude": 3.3792
        },
        "action_url": "/geofences/1"
      }
    ],
    "meta": {
      "total": 23,
      "per_page": 10,
      "current_page": 1,
      "last_page": 3
    },
    "links": {
      "first": "https://api.eonsfleet.com/api/v1/dashboard/alerts?page=1",
      "last": "https://api.eonsfleet.com/api/v1/dashboard/alerts?page=3",
      "prev": null,
      "next": "https://api.eonsfleet.com/api/v1/dashboard/alerts?page=2"
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_SEVERITY | Invalid severity value. Must be: critical, warning, informational |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this organization's alerts |
| 422 | VALIDATION_ERROR | Invalid query parameters (limit exceeds 50, page < 1) |

---

### 2. Get Maintenance Forecast
Retrieve upcoming maintenance schedules for the next N days.

**Endpoint:** `GET /dashboard/maintenance-forecast`

**Query Parameters:**
```
- days: integer (optional, default: 7, max: 90)
  Example: ?days=14

- vehicle_id: integer (optional)
  Example: ?vehicle_id=5

- cluster_id: integer (optional)
  Example: ?cluster_id=2

- status: string (optional)
  Values: "pending", "active", "completed", "overdue"
  Example: ?status=pending,active

- sort_by: string (optional, default: "due_date")
  Values: "due_date", "vehicle_registration", "service_type"
  Example: ?sort_by=due_date&order=asc
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/dashboard/maintenance-forecast?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Maintenance forecast retrieved successfully",
  "data": {
    "forecast": [
      {
        "date": "2026-03-09",
        "count": 2,
        "schedules": [
          {
            "id": 1,
            "vehicle_id": 5,
            "vehicle_registration": "LND-123-XY",
            "service_type": "oil_change",
            "due_date": "2026-03-09",
            "due_days": 0,
            "status": "pending",
            "estimated_cost_kobo": 2500000,
            "assigned_technician": null,
            "priority": "high"
          },
          {
            "id": 2,
            "vehicle_id": 8,
            "vehicle_registration": "ABJ-567-ZZ",
            "service_type": "tire_rotation",
            "due_date": "2026-03-09",
            "due_days": 0,
            "status": "active",
            "estimated_cost_kobo": 1500000,
            "assigned_technician": "Ahmed Hassan",
            "priority": "medium"
          }
        ]
      },
      {
        "date": "2026-03-12",
        "count": 3,
        "schedules": [
          {
            "id": 3,
            "vehicle_id": 12,
            "vehicle_registration": "KAN-009-YY",
            "service_type": "battery_replacement",
            "due_date": "2026-03-12",
            "due_days": 3,
            "status": "pending",
            "estimated_cost_kobo": 4500000,
            "assigned_technician": null,
            "priority": "high"
          }
        ]
      }
    ],
    "summary": {
      "total_schedules": 5,
      "pending_count": 3,
      "active_count": 1,
      "overdue_count": 1,
      "total_estimated_cost_kobo": 12500000,
      "highest_priority": "high"
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_DAYS | Days parameter must be between 1 and 90 |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this organization |
| 404 | VEHICLE_NOT_FOUND | Specified vehicle_id does not exist in this organization |

---

## Analytics Endpoints

### 3. Fuel Consumption Report
Detailed fuel consumption analysis by vehicle, driver, and time period.

**Endpoint:** `GET /analytics/fuel/consumption-report`

**Query Parameters:**
```
- period: string (required)
  Values: "daily", "weekly", "monthly"
  Example: ?period=daily

- date_from: date (optional, format: YYYY-MM-DD)
  Example: ?date_from=2026-02-09

- date_to: date (optional, format: YYYY-MM-DD)
  Example: ?date_to=2026-03-09

- vehicle_id: integer (optional)
  Example: ?vehicle_id=5

- cluster_id: integer (optional)
  Example: ?cluster_id=2

- sort_by: string (optional, default: "total_fuel_used")
  Values: "total_fuel_used", "fuel_efficiency", "distance"
  Example: ?sort_by=fuel_efficiency&order=desc

- per_page: integer (optional, default: 15, max: 100)
  Example: ?per_page=25

- page: integer (optional, default: 1)
  Example: ?page=2
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/analytics/fuel/consumption-report?period=daily&date_from=2026-02-09&date_to=2026-03-09" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Fuel consumption report retrieved successfully",
  "data": {
    "report_data": [
      {
        "date": "2026-03-09",
        "vehicle_id": 5,
        "vehicle_registration": "LND-123-XY",
        "driver_id": 3,
        "driver_name": "John Doe",
        "distance_km": 187.5,
        "fuel_used_liters": 15.3,
        "fuel_efficiency_liters_per_100km": 8.16,
        "fuel_cost_kobo": 153000,
        "idle_time_minutes": 45,
        "trip_count": 4,
        "status": "completed"
      },
      {
        "date": "2026-03-09",
        "vehicle_id": 8,
        "vehicle_registration": "ABJ-567-ZZ",
        "driver_id": 5,
        "driver_name": "Jane Smith",
        "distance_km": 245.2,
        "fuel_used_liters": 18.7,
        "fuel_efficiency_liters_per_100km": 7.63,
        "fuel_cost_kobo": 187000,
        "idle_time_minutes": 32,
        "trip_count": 3,
        "status": "completed"
      }
    ],
    "summary": {
      "total_vehicles": 2,
      "total_distance_km": 432.7,
      "total_fuel_used_liters": 34,
      "average_fuel_efficiency": 7.86,
      "total_fuel_cost_kobo": 340000,
      "fleet_average_idle_minutes": 38.5,
      "best_efficiency_vehicle": "ABJ-567-ZZ",
      "worst_efficiency_vehicle": "LND-123-XY"
    },
    "meta": {
      "total": 45,
      "per_page": 15,
      "current_page": 1,
      "last_page": 3
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_PERIOD | Period must be: daily, weekly, or monthly |
| 400 | INVALID_DATE_RANGE | date_to must be after date_from |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to analytics module |
| 404 | VEHICLE_NOT_FOUND | Specified vehicle_id does not exist |

---

### 4. Fuel Efficiency Report
Vehicle and driver fuel efficiency metrics with baseline comparisons.

**Endpoint:** `GET /analytics/fuel/efficiency-report`

**Query Parameters:**
```
- date_from: date (optional, format: YYYY-MM-DD)
  Example: ?date_from=2026-02-09

- date_to: date (optional, format: YYYY-MM-DD)
  Example: ?date_to=2026-03-09

- vehicle_id: integer (optional)
  Example: ?vehicle_id=5

- driver_id: integer (optional)
  Example: ?driver_id=3

- cluster_id: integer (optional)
  Example: ?cluster_id=2

- include_baseline: boolean (optional, default: true)
  Example: ?include_baseline=true

- sort_by: string (optional, default: "efficiency")
  Values: "efficiency", "deviation", "trips_count"
  Example: ?sort_by=deviation&order=desc

- per_page: integer (optional, default: 15, max: 100)
  Example: ?per_page=25
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/analytics/fuel/efficiency-report?date_from=2026-02-09&date_to=2026-03-09&sort_by=deviation&order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Fuel efficiency report retrieved successfully",
  "data": {
    "report_data": [
      {
        "rank": 1,
        "vehicle_id": 8,
        "vehicle_registration": "ABJ-567-ZZ",
        "vehicle_make": "Toyota",
        "vehicle_model": "Hiace",
        "driver_id": 5,
        "driver_name": "Jane Smith",
        "actual_efficiency": 7.15,
        "baseline_efficiency": 6.5,
        "efficiency_unit": "L/100km",
        "deviation_percent": -10.0,
        "status": "excellent",
        "total_trips": 42,
        "distance_km": 1245.5,
        "fuel_used_liters": 89.05,
        "fuel_cost_kobo": 890500,
        "estimated_fuel_savings_kobo": 125000,
        "recommendation": "Maintain current driving patterns"
      },
      {
        "rank": 2,
        "vehicle_id": 12,
        "vehicle_registration": "KAN-009-YY",
        "vehicle_make": "Mercedes",
        "vehicle_model": "Sprinter",
        "driver_id": 7,
        "driver_name": "Ahmed Hassan",
        "actual_efficiency": 8.25,
        "baseline_efficiency": 6.5,
        "efficiency_unit": "L/100km",
        "deviation_percent": 26.9,
        "status": "poor",
        "total_trips": 38,
        "distance_km": 1128.3,
        "fuel_used_liters": 93.08,
        "fuel_cost_kobo": 930800,
        "estimated_fuel_waste_kobo": 348000,
        "recommendation": "Review driving behavior - consider driver training"
      }
    ],
    "fleet_summary": {
      "fleet_average_efficiency": 7.42,
      "best_vehicle": "ABJ-567-ZZ (7.15 L/100km)",
      "worst_vehicle": "KAN-009-YY (8.25 L/100km)",
      "vehicles_above_baseline": 3,
      "vehicles_below_baseline": 2,
      "total_potential_savings": 473000,
      "benchmark_comparison": "Fleet is 14.2% above industry benchmark"
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_DATE_RANGE | date_to must be after date_from |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to analytics module |
| 404 | DRIVER_NOT_FOUND | Specified driver_id does not exist |
| 503 | SERVICE_UNAVAILABLE | Analytics processing in progress, try again in a few moments |

---

### 5. Top Drivers by Trip Count
Ranking of drivers by number of trips and performance metrics.

**Endpoint:** `GET /analytics/drivers/top-by-trips`

**Query Parameters:**
```
- limit: integer (optional, default: 10, max: 50)
  Example: ?limit=20

- period: string (optional)
  Values: "daily", "weekly", "monthly"
  Example: ?period=weekly

- date_from: date (optional, format: YYYY-MM-DD)
  Example: ?date_from=2026-02-09

- date_to: date (optional, format: YYYY-MM-DD)
  Example: ?date_to=2026-03-09

- cluster_id: integer (optional)
  Example: ?cluster_id=2

- include_metrics: boolean (optional, default: true)
  Example: ?include_metrics=true

- order: string (optional, default: "desc")
  Values: "asc", "desc"
  Example: ?order=asc
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/analytics/drivers/top-by-trips?limit=10&period=weekly" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Top drivers by trip count retrieved successfully",
  "data": {
    "period": "weekly",
    "drivers": [
      {
        "rank": 1,
        "driver_id": 3,
        "driver_name": "John Doe",
        "phone": "+234-801-1234567",
        "assigned_vehicle": "LND-123-XY",
        "total_trips": 42,
        "total_distance_km": 1245.5,
        "average_trip_distance": 29.65,
        "total_duration_hours": 38.5,
        "total_idle_time_minutes": 180,
        "avg_speed_kmh": 32.3,
        "harsh_events_count": 3,
        "harsh_events_per_trip": 0.07,
        "fuel_efficiency": 7.85,
        "compliance_score": 92,
        "safety_rating": 4.5,
        "incidents_count": 1,
        "performance_trend": "improving"
      },
      {
        "rank": 2,
        "driver_id": 5,
        "driver_name": "Jane Smith",
        "phone": "+234-801-2345678",
        "assigned_vehicle": "ABJ-567-ZZ",
        "total_trips": 38,
        "total_distance_km": 1128.3,
        "average_trip_distance": 29.69,
        "total_duration_hours": 36.2,
        "total_idle_time_minutes": 145,
        "avg_speed_kmh": 31.2,
        "harsh_events_count": 1,
        "harsh_events_per_trip": 0.03,
        "fuel_efficiency": 7.15,
        "compliance_score": 98,
        "safety_rating": 4.8,
        "incidents_count": 0,
        "performance_trend": "stable"
      }
    ],
    "summary": {
      "total_drivers": 2,
      "total_trips": 80,
      "total_distance_km": 2373.8,
      "average_trip_per_driver": 40,
      "fleet_average_compliance": 95,
      "fleet_average_safety_rating": 4.65
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_LIMIT | Limit must be between 1 and 50 |
| 400 | INVALID_PERIOD | Period must be: daily, weekly, or monthly |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to analytics module |
| 404 | CLUSTER_NOT_FOUND | Specified cluster_id does not exist |

---

### 6. Fuel Card Transactions Report
Detailed fuel card spending and transaction history.

**Endpoint:** `GET /analytics/fuel/card-transactions`

**Query Parameters:**
```
- date_from: date (optional, format: YYYY-MM-DD)
  Example: ?date_from=2026-02-09

- date_to: date (optional, format: YYYY-MM-DD)
  Example: ?date_to=2026-03-09

- card_id: integer (optional)
  Example: ?card_id=1

- vehicle_id: integer (optional)
  Example: ?vehicle_id=5

- status: string (optional)
  Values: "completed", "pending", "cancelled", "refunded"
  Example: ?status=completed,pending

- merchant: string (optional)
  Example: ?merchant=Shell,Total

- sort_by: string (optional, default: "transaction_date")
  Values: "transaction_date", "amount", "liters"
  Example: ?sort_by=amount&order=desc

- per_page: integer (optional, default: 15, max: 100)
  Example: ?per_page=25

- page: integer (optional, default: 1)
  Example: ?page=2
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/analytics/fuel/card-transactions?date_from=2026-02-09&date_to=2026-03-09&status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Fuel card transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": 1001,
        "transaction_date": "2026-03-09T08:30:00Z",
        "card_id": 1,
        "card_last_four": "4532",
        "card_type": "Shell",
        "vehicle_id": 5,
        "vehicle_registration": "LND-123-XY",
        "driver_id": 3,
        "driver_name": "John Doe",
        "merchant": "Shell Station - Victoria Island",
        "location": "6.4276, 3.3953",
        "fuel_type": "Diesel",
        "liters_dispensed": 45.5,
        "unit_price_kobo": 600000,
        "amount_kobo": 2730000,
        "payment_method": "fuel_card",
        "status": "completed",
        "reference": "TXN-2026030908301001",
        "balance_after_kobo": 10000000,
        "reconciled": true,
        "reconciliation_date": "2026-03-09"
      },
      {
        "id": 1002,
        "transaction_date": "2026-03-08T14:15:00Z",
        "card_id": 2,
        "card_last_four": "6789",
        "card_type": "Total",
        "vehicle_id": 8,
        "vehicle_registration": "ABJ-567-ZZ",
        "driver_id": 5,
        "driver_name": "Jane Smith",
        "merchant": "Total Station - Ikoyi",
        "location": "6.4635, 3.4287",
        "fuel_type": "Diesel",
        "liters_dispensed": 52.0,
        "unit_price_kobo": 595000,
        "amount_kobo": 3094000,
        "payment_method": "fuel_card",
        "status": "completed",
        "reference": "TXN-2026030814151002",
        "balance_after_kobo": 5500000,
        "reconciled": true,
        "reconciliation_date": "2026-03-08"
      }
    ],
    "summary": {
      "total_transactions": 2,
      "total_amount_kobo": 5824000,
      "total_liters": 97.5,
      "average_transaction_kobo": 2912000,
      "average_liters_per_transaction": 48.75,
      "average_unit_price": 597500,
      "total_vehicles": 2,
      "total_cards": 2,
      "completed_count": 2,
      "pending_count": 0,
      "cancelled_count": 0,
      "top_merchant": "Shell Station - Victoria Island",
      "reconciliation_status": "all_reconciled"
    },
    "meta": {
      "total": 47,
      "per_page": 15,
      "current_page": 1,
      "last_page": 4
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_DATE_RANGE | date_to must be after date_from |
| 400 | INVALID_STATUS | Status must be: completed, pending, cancelled, or refunded |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to fuel management module |
| 404 | CARD_NOT_FOUND | Specified card_id does not exist |
| 404 | VEHICLE_NOT_FOUND | Specified vehicle_id does not exist |

---

### 7. Anomalies Detection
AI-powered anomaly detection across fleet operations.

**Endpoint:** `POST /analytics/insights/detect-anomalies`

**Query Parameters:**
```
- days: integer (optional, default: 30, max: 90)
  Example: ?days=30
```

**Request Body:**
```json
{
  "days": 30
}
```

**Request Example:**
```bash
curl -X POST "https://api.eonsfleet.com/api/v1/analytics/insights/detect-anomalies?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

**Response (200 OK):**
```json
{
  "message": "Anomalies detected",
  "data": {
    "report_id": "rpt_abc123def456",
    "organization_id": "org_123",
    "anomaly_count": 5,
    "critical_count": 2,
    "high_count": 2,
    "medium_count": 1,
    "low_count": 0,
    "detected_at": "2026-03-09T10:30:00Z",
    "lookback_days": 30,
    "anomalies": [
      {
        "id": "fuel_abc123",
        "type": "high_fuel_consumption",
        "severity": "critical",
        "title": "High Fuel Consumption Detected",
        "description": "Vehicle LND-123-XY consuming 8.2 L/100km (26% above baseline of 6.5 L/100km)",
        "vehicle_id": 5,
        "vehicle_registration": "LND-123-XY",
        "impact": "Estimated extra cost: ₦450/week",
        "suggested_action": "Review driver behavior, check vehicle maintenance, consider fuel system diagnostics",
        "confidence_score": 85,
        "data": {
          "current_consumption": 8.2,
          "baseline_consumption": 6.5,
          "deviation_percent": 26.2,
          "vehicles_affected": 1,
          "period_days": 30
        }
      },
      {
        "id": "driver_xyz789",
        "type": "risky_driver_behavior",
        "severity": "critical",
        "title": "Risky Driving Behavior Detected",
        "description": "Driver Jane Smith has 1.2 harsh events per trip (avg: 0.2)",
        "vehicle_id": 8,
        "vehicle_registration": "ABJ-567-ZZ",
        "driver_id": 5,
        "impact": "Increased accident risk, vehicle wear, fuel wastage, insurance costs",
        "suggested_action": "Schedule driver training, review trip routes, provide real-time feedback",
        "confidence_score": 90,
        "data": {
          "harsh_events": 45,
          "total_trips": 38,
          "events_per_trip": 1.18,
          "period_days": 30
        }
      },
      {
        "id": "maint_def456",
        "type": "overdue_maintenance",
        "severity": "critical",
        "title": "Overdue Maintenance Alert",
        "description": "Vehicle KAN-009-YY has an overdue maintenance alert (12 days past due)",
        "vehicle_id": 12,
        "vehicle_registration": "KAN-009-YY",
        "impact": "Risk of vehicle breakdown, increased downtime, safety hazards",
        "suggested_action": "Schedule immediate maintenance service",
        "confidence_score": 95,
        "data": {
          "days_overdue": 12,
          "alert_type": "oil_change"
        }
      }
    ]
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_DAYS | Days must be between 1 and 90 |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to analytics module |
| 503 | SERVICE_UNAVAILABLE | Anomaly detection service temporarily unavailable |
| 504 | GATEWAY_TIMEOUT | Processing took too long, try with smaller date range |

---

## Reports Endpoints

### 8. Create Custom Report
Create a new custom report template for scheduling and sharing.

**Endpoint:** `POST /reports/custom`

**Request Body:**
```json
{
  "name": "Weekly Fuel Report",
  "report_type": "fuel_analysis",
  "dimensions": ["vehicle", "driver"],
  "metrics": ["fuel_cost", "distance_km", "fuel_efficiency"],
  "filters": {
    "status": "active",
    "date_from": "2026-02-09",
    "date_to": "2026-03-09"
  },
  "format": "pdf",
  "frequency": "weekly",
  "day_of_week": 1,
  "day_of_month": null,
  "recipients": ["admin@company.com", "manager@company.com"],
  "is_active": true
}
```

**Request Example:**
```bash
curl -X POST "https://api.eonsfleet.com/api/v1/reports/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Fuel Report",
    "report_type": "fuel_analysis",
    "format": "pdf",
    "frequency": "weekly",
    "day_of_week": 1,
    "recipients": ["admin@company.com"],
    "is_active": true
  }'
```

**Response (201 Created):**
```json
{
  "message": "Custom report created successfully",
  "data": {
    "id": 1,
    "organization_id": "org_123",
    "name": "Weekly Fuel Report",
    "report_type": "fuel_analysis",
    "dimensions": ["vehicle", "driver"],
    "metrics": ["fuel_cost", "distance_km", "fuel_efficiency"],
    "filters": {
      "status": "active"
    },
    "format": "pdf",
    "frequency": "weekly",
    "day_of_week": 1,
    "recipients": ["admin@company.com", "manager@company.com"],
    "is_active": true,
    "last_delivered_at": null,
    "created_at": "2026-03-09T10:30:00Z",
    "updated_at": "2026-03-09T10:30:00Z"
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_REPORT_TYPE | Report type must be: fuel_analysis, maintenance_forecast, driver_performance, vehicle_utilization, incident_summary, or custom |
| 400 | INVALID_FORMAT | Format must be: pdf, csv, or json |
| 400 | INVALID_FREQUENCY | Frequency must be: daily, weekly, or monthly |
| 422 | VALIDATION_ERROR | Name is required and must be unique |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to reports module |
| 409 | CONFLICT | Report with this name already exists in your organization |

---

### 9. Get Custom Reports (List)
Retrieve paginated list of all custom reports for the organization.

**Endpoint:** `GET /reports/custom`

**Query Parameters:**
```
- page: integer (optional, default: 1)
  Example: ?page=1

- per_page: integer (optional, default: 10, max: 50)
  Example: ?per_page=15

- report_type: string (optional)
  Values: "fuel_analysis", "maintenance_forecast", "driver_performance", etc.
  Example: ?report_type=fuel_analysis

- is_active: boolean (optional)
  Example: ?is_active=true

- sort_by: string (optional, default: "created_at")
  Values: "created_at", "name", "last_delivered_at"
  Example: ?sort_by=created_at&order=desc
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/reports/custom?page=1&per_page=10&is_active=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Custom reports retrieved",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "Weekly Fuel Report",
        "report_type": "fuel_analysis",
        "format": "pdf",
        "frequency": "weekly",
        "is_active": true,
        "last_delivered_at": "2026-03-08T09:00:00Z",
        "created_at": "2026-03-01T14:20:00Z",
        "updated_at": "2026-03-09T10:30:00Z"
      },
      {
        "id": 2,
        "name": "Driver Performance Digest",
        "report_type": "driver_performance",
        "format": "pdf",
        "frequency": "daily",
        "is_active": true,
        "last_delivered_at": "2026-03-09T08:00:00Z",
        "created_at": "2026-02-28T11:15:00Z",
        "updated_at": "2026-03-05T16:45:00Z"
      }
    ],
    "meta": {
      "total": 5,
      "per_page": 10,
      "current_page": 1,
      "last_page": 1
    },
    "links": {
      "first": "https://api.eonsfleet.com/api/v1/reports/custom?page=1",
      "last": "https://api.eonsfleet.com/api/v1/reports/custom?page=1",
      "prev": null,
      "next": null
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_PAGE | Page must be greater than 0 |
| 400 | INVALID_PER_PAGE | Per page must be between 1 and 50 |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to reports module |

---

### 10. Get Single Custom Report
Retrieve detailed information about a specific custom report.

**Endpoint:** `GET /reports/custom/{id}`

**Path Parameters:**
```
- id: integer (required)
  Example: /reports/custom/1
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/reports/custom/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Custom report retrieved",
  "data": {
    "id": 1,
    "organization_id": "org_123",
    "name": "Weekly Fuel Report",
    "report_type": "fuel_analysis",
    "dimensions": ["vehicle", "driver"],
    "metrics": ["fuel_cost", "distance_km", "fuel_efficiency"],
    "filters": {
      "status": "active",
      "date_from": "2026-02-09"
    },
    "format": "pdf",
    "frequency": "weekly",
    "day_of_week": 1,
    "day_of_month": null,
    "recipients": ["admin@company.com", "manager@company.com"],
    "is_active": true,
    "last_delivered_at": "2026-03-08T09:00:00Z",
    "created_by": 1,
    "created_at": "2026-03-01T14:20:00Z",
    "updated_at": "2026-03-09T10:30:00Z"
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this report |
| 404 | RESOURCE_NOT_FOUND | Custom report with id {id} not found in your organization |

---

### 11. Update Custom Report
Update an existing custom report template.

**Endpoint:** `PUT /reports/custom/{id}`

**Path Parameters:**
```
- id: integer (required)
  Example: /reports/custom/1
```

**Request Body:**
```json
{
  "name": "Updated Weekly Fuel Report",
  "report_type": "fuel_analysis",
  "format": "csv",
  "frequency": "weekly",
  "day_of_week": 2,
  "recipients": ["manager@company.com"],
  "is_active": true
}
```

**Request Example:**
```bash
curl -X PUT "https://api.eonsfleet.com/api/v1/reports/custom/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Weekly Fuel Report",
    "is_active": false
  }'
```

**Response (200 OK):**
```json
{
  "message": "Custom report updated",
  "data": {
    "id": 1,
    "organization_id": "org_123",
    "name": "Updated Weekly Fuel Report",
    "report_type": "fuel_analysis",
    "format": "csv",
    "frequency": "weekly",
    "day_of_week": 2,
    "is_active": false,
    "created_at": "2026-03-01T14:20:00Z",
    "updated_at": "2026-03-09T11:45:00Z"
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_FORMAT | Format must be: pdf, csv, or json |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have permission to update this report |
| 404 | RESOURCE_NOT_FOUND | Custom report with id {id} not found |
| 409 | CONFLICT | Report name already exists in your organization |
| 422 | VALIDATION_ERROR | Invalid field values provided |

---

### 12. Delete Custom Report
Delete a custom report (soft delete).

**Endpoint:** `DELETE /reports/custom/{id}`

**Path Parameters:**
```
- id: integer (required)
  Example: /reports/custom/1
```

**Request Example:**
```bash
curl -X DELETE "https://api.eonsfleet.com/api/v1/reports/custom/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (204 No Content):**
```
(Empty body with 204 status code)
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have permission to delete this report |
| 404 | RESOURCE_NOT_FOUND | Custom report with id {id} not found |

---

### 13. Get Recommended Reports
Retrieve ML-suggested report templates based on fleet activity.

**Endpoint:** `GET /reports/recommended`

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/reports/recommended" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Recommended reports retrieved",
  "data": {
    "recommendations": [
      {
        "id": "fuel_analysis",
        "name": "Weekly Fuel Analysis",
        "type": "fuel_analysis",
        "description": "Comprehensive fuel consumption and cost analysis across all vehicles",
        "use_case": "Monitor fuel spending, identify efficiency trends, detect fuel misuse",
        "frequency": "weekly",
        "format": "pdf",
        "priority": "high",
        "is_created": false
      },
      {
        "id": "driver_performance",
        "name": "Driver Performance Digest",
        "type": "driver_performance",
        "description": "Daily summary of driver behavior, safety incidents, and compliance",
        "use_case": "Track driver safety scores, identify training needs, ensure compliance",
        "frequency": "daily",
        "format": "pdf",
        "priority": "high",
        "is_created": true
      },
      {
        "id": "vehicle_utilization",
        "name": "Fleet Utilization Report",
        "type": "vehicle_utilization",
        "description": "Weekly overview of vehicle usage, idle time, and availability",
        "use_case": "Optimize fleet deployment, reduce idle costs, plan maintenance",
        "frequency": "weekly",
        "format": "pdf",
        "priority": "medium",
        "is_created": false
      },
      {
        "id": "maintenance_forecast",
        "name": "Maintenance Forecast",
        "type": "maintenance_forecast",
        "description": "Predictive maintenance schedule for the upcoming 30 days",
        "use_case": "Plan maintenance windows, allocate technicians, reduce downtime",
        "frequency": "weekly",
        "format": "pdf",
        "priority": "high",
        "is_created": false
      },
      {
        "id": "incident_summary",
        "name": "Incident Summary Report",
        "type": "incident_summary",
        "description": "Weekly breakdown of all incidents, near-misses, and violations",
        "use_case": "Improve safety culture, identify high-risk areas, track compliance",
        "frequency": "weekly",
        "format": "pdf",
        "priority": "medium",
        "is_created": false
      }
    ],
    "total": 5
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to reports module |

---

## Geofencing Endpoints

### 14. Bulk Assign Vehicles to Geofence
Assign multiple vehicles to a geofence in a single operation.

**Endpoint:** `POST /geofences/{geofence_id}/bulk-assign`

**Path Parameters:**
```
- geofence_id: integer (required)
  Example: /geofences/1/bulk-assign
```

**Request Body:**
```json
{
  "vehicle_ids": [5, 8, 12, 15],
  "preserve_existing": true
}
```

**Request Example:**
```bash
curl -X POST "https://api.eonsfleet.com/api/v1/geofences/1/bulk-assign" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicle_ids": [5, 8, 12],
    "preserve_existing": true
  }'
```

**Response (200 OK):**
```json
{
  "message": "Vehicles assigned to geofence successfully",
  "data": {
    "geofence_id": 1,
    "geofence_name": "Warehouse Area",
    "assigned_vehicle_count": 12,
    "newly_assigned_count": 3,
    "vehicles_already_assigned": 9,
    "assignment_status": "successful",
    "assigned_vehicles": [
      {
        "vehicle_id": 5,
        "registration": "LND-123-XY",
        "status": "newly_assigned"
      },
      {
        "vehicle_id": 8,
        "registration": "ABJ-567-ZZ",
        "status": "newly_assigned"
      },
      {
        "vehicle_id": 12,
        "registration": "KAN-009-YY",
        "status": "newly_assigned"
      }
    ],
    "created_at": "2026-03-09T10:30:00Z"
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | EMPTY_VEHICLE_LIST | At least one vehicle_id is required |
| 400 | INVALID_VEHICLE_ID | Vehicle ID must be a positive integer |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have permission to manage this geofence |
| 404 | GEOFENCE_NOT_FOUND | Geofence with id {id} not found |
| 404 | VEHICLE_NOT_FOUND | Vehicle with id {id} does not exist in your organization |
| 422 | VALIDATION_ERROR | Invalid request payload |

---

### 15. Get Geofence Analytics
Retrieve breach analytics and statistics for a specific geofence.

**Endpoint:** `GET /geofences/{geofence_id}/analytics`

**Path Parameters:**
```
- geofence_id: integer (required)
  Example: /geofences/1/analytics
```

**Query Parameters:**
```
- days: integer (optional, default: 30, max: 90)
  Example: ?days=30

- include_timeline: boolean (optional, default: true)
  Example: ?include_timeline=true

- include_ranking: boolean (optional, default: true)
  Example: ?include_ranking=true
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/geofences/1/analytics?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Geofence analytics retrieved successfully",
  "data": {
    "geofence_id": 1,
    "geofence_name": "Warehouse Area",
    "geofence_area_sqkm": 2.5,
    "analytics_period_days": 30,
    "summary": {
      "total_breaches": 12,
      "breach_rate_per_day": 0.4,
      "most_active_vehicle": {
        "vehicle_id": 5,
        "registration": "LND-123-XY",
        "breach_count": 4
      },
      "peak_breach_time": "18:00-20:00",
      "average_dwell_time_minutes": 145
    },
    "timeline": [
      {
        "date": "2026-03-09",
        "day_of_week": "Friday",
        "breach_count": 2,
        "unique_vehicles": 2
      },
      {
        "date": "2026-03-08",
        "day_of_week": "Thursday",
        "breach_count": 1,
        "unique_vehicles": 1
      },
      {
        "date": "2026-03-07",
        "day_of_week": "Wednesday",
        "breach_count": 0,
        "unique_vehicles": 0
      }
    ],
    "vehicle_ranking": [
      {
        "rank": 1,
        "vehicle_id": 5,
        "registration": "LND-123-XY",
        "breach_count": 4,
        "breach_duration_avg_minutes": 12,
        "last_breach": "2026-03-09T18:30:00Z"
      },
      {
        "rank": 2,
        "vehicle_id": 8,
        "registration": "ABJ-567-ZZ",
        "breach_count": 3,
        "breach_duration_avg_minutes": 5,
        "last_breach": "2026-03-08T19:15:00Z"
      },
      {
        "rank": 3,
        "vehicle_id": 12,
        "registration": "KAN-009-YY",
        "breach_count": 2,
        "breach_duration_avg_minutes": 8,
        "last_breach": "2026-03-06T14:45:00Z"
      }
    ]
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 400 | INVALID_DAYS | Days must be between 1 and 90 |
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this geofence |
| 404 | GEOFENCE_NOT_FOUND | Geofence with id {id} not found |

---

## Live Tracking Endpoints

### 16. Get Vehicle Sensor Health
Retrieve current sensor health status and anomalies for a vehicle.

**Endpoint:** `GET /vehicles/{vehicle_id}/sensors/health`

**Path Parameters:**
```
- vehicle_id: integer (required)
  Example: /vehicles/5/sensors/health
```

**Query Parameters:**
```
- include_history: boolean (optional, default: false)
  Example: ?include_history=true

- anomaly_threshold: string (optional, default: "medium")
  Values: "low", "medium", "high"
  Example: ?anomaly_threshold=high
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/vehicles/5/sensors/health" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Vehicle sensor health retrieved",
  "data": {
    "vehicle_id": 5,
    "vehicle_registration": "LND-123-XY",
    "vehicle_make": "Toyota",
    "vehicle_model": "Hiace",
    "sensors": [
      {
        "id": 1,
        "name": "Fuel Sensor",
        "category": "fuel",
        "status": "normal",
        "current_value": 65.5,
        "unit": "liters",
        "baseline": null,
        "anomaly_type": null,
        "health_score": 100,
        "description": "Fuel sensor operating normally",
        "suggested_action": "No action required",
        "last_reading": "2026-03-09T10:30:00Z"
      },
      {
        "id": 2,
        "name": "GPS Device",
        "category": "device",
        "status": "normal",
        "current_value": "online",
        "unit": "status",
        "baseline": "online",
        "anomaly_type": null,
        "health_score": 100,
        "description": "GPS device connected and transmitting",
        "suggested_action": "No action required",
        "last_reading": "2026-03-09T10:30:00Z"
      },
      {
        "id": 3,
        "name": "Engine/OBD Sensors",
        "category": "engine",
        "status": "warning",
        "current_value": 8,
        "unit": "harsh_events_24h",
        "baseline": 3,
        "anomaly_type": "excessive_harsh_events",
        "health_score": 70,
        "description": "Excessive harsh driving detected (8 events in 24h)",
        "suggested_action": "Review driver behavior and provide training",
        "last_reading": "2026-03-09T10:30:00Z"
      },
      {
        "id": 4,
        "name": "Battery/Electrical",
        "category": "electrical",
        "status": "normal",
        "current_value": 13.2,
        "unit": "volts",
        "baseline": 13.2,
        "anomaly_type": null,
        "health_score": 100,
        "description": "Battery voltage normal",
        "suggested_action": "No action required",
        "last_reading": "2026-03-09T10:30:00Z"
      }
    ],
    "health_score": 93,
    "anomaly_count": 1,
    "status_summary": {
      "normal": 3,
      "warning": 1,
      "critical": 0
    },
    "last_updated_at": "2026-03-09T10:30:00Z"
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this vehicle |
| 404 | VEHICLE_NOT_FOUND | Vehicle with id {id} not found in your organization |

---

### 17. Get Trip Playback
Retrieve trip timeline with GPS points and events for playback.

**Endpoint:** `GET /vehicles/{vehicle_id}/trips/{trip_id}/playback`

**Path Parameters:**
```
- vehicle_id: integer (required)
  Example: 5

- trip_id: integer (required)
  Example: 123
```

**Query Parameters:**
```
- include_gps_points: boolean (optional, default: true)
  Example: ?include_gps_points=true

- include_events: boolean (optional, default: true)
  Example: ?include_events=true

- point_interval: integer (optional, default: 1, unit: minutes)
  Example: ?point_interval=5
```

**Request Example:**
```bash
curl -X GET "https://api.eonsfleet.com/api/v1/vehicles/5/trips/123/playback" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Type: client"
```

**Response (200 OK):**
```json
{
  "message": "Trip playback data retrieved successfully",
  "data": {
    "trip": {
      "id": 123,
      "vehicle_id": 5,
      "vehicle_registration": "LND-123-XY",
      "driver_id": 3,
      "driver_name": "John Doe",
      "trip_number": "TRIP-2026030901",
      "trip_type": "delivery",
      "planned_start_time": "2026-03-09T08:00:00Z",
      "planned_end_time": "2026-03-09T17:00:00Z",
      "actual_start_time": "2026-03-09T08:15:00Z",
      "actual_end_time": "2026-03-09T14:23:00Z",
      "status": "completed",
      "distance_km": 187.5,
      "duration_minutes": 368,
      "average_speed_kmh": 30.6,
      "fuel_used_liters": 15.3,
      "idle_time_minutes": 45,
      "harsh_events_count": 4
    },
    "gps_points": [
      {
        "point_index": 1,
        "timestamp": "2026-03-09T08:15:00Z",
        "latitude": 6.4328,
        "longitude": 3.3792,
        "speed_kmh": 0,
        "heading": null,
        "accuracy_meters": 15,
        "altitude_meters": 12
      },
      {
        "point_index": 2,
        "timestamp": "2026-03-09T08:20:00Z",
        "latitude": 6.4335,
        "longitude": 3.3805,
        "speed_kmh": 25,
        "heading": 45,
        "accuracy_meters": 12,
        "altitude_meters": 12
      },
      {
        "point_index": 3,
        "timestamp": "2026-03-09T08:25:00Z",
        "latitude": 6.4345,
        "longitude": 3.3825,
        "speed_kmh": 35,
        "heading": 45,
        "accuracy_meters": 10,
        "altitude_meters": 14
      }
    ],
    "timeline_events": [
      {
        "event_index": 1,
        "timestamp": "2026-03-09T08:15:00Z",
        "event_type": "trip_start",
        "location": "Victoria Island, Lagos",
        "latitude": 6.4328,
        "longitude": 3.3792,
        "description": "Trip started from warehouse",
        "duration_seconds": 0
      },
      {
        "event_index": 2,
        "timestamp": "2026-03-09T08:45:00Z",
        "event_type": "geofence_exit",
        "location": "Leaving Warehouse Area",
        "latitude": 6.4450,
        "longitude": 3.3950,
        "description": "Exited geofence: Warehouse Area",
        "duration_seconds": 0,
        "geofence_name": "Warehouse Area"
      },
      {
        "event_index": 3,
        "timestamp": "2026-03-09T09:12:00Z",
        "event_type": "harsh_acceleration",
        "location": "Victoria Island Main Road",
        "latitude": 6.4580,
        "longitude": 3.4050,
        "description": "Harsh acceleration detected (0.45g)",
        "duration_seconds": 2,
        "intensity": 0.45
      },
      {
        "event_index": 4,
        "timestamp": "2026-03-09T10:30:00Z",
        "event_type": "refuel",
        "location": "Shell Station - Victoria Island",
        "latitude": 6.4276,
        "longitude": 3.3953,
        "description": "Refueled 15L @ ₦10,800",
        "fuel_amount_liters": 15,
        "fuel_cost_kobo": 108000
      },
      {
        "event_index": 5,
        "timestamp": "2026-03-09T12:15:00Z",
        "event_type": "harsh_braking",
        "location": "Lagos Mainland Bridge",
        "latitude": 6.5120,
        "longitude": 3.4680,
        "description": "Harsh braking detected (0.38g)",
        "duration_seconds": 1,
        "intensity": 0.38
      },
      {
        "event_index": 6,
        "timestamp": "2026-03-09T14:23:00Z",
        "event_type": "trip_end",
        "location": "Ikoyi Distribution Center",
        "latitude": 6.4635,
        "longitude": 3.4287,
        "description": "Trip completed at distribution center",
        "duration_seconds": 0
      }
    ],
    "summary": {
      "total_distance_km": 187.5,
      "total_duration_minutes": 368,
      "average_speed_kmh": 30.6,
      "max_speed_kmh": 65,
      "fuel_used_liters": 15.3,
      "fuel_efficiency": 8.16,
      "idle_time_minutes": 45,
      "harsh_events_count": 4,
      "harsh_acceleration_count": 1,
      "harsh_braking_count": 1,
      "harsh_cornering_count": 0,
      "overspeeding_events": 2,
      "geofence_breaches": 1,
      "fuel_stops": 1,
      "total_stops": 3
    }
  }
}
```

**Common Errors:**

| Status | Code | Detail |
|--------|------|--------|
| 401 | UNAUTHORIZED | Invalid or expired authentication token |
| 403 | FORBIDDEN | User does not have access to this vehicle or trip |
| 404 | VEHICLE_NOT_FOUND | Vehicle with id {vehicle_id} not found |
| 404 | TRIP_NOT_FOUND | Trip with id {trip_id} not found for this vehicle |
| 410 | GONE | Trip data has been archived and is no longer available |

---

## Error Codes Reference

### HTTP Status Codes

| Status | Code | Meaning |
|--------|------|---------|
| 200 | OK | Request successful, data returned |
| 201 | CREATED | Resource created successfully |
| 204 | NO_CONTENT | Request successful, no content to return |
| 400 | BAD_REQUEST | Invalid request parameters or payload |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 403 | FORBIDDEN | User lacks permission for this action |
| 404 | NOT_FOUND | Requested resource does not exist |
| 409 | CONFLICT | Request conflicts with existing data |
| 410 | GONE | Requested resource no longer available |
| 422 | UNPROCESSABLE_ENTITY | Validation error in request |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_SERVER_ERROR | Server error |
| 502 | BAD_GATEWAY | Gateway error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |
| 504 | GATEWAY_TIMEOUT | Request timeout |

### Common Error Response Format

```json
{
  "message": "Error message description",
  "errors": [
    {
      "status": "400",
      "code": "VALIDATION_ERROR",
      "title": "Validation Failed",
      "detail": "Field-specific error message",
      "source": {
        "pointer": "/data/attributes/field_name"
      }
    }
  ]
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| UNAUTHORIZED | Token missing, expired, or invalid | Refresh authentication token |
| FORBIDDEN | User lacks required permissions | Contact administrator for access |
| VALIDATION_ERROR | Invalid input parameters | Review request payload against API spec |
| RESOURCE_NOT_FOUND | Requested item doesn't exist | Verify resource ID is correct |
| INVALID_FIELD | Specific field has invalid value | Check field format/constraints |
| CONFLICT | Data conflicts with existing resource | Check for duplicates or constraints |
| RATE_LIMIT_EXCEEDED | Too many requests in time window | Implement exponential backoff retry |
| SERVICE_UNAVAILABLE | Service temporarily down | Retry after delay |
| GATEWAY_TIMEOUT | Request took too long | Reduce data range or try smaller requests |

---

## Authentication

All endpoints require OAuth2 Bearer token authentication.

**Header Format:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
X-Request-Type: client
```

**Token Expiration:** 24 hours (automatic refresh available)

**Token Refresh:**
```bash
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "YOUR_REFRESH_TOKEN"
}
```

---

## Rate Limiting

- **Global Limit:** 120 requests/minute per user
- **Per-Organization Limit:** 300 requests/minute per organization
- **GPS Ingest:** No limit for authorized gateway IPs
- **WebSocket Auth:** No limit

**Headers:**
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678426200
Retry-After: 60
```

---

## Best Practices

1. **Pagination:** Always implement pagination for list endpoints (default 10-15 items/page)
2. **Date Ranges:** Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
3. **Error Handling:** Implement exponential backoff for rate limits and timeouts
4. **Caching:** Cache static data (vehicle lists, geofences) for 5-10 minutes
5. **WebSocket:** Use WebSocket for real-time updates (location, alerts, events)
6. **Filtering:** Always filter by organization_id server-side (automatic via middleware)
7. **Timezone:** All timestamps are UTC; client should convert to local timezone

---

## Support & Documentation

- **API Documentation:** https://docs.eonsfleet.com/api
- **WebSocket Guide:** See [WEBSOCKET_README.md](./WEBSOCKET_README.md)
- **Status Page:** https://status.eonsfleet.com
- **Support Email:** api-support@eonsfleet.com
- **Slack Community:** #api-integration

---

**Last Updated:** March 9, 2026
**Version:** 2.0
**Maintainer:** EonsFleet API Team
