/**
 * Server-Side Feature Flags and Kill Switches
 *
 * Implements server-managed feature flags:
 * - glory_ai: Kill switch for Gemini AI copilot
 * - voice_dictation: Kill switch for audio dictation
 * - file_export: Kill switch for data export
 * - telemetry_collection: Kill switch for client telemetry ingestion
 *
 * FAIL-OPEN GUARANTEE:
 * If the feature flags store or database is unreachable, all user-facing
 * features default to ENABLED (true) so that application availability is never broken.
 */

import { pool } from '@/lib/server/db';

export interface ServerFeatureFlag {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  updatedAt: string;
  updatedBy: string;
}

// Default fail-open baseline configuration
const DEFAULT_FLAGS: Record<string, ServerFeatureFlag> = {
  glory_ai: {
    key: 'glory_ai',
    name: 'Glory AI Copilot',
    description: 'Enables or disables AI assistant endpoints and intelligent guidance.',
    isEnabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_default',
  },
  voice_dictation: {
    key: 'voice_dictation',
    name: 'Voice Dictation & STT',
    description: 'Enables real-time continuous speech-to-text dictation and transcription.',
    isEnabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_default',
  },
  file_export: {
    key: 'file_export',
    name: 'Data & File Export',
    description: 'Enables downloading backups, notes, and local database archives.',
    isEnabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_default',
  },
  telemetry_collection: {
    key: 'telemetry_collection',
    name: 'Telemetry Ingestion',
    description: 'Accepts technical performance, error reports, and vitals ingestion.',
    isEnabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_default',
  },
};

// In-memory cache with 30s TTL
let cachedFlags: Record<string, ServerFeatureFlag> = { ...DEFAULT_FLAGS };
let lastFetchedAt = 0;
const CACHE_TTL_MS = 30000;

export async function getAllFeatureFlags(): Promise<ServerFeatureFlag[]> {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL_MS && Object.keys(cachedFlags).length > 0) {
    return Object.values(cachedFlags);
  }

  try {
    const { rows } = await pool.query(
      `SELECT key, name, description, is_enabled, rollout_percentage, updated_at, updated_by FROM admin_feature_flags`
    );

    if (rows.length > 0) {
      const freshMap: Record<string, ServerFeatureFlag> = { ...DEFAULT_FLAGS };
      for (const r of rows) {
        freshMap[r.key] = {
          key: r.key,
          name: r.name || r.key,
          description: r.description || '',
          isEnabled: Boolean(r.is_enabled),
          rolloutPercentage: Number(r.rollout_percentage) || 100,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          updatedBy: r.updated_by || 'admin',
        };
      }
      cachedFlags = freshMap;
      lastFetchedAt = now;
      return Object.values(cachedFlags);
    }
  } catch (err: any) {
    console.warn('[FeatureFlags] Database query notice (using fail-open defaults):', err?.message);
  }

  return Object.values(cachedFlags);
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  const flag = flags.find((f) => f.key === key);
  return flag !== undefined ? flag.isEnabled : true; // Default fail-open
}

export async function updateFeatureFlag(
  keyOrObj: string | ({ key: string; isEnabled?: boolean } & Partial<ServerFeatureFlag>),
  updates?: Partial<ServerFeatureFlag> | boolean,
  adminEmail: string = 'fahimhossain1617@gmail.com'
): Promise<ServerFeatureFlag> {
  let key: string;
  let normalizedUpdates: Partial<ServerFeatureFlag>;
  let email = adminEmail;

  if (typeof keyOrObj === 'object' && keyOrObj !== null) {
    key = keyOrObj.key;
    const { key: _k, updatedBy, ...rest } = keyOrObj;
    normalizedUpdates = rest;
    if (updatedBy) email = updatedBy;
  } else {
    key = keyOrObj;
    normalizedUpdates = typeof updates === 'boolean'
      ? { isEnabled: updates }
      : (updates || {});
  }

  const current = cachedFlags[key] || DEFAULT_FLAGS[key] || {
    key,
    name: key,
    description: '',
    isEnabled: true,
    rolloutPercentage: 100,
    updatedAt: new Date().toISOString(),
    updatedBy: email,
  };

  const updated: ServerFeatureFlag = {
    ...current,
    ...normalizedUpdates,
    key,
    updatedAt: new Date().toISOString(),
    updatedBy: email,
  };

  try {
    await pool.query(
      `
      INSERT INTO admin_feature_flags (key, name, description, is_enabled, rollout_percentage, updated_at, updated_by)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (key) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, admin_feature_flags.name),
        description = COALESCE(EXCLUDED.description, admin_feature_flags.description),
        is_enabled = EXCLUDED.is_enabled,
        rollout_percentage = EXCLUDED.rollout_percentage,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      `,
      [
        updated.key,
        updated.name,
        updated.description,
        updated.isEnabled,
        updated.rolloutPercentage,
        adminEmail,
      ]
    );
  } catch (err: any) {
    console.warn('[FeatureFlags] DB update notice (table may be pending Part 3):', err?.message);
  }

  cachedFlags[key] = updated;
  lastFetchedAt = Date.now();
  return updated;
}
