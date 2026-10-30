/**
 * Focentia Admin API Client (Single Typed Module)
 *
 * Strict contract with Part 2 Backend endpoints.
 * Returns structured BaseApiResponse with explicit status ("connected" | "not_connected" | "error" | "forbidden").
 * If the backend endpoint is not implemented or reachable, it returns "not_connected" so
 * that the frontend NEVER claims or displays a confirmed zero.
 */

import { supabase } from "../lib/supabaseClient";
import {
  BaseApiResponse,
  AdminMeResponse,
  AdminOverviewData,
  ProductAnalyticsData,
  AdminUserListItem,
  AdminUserDetail,
  PaginatedResult,
  GuestActivityData,
  FeedbackTicket,
  BugIssue,
  PerformanceMetricRecord,
  SecurityEvent,
  SyncHealthData,
  ReleaseStatusData,
  AdminReleaseNotice,
  AlertItem,
  AuditLogEntry,
  AIUsageData,
  UserAIQuota,
  AdminFeatureFlag,
  MonitoringHealthData,
  PrivacyRequestItem,
  AdminSessionItem,
  TimeRangeFilter,
} from "../types/admin";

interface CacheEntry<T> {
  data: BaseApiResponse<T>;
  timestamp: number;
}

const adminMemoryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60 * 1000; // 60s client cache for instant SPA switching

export function invalidateAdminCache(prefix?: string) {
  if (!prefix) {
    adminMemoryCache.clear();
  } else {
    for (const key of adminMemoryCache.keys()) {
      if (key.startsWith(prefix)) {
        adminMemoryCache.delete(key);
      }
    }
  }
}

async function executeAdminFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<BaseApiResponse<T>> {
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const bypassCache = options.cache === "reload";

  // If cached and fresh, return immediately without network latency
  if (isGet && !bypassCache) {
    const cached = adminMemoryCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as BaseApiResponse<T>;
    }
  }

  const timestamp = new Date().toISOString();
  try {
    let authHeader = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authHeader = `Bearer ${session.access_token}`;
      }
    } catch (authErr) {
      console.warn("[adminApiClient] Failed to acquire Supabase session token:", authErr);
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        status: "forbidden",
        error: "Access denied: Unauthorized admin session.",
        timestamp,
      };
    }

    if (res.status === 404 || res.status === 502 || res.status === 503) {
      return {
        success: false,
        status: "not_connected",
        error: `Endpoint not available (${res.status}): Backend data source not connected yet.`,
        timestamp,
      };
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      return {
        success: false,
        status: "error",
        error: errorJson.error || errorJson.message || `API error (${res.status})`,
        timestamp,
      };
    }

    const json = await res.json();
    const result: BaseApiResponse<T> = {
      success: true,
      status: "connected",
      data: json.data !== undefined ? json.data : json,
      timestamp,
      dataSource: json.dataSource || "Focentia Admin API",
    };

    if (isGet) {
      adminMemoryCache.set(url, { data: result, timestamp: Date.now() });
    } else {
      // Invalidate cache on mutations
      adminMemoryCache.clear();
    }

    return result;
  } catch (err: any) {
    return {
      success: false,
      status: "not_connected",
      error: err?.message || "Network request failed: Backend not connected.",
      timestamp,
    };
  }
}

export const adminApiClient = {
  // 1. Admin Identity
  async getMe(): Promise<BaseApiResponse<AdminMeResponse>> {
    return executeAdminFetch<AdminMeResponse>("/api/admin/me");
  },

  // 2. Overview Dashboard
  async getOverview(range: TimeRangeFilter = "24h"): Promise<BaseApiResponse<AdminOverviewData>> {
    return executeAdminFetch<AdminOverviewData>(`/api/admin/overview?range=${encodeURIComponent(range)}`);
  },

  // 3. Product Analytics
  async getAnalytics(
    range: TimeRangeFilter = "7d",
    feature?: string
  ): Promise<BaseApiResponse<ProductAnalyticsData>> {
    const query = new URLSearchParams({ range });
    if (feature) query.set("feature", feature);
    return executeAdminFetch<ProductAnalyticsData>(`/api/admin/analytics?${query.toString()}`);
  },

  // 4. Users & Login Activity
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  } = {}): Promise<BaseApiResponse<PaginatedResult<AdminUserListItem>>> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    return executeAdminFetch<PaginatedResult<AdminUserListItem>>(`/api/admin/users?${query.toString()}`);
  },

  async getUserDetail(userId: string): Promise<BaseApiResponse<AdminUserDetail>> {
    return executeAdminFetch<AdminUserDetail>(`/api/admin/users/${encodeURIComponent(userId)}`);
  },

  async suspendUser(
    userId: string,
    reason: string
  ): Promise<BaseApiResponse<{ suspended: boolean; userId: string }>> {
    return executeAdminFetch<{ suspended: boolean; userId: string }>(
      `/api/admin/users/${encodeURIComponent(userId)}/suspend`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    );
  },

  async restoreUser(userId: string): Promise<BaseApiResponse<{ restored: boolean; userId: string }>> {
    return executeAdminFetch<{ restored: boolean; userId: string }>(
      `/api/admin/users/${encodeURIComponent(userId)}/restore`,
      { method: "POST" }
    );
  },

  // 5. Guest Activity
  async getGuests(range: TimeRangeFilter = "7d"): Promise<BaseApiResponse<GuestActivityData>> {
    return executeAdminFetch<GuestActivityData>(`/api/admin/guests?range=${encodeURIComponent(range)}`);
  },

  // 6. Feedback & Support Inbox
  async getFeedback(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: string;
    search?: string;
  } = {}): Promise<BaseApiResponse<PaginatedResult<FeedbackTicket>>> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    if (params.category) query.set("category", params.category);
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    return executeAdminFetch<PaginatedResult<FeedbackTicket>>(`/api/admin/feedback?${query.toString()}`);
  },

  async getFeedbackDetail(id: string): Promise<BaseApiResponse<FeedbackTicket>> {
    return executeAdminFetch<FeedbackTicket>(`/api/admin/feedback/${encodeURIComponent(id)}`);
  },

  async updateFeedbackStatus(
    id: string,
    status: FeedbackTicket["status"]
  ): Promise<BaseApiResponse<FeedbackTicket>> {
    return executeAdminFetch<FeedbackTicket>(`/api/admin/feedback/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async addFeedbackNotes(id: string, notes: string): Promise<BaseApiResponse<{ notes: string }>> {
    return executeAdminFetch<{ notes: string }>(`/api/admin/feedback/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  // 7. Bugs & Crash Reports
  async getIssues(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    severity?: string;
  } = {}): Promise<BaseApiResponse<PaginatedResult<BugIssue>>> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    if (params.status) query.set("status", params.status);
    if (params.severity) query.set("severity", params.severity);
    return executeAdminFetch<PaginatedResult<BugIssue>>(`/api/admin/issues?${query.toString()}`);
  },

  async getIssueDetail(id: string): Promise<BaseApiResponse<BugIssue>> {
    return executeAdminFetch<BugIssue>(`/api/admin/issues/${encodeURIComponent(id)}`);
  },

  async updateIssueStatus(
    id: string,
    status: BugIssue["status"]
  ): Promise<BaseApiResponse<BugIssue>> {
    return executeAdminFetch<BugIssue>(`/api/admin/issues/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 8. Performance Monitoring
  async getPerformance(range: TimeRangeFilter = "24h"): Promise<BaseApiResponse<PerformanceMetricRecord[]>> {
    return executeAdminFetch<PerformanceMetricRecord[]>(`/api/admin/performance?range=${encodeURIComponent(range)}`);
  },

  // 9. Security & Abuse Monitoring
  async getSecurity(): Promise<BaseApiResponse<SecurityEvent[]>> {
    return executeAdminFetch<SecurityEvent[]>("/api/admin/security");
  },

  // 10. Data & Sync Health
  async getSyncHealth(range: TimeRangeFilter = "24h"): Promise<BaseApiResponse<SyncHealthData>> {
    return executeAdminFetch<SyncHealthData>(`/api/admin/sync-health?range=${encodeURIComponent(range)}`);
  },

  // 11. Release & Deployment Status
  async getRelease(): Promise<BaseApiResponse<ReleaseStatusData>> {
    return executeAdminFetch<ReleaseStatusData>("/api/admin/release");
  },

  async markReleaseSeen(version: string): Promise<BaseApiResponse<{ seen: boolean }>> {
    return executeAdminFetch<{ seen: boolean }>("/api/admin/release/seen", {
      method: "POST",
      body: JSON.stringify({ version }),
    });
  },

  // 12. Alert Center
  async getAlerts(): Promise<BaseApiResponse<AlertItem[]>> {
    return executeAdminFetch<AlertItem[]>("/api/admin/alerts");
  },

  async updateAlertStatus(
    id: string,
    status: AlertItem["status"]
  ): Promise<BaseApiResponse<AlertItem>> {
    return executeAdminFetch<AlertItem>(`/api/admin/alerts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  // 13. Admin Activity / Audit Log
  async getAuditLog(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<BaseApiResponse<PaginatedResult<AuditLogEntry>>> {
    const query = new URLSearchParams({
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 30),
    });
    return executeAdminFetch<PaginatedResult<AuditLogEntry>>(`/api/admin/audit-log?${query.toString()}`);
  },

  // 14. AI Usage & Quotas
  async getAIUsage(range: TimeRangeFilter = "7d"): Promise<BaseApiResponse<AIUsageData>> {
    return executeAdminFetch<AIUsageData>(`/api/admin/ai-usage?range=${encodeURIComponent(range)}`);
  },

  async getUserQuota(userId: string): Promise<BaseApiResponse<UserAIQuota>> {
    return executeAdminFetch<UserAIQuota>(`/api/admin/quotas/${encodeURIComponent(userId)}`);
  },

  async adjustUserQuota(
    userId: string,
    tokenLimit: number
  ): Promise<BaseApiResponse<UserAIQuota>> {
    return executeAdminFetch<UserAIQuota>(`/api/admin/quotas/${encodeURIComponent(userId)}/adjust`, {
      method: "POST",
      body: JSON.stringify({ tokenLimit }),
    });
  },

  // 15. Feature Flags
  async getFlags(): Promise<BaseApiResponse<AdminFeatureFlag[]>> {
    return executeAdminFetch<AdminFeatureFlag[]>("/api/admin/flags");
  },

  async updateFlag(
    key: string,
    updates: Partial<AdminFeatureFlag>
  ): Promise<BaseApiResponse<AdminFeatureFlag>> {
    return executeAdminFetch<AdminFeatureFlag>(`/api/admin/flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  // 16. Monitoring Health
  async getMonitoringHealth(): Promise<BaseApiResponse<MonitoringHealthData>> {
    return executeAdminFetch<MonitoringHealthData>("/api/admin/monitoring-health");
  },

  // 17. Privacy Requests
  async getPrivacyRequests(): Promise<BaseApiResponse<PrivacyRequestItem[]>> {
    return executeAdminFetch<PrivacyRequestItem[]>("/api/admin/privacy-requests");
  },

  async updatePrivacyRequestStatus(
    id: string,
    status: PrivacyRequestItem["status"]
  ): Promise<BaseApiResponse<PrivacyRequestItem>> {
    return executeAdminFetch<PrivacyRequestItem>(`/api/admin/privacy-requests`, {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
  },

  // 18. Admin Sessions
  async getAdminSessions(): Promise<BaseApiResponse<AdminSessionItem[]>> {
    return executeAdminFetch<AdminSessionItem[]>("/api/admin/security/admin-sessions");
  },
};
