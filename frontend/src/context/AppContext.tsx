"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  startFocusSession: (taskName: string, category: string, taskId?: number) => string;
  endFocusSession: (sessionId: string, durationMinutes: number) => void;
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
  saveDiaryEntryItem: (topicId: string, entryId: string, updates: Partial<Pick<DiaryEntry, 'title' | 'content'>>) => void;
  deleteDiaryEntryItem: (topicId: string, entryId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  // Load state from IndexedDB or Cloud
  useEffect(() => {
    let isMounted = true;

    async function initStorage() {
      try {
        let loadedData = await loadStateFromIndexedDB();
        if (!loadedData && typeof window !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            loadedData = JSON.parse(raw);
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        // If logged in, prefer cloud state
        if (session?.user) {
          const { data: cloudData, error } = await supabase
            .from('user_cloud_state')
            .select('state')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && cloudData && cloudData.state) {
            loadedData = cloudData.state as AppState;
          } else if (loadedData) {
            // First time cloud sync: push local data up
            await supabase.from('user_cloud_state').upsert({
              id: session.user.id,
              state: loadedData,
              updated_at: new Date().toISOString()
            });
          }
        }

        if (loadedData && isMounted) {
          const parsed = loadedData;
          if (parsed.tasks) {
            parsed.tasks = parsed.tasks.map((t: any) => ({
              ...t,
              status: t.status === 'pending' ? 'not_started' : t.status,
              category: t.category || '',
              notes: t.notes || '',
              tier: t.tier || (t.priority === 'high' || t.priority === 'urgent' ? 'now' : t.priority === 'medium' ? 'next' : 'later'),
              estMinutes: t.estMinutes || (t.estHours ? t.estHours * 60 : 60),
            }));
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

  // Save state to IndexedDB (unlimited quota), safely to localStorage, and push to Cloud
  useEffect(() => {
    if (isLoaded) {
      saveStateToIndexedDB(state);
      safeSaveToLocalStorage(STORAGE_KEY, state);

      // Debounce the cloud sync
      const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('user_cloud_state').upsert({
            id: session.user.id,
            state: state,
            updated_at: new Date().toISOString()
          });
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [state, isLoaded]);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
  }, []);

  // ==================== Navigation ====================

  const navigateTo = useCallback((page: string) => {
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
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ==================== Mind Items ====================

  const addMindItem = useCallback((content: string, source?: MindItem['source']) => {
    if (!content.trim()) return;
    setState((prev) => ({
      ...prev,
      mindItems: [
        { 
          id: generateId(), 
          content: content.trim(), 
          type: 'thought', 
          createdAt: new Date().toISOString(),
          source 
        },
        ...prev.mindItems,
      ],
    }));
  }, []);

  const updateMindItem = useCallback((id: string, content: string) => {
    setState((prev) => ({
      ...prev,
      mindItems: prev.mindItems.map((item) =>
        item.id === id ? { ...item, content } : item
      ),
    }));
  }, []);

  const deleteMindItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      mindItems: prev.mindItems.filter((item) => item.id !== id),
    }));
  }, []);

  // ==================== Tasks ====================

  const addTask = useCallback((taskData: Partial<Task> & { name?: string; title?: string }) => {
    const taskName = taskData.name || taskData.title || '';
    const taskDate = taskData.targetDate || taskData.date || '';
    const isComp = taskData.completed ?? (taskData.status === 'completed');
    const newTask: Task = {
      id: Date.now(),
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
  }, []);

  const deleteTask = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }, []);

  const cycleTaskStatus = useCallback((id: number) => {
    const statusCycle: Task['status'][] = ['not_started', 'in_progress', 'completed'];
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const idx = statusCycle.indexOf(t.status);
        return { ...t, status: statusCycle[(idx + 1) % statusCycle.length] };
      }),
    }));
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
    return newNote;
  }, []);

  const updateNote = useCallback((id: number, updates: Partial<Note>) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
    }));
  }, []);

  const deleteNote = useCallback((id: number) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== id),
    }));
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

  const startFocusSession = useCallback((taskName: string, category: string, taskId?: number): string => {
    const id = generateId();
    const session: FocusSession = {
      id,
      taskId,
      taskName,
      category,
      startedAt: new Date().toISOString(),
      durationMinutes: 0,
      distractions: [],
      completed: false,
    };
    setState((prev) => ({ ...prev, focusSessions: [...prev.focusSessions, session] }));
    return id;
  }, []);

  const endFocusSession = useCallback((sessionId: string, durationMinutes: number) => {
    setState((prev) => {
      const session = prev.focusSessions.find((s) => s.id === sessionId);
      if (!session) return prev;

      const updatedSessions = prev.focusSessions.map((s) =>
        s.id === sessionId
          ? { ...s, endedAt: new Date().toISOString(), durationMinutes, completed: true }
          : s
      );

      // Auto-log as activity
      const newActivity = {
        id: Date.now(),
        category: session.category || 'Focus Session',
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
        totalMinutes: durationMinutes,
        date: todayStr(),
        notes: session.taskName,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        focusSessions: updatedSessions,
        activities: [...prev.activities, newActivity],
        pomodoroSessions: prev.pomodoroSessions + 1,
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
    setState((prev) => ({
      ...prev,
      learningFolders: [...prev.learningFolders, { id: generateId(), name, createdAt: new Date().toISOString(), completed: false }]
    }));
  }, []);

  const deleteLearningFolder = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      learningFolders: prev.learningFolders.filter((f) => f.id !== id),
      learningLogs: prev.learningLogs.filter((l) => l.folderId !== id),
    }));
  }, []);

  const toggleLearningFolderCompletion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      learningFolders: prev.learningFolders.map((f) => f.id === id ? { ...f, completed: !f.completed } : f)
    }));
  }, []);

  const addLearningLog = useCallback((log: Omit<LearningLog, 'id'>) => {
    setState((prev) => ({
      ...prev,
      learningLogs: [...prev.learningLogs, { ...log, id: generateId() }]
    }));
  }, []);

  const deleteLearningLog = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      learningLogs: prev.learningLogs.filter((l) => l.id !== id)
    }));
  }, []);

  // ==================== My Diary ====================

  const saveDiaryTopic = useCallback((title: string, description: string = '') => {
    let createdTopic: DiaryTopic;
    setState((prev) => {
      const { topic, updatedTopics } = createDiaryTopic(title, description, prev.diaryTopics || []);
      createdTopic = topic;
      return { ...prev, diaryTopics: updatedTopics };
    });
    return createdTopic!;
  }, []);

  const updateDiaryTopicItem = useCallback((topicId: string, updates: Partial<Pick<DiaryTopic, 'title' | 'description'>>) => {
    setState((prev) => ({
      ...prev,
      diaryTopics: updateDiaryTopic(topicId, updates, prev.diaryTopics || [])
    }));
  }, []);

  const deleteDiaryTopicItem = useCallback((topicId: string) => {
    setState((prev) => ({
      ...prev,
      diaryTopics: deleteDiaryTopic(topicId, prev.diaryTopics || [])
    }));
  }, []);

  const addDiaryEntryItem = useCallback((topicId: string, title: string = '', content: string = '') => {
    let createdEntry: DiaryEntry;
    setState((prev) => {
      const { newEntry, updatedTopics } = createDiaryEntry(topicId, title, content, prev.diaryTopics || []);
      createdEntry = newEntry;
      return { ...prev, diaryTopics: updatedTopics };
    });
    return createdEntry!;
  }, []);

  const saveDiaryEntryItem = useCallback((topicId: string, entryId: string, updates: Partial<Pick<DiaryEntry, 'title' | 'content'>>) => {
    setState((prev) => ({
      ...prev,
      diaryTopics: updateDiaryEntry(topicId, entryId, updates, prev.diaryTopics || [])
    }));
  }, []);

  const deleteDiaryEntryItem = useCallback((topicId: string, entryId: string) => {
    setState((prev) => {
      const { updatedTopics } = deleteDiaryEntry(topicId, entryId, prev.diaryTopics || []);
      return { ...prev, diaryTopics: updatedTopics };
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
