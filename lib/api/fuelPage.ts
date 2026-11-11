/**
 * The Fuel Overview and Real-time endpoints, and the actions on a fuel alert:
 * one typed client for everything the redesigned pages read. A figure the
 * server has nothing behind arrives as null, and stays null here.
 */
import apiClient from "./client";

export interface FuelScopeFilters {
  cluster_id?: number;
  type?: string;
  make?: string;
  model?: string;
}

// ── Real-time ────────────────────────────────────────────────────────────────

/** measured: sensor litres. calculated: a percentage times the tank's capacity. percent_only: no capacity to turn it into litres. */
export type LevelBasis = "measured" | "calculated" | "percent_only";

export interface RealtimeLocation {
  latitude: number;
  longitude: number;
  at: string;
  address: string | null;
  /** null when the position is too old to say. */
  moving: boolean | null;
  speed_kph: number | null;
}

export interface RealtimeFuelVehicle {
  vehicle_id: number;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  type: string | null;
  cluster_id: number | null;
  level_litres: number | null;
  level_percent: number | null;
  basis: LevelBasis | null;
  capacity_litres: number | null;
  recorded_at: string;
  age_minutes: number;
  freshness: "live" | "stale";
  burn_litres_per_hour: number | null;
  burn_percent_per_hour: number | null;
  burn_basis: { span_minutes: number; points: number } | null;
  hours_to_empty: number | null;
  range_km: number | null;
  location: RealtimeLocation | null;
  open_alerts: number;
}

export interface SilentFuelVehicle {
  vehicle_id: number;
  registration_number: string | null;
  last_reading_at: string;
  age_minutes: number;
  cluster_id: number | null;
}

export interface RealtimeFuelSnapshot {
  summary: {
    reporting: number;
    live: number;
    stale: number;
    silent: number;
    low: number;
  };
  vehicles: RealtimeFuelVehicle[];
  silent: SilentFuelVehicle[];
  generated_at: string;
}

export const getFuelRealtimeSnapshot = async (
  filters: FuelScopeFilters = {},
): Promise<RealtimeFuelSnapshot> => {
  const response = await apiClient.get<{ data: RealtimeFuelSnapshot }>(
    "/fuel/realtime",
    { params: filters },
  );
  return response.data.data;
};

// ── Overview ─────────────────────────────────────────────────────────────────

export type CompareBasis = "previous" | "last_month";

export interface OverviewMetrics {
  litres: number | null;
  litres_measured: number | null;
  litres_estimated: number | null;
  distance_km: number | null;
  l_per_100km: number | null;
  spend: number | null;
  purchased_litres: number | null;
  price_per_litre: number | null;
  idle_litres: number | null;
  idle_cost: number | null;
}

export type OverviewMetricKey = keyof OverviewMetrics;

export interface OverviewChange {
  absolute: number | null;
  percent: number | null;
}

export interface OverviewOutlier {
  vehicle_id: number;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  l_per_100km: number;
  peer_median_l_per_100km: number;
  peers: number;
  excess_litres: number;
  basis: "measured" | "estimated";
}

export interface OverviewAlert {
  id: number;
  vehicle_id: number;
  registration_number: string | null;
  type: string;
  status: string;
  severity: string | null;
  alert_time: string;
  difference: number | null;
  unit: string | null;
  message: string | null;
  assigned_to: number | null;
  investigating: boolean;
}

export interface OverviewBudget {
  month: string;
  vehicles: number;
  budget_litres: number;
  used_litres: number;
  used_percent: number | null;
  projected_litres: number | null;
  projected_over_litres: number | null;
  days_elapsed: number;
  days_in_month: number;
}

export interface FuelOverviewSummary {
  period: { from: string; to: string; days: number };
  previous_period: { from: string; to: string; basis: CompareBasis };
  current: OverviewMetrics;
  previous: OverviewMetrics;
  change: Record<string, OverviewChange>;
  quality: {
    vehicles: number;
    with_usage: number;
    with_measured_usage: number;
    with_sensor_readings: number;
    estimated_only: number;
    no_data: number;
  };
  loss: {
    drain_alerts: { count: number; vehicles: number; litres: number | null };
    unmatched_refills: { count: number; litres: number };
    bought_vs_used: {
      purchased_litres: number | null;
      used_litres: number | null;
      gap_litres: number | null;
    };
    idle: { litres: number | null; cost: number | null };
  };
  by_cluster: Array<{
    cluster_id: number | null;
    name: string;
    vehicles: number;
    litres: number;
    distance_km: number | null;
    l_per_100km: number | null;
    spend: number | null;
  }>;
  by_type: Array<{
    type: string | null;
    make: string | null;
    model: string | null;
    vehicles: number;
    litres: number;
    distance_km: number | null;
    l_per_100km: number | null;
  }>;
  outliers: OverviewOutlier[];
  budget: OverviewBudget | null;
  needs_action: {
    counts: { new: number; acknowledged: number };
    alerts: OverviewAlert[];
  };
  trend: Array<{ date: string; litres: number | null; spend: number | null }>;
  generated_at: string;
}

export interface FuelOverviewParams extends FuelScopeFilters {
  from?: string;
  to?: string;
  compare?: CompareBasis;
}

export const getFuelOverviewSummary = async (
  params: FuelOverviewParams = {},
): Promise<FuelOverviewSummary> => {
  const response = await apiClient.get<{ data: FuelOverviewSummary }>(
    "/fuel/overview",
    { params },
  );
  return response.data.data;
};

// ── Analytics (history) ──────────────────────────────────────────────────────

export interface FuelAnalyticsParams {
  from?: string;
  to?: string;
  vehicle_ids?: number[];
  cluster_id?: number;
  bucket?: "day" | "week" | "month";
}

export interface FuelAnalyticsTotals {
  litres_used: number | null;
  litres_measured: number | null;
  litres_estimated: number | null;
  distance_km: number | null;
  l_per_100km: number | null;
  km_per_litre: number | null;
  vehicles_with_usage: number;
  days_with_usage: number;
  refill_count: number;
  refilled_litres: number | null;
  purchase_count: number;
  purchased_litres: number | null;
  spend: number | null;
  price_per_litre: number | null;
}

export interface FuelAnalyticsBucket {
  date: string;
  litres: number | null;
  distance_km: number | null;
  l_per_100km: number | null;
  refilled_litres: number | null;
  refills: number;
  purchased_litres: number | null;
  spend: number | null;
}

export interface FuelAnalyticsLevelPoint {
  at: string;
  litres: number | null;
  percent: number | null;
}

export interface FuelAnalyticsRefill {
  id: number;
  vehicle_id: number;
  registration_number: string | null;
  at: string;
  litres: number;
  source: string | null;
  matched_purchase: boolean;
}

export interface FuelAnalyticsDrain {
  id: number;
  vehicle_id: number;
  registration_number: string | null;
  at: string;
  amount: number | null;
  unit: string | null;
  status: string;
  type: string;
}

export interface FuelAnalyticsVehicleRow {
  vehicle_id: number;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  days: number;
  litres: number;
  distance_km: number | null;
  l_per_100km: number | null;
  km_per_litre: number | null;
  refilled_litres: number | null;
  refills: number;
  purchased_litres: number | null;
  spend: number | null;
  basis: "measured" | "estimated";
}

export interface FuelAnalytics {
  period: { from: string; to: string; days: number; bucket: "day" | "week" | "month" };
  vehicles: number;
  totals: FuelAnalyticsTotals;
  series: FuelAnalyticsBucket[];
  /** Only when one to five vehicles were chosen. */
  levels: Array<{
    vehicle_id: number;
    registration_number: string | null;
    step_seconds: number;
    points: FuelAnalyticsLevelPoint[];
  }> | null;
  refills: FuelAnalyticsRefill[];
  drains: FuelAnalyticsDrain[];
  by_vehicle: FuelAnalyticsVehicleRow[];
  generated_at: string;
}

export const getFuelAnalytics = async (
  params: FuelAnalyticsParams = {},
): Promise<FuelAnalytics> => {
  const response = await apiClient.get<{ data: FuelAnalytics }>(
    "/fuel/analytics",
    { params },
  );
  return response.data.data;
};

// ── Budgets ──────────────────────────────────────────────────────────────────

export interface BudgetProposal {
  litres: number;
  days_of_data: number;
}

export interface FuelBudgetRow {
  vehicle_id: number;
  registration_number: string | null;
  make: string | null;
  model: string | null;
  type: string | null;
  cluster_id: number | null;
  budget_litres: number | null;
  source: "manual" | "proposed" | null;
  proposal: BudgetProposal | null;
}

export interface FuelBudgetList {
  month: string;
  totals: {
    vehicles: number;
    budgeted: number;
    unbudgeted: number;
    litres: number;
    manual: number;
    proposed: number;
  };
  vehicles: FuelBudgetRow[];
  page: number;
  per_page: number;
  total: number;
}

export interface FuelBudgetListParams extends FuelScopeFilters {
  month?: string;
  page?: number;
  per_page?: number;
}

export const getFuelBudgets = async (
  params: FuelBudgetListParams = {},
): Promise<FuelBudgetList> => {
  const response = await apiClient.get<{ data: FuelBudgetList }>(
    "/fuel/budgets",
    { params },
  );
  return response.data.data;
};

export const saveFuelBudgets = async (
  month: string,
  budgets: Array<{ vehicle_id: number; litres: number }>,
): Promise<{ saved: number }> => {
  const response = await apiClient.put<{ data: { saved: number } }>(
    "/fuel/budgets",
    { month, budgets },
  );
  return response.data.data;
};

export const adjustFuelBudgets = async (
  month: string,
  percent: number,
  filters: FuelScopeFilters = {},
): Promise<{ changed: number }> => {
  const response = await apiClient.post<{ data: { changed: number } }>(
    "/fuel/budgets/adjust",
    { month, percent },
    { params: filters },
  );
  return response.data.data;
};

export interface ApplyProposalsResult {
  written: number;
  skipped_manual: number;
  no_history: number;
}

export const applyFuelBudgetProposals = async (
  month: string,
  filters: FuelScopeFilters = {},
): Promise<ApplyProposalsResult> => {
  const response = await apiClient.post<{ data: ApplyProposalsResult }>(
    "/fuel/budgets/apply-proposals",
    { month },
    { params: filters },
  );
  return response.data.data;
};

// ── Alert actions ────────────────────────────────────────────────────────────

export interface FuelAlertAssignee {
  id: number;
  name: string;
  email: string;
}

export const getFuelAlertAssignees = async (): Promise<FuelAlertAssignee[]> => {
  const response = await apiClient.get<{ data: FuelAlertAssignee[] }>(
    "/fuel-alerts/assignees",
  );
  return response.data.data;
};

export const assignFuelAlert = async (
  alertId: number,
  userId: number,
): Promise<void> => {
  await apiClient.post(`/fuel-alerts/${alertId}/assign`, { user_id: userId });
};

export const openFuelAlertInvestigation = async (
  alertId: number,
  notes?: string,
): Promise<void> => {
  await apiClient.post(`/fuel-alerts/${alertId}/investigate`, { notes });
};

export interface ContactDriverResult {
  driver: { id: number; name: string; phone: string };
  channel: "sms" | "call";
  sent: boolean;
}

export const contactAlertDriver = async (
  alertId: number,
  channel: "sms" | "call",
  message?: string,
): Promise<ContactDriverResult> => {
  const response = await apiClient.post<{ data: ContactDriverResult }>(
    `/fuel-alerts/${alertId}/contact-driver`,
    { channel, message },
  );
  return response.data.data;
};
