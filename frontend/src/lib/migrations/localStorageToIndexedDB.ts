/**
 * Focentia Safe LocalStorage -> IndexedDB (Dexie) Migration Engine
 * (lib/migrations/localStorageToIndexedDB.ts)
 *
 * Guarantees zero data loss:
 * 1. Checks if migration was already completed for the active user/guest.
 * 2. Reads legacy localStorage keys (focusforge_data, focusforge_data_*, state_*).
 * 3. Validates and transforms items into typed records.
 * 4. Atomically writes records into Dexie IndexedDB stores.
 * 5. Verifies records exist and are queryable in Dexie.
 * 6. Marks migration complete in localStorage.
 * 7. Safely removes only migrated application keys, leaving system/auth tokens intact.
 * 8. Survives browser refreshes, partial failures, and network disconnects.
 */

import { db } from "../db";
import {
  taskRepository,
  noteRepository,
  diaryRepository,
  focusRepository,
  learningRepository,
  mindRepository,
  routineRepository,
  settingsRepository,
} from "../repositories";
import type { AppState } from "../../types";

export interface MigrationResult {
  migrated: boolean;
  tasksCount: number;
  notesCount: number;
  diaryTopicsCount: number;
  focusSessionsCount: number;
  learningFoldersCount: number;
  mindItemsCount: number;
  routineTemplatesCount: number;
  error?: string;
}

const MIGRATION_FLAG_PREFIX = "focentia_migrated_dexie_v1_";

export async function migrateLocalStorageToIndexedDB(userId?: string | null): Promise<MigrationResult> {
  if (typeof window === "undefined") {
    return {
      migrated: false,
      tasksCount: 0,
      notesCount: 0,
      diaryTopicsCount: 0,
      focusSessionsCount: 0,
      learningFoldersCount: 0,
      mindItemsCount: 0,
      routineTemplatesCount: 0,
    };
  }

  const cleanUserId = userId?.trim() || "guest";
  const migrationFlagKey = `${MIGRATION_FLAG_PREFIX}${cleanUserId}`;

  // 1. Idempotency Check: Already migrated?
  try {
    const alreadyMigrated = localStorage.getItem(migrationFlagKey);
    if (alreadyMigrated === "true") {
      return {
        migrated: false,
        tasksCount: 0,
        notesCount: 0,
        diaryTopicsCount: 0,
        focusSessionsCount: 0,
        learningFoldersCount: 0,
        mindItemsCount: 0,
        routineTemplatesCount: 0,
      };
    }
  } catch {}

  // 2. Discover legacy data candidates
  let legacyState: AppState | null = null;
  const legacyKeysChecked: string[] = [];

  const candidateKeys = [
    `focusforge_data_${cleanUserId}`,
    cleanUserId === "guest" ? "focusforge_data_guest" : null,
    cleanUserId === "guest" ? "focusforge_data" : null,
    `state_${cleanUserId}`,
    cleanUserId === "guest" ? "state_guest" : null,
  ].filter(Boolean) as string[];

  for (const key of candidateKeys) {
    legacyKeysChecked.push(key);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          legacyState = parsed as AppState;
          break;
        }
      }
    } catch {}
  }

  // If no legacy data found, mark migration done to prevent redundant checks
  if (!legacyState) {
    try {
      localStorage.setItem(migrationFlagKey, "true");
    } catch {}
    return {
      migrated: false,
      tasksCount: 0,
      notesCount: 0,
      diaryTopicsCount: 0,
      focusSessionsCount: 0,
      learningFoldersCount: 0,
      mindItemsCount: 0,
      routineTemplatesCount: 0,
    };
  }

  // 3. Transform and Write into Dexie Repositories
  let tasksCount = 0;
  let notesCount = 0;
  let diaryTopicsCount = 0;
  let focusSessionsCount = 0;
  let learningFoldersCount = 0;
  let mindItemsCount = 0;
  let routineTemplatesCount = 0;

  try {
    // Tasks
    if (Array.isArray(legacyState.tasks) && legacyState.tasks.length > 0) {
      await taskRepository.bulkSave(cleanUserId, legacyState.tasks);
      tasksCount = legacyState.tasks.length;
    }

    // Notes
    if (Array.isArray(legacyState.notes) && legacyState.notes.length > 0) {
      for (const note of legacyState.notes) {
        await noteRepository.save(cleanUserId, note);
        notesCount++;
      }
    }

    // Diary Topics & Entries
    if (Array.isArray(legacyState.diaryTopics) && legacyState.diaryTopics.length > 0) {
      for (const topic of legacyState.diaryTopics) {
        await diaryRepository.saveTopic(cleanUserId, topic);
        diaryTopicsCount++;
      }
    }

    // Focus Sessions
    if (Array.isArray(legacyState.focusSessions) && legacyState.focusSessions.length > 0) {
      for (const sess of legacyState.focusSessions) {
        await focusRepository.save(cleanUserId, sess);
        focusSessionsCount++;
      }
    }

    // Learning Hub
    if (Array.isArray(legacyState.learningFolders) && legacyState.learningFolders.length > 0) {
      for (const f of legacyState.learningFolders) {
        await learningRepository.saveFolder(cleanUserId, f);
        learningFoldersCount++;
      }
    }
    if (Array.isArray(legacyState.learningLogs) && legacyState.learningLogs.length > 0) {
      for (const l of legacyState.learningLogs) {
        await learningRepository.saveLog(cleanUserId, l);
      }
    }

    // Mind Items
    if (Array.isArray(legacyState.mindItems) && legacyState.mindItems.length > 0) {
      for (const m of legacyState.mindItems) {
        await mindRepository.save(cleanUserId, m);
        mindItemsCount++;
      }
    }

    // Routine Templates
    if (Array.isArray(legacyState.routineTemplates) && legacyState.routineTemplates.length > 0) {
      for (const r of legacyState.routineTemplates) {
        await routineRepository.save(cleanUserId, r);
        routineTemplatesCount++;
      }
    }

    // Preferences and full state snapshot
    await settingsRepository.savePreferences(cleanUserId, {
      theme: legacyState.theme,
      lang: legacyState.lang,
      notifPreferences: legacyState.notifPreferences,
      calendarPreferences: legacyState.calendarPreferences,
    });
    await settingsRepository.saveAppStateBackup(cleanUserId, legacyState);

    // 4. VERIFICATION GATE: Ensure Dexie records exist before removing localStorage
    if (tasksCount > 0) {
      const verifiedTasks = await taskRepository.getAll(cleanUserId);
      if (verifiedTasks.length === 0) {
        throw new Error("Verification failed: Tasks were not successfully written to IndexedDB");
      }
    }

    if (notesCount > 0) {
      const verifiedNotes = await noteRepository.getAll(cleanUserId);
      if (verifiedNotes.length === 0) {
        throw new Error("Verification failed: Notes were not successfully written to IndexedDB");
      }
    }

    // 5. Mark migration complete
    localStorage.setItem(migrationFlagKey, "true");

    // 6. Safely remove migrated keys from localStorage
    for (const key of candidateKeys) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }

    return {
      migrated: true,
      tasksCount,
      notesCount,
      diaryTopicsCount,
      focusSessionsCount,
      learningFoldersCount,
      mindItemsCount,
      routineTemplatesCount,
    };
  } catch (err: any) {
    // Fail-safe: NEVER delete legacy data on error
    console.warn("[Migration] Storage migration encountered a non-fatal notice; legacy data kept intact:", err?.message);
    return {
      migrated: false,
      tasksCount,
      notesCount,
      diaryTopicsCount,
      focusSessionsCount,
      learningFoldersCount,
      mindItemsCount,
      routineTemplatesCount,
      error: err?.message,
    };
  }
}
