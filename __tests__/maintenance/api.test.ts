/**
 * Maintenance API unit tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  getMaintenances,
  createSchedule,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  getMaintenanceJobs,
  createMaintenanceJob,
  getMaintenanceJobById,
  transitionMaintenanceJob,
  getMaintenanceAlerts,
  acknowledgeMaintenanceAlert,
  snoozeMaintenanceAlert,
  getMaintenanceLogs,
  updateLogStatus,
  startLog,
  completeLog,
  cancelLog,
  getJobCostSummary,
  getJobHistory,
  getJobConversation,
  postJobMessage,
} from "@/lib/api/maintenance";

const mockPagination = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Schedules ─────────────────────────────────────────────────────────────────

describe("getMaintenances", () => {
  it("calls GET /maintenances with params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { schedules: [], pagination: mockPagination } },
    });
    await getMaintenances({ page: 1, per_page: 20, status: "pending" });
    expect(apiClient.get).toHaveBeenCalledWith("/maintenances", {
      params: { page: 1, per_page: 20, status: "pending" },
    });
  });
});

describe("createSchedule", () => {
  it("calls POST /maintenances/schedules with payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { schedule: {} } },
    });
    const payload = {
      vehicle_id: 1,
      service_type: "oil_change",
      schedule_type: "time" as const,
    };
    await createSchedule(payload);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/maintenances/schedules",
      payload,
    );
  });
});

describe("getScheduleById", () => {
  it("calls GET /maintenances/schedules/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { schedule: {} } },
    });
    await getScheduleById("42");
    expect(apiClient.get).toHaveBeenCalledWith("/maintenances/schedules/42");
  });
});

describe("updateSchedule", () => {
  it("calls PUT /maintenances/schedules/:id with data", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { data: { schedule: {} } },
    });
    await updateSchedule("5", { is_active: false });
    expect(apiClient.put).toHaveBeenCalledWith("/maintenances/schedules/5", {
      is_active: false,
    });
  });
});

describe("deleteSchedule", () => {
  it("calls DELETE /maintenances/schedules/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({});
    await deleteSchedule("7");
    expect(apiClient.delete).toHaveBeenCalledWith("/maintenances/schedules/7");
  });
});

// ── Jobs ──────────────────────────────────────────────────────────────────────

describe("getMaintenanceJobs", () => {
  it("calls GET /maintenance/jobs with params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { jobs: [], pagination: mockPagination } },
    });
    await getMaintenanceJobs({ page: 2, status: "in_progress" });
    expect(apiClient.get).toHaveBeenCalledWith("/maintenance/jobs", {
      params: { page: 2, status: "in_progress" },
    });
  });
});

describe("createMaintenanceJob", () => {
  it("calls POST /maintenance/jobs with payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const payload = {
      vehicle_id: 3,
      title: "Oil change",
      description: "Routine",
      fault_category: "engine",
      cost_estimate_kobo: 5000000,
    };
    await createMaintenanceJob(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/maintenance/jobs", payload);
  });
});

describe("getMaintenanceJobById", () => {
  it("calls GET /maintenance/jobs/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    await getMaintenanceJobById("99");
    expect(apiClient.get).toHaveBeenCalledWith("/maintenance/jobs/99");
  });
});

describe("transitionMaintenanceJob", () => {
  it("calls PATCH /maintenance/jobs/:id/transition with to_status", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    await transitionMaintenanceJob("10", {
      to_status: "completed",
      notes: "Done",
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/maintenance/jobs/10/transition",
      {
        to_status: "completed",
        notes: "Done",
      },
    );
  });
});

// ── Alerts ────────────────────────────────────────────────────────────────────

describe("getMaintenanceAlerts", () => {
  it("calls GET /maintenance/alerts", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { alerts: [], pagination: mockPagination } },
    });
    await getMaintenanceAlerts({ status: "pending" });
    expect(apiClient.get).toHaveBeenCalledWith("/maintenance/alerts", {
      params: { status: "pending" },
    });
  });
});

describe("acknowledgeMaintenanceAlert", () => {
  it("calls PATCH /maintenance/alerts/:id/acknowledge", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    await acknowledgeMaintenanceAlert("3");
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/maintenance/alerts/3/acknowledge",
    );
  });
});

describe("snoozeMaintenanceAlert", () => {
  it("calls PATCH /maintenance/alerts/:id/snooze with snooze_days", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    await snoozeMaintenanceAlert("5", {
      snooze_days: 7,
      reason: "Parts ordered",
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/maintenance/alerts/5/snooze",
      {
        snooze_days: 7,
        reason: "Parts ordered",
      },
    );
  });
});

// ── Logs ──────────────────────────────────────────────────────────────────────

describe("getMaintenanceLogs", () => {
  it("calls GET /maintenances/logs with params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: { logs: [] } },
    });
    await getMaintenanceLogs({ page: 1, per_page: 10 });
    expect(apiClient.get).toHaveBeenCalledWith("/maintenances/logs", {
      params: { page: 1, per_page: 10 },
    });
  });
});

describe("updateLogStatus", () => {
  it("calls PUT /maintenances/logs/update-status/:id with status", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} });
    await updateLogStatus("12", "completed");
    expect(apiClient.put).toHaveBeenCalledWith(
      "/maintenances/logs/update-status/12",
      { status: "completed" },
    );
  });
});

describe("startLog", () => {
  it("calls POST /maintenances/logs/:id/start", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await startLog("4");
    expect(apiClient.post).toHaveBeenCalledWith("/maintenances/logs/4/start");
  });
});

describe("completeLog", () => {
  it("calls POST /maintenances/logs/:id/complete", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await completeLog("4");
    expect(apiClient.post).toHaveBeenCalledWith(
      "/maintenances/logs/4/complete",
    );
  });
});

describe("cancelLog", () => {
  it("calls POST /maintenances/logs/:id/cancel with reason", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await cancelLog("4", "Parts unavailable");
    expect(apiClient.post).toHaveBeenCalledWith("/maintenances/logs/4/cancel", {
      reason: "Parts unavailable",
    });
  });
});

// ── Job detail helpers ────────────────────────────────────────────────────────

describe("getJobCostSummary", () => {
  it("calls GET /maintenance/jobs/:id/cost-summary", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    await getJobCostSummary("8");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/maintenance/jobs/8/cost-summary",
    );
  });
});

describe("getJobHistory", () => {
  it("calls GET /maintenance/jobs/:id/history", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    await getJobHistory("8");
    expect(apiClient.get).toHaveBeenCalledWith("/maintenance/jobs/8/history");
  });
});

describe("getJobConversation", () => {
  it("calls GET /maintenance/jobs/:id/conversation", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    await getJobConversation("8");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/maintenance/jobs/8/conversation",
    );
  });
});

describe("postJobMessage", () => {
  it("calls POST /maintenance/jobs/:id/messages with body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    await postJobMessage("8", { body: "Parts ordered", is_internal: true });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/maintenance/jobs/8/messages",
      {
        body: "Parts ordered",
        is_internal: true,
      },
    );
  });
});
