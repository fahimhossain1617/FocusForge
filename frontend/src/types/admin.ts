/**
 * Focentia Admin Control Center Types
 *
 * Full contract with Part 2 Backend and Part 3 Database.
 * Every response includes an explicit status discriminator so that
 * errors or unconnected states NEVER render as a false positive "zero".
 */

export type ApiResponseStatus = "connected" | "not_connected" | "error" | "forbidden";

export interface BaseApiResponse<T> {
  success: boolean;
  status: ApiResponseStatus;
  data?: T;
  error?: string;
  timestamp: string;
  dataSource?: string;
}

export type TimeRangeFilter = "24h" | "7d" | "30d" | "custom";

// 1. Admin Identity & Session Info
export interface AdminMeResponse {
  isAdmin: boolean;
  email: string;
  role: "super_admin" | "admin" | "operator";
  permissions: string[];
  mfaEnabled: boolean;
  lastLoginAt?: string;
}

// 2. Overview Dashboard
export interface AdminOverviewMetric {
  title: string;
  value: number | string;
  previousValue?: number | string;
  changePercent?: number;
  definition: string;
  windowLabel: string;
}

export interface FeatureRankItem {
  featureName: string;
  usageCount: number;
  uniqueUsers: number;
  percentageOfTotal: number;
}

export interface AdminOverviewData {
  timeWindow: string;
  registeredUsers: AdminOverviewMetric;
  guestSessions: AdminOverviewMetric; // Distinct from unique people!
  dau: AdminOverviewMetric;
  wau: AdminOverviewMetric;
  mau: AdminOverviewMetric;
  openFeedbackCount: number;
  unresolvedBugsCount: number;
  criticalSecurityEvents: number;
  performanceIssuesCount: number;
  syncErrorsCount: number;
  currentReleaseVersion: string;
  deploymentStatus: "healthy" | "degraded" | "failing" | "unknown";
  aiUsageSummary: {
    totalEstimatedTokens: number;
    estimatedCostUsd: number; // Clearly labeled as estimate!
    activeRequests: number;
    errorRatePercent: number;
  };
  mostUsedFeatures: FeatureRankItem[];
  leastUsedFeatures: FeatureRankItem[];
  reliableDataCollectionStartedAt?: string;
}

// 3. Product Analytics
export interface FeatureAnalyticsItem {
  featureId: string;
  featureName: string;
  totalInteractions: number;
  activeUsers: number;
  repeatUsagePercent: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs?: number;
  dailyTrend: { date: string; count: number }[];
}

export interface ProductAnalyticsData {
  range: TimeRangeFilter;
  features: FeatureAnalyticsItem[];
  totalActions: number;
}

// 4. Users & Login Activity
export interface AdminUserListItem {
  id: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  lastObservedLogin?: string;
  lastActivityAt?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  reportsCount: number;
  role: string;
}

export interface AdminUserDetail {
  id: string;
  email?: string;
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  lastObservedLogin?: string;
  lastActivityAt?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  totalFocusMinutes: number;
  totalTasksCompleted: number;
  notesCount: number;
  relatedTicketsCount: number;
  relatedIssuesCount: number;
  recentSessions: { date: string; platform: string; durationMins: number }[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 5. Guest Activity
export interface GuestDailyCount {
  date: string;
  guestSessionsCount: number;
  anonymousVisitsCount: number;
}

export interface GuestActivityData {
  range: TimeRangeFilter;
  dailyCounts: GuestDailyCount[];
  totalSessions: number;
  averageSessionsPerDay: number;
  note: string; // Explaining sessions != unique people
}

// 6. Feedback & Support Inbox
export type FeedbackCategory = "problem" | "support" | "feedback" | "suggestion" | "review";
export type FeedbackStatus = "new" | "in_progress" | "resolved" | "closed";

export interface FeedbackTicket {
  id: string;
  category: FeedbackCategory;
  subject?: string;
  message: string;
  rating?: number | null;
  submittedAt: string;
  userType: "authenticated" | "guest";
  userName: string;
  userId?: string;
  userEmail?: string;
  avatarUrl?: string;
  appVersion: string;
  technicalContext?: Record<string, any>;
  status: FeedbackStatus;
  internalNotes?: string;
  isGuest?: boolean;
  updatedAt?: string;
  resolvedAt?: string;
}

// 7. Bugs & Crash Reports
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueStatus = "new" | "investigating" | "fixed" | "verified" | "reopened";

export interface BugIssue {
  id: string;
  fingerprint?: string;
  title: string;
  errorName: string;
  message: string;
  sanitizedStack?: string;
  route: string;
  appVersion: string;
  platform: string;
  severity: IssueSeverity;
  status: IssueStatus;
  occurrencesCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  breadcrumbs: { timestamp: string; action: string }[];
  isRecurrent: boolean;
  facts: string[];
  hypotheses: string[];
}

// 8. Performance Monitoring
export interface PerformanceMetricRecord {
  id: string;
  metric: "LCP" | "CLS" | "INP" | "API_LATENCY" | "IDB_LATENCY";
  observedValue: number;
  unit: "ms" | "score";
  monitoringThreshold: number;
  route: string;
  appVersion: string;
  platform: string;
  affectedSessions: number;
  severity: "normal" | "warning" | "critical";
  firstSeenAt: string;
  lastSeenAt: string;
  status: "active" | "mitigated" | "investigating";
}

// 9. Security & Abuse Monitoring
export interface SecurityEvent {
  id: string;
  timestamp: string;
  category: "rate_limit" | "auth_brute_force" | "origin_mismatch" | "token_anomaly" | "payload_size";
  severity: "critical" | "high" | "medium" | "low";
  resource: string;
  sanitizedContext: string;
  detectionReason: string;
  status: "detected" | "reviewed" | "dismissed";
  notes?: string;
}

// 10. Data & Sync Health
export interface SyncHealthData {
  range: TimeRangeFilter;
  indexedDbHealthyCount: number;
  indexedDbErrorCount: number;
  supabaseSyncSuccessRate: number; // e.g. 99.4%
  syncConflictsCount: number;
  pendingSyncQueueAvgSize: number;
  commonSyncErrors: { errorSnippet: string; count: number }[];
}

// 11. Release & Deployment Status
export interface ReleaseStatusData {
  currentAppVersion: string;
  currentCommitHash: string;
  deployedAt?: string;
  environment: "production" | "preview" | "development";
  isHealthy: boolean;
  integrationStatus: "connected" | "unavailable";
  changelogItems: string[];
  lastSeenAdminRelease?: string;
}

export interface AdminReleaseNotice {
  version: string;
  releasedAt: string;
  summary: string;
  isNew: boolean;
}

// 12. Alert Center
export interface AlertItem {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "security" | "crash" | "performance" | "sync" | "ai_quota";
  title: string;
  description: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "acknowledged" | "investigating" | "resolved";
  actionLink?: string;
}

// 13. Admin Activity / Audit Log
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  targetResource: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

// 14. AI Usage & Quotas
export interface AIUsageData {
  range: TimeRangeFilter;
  totalTokensUsed: number;
  estimatedCostUsd: number; // Clearly labeled as estimate!
  copilotRequests: number;
  voiceMinutes: number;
  geminiErrorsCount: number;
  quotaStatus: {
    planTier: string;
    usedPercent: number;
    resetDate: string;
  };
  dailyTokenBreakdown: { date: string; tokens: number; costEstimate: number }[];
}

export interface UserAIQuota {
  userId: string;
  userEmail?: string;
  monthlyTokenLimit: number;
  currentTokensUsed: number;
  resetDate: string;
  isUnlimited: boolean;
}

// 15. Feature Flags / Kill Switches
export interface AdminFeatureFlag {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  updatedAt: string;
  updatedBy: string;
}

// 16. Monitoring Health
export interface MonitoringHealthData {
  telemetryIngestStatus: "healthy" | "degraded" | "down";
  lastSuccessfulIngestionAt?: string;
  ingestedLast24h: number;
  droppedLast24h: number;
  ingestErrorRatePercent: number;
  storageUsageMb: number;
}

// 17. Privacy Requests
export interface PrivacyRequestItem {
  id: string;
  userId: string;
  userEmail: string;
  type: "data_export" | "account_deletion";
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

// 18. Admin Security Sessions
export interface AdminSessionItem {
  id: string;
  adminEmail: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
}
