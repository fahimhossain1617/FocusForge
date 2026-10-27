/**
 * Focentia Client Telemetry Types
 *
 * Defines strictly typed structures for client-side technical events,
 * queue payloads, error diagnostics, and feature flags.
 *
 * PRIVACY GUARANTEE:
 * No personal user data, notes, diary text, task contents, or AI chat prompts
 * are ever accepted into telemetry payloads.
 */

export type TelemetryEventType =
  | "feature_usage"
  | "session_lifecycle"
  | "client_error"
  | "network_error"
  | "idb_metric"
  | "web_vital"
  | "ai_metric"
  | "auth_sync_event"
  | "heartbeat";

export type FeatureAction = "opened" | "used" | "completed" | "failed";

export interface FeatureUsageEvent {
  type: "feature_usage";
  feature: string;
  action: FeatureAction;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface SessionLifecycleEvent {
  type: "session_lifecycle";
  lifecycle: "start" | "end" | "resume" | "background";
  sessionDurationMs?: number;
}

export type ErrorSeverity = "fatal" | "high" | "medium" | "low";

export interface ClientErrorEvent {
  type: "client_error";
  errorType:
    | "react_boundary"
    | "uncaught_window_error"
    | "unhandled_rejection"
    | "chunk_load"
    | "invalid_state";
  name: string;
  message: string;
  sanitizedStack?: string;
  componentStack?: string;
  route: string;
  severity: ErrorSeverity;
  appVersion: string;
  platform: "desktop" | "mobile" | "pwa_installed";
}

export interface NetworkErrorEvent {
  type: "network_error";
  endpoint: string;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  status: number;
  durationMs: number;
  sanitizedErrorMessage?: string;
}

export interface IdbMetricEvent {
  type: "idb_metric";
  operation: "read" | "write" | "delete" | "query" | "bulk_write";
  storeName: string;
  durationMs: number;
  success: boolean;
  errorSnippet?: string;
}

export interface WebVitalEvent {
  type: "web_vital";
  name: "LCP" | "CLS" | "INP" | "TTFB" | "FID";
  value: number;
  rating: "good" | "needs_improvement" | "poor";
}

export interface AIMetricEvent {
  type: "ai_metric";
  feature: "glory_copilot" | "voice_transcription" | "roadmap_generation" | "task_extractor";
  durationMs: number;
  success: boolean;
  errorCode?: string;
  estimatedTokens?: number;
}

export interface AuthSyncEvent {
  type: "auth_sync_event";
  event: "auth_failure" | "session_expired" | "sync_conflict" | "sync_failed";
  details?: string;
}

export interface HeartbeatEvent {
  type: "heartbeat";
  activeTab: boolean;
}

export type TelemetryPayload =
  | FeatureUsageEvent
  | SessionLifecycleEvent
  | ClientErrorEvent
  | NetworkErrorEvent
  | IdbMetricEvent
  | WebVitalEvent
  | AIMetricEvent
  | AuthSyncEvent
  | HeartbeatEvent;

export interface QueuedTelemetryRecord {
  id: string; // UUID / random string
  idempotencyKey: string;
  timestamp: string; // ISO string
  sessionId: string; // anonymous random session ID
  isGuest: boolean;
  appVersion: string;
  event: TelemetryPayload;
  retryCount: number;
  lastAttemptAt?: string;
}

export interface IngestResponse {
  success: boolean;
  acceptedCount: number;
  rejectedCount?: number;
  message?: string;
}

export interface PublicFeatureFlags {
  [flagKey: string]: boolean;
}

export interface DurableFeedbackPayload {
  id: string;
  category: "problem" | "support" | "feedback" | "review";
  subject?: string;
  message: string;
  rating?: number | null;
  appVersion: string;
  technicalContext?: {
    platform: string;
    userAgent: string;
    route: string;
    [key: string]: any;
  };
  submittedAt: string;
  retryCount: number;
}
