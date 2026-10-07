/**
 * Focentia Dexie.js Client Database Layer (lib/db.ts)
 *
 * Provides a versioned, typed IndexedDB schema powered by Dexie.js.
 * Guarantees strict user isolation by scoping every store and record to the active user ID.
 */

import Dexie, { type EntityTable } from "dexie";
import type {
  Task,
  Note,
  DiaryTopic,
  DiaryEntry,
  FocusSession,
  LearningFolder,
  LearningLog,
  MindItem,
  RoutineTemplate,
  AppState,
} from "../types";

export interface DexieBaseRecord {
  localKey: string; // Composite key: `${userId}::${id}`
  id: string | number;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  syncVersion?: number;
}

export type DexieTask = DexieBaseRecord & Task;
export type DexieNote = DexieBaseRecord & Note;
export type DexieDiaryTopic = DexieBaseRecord & DiaryTopic;
export type DexieDiaryEntry = DexieBaseRecord & DiaryEntry & { topicId: string };
export type DexieFocusSession = DexieBaseRecord & FocusSession;
export type DexieLearningFolder = DexieBaseRecord & LearningFolder;
export type DexieLearningLog = DexieBaseRecord & LearningLog;
export type DexieMindItem = DexieBaseRecord & MindItem;
export type DexieRoutineTemplate = DexieBaseRecord & RoutineTemplate;

export interface DexieAttachment extends DexieBaseRecord {
  fileName: string;
  fileSize: number;
  fileType: string;
  dataUrl?: string;
  encryptedBlobPath?: string;
  iv?: string;
}

export interface DexieAISession extends DexieBaseRecord {
  title: string;
  model?: string;
  isPinned?: boolean;
}

export interface DexieAIMessage extends DexieBaseRecord {
  sessionId: string;
  role: "user" | "model" | "assistant" | "system";
  content: string;
  action?: string;
  actionPayload?: any;
}

export interface DexieAIMemory extends DexieBaseRecord {
  category: string;
  key: string;
  value: string;
  confidence?: number;
}

export interface DexieAppPreferences {
  localKey: string;
  userId: string;
  theme?: any;
  lang?: string;
  notifPreferences?: any;
  calendarPreferences?: any;
  updatedAt: string;
}

export interface DexieAppStateBackup {
  localKey: string;
  userId: string;
  state: Partial<AppState>;
  updatedAt: string;
}

export interface DexieSyncQueueItem {
  localKey: string; // `${userId}::${storeName}::${recordId}`
  userId: string;
  storeName: string;
  recordId: string | number;
  updatedAt: string;
  isDeleted: boolean;
}

export interface DexieCryptoMetadata {
  userId: string;
  keyVersion: number;
  algorithm: string;
  kdfAlgorithm: string;
  kdfSalt: string;
  kdfParams: Record<string, any>;
  wrappedMasterKey: string;
  hasLocalRecoveryKey?: boolean;
  updatedAt: string;
}

// ============================================================================
// DEXIE DATABASE CLASS
// ============================================================================

export class FocentiaDatabase extends Dexie {
  tasks!: EntityTable<DexieTask, "localKey">;
  routine_templates!: EntityTable<DexieRoutineTemplate, "localKey">;
  notes!: EntityTable<DexieNote, "localKey">;
  diary_topics!: EntityTable<DexieDiaryTopic, "localKey">;
  diary_entries!: EntityTable<DexieDiaryEntry, "localKey">;
  focus_sessions!: EntityTable<DexieFocusSession, "localKey">;
  learning_folders!: EntityTable<DexieLearningFolder, "localKey">;
  learning_logs!: EntityTable<DexieLearningLog, "localKey">;
  mind_items!: EntityTable<DexieMindItem, "localKey">;
  attachments!: EntityTable<DexieAttachment, "localKey">;
  ai_sessions!: EntityTable<DexieAISession, "localKey">;
  ai_messages!: EntityTable<DexieAIMessage, "localKey">;
  ai_memory!: EntityTable<DexieAIMemory, "localKey">;
  app_preferences!: EntityTable<DexieAppPreferences, "localKey">;
  app_state!: EntityTable<DexieAppStateBackup, "localKey">;
  sync_queue!: EntityTable<DexieSyncQueueItem, "localKey">;
  crypto_metadata!: EntityTable<DexieCryptoMetadata, "userId">;

  constructor() {
    super("focentia_e2ee_db_v1");

    this.version(1).stores({
      tasks: "localKey, id, userId, targetDate, status, tier, [userId+targetDate], [userId+updatedAt], isDeleted",
      routine_templates: "localKey, id, userId, weekday, [userId+updatedAt], isDeleted",
      notes: "localKey, id, userId, category, [userId+category], [userId+updatedAt], isDeleted",
      diary_topics: "localKey, id, userId, [userId+updatedAt], isDeleted",
      diary_entries: "localKey, id, userId, topicId, date, [userId+topicId], [userId+date], [userId+updatedAt], isDeleted",
      focus_sessions: "localKey, id, userId, startTime, [userId+startTime], [userId+updatedAt], isDeleted",
      learning_folders: "localKey, id, userId, [userId+updatedAt], isDeleted",
      learning_logs: "localKey, id, userId, folderId, date, [userId+folderId], [userId+updatedAt], isDeleted",
      mind_items: "localKey, id, userId, [userId+updatedAt], isDeleted",
      attachments: "localKey, id, userId, fileType, [userId+updatedAt], isDeleted",
      ai_sessions: "localKey, id, userId, [userId+updatedAt], isDeleted",
      ai_messages: "localKey, id, userId, sessionId, [userId+sessionId], [userId+updatedAt], isDeleted",
      ai_memory: "localKey, id, userId, category, [userId+category], [userId+updatedAt], isDeleted",
      app_preferences: "localKey, userId, updatedAt",
      app_state: "localKey, userId, updatedAt",
      sync_queue: "localKey, userId, storeName, [userId+storeName], updatedAt, isDeleted",
      crypto_metadata: "userId, keyVersion, updatedAt",
    });
  }

  /**
   * Helper to build a unique user-scoped composite key:
   * `${userId}::${recordId}`
   */
  makeLocalKey(userId: string | null | undefined, recordId: string | number): string {
    const cleanUserId = userId?.trim() || "guest";
    return `${cleanUserId}::${recordId}`;
  }

  /**
   * Helper to build a sync queue composite key:
   * `${userId}::${storeName}::${recordId}`
   */
  makeSyncQueueKey(userId: string | null | undefined, storeName: string, recordId: string | number): string {
    const cleanUserId = userId?.trim() || "guest";
    return `${cleanUserId}::${storeName}::${recordId}`;
  }
}

// Global Singleton Database Instance
export const db = new FocentiaDatabase();
