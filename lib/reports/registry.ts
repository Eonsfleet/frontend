/**
 * Every report a customer can run, in one list. The groups are the legacy
 * export types plus the telemetry reports; the backend catalog (when it
 * answers) marks which ones can also be previewed on screen.
 *
 * Legacy groups are hidden from the pickers unless
 * NEXT_PUBLIC_SHOW_LEGACY_REPORTS=true. They stay in the registry so
 * existing schedules, history and deep links still resolve a proper title.
 */

export const SHOW_LEGACY_REPORTS = process.env.NEXT_PUBLIC_SHOW_LEGACY_REPORTS === "true";

/** The one group the backend ReportCatalog serves; every other group is a legacy export. */
const CURRENT_GROUP = "Telemetry (trips, alarms, fuel by source, utilization)";

export const REPORT_TYPE_GROUPS = [
  {
    group: "Fleet",
    options: [
      {
        value: "fleet.utilization-summary",
        label: "Utilization Rate, Active Vehicles & Distance",
      },
      {
        value: "fleet.vehicle-list",
        label: "Per-Vehicle Utilization & Active Days",
      },
      {
        value: "fleet.availability-snapshot",
        label: "Vehicle Status Snapshot (Available / In-Use / Maintenance)",
      },
      {
        value: "fleet.top-vehicles",
        label: "Top Vehicles by GPS Distance Driven",
      },
      {
        value: "fleet.asset-performance",
        label: "Asset Performance Score (Distance × Activity)",
      },
      {
        value: "fleet.health-score",
        label: "Vehicle Health Score (Maintenance + Fuel)",
      },
      { value: "fleet.opex-trend", label: "Operating Expenditure Trend" },
      {
        value: "fleet.cost-per-km",
        label: "Cost Per KM Trend (Fuel ÷ Distance)",
      },
      {
        value: "fleet.driver-risk",
        label: "Driver Risk Profile (Incident History)",
      },
      {
        value: "fleet.predictive-maintenance",
        label: "Vehicles Approaching Maintenance Thresholds",
      },
    ],
  },
  {
    group: "Drivers",
    options: [
      {
        value: "drivers.trip-summary",
        label: "Per-Driver Activity (Segments, Distance, Fuel)",
      },
      {
        value: "drivers.top-by-trips",
        label: "Top Drivers Ranked by Distance / Segments",
      },
      { value: "drivers.compliance", label: "Driver Compliance Metrics" },
      {
        value: "drivers.incident-history",
        label: "Incident History Per Driver",
      },
      {
        value: "drivers.workload-distribution",
        label: "Workload Distribution (Light / Moderate / Heavy)",
      },
    ],
  },
  {
    group: "Fuel",
    options: [
      {
        value: "fuel.consumption-report",
        label: "Fuel Consumption Totals & Trend",
      },
      { value: "fuel.cost-report", label: "Fuel Cost Analysis" },
      {
        value: "fuel.efficiency-report",
        label: "L/100km Efficiency Per Vehicle",
      },
      {
        value: "fuel.anomaly-report",
        label: "Fuel Anomalies (Theft Risk, Overconsumption)",
      },
      { value: "fuel.usage-report", label: "Daily Fuel Usage Per Vehicle" },
    ],
  },
  {
    group: "Maintenance",
    options: [
      {
        value: "maintenance.schedule-compliance",
        label: "On-Time vs Overdue Maintenance Compliance",
      },
      {
        value: "maintenance.cost-report",
        label: "Maintenance Spend Breakdown",
      },
      {
        value: "maintenance.workflow-report",
        label: "Maintenance Job Workflow Status",
      },
      {
        value: "maintenance.workshop-summary",
        label: "Workshop Throughput & Job Status",
      },
    ],
  },
  {
    group: "Incidents",
    options: [
      {
        value: "incidents.summary",
        label: "Total Incidents — Open vs Resolved",
      },
      {
        value: "incidents.type-distribution",
        label: "Incidents Broken Down by Type",
      },
      { value: "incidents.by-vehicle", label: "Incident Count Per Vehicle" },
    ],
  },
  {
    group: "GPS & Routes",
    options: [
      {
        value: "gps.driving-summary",
        label: "Trip Summary (Distance, Active Vehicles, Segments)",
      },
      {
        value: "gps.distance-report",
        label: "Distance Trend + Top Vehicles by Distance",
      },
      {
        value: "gps.top-by-distance",
        label: "Ranked Vehicles by Total KM Driven",
      },
      {
        value: "gps.device-status",
        label: "Device Online / Offline / Connected Counts",
      },
    ],
  },
  {
    // Read from the telemetry reporting store (60 days) and the fuel sources;
    // the same reports as on the GPS, alarms, fuel and utilization screens.
    group: CURRENT_GROUP,
    options: [
      { value: "gps.trips", label: "Trip Summary (Every Trip, Fuel, Speeding)" },
      { value: "gps.daily", label: "Daily Driving Summary Per Vehicle" },
      { value: "gps.stops", label: "Stops (Place, Geofence, Duration)" },
      { value: "gps.devices", label: "Tracker Status (Online, Power, Offline Time)" },
      { value: "gps.scheduled-trips", label: "Scheduled Trips vs Actual Driving" },
      { value: "events.list", label: "Alarms & Events" },
      { value: "events.counts", label: "Alarms & Events Per Vehicle (per 100 km)" },
      { value: "fuel.source-report", label: "Fuel by Source (Estimate, Sensor, Purchases)" },
      { value: "fleet.utilization-report", label: "Utilization Against Working Hours" },
    ],
  },
  {
    group: "Insights (AI)",
    options: [
      {
        value: "insights.anomalies",
        label: "All Detected Anomalies (Fuel, Driver, Vehicle, Efficiency)",
      },
    ],
  },
].map((g) => ({ ...g, legacy: g.group !== CURRENT_GROUP }));

export interface ReportEntry {
  type: string;
  label: string;
  group: string;
  legacy: boolean;
}

/** Groups offered in the pickers (the schedule dialog's report select). */
export const VISIBLE_REPORT_GROUPS = REPORT_TYPE_GROUPS.filter((g) => SHOW_LEGACY_REPORTS || !g.legacy);

/** Every known report, legacy included: for resolving titles, never for picking. */
export const ALL_REPORTS: ReportEntry[] = REPORT_TYPE_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ type: o.value, label: o.label, group: g.group, legacy: g.legacy })),
);

/** The reports a customer can pick: the catalog grid, favorites, recents and the schedule dialog. */
export const VISIBLE_REPORTS: ReportEntry[] = ALL_REPORTS.filter((r) => SHOW_LEGACY_REPORTS || !r.legacy);

const BY_TYPE = new Map(ALL_REPORTS.map((r) => [r.type, r]));

export const getReport = (type: string) => BY_TYPE.get(type);

export const getReportLabel = (type: string) =>
  BY_TYPE.get(type)?.label ?? type.replace(/[._-]/g, " ");

/** Short category names for the filter chips (the group names are long). */
export const CATEGORY_LABEL: Record<string, string> = {
  "Telemetry (trips, alarms, fuel by source, utilization)": "Telemetry",
  "Insights (AI)": "Insights",
  "GPS & Routes": "GPS",
};

export const categoryOf = (entry: ReportEntry) =>
  CATEGORY_LABEL[entry.group] ?? entry.group;

/** Chips for the visible reports only, so none is ever empty. */
export const CATEGORIES = Array.from(new Set(VISIBLE_REPORTS.map(categoryOf)));

/** The reporting store keeps 60 days; the fuel report's estimates and purchases go further back. */
export const SIXTY_DAY_TYPES = [
  "gps.trips", "gps.daily", "gps.stops", "gps.devices", "gps.scheduled-trips",
  "events.list", "events.counts", "fleet.utilization-report",
];

export const PERIOD_OPTIONS = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "60d", label: "60 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "12 months" },
];

/** Which presets each report accepts: the reporting store stops at 60 days. */
export const periodsFor = (type: string) =>
  SIXTY_DAY_TYPES.includes(type)
    ? PERIOD_OPTIONS.filter((p) => ["1d", "7d", "30d", "60d"].includes(p.value))
    : PERIOD_OPTIONS.filter((p) => p.value !== "1d" && p.value !== "60d");

/** Schedules accept these presets only. */
export const SCHEDULE_PERIODS = PERIOD_OPTIONS.filter((p) =>
  ["7d", "30d", "90d", "1y"].includes(p.value),
);

export const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" }, { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];
