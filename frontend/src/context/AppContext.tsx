"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { AppState, Task, Note, MindItem, TimeBlock, FocusSession, DistractionEntry, DailyBig3, LearningFolder, LearningLog, DiaryTopic, DiaryEntry } from '../types';
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
import { syncTaskToBackend, updateTaskInBackend, deleteTaskFromBackend } from '../services/taskService';


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
  learningLogs: []
  ,theme: { accent: '#3B82F6', background: '#070A12', preset: 'Midnight Blue', mode: 'dark' },
  diaryTopics: []
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
  deleteTask: (id: number) => void;
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
  deleteTimeBlock: (id: string) => void;

  // Focus Sessions
  startFocusSession: (taskName: string, category: string, taskId?: number, targetMinutes?: number) => string;
  endFocusSession: (sessionId: string, durationMinutes: number, completed?: boolean) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  // Load state: Cloud for logged-in users; fresh clean state (or tab temporary state) for guests
  useEffect(() => {
    let isMounted = true;

    async function initStorage() {
      try {
        let loadedData: AppState | null = null;
        const { data: { session } } = await supabase.auth.getSession();
        
        // If logged in, prefer cloud state from Supabase
        if (session?.user) {
          const { data: cloudData, error } = await supabase
            .from('user_cloud_state')
            .select('state')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && cloudData && cloudData.state) {
            loadedData = cloudData.state as AppState;
          } else {
            // First time login for new user: clean fresh state
            loadedData = { ...defaultState };
            try {
              await supabase.from('user_cloud_state').upsert({
                id: session.user.id,
                state: defaultState,
                updated_at: new Date().toISOString()
              });
            } catch {}
          }

          // Fetch structured notes from Supabase PostgreSQL notes table
          try {
            const dbNotes = await noteService.fetchNotes(session.user.id);
            if (dbNotes && dbNotes.length > 0) {
              if (!loadedData) loadedData = { ...defaultState };
              loadedData.notes = dbNotes;
            }
          } catch (notesErr) {
            console.warn("[AppContext] Error syncing PostgreSQL notes on load:", notesErr);
          }

          // Fetch structured mind items from Supabase PostgreSQL mind_items table
          try {
            const dbMindItems = await mindService.fetchMindItems(session.user.id);
            if (dbMindItems && dbMindItems.length > 0) {
              if (!loadedData) loadedData = { ...defaultState };
              loadedData.mindItems = dbMindItems;
            }
          } catch (mindErr) {
            console.warn("[AppContext] Error syncing PostgreSQL mind items on load:", mindErr);
          }

          // Fetch structured diary topics & entries from Supabase PostgreSQL
          try {
            const dbDiaryTopics = await diaryDbService.fetchDiaryTopics(session.user.id);
            if (dbDiaryTopics && dbDiaryTopics.length > 0) {
              if (!loadedData) loadedData = { ...defaultState };
              loadedData.diaryTopics = dbDiaryTopics;
            }
          } catch (diaryErr) {
            console.warn("[AppContext] Error syncing PostgreSQL diary on load:", diaryErr);
          }

          // Fetch focus sessions from Supabase PostgreSQL focus_sessions table
          try {
            const dbFocusSessions = await focusDbService.fetchFocusSessions(session.user.id);
            if (dbFocusSessions && dbFocusSessions.length > 0) {
              if (!loadedData) loadedData = { ...defaultState };
              loadedData.focusSessions = dbFocusSessions;
            }
          } catch (focusErr) {
            console.warn("[AppContext] Error syncing PostgreSQL focus sessions on load:", focusErr);
          }

          // Fetch learning folders and logs from Supabase PostgreSQL
          try {
            const dbLearning = await learningDbService.fetchLearningData(session.user.id);
            if (dbLearning) {
              if (!loadedData) loadedData = { ...defaultState };
              if (dbLearning.folders && dbLearning.folders.length > 0) {
                loadedData.learningFolders = dbLearning.folders;
              }
              if (dbLearning.logs && dbLearning.logs.length > 0) {
                loadedData.learningLogs = dbLearning.logs;
              }
            }
          } catch (learningErr) {
            console.warn("[AppContext] Error syncing PostgreSQL learning data on load:", learningErr);
          }
        } else {
          // Guest Mode:
          // Temporary session data during current browser tab session only.
          // Fresh clean zero state on initial visit.
          if (typeof window !== 'undefined') {
            const sessionRaw = sessionStorage.getItem('focusforge_guest_temp_data');
            if (sessionRaw) {
              try {
                loadedData = JSON.parse(sessionRaw);
              } catch {}
            }
          }
          if (!loadedData) {
            loadedData = { ...defaultState };
          }
        }

        if (loadedData && isMounted) {
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
            notifPreferences: { ...defaultState.notifPreferences, ...(parsed.notifPreferences || {}) },
            calendarPreferences: { ...defaultState.calendarPreferences, ...(parsed.calendarPreferences || {}) },
            theme: { ...defaultState.theme, ...parsed.theme } 
          });
        }
      } catch (e) {
        console.warn('State load warning:', e);
      } finally {
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
          } catch (e) {}
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
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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

  const navigateTo = useCallback((page: string) => {
    if (focusLockRef.current.isLocked && focusLockRef.current.onAttemptExit) {
      const allowed = focusLockRef.current.onAttemptExit(page);
      if (!allowed) {
        return; // Intercepted and blocked by focus lock
      }
    }

    setState((prev) => {
      if (prev.activePage === page) return prev;
      setIsPageLoading(true);
      setTimeout(() => {
        setIsPageLoading(false);
      }, 160);
      return { ...prev, activePage: page };
    });
  }, []);

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

    // Asynchronously persist to Supabase if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mindService.saveMindItem(newItem, session.user.id);
      }
    });
  }, []);

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    syncTaskToBackend(newTask).catch(() => {});
  }, []);

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
    updateTaskInBackend(id, updates).catch(() => {});
  }, []);

  const deleteTask = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
    deleteTaskFromBackend(id).catch(() => {});
  }, []);

  const cycleTaskStatus = useCallback((id: number) => {
    const statusCycle: ('not_started' | 'in_progress' | 'completed')[] = ['not_started', 'in_progress', 'completed'];
    let nextStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const idx = statusCycle.indexOf(t.status);
        const status = statusCycle[(idx + 1) % statusCycle.length];
        nextStatus = status;
        return { ...t, status, completed: status === 'completed', updatedAt: new Date().toISOString() };
      }),
    }));
    updateTaskInBackend(id, { status: nextStatus, completed: (nextStatus as string) === 'completed' }).catch(() => {});
  }, []);

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

    return newNote;
  }, []);

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

  const deleteTimeBlock = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      timeBlocks: prev.timeBlocks.filter((b) => b.id !== id),
    }));
  }, []);

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

    // Async update in Supabase & Express backend
    focusDbService.endFocusSession(sessionId, durationMinutes, completed).catch((err) => {
      console.warn("[AppContext] Error concluding focus session in DB:", err);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        learningDbService.saveFolder(newFolder, session.user.id);
      }
    });
  }, []);

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

    return createdTopic!;
  }, []);

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090F' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm text-zinc-500">Loading...</span>
        </div>
      </div>
    );
  }

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
        isLoaded,
        isPageLoading,
        setPageLoading: setIsPageLoading,
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
