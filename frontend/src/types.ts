export type BlockType = 
  | 'h1' | 'h2' | 'h3' | 'paragraph' | 'todo' | 'code' | 'math' | 'sticky'
  | 'bullet' | 'numbered' | 'quote' | 'image' | 'file' | 'link';

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface NoteLink {
  id: string;
  url: string;
  title?: string;
  domain?: string;
  description?: string;
  addedAt: string;
}

export interface NoteBlock {
  id: string;
  type: BlockType;
  content: string;
  isCompleted?: boolean;
  language?: 'javascript' | 'typescript' | 'java' | 'python' | 'c' | 'cpp' | 'html' | 'css' | 'json';
  stickyColor?: 'violet' | 'amber' | 'rose';
  textColor?: string;
  highlightColor?: string;
  boxColor?: string;
  boxBorderColor?: string;
  drawingData?: string;
  // Rich media & attachment block fields
  url?: string;
  /** Private Supabase object path; URLs are short-lived signed URLs. */
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  linkTitle?: string;
  linkDomain?: string;
  caption?: string;
  imageSize?: 'small' | 'medium' | 'large';
}

export interface ThemePreferences {
  accent: string;
  background: string;
  preset: string;
  mode: 'dark' | 'light';
}

export interface Note {
  id: number;
  title: string;
  blocks: NoteBlock[];
  attachments?: NoteAttachment[];
  links?: NoteLink[];
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  category: string;
  hours: number;
  minutes: number;
  totalMinutes: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Task {
  id: number;
  name: string;
  title?: string;
  description?: string;
  targetDate: string;
  date?: string;
  time?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estHours: number;
  estMinutes: number;
  status: 'not_started' | 'in_progress' | 'completed';
  completed?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
  category: string;
  notes: string;
  tier: 'now' | 'next' | 'later';
  createdAt: string;
  updatedAt?: string;
}

export interface MindItem {
  id: string;
  content: string;
  type: 'thought' | string; // legacy items may have 'unprocessed', 'task', etc.
  createdAt: string;
  processedAt?: string;
  source?: 'quick_capture' | 'empty_session' | 'problem_solver' | 'idea_capture' | 'home';
}

export interface DiaryEntry {
  id: string;
  title?: string;
  content: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface DiaryTopic {
  id: string;
  order: number;
  title: string;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  entries: DiaryEntry[];
}

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  taskId?: number;
  label: string;
  category: string;
  isBreak: boolean;
}

export interface DistractionEntry {
  id: string;
  content: string;
  timestamp: string;
}

export interface FocusSession {
  id: string;
  taskId?: number;
  taskName: string;
  category: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  distractions: DistractionEntry[];
  completed: boolean;
}

export interface ScheduleDay {
  day: number;
  date: string;
  tasks: { name: string; hours: number; priority: string }[];
  totalHours: number;
}

export interface Distraction {
  id: number;
  date: string;
  time: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface FolderLog {
  id: string;
  folderId: string;
  date: string;
  topics: string;
  videoHours: number;
  problemsSolved: number;
  notes: string;
}

export interface LearningFolder {
  id: string;
  name: string;
  createdAt: string;
  completed: boolean;
}

export interface LearningLog {
  id: string;
  folderId: string;
  date: string;
  watchMinutes: number;
  practiceMinutes: number;
  practiceDetails: string;
  topics: string;
  blockers: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: string;
  createdAt: string;
  records: string[];
}

export interface BrainDump {
  id: string;
  content: string;
  type: 'task' | 'idea' | 'note' | 'schedule';
  createdAt: string;
}

export interface DailyBig3 {
  date: string;
  taskIds: number[];
}

export interface NotificationPreferences {
  enabled: boolean;
  taskReminders: boolean;
  taskReminderTime: number; // minutes before
  dailyMorningPlan: boolean;
  dailyMorningPlanTime: string; // "07:00"
  motivationalNotifications: boolean;
  dailyTaskReminder: boolean;
  dailyTaskReminderTime: string; // "09:00"
  dailyReviewReminder: boolean;
  dailyReviewReminderTime: string; // "21:00"
  focusSessionReminder: boolean;
}

export interface CalendarPreferences {
  defaultTaskReminder: number;
  weekStartsOn: 'saturday' | 'sunday' | 'monday';
  showCompletedTasks: boolean;
}

// ==================== App State ====================

export interface AppState {
  lang: 'en' | 'bn';
  activePage: string;
  categories: string[];
  activities: Activity[];
  tasks: Task[];
  notes: Note[];
  mindItems: MindItem[];
  timeBlocks: TimeBlock[];
  focusSessions: FocusSession[];
  dailyBig3: DailyBig3[];
  generatedSchedule: ScheduleDay[];
  distractions: Distraction[];
  pomodoroSessions: number;
  notifSettings: { breakReminders: boolean; dailyReminders: boolean }; // Legacy, kept for migration
  notifPreferences: NotificationPreferences;
  calendarPreferences: CalendarPreferences;
  folders: Folder[];
  folderLogs: FolderLog[];
  habits: Habit[];
  brainDump: BrainDump[];
  productivityScore: number;
  focusLogs: FocusSession[];
  activeFocusTaskId: number | null;
  learningFolders: LearningFolder[];
  learningLogs: LearningLog[];
  theme: ThemePreferences;
  diaryTopics?: DiaryTopic[];
}

// ==================== Task Categories ====================

export const TASK_CATEGORIES = [
  'Programming',
  'Study',
  'University',
  'Exam',
  'Personal',
  'Health',
  'Project',
  'Business',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number] | string;

// ==================== Authentication Types ====================

export type AuthMethod = 'email' | 'phone' | 'google';

export interface UserProfileData {
  fullName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  country?: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface User extends UserProfileData {
  id: string;
  identifier: string; // email address or phone number
  authMethod: AuthMethod;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export type AuthModalView = 
  | 'initial' 
  | 'login' 
  | 'signup' 
  | 'password_create' 
  | 'otp' 
  | 'forgot_request' 
  | 'forgot_otp' 
  | 'forgot_new_password';

export interface AuthSession {
  user: User | null;
  token?: string;
  rememberMe: boolean;
  expiresAt?: string;
}

