"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AppState, Task, Note, MindItem, TimeBlock, FocusSession, DistractionEntry, DailyBig3, LearningFolder, LearningLog, DiaryTopic, DiaryEntry, Weekday, RoutineTemplate, RoutineTemplateTask } from '../types';
import {
  createDiaryTopic,
  updateDiaryTopic,
  deleteDiaryTopic,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry
} from '../services/diaryStorageService';
import {
  loadStateFromIndexedDB,
  saveStateToIndexedDB,
  safeSaveToLocalStorage
} from '../services/indexedDBStorage';
import { supabase } from '../lib/supabaseClient';
import { noteService } from '../services/noteService';
import { mindService } from '../services/mindService';
import { diaryDbService } from '../services/diaryDbService';
import { focusDbService } from '../services/focusDbService';
import { learningDbService } from '../services/learningDbService';
import {
  syncTaskToBackend,
  updateTaskInBackend,
  deleteTaskFromBackend,
  fetchTasksFromBackend,
  fetchRoutineTemplatesFromBackend,
  saveRoutineTemplateToBackend,
  deleteRoutineTemplateFromBackend
} from '../services/taskService';
import { reviewService } from '../services/reviewService';


const defaultCategories = ['Programming', 'Study', 'University', 'Exam', 'Personal', 'Health', 'Project', 'Business'];

const defaultState: AppState = {
  lang: 'en',
  activePage: 'today',
  categories: [...defaultCategories],
  activities: [],
  tasks: [],
  notes: [],
  mindItems: [],
  timeBlocks: [],
  focusSessions: [],
  dailyBig3: [],
  generatedSchedule: [],
  distractions: [],
  pomodoroSessions: 0,
  notifSettings: { breakReminders: true, dailyReminders: false },
  notifPreferences: {
    enabled: true,
    taskReminders: true,
    taskReminderTime: 10,
    dailyMorningPlan: true,
    dailyMorningPlanTime: "07:00",
    motivationalNotifications: true,
    dailyTaskReminder: false,
    dailyTaskReminderTime: "09:00",
    dailyReviewReminder: false,
    dailyReviewReminderTime: "21:00",
    focusSessionReminder: true
  },
  calendarPreferences: {
    defaultTaskReminder: 0,
    weekStartsOn: 'saturday',
    showCompletedTasks: true
  },
  folders: [],
  folderLogs: [],
  habits: [],
  brainDump: [],
  productivityScore: 0,
  focusLogs: [],
  activeFocusTaskId: null,
  learningFolders: [],
  learningLogs: [],
  theme: { accent: '#2563EB', background: '#08090C', preset: 'Obsidian Kinetic', mode: 'dark' },
  routineTemplates: [],
  diaryTopics: [],
  focusTaskHistory: []
};

const STORAGE_KEY = 'focusforge_data';

// ==================== Helpers ====================

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// ==================== Context Type ====================

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  updateState: (updates: Partial<AppState>) => void;
  resetState: () => void;

  // Network Connectivity
  isOnline: boolean;

  // Loading States
  isLoaded: boolean;
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;

  // Navigation
  navigateTo: (page: string) => void;
  registerFocusLock: (onAttemptExit: (targetPage: string) => boolean) => void;
  unregisterFocusLock: () => void;

  // Mind Items
  addMindItem: (content: string, source?: MindItem['source']) => void;
  updateMindItem: (id: string, content: string) => void;
  deleteMindItem: (id: string) => void;

  // Tasks
  addTask: (task: Partial<Task> & { name?: string; title?: string }) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number | string) => void;
  cycleTaskStatus: (id: number) => void;
  setDailyBig3: (taskIds: number[]) => void;
  getDailyBig3: () => Task[];

  // Notes
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: number, updates: Partial<Note>) => void;
  deleteNote: (id: number) => void;

  // Time Blocks
  addTimeBlock: (block: Omit<TimeBlock, 'id'>) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string | number) => void;

  // Focus Sessions
  startFocusSession: (taskName: string, category: string, taskId?: number, targetMinutes?: number) => string;
  endFocusSession: (sessionId: string, durationMinutes: number, completed?: boolean) => void;
  addBreakTime: (breakMinutes: number, sessionId?: string) => void;
  addDistraction: (sessionId: string, content: string) => void;

  // Activities
  logActivity: (category: string, hours: number, minutes: number, date: string, notes: string) => void;
  deleteActivity: (id: number) => void;

  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: { id: string; message: string; type: string }[];

  // Learning Hub
  addLearningFolder: (name: string) => void;
  deleteLearningFolder: (id: string) => void;
  toggleLearningFolderCompletion: (id: string) => void;
  addLearningLog: (log: Omit<LearningLog, 'id'>) => void;
  deleteLearningLog: (id: string) => void;

  // My Diary
  saveDiaryTopic: (title: string, description?: string) => DiaryTopic;
  updateDiaryTopicItem: (topicId: string, updates: Partial<Pick<DiaryTopic, 'title' | 'description'>>) => void;
  deleteDiaryTopicItem: (topicId: string) => void;
  addDiaryEntryItem: (topicId: string, title?: string, content?: string) => DiaryEntry;
  saveDiaryEntryItem: (topicId: string, entryId: string, updates: Partial<Pick<DiaryEntry, 'title' | 'content' | 'images'>>) => void;
  deleteDiaryEntryItem: (topicId: string, entryId: string) => void;

  // Routine Templates & Import
  saveRoutineTemplate: (template: RoutineTemplate) => void;
  deleteRoutineTemplate: (templateId: string) => void;
  addRoutineTask: (weekday: Weekday, task: Omit<RoutineTemplateTask, 'id' | 'order'>) => void;
  updateRoutineTask: (weekday: Weekday, taskId: string, updates: Partial<RoutineTemplateTask>) => void;
  deleteRoutineTask: (weekday: Weekday, taskId: string) => void;
  reorderRoutineTasks: (weekday: Weekday, taskIds: string[]) => void;
  importRoutineToDate: (weekday: Weekday, dateStr: string, options?: { mode: 'all' | 'missing_only' }) => { importedCount: number; skippedCount: number };

  // Review System Meaningful Action Tracking
  trackMeaningfulAction: (actionType: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  });
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  // Load state: Cloud for logged-in users; fresh clean state (or tab temporary state) for guests
  useEffect(() => {
    let isMounted = true;

    async function initStorage() {
      try {
        // 1. Instant Synchronous Cache Hydration (0ms first paint)
        let cachedState: AppState | null = null;
        if (typeof window !== 'undefined') {
          try {
            const syncLocal = localStorage.getItem(STORAGE_KEY);
            if (syncLocal) {
              cachedState = JSON.parse(syncLocal);
            }
          } catch { }
        }

        // 2. Asynchronous IndexedDB check (handles media/large datasets)
        if (!cachedState) {
          try {
            cachedState = await loadStateFromIndexedDB();
          } catch { }
        }

        let sessionActivePage: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            sessionActivePage = sessionStorage.getItem('focusforge_active_page');
          } catch { }
        }
        const initialActivePage = sessionActivePage || 'today';

        if (cachedState && isMounted) {
          setState({
            ...defaultState,
            ...cachedState,
            activePage: initialActivePage,
            notifPreferences: { ...defaultState.notifPreferences, ...(cachedState.notifPreferences || {}) },
            calendarPreferences: { ...defaultState.calendarPreferences, ...(cachedState.calendarPreferences || {}) },
            theme: { ...defaultState.theme, ...cachedState.theme }
          });
          setIsLoaded(true);
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Parallelized fetching: Fetch all independent tables simultaneously with Promise.allSettled
          const [
            cloudStateResult,
            notesResult,
            mindResult,
            diaryResult,
            focusResult,
            learningResult,
            tasksResult,
            templatesResult
          ] = await Promise.allSettled([
            supabase.from('user_cloud_state').select('state').eq('id', session.user.id).maybeSingle(),
            noteService.fetchNotes(session.user.id),
            mindService.fetchMindItems(session.user.id),
            diaryDbService.fetchDiaryTopics(session.user.id),
            focusDbService.fetchFocusSessions(session.user.id),
            learningDbService.fetchLearningData(session.user.id),
            fetchTasksFromBackend(),
            fetchRoutineTemplatesFromBackend()
          ]);

          let loadedData: AppState = cachedState ? { ...cachedState } : { ...defaultState };

          // 1. User Cloud State
          if (cloudStateResult.status === 'fulfilled') {
            const { data: cloudData, error } = cloudStateResult.value;
            if (!error && cloudData?.state) {
              loadedData = { ...loadedData, ...(cloudData.state as AppState) };
            } else if (!cachedState) {
              // Initialize empty state in cloud for new user
              try {
                await supabase.from('user_cloud_state').upsert({
                  id: session.user.id,
                  state: defaultState,
                  updated_at: new Date().toISOString()
                });
              } catch { }
            }
          }

          // 2. Structured Notes
          if (notesResult.status === 'fulfilled' && notesResult.value && notesResult.value.length > 0) {
            loadedData.notes = notesResult.value;
          }

          // 3. Structured Mind Items
          if (mindResult.status === 'fulfilled' && mindResult.value && mindResult.value.length > 0) {
            loadedData.mindItems = mindResult.value;
          }

          // 4. Diary Topics
          if (diaryResult.status === 'fulfilled' && diaryResult.value && diaryResult.value.length > 0) {
            loadedData.diaryTopics = diaryResult.value;
          }

          // 5. Focus Sessions
          if (focusResult.status === 'fulfilled' && focusResult.value && focusResult.value.length > 0) {
            loadedData.focusSessions = focusResult.value;
          }

          // 6. Learning Hub Folders & Logs
          if (learningResult.status === 'fulfilled' && learningResult.value) {
            if (learningResult.value.folders && learningResult.value.folders.length > 0) {
              loadedData.learningFolders = learningResult.value.folders;
            }
            if (learningResult.value.logs && learningResult.value.logs.length > 0) {
              loadedData.learningLogs = learningResult.value.logs;
            }
          }

          // 7. Structured Tasks
          if (tasksResult.status === 'fulfilled' && tasksResult.value && tasksResult.value.length > 0) {
            const dbTasks = tasksResult.value;
            const existingIds = new Set(dbTasks.map((t: Task) => t.id));
            const localOnlyTasks = (loadedData.tasks || []).filter((t: any) => !existingIds.has(t.id));
            loadedData.tasks = [...dbTasks, ...localOnlyTasks];
          }

          // 8. Routine Templates
          if (templatesResult.status === 'fulfilled' && templatesResult.value && templatesResult.value.length > 0) {
            loadedData.routineTemplates = templatesResult.value;
          }

          if (isMounted) {
            const parsed = loadedData;
            if (parsed.tasks) {
              const seenIds = new Set<number>();
              parsed.tasks = parsed.tasks.map((t: any, index: number) => {
                let taskId = t.id ? Number(t.id) : (Date.now() + index);
                while (seenIds.has(taskId)) {
                  taskId = taskId + 1 + Math.floor(Math.random() * 10000);
                }
                seenIds.add(taskId);
                return {
                  ...t,
                  id: taskId,
                  status: t.status === 'pending' ? 'not_started' : t.status,
                  category: t.category || '',
                  notes: t.notes || '',
                  tier: t.tier || (t.priority === 'high' || t.priority === 'urgent' ? 'now' : t.priority === 'medium' ? 'next' : 'later'),
                  estMinutes: t.estMinutes || (t.estHours ? t.estHours * 60 : 60),
                };
              });
            }
            if (parsed.notes) {
              parsed.notes = parsed.notes.map((n: any) => {
                if (n.content !== undefined) {
                  const migratedBlocks = [{ id: Math.random().toString(36).substr(2, 9), type: 'paragraph', content: n.content }];
                  const { content, ...rest } = n;
                  return { ...rest, blocks: migratedBlocks };
                }
                return n;
              });
            }

            setState({
              ...defaultState,
              ...parsed,
              activePage: initialActivePage,
              notifPreferences: { ...defaultState.notifPreferences, ...(parsed.notifPreferences || {}) },
              calendarPreferences: { ...defaultState.calendarPreferences, ...(parsed.calendarPreferences || {}) },
              theme: { ...defaultState.theme, ...parsed.theme }
            });

            // Cache freshly fetched data to IndexedDB
            saveStateToIndexedDB(parsed);
          }
        } else {
          // Guest Mode:
          let guestData: AppState | null = null;
          if (typeof window !== 'undefined') {
            const sessionRaw = sessionStorage.getItem('focusforge_guest_temp_data');
            if (sessionRaw) {
              try {
                guestData = JSON.parse(sessionRaw);
              } catch { }
            }
          }
          if (!guestData) {
            guestData = { ...defaultState };
          }

          if (isMounted) {
            setState({
              ...defaultState,
              ...guestData,
              activePage: initialActivePage,
            });
          }
        }
      } catch (e) {
        console.warn('State load warning:', e);
        if (isMounted) setIsLoaded(true);
      }
    }

    initStorage();
    return () => { isMounted = false; };
  }, []);

  // Save state: Cloud + local persistence for logged-in users; temporary sessionStorage ONLY for guests
  useEffect(() => {
    if (!isLoaded) return;

    let cloudTimer: ReturnType<typeof setTimeout> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Authenticated: save to IndexedDB & localStorage cache
        saveStateToIndexedDB(state);
        safeSaveToLocalStorage(STORAGE_KEY, state);

        // Debounced cloud sync to Supabase
        cloudTimer = setTimeout(async () => {
          try {
            await supabase.from('user_cloud_state').upsert({
              id: session.user.id,
              state: state,
              updated_at: new Date().toISOString()
            });
          } catch (cloudErr) {
            console.warn("[AppContext] Cloud sync error:", cloudErr);
          }
        }, 2500);
      } else {
        // Guest mode: ONLY keep in sessionStorage as temporary in-memory data
        // ZERO data is sent to Supabase or permanent disk storage!
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('focusforge_guest_temp_data', JSON.stringify(state));
          } catch (err) {
            console.warn("Guest sessionStorage warning:", err);
          }
        }
      }
    });

    return () => {
      if (cloudTimer) clearTimeout(cloudTimer);
    };
  }, [state, isLoaded]);

  // Synchronize state when user signs in or out
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        try {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem('focusforge_guest_temp_data');
          }
          const { data: cloudData } = await supabase
            .from('user_cloud_state')
            .select('state')
            .eq('id', session.user.id)
            .maybeSingle();

          if (cloudData?.state) {
            setState(prev => ({
              ...defaultState,
              ...(cloudData.state as AppState),
              theme: { ...defaultState.theme, ...((cloudData.state as AppState).theme || {}) }
            }));
          } else {
            setState({ ...defaultState });
          }

          const dbNotes = await noteService.fetchNotes(session.user.id);
          if (dbNotes && dbNotes.length > 0) {
            setState(prev => ({ ...prev, notes: dbNotes }));
          }

          try {
            const dbLearning = await learningDbService.fetchLearningData(session.user.id);
            if (dbLearning) {
              setState(prev => ({
                ...prev,
                learningFolders: dbLearning.folders || prev.learningFolders,
                learningLogs: dbLearning.logs || prev.learningLogs
              }));
            }
          } catch (e) { }
        } catch (err) {
          console.warn("[AppContext] Error on SIGNED_IN load:", err);
        }
      } else if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem('focusforge_guest_temp_data');
        }
        setState({ ...defaultState });
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription for Notes: keeps tabs & devices in sync
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        unsubscribe = noteService.subscribeToNotes(session.user.id, async () => {
          try {
            const freshNotes = await noteService.fetchNotes(session.user.id);
            if (freshNotes && freshNotes.length > 0) {
              setState((prev) => ({ ...prev, notes: freshNotes }));
            }
          } catch (err) {
            console.warn("[AppContext] Realtime notes refresh error:", err);
          }
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const updateState = useCallback((updates: Partial<AppState>) => {
    if (updates.activePage && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('focusforge_active_page', updates.activePage);
      } catch { }
    }
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('focusforge_active_page');
      } catch { }
    }
    setState(defaultState);
  }, []);

  // ==================== Navigation & Focus Lock ====================

  const focusLockRef = useRef<{
    isLocked: boolean;
    onAttemptExit?: (targetPage: string) => boolean;
  }>({ isLocked: false });

  const registerFocusLock = useCallback((onAttemptExit: (targetPage: string) => boolean) => {
    focusLockRef.current = { isLocked: true, onAttemptExit };
  }, []);

  const unregisterFocusLock = useCallback(() => {
    focusLockRef.current = { isLocked: false };
  }, []);

  // ==================== Review System Meaningful Action Tracking ====================
  const recentActionTimesRef = useRef<Map<string, number>>(new Map());

  const trackMeaningfulAction = useCallback((actionType: string) => {
    const now = Date.now();
    const lastTime = recentActionTimesRef.current.get(actionType) || 0;
    if (now - lastTime < 1500) {
      return; // Deduplicate rapid clicks of the exact same action within 1.5 seconds
    }
    recentActionTimesRef.current.set(actionType, now);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("focusforge:action", { detail: actionType }));
    }
    reviewService.recordAction().catch(() => { });
  }, []);

  const navigateTo = useCallback((page: string) => {
    if (focusLockRef.current.isLocked && focusLockRef.current.onAttemptExit) {
      const allowed = focusLockRef.current.onAttemptExit(page);
      if (!allowed) {
        return; // Intercepted and blocked by focus lock
      }
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('focusforge_active_page', page);
      } catch { }
    }

    trackMeaningfulAction('feature_' + page);

    setIsPageLoading(true);
    setState((prev) => {
      if (prev.activePage === page) return prev;
      return { ...prev, activePage: page };
    });

    setTimeout(() => {
      setIsPageLoading(false);
    }, 180);
  }, [trackMeaningfulAction]);

  // ==================== Toast ====================

  const showToast = useCallback((message: string, type: string = 'success') => {
    const id = generateId();
    setTimeout(() => {
      setToasts((prev) => [...prev, { id, message, type }]);
    }, 0);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Network online/offline event handlers & automatic cloud resynchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = async () => {
      setIsOnline(true);
      showToast(
        state.lang === 'bn'
          ? "ইন্টারনেট সংযোগ চালু হয়েছে। সকল ডাটা সিঙ্ক হচ্ছে..."
          : "Back online. Synchronizing data with cloud...",
        'info'
      );

      // Trigger immediate cloud sync for authenticated users
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('user_cloud_state').upsert({
            id: session.user.id,
            state: state,
            updated_at: new Date().toISOString()
          });

          // Also refresh any notes from cloud
          const freshNotes = await noteService.fetchNotes(session.user.id);
          if (freshNotes && freshNotes.length > 0) {
            setState((prev) => ({ ...prev, notes: freshNotes }));
          }
        }
      } catch (syncErr) {
        console.warn("[AppContext] Auto-sync on online event error:", syncErr);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast(
        state.lang === 'bn'
          ? "আপনি অফলাইনে আছেন। আপনার সকল পরিবর্তন নিরাপদে লোকালি সেভ হচ্ছে।"
          : "You are offline. All changes are being saved locally.",
        'info'
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [state, showToast]);


  // ==================== Mind Items ====================

  const addMindItem = useCallback((content: string, source?: MindItem['source']) => {
    if (!content.trim()) return;
    const newItem: MindItem = {
      id: generateId(),
      content: content.trim(),
      type: 'thought',
      createdAt: new Date().toISOString(),
      source: source || 'home',
    };
    setState((prev) => ({
      ...prev,
      mindItems: [newItem, ...prev.mindItems],
    }));

    trackMeaningfulAction('add_mind_thought');

    // Asynchronously persist to Supabase if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mindService.saveMindItem(newItem, session.user.id);
      }
    });
  }, [trackMeaningfulAction]);

  const updateMindItem = useCallback((id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      mindItems: prev.mindItems.map((item) =>
        item.id === id ? { ...item, content } : item
      ),
    }));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mindService.updateMindItem(id, content, session.user.id);
      }
    });
  }, []);

  const deleteMindItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      mindItems: prev.mindItems.filter((item) => item.id !== id),
    }));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mindService.deleteMindItem(id, session.user.id);
      }
    });
  }, []);

  // ==================== Tasks ====================

  const addTask = useCallback((taskData: Partial<Task> & { name?: string; title?: string }) => {
    const taskName = taskData.name || taskData.title || '';
    const taskDate = taskData.targetDate || taskData.date || '';
    const isComp = taskData.completed ?? (taskData.status === 'completed');
    const newTask: Task = {
      id: taskData.id && typeof taskData.id === 'number' ? taskData.id : (Date.now() + Math.floor(Math.random() * 100000)),
      name: taskName,
      title: taskName,
      description: taskData.description || taskData.notes || '',
      targetDate: taskDate,
      date: taskDate,
      time: taskData.time || '',
      endTime: taskData.endTime || '',
      priority: taskData.priority || 'medium',
      estHours: taskData.estHours || 1,
      estMinutes: taskData.estMinutes || 60,
      status: taskData.status || (isComp ? 'completed' : 'not_started'),
      completed: isComp,
      reminderEnabled: taskData.reminderEnabled ?? false,
      reminderTime: taskData.reminderTime || '',
      category: taskData.category || '',
      notes: taskData.notes || taskData.description || '',
      tier: taskData.tier || 'next',
      sourceType: taskData.sourceType || 'custom',
      sourceRoutineId: taskData.sourceRoutineId || undefined,
      sourceRoutineTaskId: taskData.sourceRoutineTaskId || undefined,
      importedAt: taskData.importedAt || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    trackMeaningfulAction('create_task');
    syncTaskToBackend(newTask).catch((err) => showToast(err.message || 'Failed to sync task.', 'error'));
  }, [trackMeaningfulAction, showToast]);

  const updateTask = useCallback((id: number, updates: Partial<Task>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...updates, updatedAt: new Date().toISOString() };
        if (updates.completed !== undefined) {
          updated.status = updates.completed ? 'completed' : 'not_started';
        } else if (updates.status !== undefined) {
          updated.completed = updates.status === 'completed';
        }
        if (updates.name && !updates.title) updated.title = updates.name;
        if (updates.title && !updates.name) updated.name = updates.title;
        if (updates.targetDate && !updates.date) updated.date = updates.targetDate;
        if (updates.date && !updates.targetDate) updated.targetDate = updates.date;
        if (updates.notes && !updates.description) updated.description = updates.notes;
        if (updates.description && !updates.notes) updated.notes = updates.description;
        return updated;
      }),
    }));
    if (updates.completed === true || updates.status === 'completed') {
      trackMeaningfulAction('check_task');
      showToast("Boom!Task completed successfully.", "success");
    }
    updateTaskInBackend(id, updates).catch((err) => {
      console.warn('[AppContext] Failed to sync task update to backend (saved locally):', err);
    });
  }, [trackMeaningfulAction, showToast]);

  const deleteTask = useCallback((id: number | string) => {
    const numId = typeof id === 'number' ? id : parseInt(String(id), 10);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => String(t.id) !== String(id) && (!isNaN(numId) ? t.id !== numId : true)),
    }));
    if (!isNaN(numId)) {
      deleteTaskFromBackend(numId).catch((err) => console.warn('[AppContext] Failed to delete task in backend:', err));
    }
  }, []);

  const cycleTaskStatus = useCallback((id: number) => {
    const statusCycle: ('not_started' | 'in_progress' | 'completed')[] = ['not_started', 'in_progress', 'completed'];
    const currentTask = state.tasks.find((t) => t.id === id);
    const currentIdx = currentTask ? statusCycle.indexOf(currentTask.status) : -1;
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];

    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        return { ...t, status: nextStatus, completed: nextStatus === 'completed', updatedAt: new Date().toISOString() };
      }),
    }));
    trackMeaningfulAction('check_task');
    if (nextStatus === 'completed') {
      showToast("🎉 দারুণ! কাজ সম্পন্ন করায় অভিনন্দন!", "success");
    }
    updateTaskInBackend(id, { status: nextStatus, completed: nextStatus === 'completed' }).catch((err) => {
      console.warn('[AppContext] Failed to sync task status to backend (saved locally):', err);
    });
  }, [state.tasks, trackMeaningfulAction, showToast]);

  const setDailyBig3 = useCallback((taskIds: number[]) => {
    const today = todayStr();
    setState((prev) => {
      const existing = prev.dailyBig3.filter((d) => d.date !== today);
      return { ...prev, dailyBig3: [...existing, { date: today, taskIds: taskIds.slice(0, 3) }] };
    });
  }, []);

  const getDailyBig3 = useCallback((): Task[] => {
    const today = todayStr();
    const big3 = state.dailyBig3.find((d) => d.date === today);
    if (!big3) return [];
    return big3.taskIds.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean) as Task[];
  }, [state.dailyBig3, state.tasks]);

  // ==================== Notes ====================

  const addNote = useCallback((noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
    const newNote: Note = {
      id: Date.now(),
      title: noteData.title,
      blocks: noteData.blocks,
      category: noteData.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, notes: [newNote, ...prev.notes] }));

    // Persist to Supabase PostgreSQL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        noteService.saveNote(newNote, session.user.id).catch((err) => {
          console.warn("[AppContext] Failed to save note to Supabase:", err);
        });
      }
    });

    trackMeaningfulAction('create_note');
    return newNote;
  }, [trackMeaningfulAction]);

  const updateNote = useCallback((id: number, updates: Partial<Note>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
    }));

    // Update in Supabase PostgreSQL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        noteService.updateNote(id, updates, session.user.id).catch((err) => {
          console.warn("[AppContext] Failed to update note in Supabase:", err);
        });
      }
    });
  }, []);

  const deleteNote = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));

    // Delete from Supabase PostgreSQL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        noteService.deleteNote(id, session.user.id).catch((err) => {
          console.warn("[AppContext] Failed to delete note from Supabase:", err);
        });
      }
    });
  }, []);


  // ==================== Time Blocks ====================

  const addTimeBlock = useCallback((block: Omit<TimeBlock, 'id'>) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: [...prev.timeBlocks, { ...block, id: generateId() }],
    }));
  }, []);

  const updateTimeBlock = useCallback((id: string, updates: Partial<TimeBlock>) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, []);

  const deleteTimeBlock = useCallback((id: string | number) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.filter((b) => String(b.id) !== String(id)),
    }));
  }, []);

  // ==================== Routine Templates ====================

  const saveRoutineTemplate = useCallback((template: RoutineTemplate) => {
    setState((prev) => {
      const templates = prev.routineTemplates || [];
      const index = templates.findIndex((t) => t.id === template.id || t.weekday === template.weekday);
      let updated: RoutineTemplate[];
      let targetTemplate: RoutineTemplate;
      if (index >= 0) {
        targetTemplate = { ...template, updatedAt: new Date().toISOString() };
        updated = [...templates];
        updated[index] = targetTemplate;
      } else {
        targetTemplate = { ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        updated = [...templates, targetTemplate];
      }
      saveRoutineTemplateToBackend(targetTemplate).catch((err) =>
        console.warn('[AppContext] saveRoutineTemplate backend sync error:', err)
      );
      return { ...prev, routineTemplates: updated };
    });
  }, []);

  const deleteRoutineTemplate = useCallback((templateId: string) => {
    deleteRoutineTemplateFromBackend(templateId).catch((err) =>
      console.warn('[AppContext] deleteRoutineTemplate backend sync error:', err)
    );
    setState((prev) => ({
      ...prev,
      routineTemplates: (prev.routineTemplates || []).filter((t) => String(t.id) !== String(templateId)),
    }));
  }, []);

  const addRoutineTask = useCallback((weekday: Weekday, taskData: Omit<RoutineTemplateTask, 'id' | 'order'>) => {
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      const newTaskId = 'rt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      if (templateIndex === -1) {
        const newTemplate: RoutineTemplate = {
          id: 'routine_' + weekday,
          weekday,
          tasks: [{
            ...taskData,
            id: newTaskId,
            order: 0,
          }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveRoutineTemplateToBackend(newTemplate).catch((err) =>
          console.warn('[AppContext] addRoutineTask backend sync error:', err)
        );
        return { ...prev, routineTemplates: [...templates, newTemplate] };
      }

      const template = { ...templates[templateIndex] };
      const currentTasks = template.tasks || [];
      const nextOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map((t) => t.order ?? 0)) + 1 : 0;
      template.tasks = [...currentTasks, { ...taskData, id: newTaskId, order: nextOrder }];
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      saveRoutineTemplateToBackend(template).catch((err) =>
        console.warn('[AppContext] addRoutineTask backend sync error:', err)
      );

      return { ...prev, routineTemplates: templates };
    });
  }, []);

  const updateRoutineTask = useCallback((weekday: Weekday, taskId: string, updates: Partial<RoutineTemplateTask>) => {
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      template.tasks = (template.tasks || []).map((t) => (String(t.id) === String(taskId) ? { ...t, ...updates } : t));
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      saveRoutineTemplateToBackend(template).catch((err) =>
        console.warn('[AppContext] updateRoutineTask backend sync error:', err)
      );

      return { ...prev, routineTemplates: templates };
    });
  }, []);

  const deleteRoutineTask = useCallback((weekday: Weekday, taskId: string) => {
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      template.tasks = (template.tasks || []).filter((t) => String(t.id) !== String(taskId));
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      saveRoutineTemplateToBackend(template).catch((err) =>
        console.warn('[AppContext] deleteRoutineTask backend sync error:', err)
      );

      return { ...prev, routineTemplates: templates };
    });
  }, []);

  const reorderRoutineTasks = useCallback((weekday: Weekday, taskIds: string[]) => {
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      const taskMap = new Map((template.tasks || []).map((t) => [t.id, t]));
      const reordered: RoutineTemplateTask[] = [];
      taskIds.forEach((id, index) => {
        const item = taskMap.get(id);
        if (item) {
          reordered.push({ ...item, order: index });
        }
      });
      template.tasks = reordered;
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      saveRoutineTemplateToBackend(template).catch((err) =>
        console.warn('[AppContext] reorderRoutineTasks backend sync error:', err)
      );

      return { ...prev, routineTemplates: templates };
    });
  }, []);

  const importRoutineToDate = useCallback((weekday: Weekday, dateStr: string, options?: { mode: 'all' | 'missing_only' }): { importedCount: number; skippedCount: number } => {
    const mode = options?.mode || 'missing_only';
    let importedCount = 0;
    let skippedCount = 0;

    setState((prev) => {
      const templates = prev.routineTemplates || [];
      const template = templates.find((t) => t.weekday === weekday);
      if (!template || !template.tasks || template.tasks.length === 0) {
        showToast('No routine template found for ' + weekday, 'info');
        return prev;
      }

      const sortedTasks = [...template.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const existingDateTasks = (prev.tasks || []).filter((t) => t.targetDate === dateStr || t.date === dateStr);

      const newTasksToCreate: Task[] = [];
      const newBlocksToCreate: TimeBlock[] = [];

      sortedTasks.forEach((tmplTask, index) => {
        // Duplicate detection
        const isDuplicate = existingDateTasks.some((existing) => {
          if (existing.sourceRoutineTaskId && existing.sourceRoutineTaskId === tmplTask.id) return true;
          const sameTitle = (existing.name || existing.title || '').trim().toLowerCase() === tmplTask.title.trim().toLowerCase();
          const sameTime = existing.time === tmplTask.startTime;
          return sameTitle && sameTime;
        });

        if (isDuplicate && mode === 'missing_only') {
          skippedCount++;
          return;
        }

        const newTaskId = Date.now() + Math.floor(Math.random() * 100000) + index;
        const createdTask: Task = {
          id: newTaskId,
          name: tmplTask.title,
          title: tmplTask.title,
          description: tmplTask.notes || '',
          notes: tmplTask.notes || '',
          targetDate: dateStr,
          date: dateStr,
          time: tmplTask.startTime,
          endTime: tmplTask.endTime,
          priority: tmplTask.priority,
          estHours: 1,
          estMinutes: 60,
          status: 'not_started',
          completed: false,
          reminderEnabled: tmplTask.reminderEnabled ?? false,
          reminderTime: tmplTask.reminderEnabled ? (tmplTask.reminderTime || tmplTask.startTime) : undefined,
          category: tmplTask.category || '',
          tier: tmplTask.priority === 'urgent' || tmplTask.priority === 'high' ? 'now' : 'next',
          sourceType: 'routine',
          sourceRoutineId: template.id,
          sourceRoutineTaskId: tmplTask.id,
          importedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const createdBlock: TimeBlock = {
          id: generateId(),
          date: dateStr,
          startTime: tmplTask.startTime,
          endTime: tmplTask.endTime,
          label: tmplTask.title,
          category: tmplTask.category || '',
          isBreak: false,
          taskId: newTaskId,
          sourceType: 'routine',
          sourceRoutineId: template.id,
          sourceRoutineTaskId: tmplTask.id,
        };

        newTasksToCreate.push(createdTask);
        newBlocksToCreate.push(createdBlock);
        importedCount++;
      });

      if (newTasksToCreate.length > 0) {
        // Async backend sync for created tasks
        newTasksToCreate.forEach((t) => {
          syncTaskToBackend(t).catch((err) => console.warn('[AppContext] Failed to sync imported task:', err));
        });

        trackMeaningfulAction('import_routine');
        setTimeout(() => {
          showToast(importedCount + ' routine task' + (importedCount > 1 ? 's' : '') + ' added to ' + dateStr, 'success');
        }, 0);

        return {
          ...prev,
          tasks: [...prev.tasks, ...newTasksToCreate],
          timeBlocks: [...prev.timeBlocks, ...newBlocksToCreate],
        };
      } else {
        if (skippedCount > 0) {
          setTimeout(() => {
            showToast('Routine tasks are already scheduled on ' + dateStr, 'info');
          }, 0);
        }
        return prev;
      }
    });

    return { importedCount, skippedCount };
  }, [showToast, trackMeaningfulAction]);

  // ==================== Focus Sessions ====================

  const startFocusSession = useCallback((taskName: string, category: string, taskId?: number, targetMinutes: number = 25): string => {
    const id = generateId();
    const session: FocusSession = {
      id,
      taskId,
      taskName,
      category,
      startedAt: new Date().toISOString(),
      targetMinutes,
      durationMinutes: 0,
      distractions: [],
      completed: false,
    };
    setState((prev) => ({ ...prev, focusSessions: [...prev.focusSessions, session] }));

    // Async persist to Supabase & Express backend
    focusDbService.saveFocusSession(session).catch((err) => {
      console.warn("[AppContext] Error persisting focus session:", err);
    });

    return id;
  }, []);

  const endFocusSession = useCallback((sessionId: string, durationMinutes: number, completed: boolean = true) => {
    setState((prev) => {
      const session = prev.focusSessions.find((s) => s.id === sessionId);
      if (!session) return prev;

      const endedAt = new Date().toISOString();
      const updatedSessions = prev.focusSessions.map((s) =>
        s.id === sessionId
          ? { ...s, endedAt, durationMinutes, completed }
          : s
      );

      // Auto-log as activity if durationMinutes > 0
      const newActivities = durationMinutes > 0 ? [
        ...prev.activities,
        {
          id: Date.now(),
          category: session.category || 'Focus Session',
          hours: Math.floor(durationMinutes / 60),
          minutes: durationMinutes % 60,
          totalMinutes: durationMinutes,
          date: todayStr(),
          notes: session.taskName,
          createdAt: new Date().toISOString(),
        }
      ] : prev.activities;

      return {
        ...prev,
        focusSessions: updatedSessions,
        activities: newActivities,
        pomodoroSessions: completed ? prev.pomodoroSessions + 1 : prev.pomodoroSessions,
      };
    });

    trackMeaningfulAction('focus_session');

    // Async update in Supabase & Express backend
    focusDbService.endFocusSession(sessionId, durationMinutes, completed).catch((err) => {
      console.warn("[AppContext] Error concluding focus session in DB:", err);
    });
  }, [trackMeaningfulAction]);

  const addBreakTime = useCallback((breakMinutes: number, sessionId?: string) => {
    if (breakMinutes <= 0) return;
    setState((prev) => {
      let updatedSessions = prev.focusSessions;
      if (sessionId) {
        updatedSessions = prev.focusSessions.map((s) =>
          s.id === sessionId ? { ...s, breakMinutes: (s.breakMinutes || 0) + breakMinutes } : s
        );
      } else if (prev.focusSessions.length > 0) {
        const lastSession = prev.focusSessions[prev.focusSessions.length - 1];
        updatedSessions = prev.focusSessions.map((s) =>
          s.id === lastSession.id ? { ...s, breakMinutes: (s.breakMinutes || 0) + breakMinutes } : s
        );
      }

      const newActivities = [
        ...prev.activities,
        {
          id: Date.now(),
          category: 'Break',
          hours: Math.floor(breakMinutes / 60),
          minutes: breakMinutes % 60,
          totalMinutes: breakMinutes,
          date: todayStr(),
          notes: 'Focus Break',
          createdAt: new Date().toISOString(),
        }
      ];

      return {
        ...prev,
        focusSessions: updatedSessions,
        activities: newActivities,
      };
    });
  }, []);

  const addDistraction = useCallback((sessionId: string, content: string) => {
    const entry: DistractionEntry = {
      id: generateId(),
      content,
      timestamp: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      focusSessions: prev.focusSessions.map((s) =>
        s.id === sessionId ? { ...s, distractions: [...s.distractions, entry] } : s
      ),
      // Also log to legacy distractions for backward compat
      distractions: [
        ...prev.distractions,
        {
          id: Date.now(),
          date: todayStr(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }));

    // Async sync distraction to Supabase & Express backend
    focusDbService.addDistraction(sessionId, entry).catch((err) => {
      console.warn("[AppContext] Error syncing distraction to DB:", err);
    });
  }, []);

  // ==================== Activities ====================

  const logActivity = useCallback((category: string, hours: number, minutes: number, date: string, notes: string) => {
    setState((prev) => ({
      ...prev,
      activities: [
        ...prev.activities,
        {
          id: Date.now(),
          category,
          hours,
          minutes,
          totalMinutes: hours * 60 + minutes,
          date: date || todayStr(),
          notes,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }, []);

  const deleteActivity = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
  }, []);

  // ==================== Loading State ====================

  // ==================== Learning Hub ====================
  const addLearningFolder = useCallback((name: string) => {
    const newFolder: LearningFolder = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      completed: false,
    };
    setState((prev) => ({
      ...prev,
      learningFolders: [...prev.learningFolders, newFolder]
    }));
    trackMeaningfulAction('learning_folder');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        learningDbService.saveFolder(newFolder, session.user.id);
      }
    });
  }, [trackMeaningfulAction]);

  const deleteLearningFolder = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      learningFolders: prev.learningFolders.filter((f) => f.id !== id),
      learningLogs: prev.learningLogs.filter((l) => l.folderId !== id),
    }));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        learningDbService.deleteFolder(id, session.user.id);
      }
    });
  }, []);

  const toggleLearningFolderCompletion = useCallback((id: string) => {
    let targetFolder: LearningFolder | undefined;
    setState((prev) => {
      const updatedFolders = prev.learningFolders.map((f) => {
        if (f.id === id) {
          targetFolder = { ...f, completed: !f.completed };
          return targetFolder;
        }
        return f;
      });
      return { ...prev, learningFolders: updatedFolders };
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && targetFolder) {
        learningDbService.updateFolder(id, { completed: targetFolder.completed }, session.user.id);
      }
    });
  }, []);

  const addLearningLog = useCallback((log: Omit<LearningLog, 'id'>) => {
    const newLog: LearningLog = { ...log, id: generateId() };
    setState((prev) => ({
      ...prev,
      learningLogs: [...prev.learningLogs, newLog]
    }));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        learningDbService.saveLog(newLog, session.user.id);
      }
    });
  }, []);

  const deleteLearningLog = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      learningLogs: prev.learningLogs.filter((l) => l.id !== id)
    }));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        learningDbService.deleteLog(id, session.user.id);
      }
    });
  }, []);

  // ==================== My Diary ====================

  const saveDiaryTopic = useCallback((title: string, description: string = '') => {
    let createdTopic: DiaryTopic;
    setState((prev) => {
      const { topic, updatedTopics } = createDiaryTopic(title, description, prev.diaryTopics || []);
      createdTopic = topic;
      return { ...prev, diaryTopics: updatedTopics };
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && createdTopic) {
        diaryDbService.saveDiaryTopic(createdTopic, session.user.id);
        if (createdTopic.entries?.[0]) {
          diaryDbService.saveDiaryEntry(createdTopic.id, createdTopic.entries[0], session.user.id);
        }
      }
    });

    trackMeaningfulAction('save_diary');

    return createdTopic!;
  }, [trackMeaningfulAction]);

  const updateDiaryTopicItem = useCallback((topicId: string, updates: Partial<Pick<DiaryTopic, 'title' | 'description'>>) => {
    setState((prev) => {
      const updatedTopics = updateDiaryTopic(topicId, updates, prev.diaryTopics || []);
      const updatedTopic = updatedTopics.find(t => t.id === topicId);
      if (updatedTopic) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            diaryDbService.saveDiaryTopic(updatedTopic, session.user.id);
          }
        });
      }
      return { ...prev, diaryTopics: updatedTopics };
    });
  }, []);

  const deleteDiaryTopicItem = useCallback((topicId: string) => {
    setState((prev) => ({
      ...prev,
      diaryTopics: deleteDiaryTopic(topicId, prev.diaryTopics || [])
    }));

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        diaryDbService.deleteDiaryTopic(topicId, session.user.id);
      }
    });
  }, []);

  const addDiaryEntryItem = useCallback((topicId: string, title: string = '', content: string = '') => {
    let createdEntry: DiaryEntry;
    setState((prev) => {
      const { newEntry, updatedTopics } = createDiaryEntry(topicId, title, content, prev.diaryTopics || []);
      createdEntry = newEntry;
      return { ...prev, diaryTopics: updatedTopics };
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && createdEntry) {
        diaryDbService.saveDiaryEntry(topicId, createdEntry, session.user.id);
      }
    });

    return createdEntry!;
  }, []);

  const saveDiaryEntryItem = useCallback((topicId: string, entryId: string, updates: Partial<Pick<DiaryEntry, 'title' | 'content' | 'images'>>) => {
    setState((prev) => {
      const updatedTopics = updateDiaryEntry(topicId, entryId, updates, prev.diaryTopics || []);
      const updatedTopic = updatedTopics.find(t => t.id === topicId);
      const updatedEntry = updatedTopic?.entries.find(e => e.id === entryId);
      if (updatedEntry) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            diaryDbService.saveDiaryEntry(topicId, updatedEntry, session.user.id);
          }
        });
      }
      return { ...prev, diaryTopics: updatedTopics };
    });
  }, []);

  const deleteDiaryEntryItem = useCallback((topicId: string, entryId: string) => {
    setState((prev) => {
      const { updatedTopics } = deleteDiaryEntry(topicId, entryId, prev.diaryTopics || []);
      return { ...prev, diaryTopics: updatedTopics };
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        diaryDbService.deleteDiaryEntry(entryId, session.user.id);
      }
    });
  }, []);



  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        updateState,
        resetState,
        navigateTo,
        registerFocusLock,
        unregisterFocusLock,
        addMindItem,
        updateMindItem,
        deleteMindItem,
        addTask,
        updateTask,
        deleteTask,
        cycleTaskStatus,
        setDailyBig3,
        getDailyBig3,
        addNote,
        updateNote,
        deleteNote,
        addTimeBlock,
        updateTimeBlock,
        deleteTimeBlock,
        startFocusSession,
        endFocusSession,
        addBreakTime,
        addDistraction,
        logActivity,
        deleteActivity,
        showToast,
        toasts,
        addLearningFolder,
        deleteLearningFolder,
        toggleLearningFolderCompletion,
        addLearningLog,
        deleteLearningLog,
        saveDiaryTopic,
        updateDiaryTopicItem,
        deleteDiaryTopicItem,
        addDiaryEntryItem,
        saveDiaryEntryItem,
        deleteDiaryEntryItem,
        saveRoutineTemplate,
        deleteRoutineTemplate,
        addRoutineTask,
        updateRoutineTask,
        deleteRoutineTask,
        reorderRoutineTasks,
        importRoutineToDate,
        trackMeaningfulAction,
        isLoaded,
        isPageLoading,
        setPageLoading: setIsPageLoading,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
