// ==================== TRANSLATION DICTIONARY ====================
    const i18n = {
      en: {
        tagline: 'Productivity Hub',
        nav_dashboard: 'Dashboard', nav_logger: 'Activity Logger', nav_routine: 'Routine Planner',
        nav_focus: 'Focus Mode', nav_settings: 'Settings',
        dashboard_title: 'Dashboard Overview', dashboard_subtitle: 'Your productivity at a glance',
        today: 'Today', this_week: 'This Week', all_time: 'All Time', distractions: 'Distractions',
        hours_logged_today: 'Hours logged today', hours_this_week: 'Hours this week',
        total_hours: 'Total hours logged', distractions_today: 'Distractions logged today',
        recent_activity: 'Recent Activity', no_activity_yet: 'No activity logged yet. Start tracking!',
        category_breakdown: 'Category Breakdown', no_categories_yet: 'No categories tracked yet.',
        logger_title: 'Activity & Hour Logger', logger_subtitle: 'Track your daily study and coding hours',
        log_activity: 'Log Activity', category: 'Category', hours: 'Hours', minutes: 'Minutes',
        date: 'Date', notes: 'Notes', notes_placeholder: 'What did you work on?',
        log_entry: 'Log Entry', activity_history: 'Activity History', clear_all: 'Clear All',
        no_entries: 'No entries yet. Log your first activity!', manage_categories: 'Manage Categories',
        add_category: 'Add Category', category_name_placeholder: 'e.g., Algorithm Practice',
        add: 'Add', cancel: 'Cancel',
        routine_title: 'Smart Routine Planner', routine_subtitle: 'Schedule tasks and auto-generate balanced routines',
        add_task: 'Add Task', task_name: 'Task Name', task_name_placeholder: 'e.g., Complete React module',
        target_date: 'Target Date', priority: 'Priority', est_hours: 'Est. Hours', add_task_btn: 'Add Task',
        high: 'High', medium: 'Medium', low: 'Low',
        generate_routine: 'Generate Routine', daily_available_hours: 'Daily Available Hours',
        start_date: 'Start Date', auto_generate: 'Auto-Generate',
        task_list: 'Task List', no_tasks: 'No tasks yet. Add your first task!',
        generated_schedule: 'Generated Schedule', no_schedule: 'Click "Auto-Generate" to create a balanced routine from your tasks.',
        focus_title: 'Distraction Shield & Focus', focus_subtitle: 'Stay locked in with the Pomodoro timer',
        pomodoro_timer: 'Pomodoro Timer', work_session: 'Work Session', break_session: 'Break Time',
        start: 'Start', pause: 'Pause', reset: 'Reset', resume: 'Resume',
        work_min: 'Work (min)', break_min: 'Break (min)', sessions: 'Sessions',
        enter_deep_focus: 'Enter Deep Focus Mode',
        distraction_counter: 'Distraction Counter', times_distracted_today: 'times distracted today',
        log_distraction: 'I Got Distracted', undo_last: 'Undo Last',
        distraction_log: 'Distraction Log', no_distractions: 'Clean slate! Stay focused 💪',
        focus_tasks: 'Focus Tasks', no_focus_tasks: 'Add tasks in Routine Planner',
        deep_focus_active: '🔒 Deep Focus Active', stay_focused_msg: 'Eliminate distractions. Stay in the zone.',
        current_tasks: 'Current Tasks',
        settings_title: 'Settings', settings_subtitle: 'Manage your preferences and data',
        notifications: 'Notifications', break_reminders: 'Break Reminders',
        break_reminders_desc: 'Get notified when Pomodoro sessions end',
        daily_reminders: 'Daily Study Reminders', daily_reminders_desc: 'Remind to log activity each day',
        enable_notifications: 'Enable Browser Notifications',
        notif_status_default: 'Notification permission: not requested',
        notif_granted: 'Notification permission: granted ✅',
        notif_denied: 'Notification permission: denied ❌',
        data_management: 'Data Management', export_json: 'Export Data (JSON)',
        import_json: 'Import Data (JSON)', reset_all_data: '⚠️ Reset All Data',
        language_settings: 'Language Settings', lang_saved_note: 'Language preference is saved automatically.',
        about: 'About', about_desc: 'A 100% free, offline-first productivity app. All data is stored locally in your browser. No accounts, no tracking, no backend.',
        toast_logged: 'Activity logged successfully!', toast_deleted: 'Entry deleted.',
        toast_category_added: 'Category added!', toast_category_removed: 'Category removed.',
        toast_task_added: 'Task added!', toast_task_deleted: 'Task deleted.',
        toast_exported: 'Data exported successfully!', toast_imported: 'Data imported successfully!',
        toast_reset: 'All data has been reset.', toast_routine_generated: 'Routine generated!',
        toast_cleared: 'All entries cleared.',
        confirm_clear: 'Are you sure you want to clear all entries?',
        confirm_reset: 'Are you sure you want to reset ALL data? This cannot be undone.',
        confirm_delete_category: 'Remove this category?',
        pomodoro_work_done: '🎉 Work session complete! Take a break.',
        pomodoro_break_done: '☕ Break is over! Ready for the next round?',
        pending: 'Pending', in_progress: 'In Progress', completed: 'Completed',
        schedule_day: 'Day', delete: 'Delete', ago: 'ago', just_now: 'Just now',
        h: 'h', m: 'm', min_ago: 'min ago', hr_ago: 'hr ago',
        nav_learning: 'Learning Hub', learning_hub_title: 'Learning Hub', learning_hub_subtitle: 'Organize your subjects and track your progress',
        nav_today: 'Today', nav_tasks: 'Tasks', nav_habits: 'Habits', nav_braindump: 'Brain Dump', nav_analytics: 'Analytics',
        projects: 'Learning Folders', create_folder: 'Create Folder', folder_name: 'Folder Name',
        folder_name_placeholder: 'e.g., Java Programming', no_folders: 'No folders yet. Create one to start!',
        folder_stats: 'Folder Stats', total_video_hours: 'Video Hours', total_problems: 'Problems Solved', active_days: 'Active Days',
        log_progress: 'Log Progress', topics_learned: 'Topics Learned', topics_placeholder: 'e.g., OOP, Inheritance',
        video_hours: 'Video Hours', problems_solved: 'Problems Solved', log_history: 'Performance',
        no_logs: 'No progress logged yet.',
        session_report_title: 'Session Report', session_report_subtitle: 'Log your work to unlock Focus Mode',
        select_folder: 'Select Folder (Optional)', general_study: 'General Study', unlock: 'Submit & Unlock',
      },
      bn: {
        tagline: 'প্রোডাক্টিভিটি হাব',
        nav_dashboard: 'ড্যাশবোর্ড', nav_logger: 'অ্যাক্টিভিটি লগার', nav_routine: 'রুটিন প্ল্যানার',
        nav_focus: 'ফোকাস মোড', nav_settings: 'সেটিংস',
        dashboard_title: 'ড্যাশবোর্ড ওভারভিউ', dashboard_subtitle: 'আপনার প্রোডাক্টিভিটি এক নজরে',
        today: 'আজ', this_week: 'এই সপ্তাহ', all_time: 'সর্বমোট', distractions: 'বিভ্রান্তি',
        hours_logged_today: 'আজ লগ করা ঘণ্টা', hours_this_week: 'এই সপ্তাহে লগ করা ঘণ্টা',
        total_hours: 'মোট লগ করা ঘণ্টা', distractions_today: 'আজ রেকর্ড করা বিভ্রান্তি',
        recent_activity: 'সাম্প্রতিক অ্যাক্টিভিটি', no_activity_yet: 'এখনো কোনো অ্যাক্টিভিটি লগ করা হয়নি। ট্র্যাকিং শুরু করুন!',
        category_breakdown: 'ক্যাটাগরি বিশ্লেষণ', no_categories_yet: 'এখনো কোনো ক্যাটাগরি ট্র্যাক করা হয়নি।',
        logger_title: 'অ্যাক্টিভিটি ও ঘণ্টা লগার', logger_subtitle: 'আপনার দৈনিক পড়াশোনা ও কোডিং ঘণ্টা ট্র্যাক করুন',
        log_activity: 'অ্যাক্টিভিটি লগ করুন', category: 'ক্যাটাগরি', hours: 'ঘণ্টা', minutes: 'মিনিট',
        date: 'তারিখ', notes: 'নোটস', notes_placeholder: 'আপনি কী নিয়ে কাজ করেছেন?',
        log_entry: 'এন্ট্রি লগ করুন', activity_history: 'অ্যাক্টিভিটি হিস্ট্রি', clear_all: 'সব মুছুন',
        no_entries: 'এখনো কোনো এন্ট্রি নেই। প্রথম অ্যাক্টিভিটি লগ করুন!', manage_categories: 'ক্যাটাগরি ম্যানেজ করুন',
        add_category: 'ক্যাটাগরি যোগ করুন', category_name_placeholder: 'যেমন: অ্যালগরিদম প্র্যাকটিস',
        add: 'যোগ করুন', cancel: 'বাতিল',
        routine_title: 'স্মার্ট রুটিন প্ল্যানার', routine_subtitle: 'টাস্ক সিডিউল করুন এবং স্বয়ংক্রিয় রুটিন তৈরি করুন',
        add_task: 'টাস্ক যোগ করুন', task_name: 'টাস্কের নাম', task_name_placeholder: 'যেমন: React মডিউল সম্পন্ন করুন',
        target_date: 'লক্ষ্য তারিখ', priority: 'অগ্রাধিকার', est_hours: 'আনুমানিক ঘণ্টা', add_task_btn: 'টাস্ক যোগ করুন',
        high: 'উচ্চ', medium: 'মাঝারি', low: 'নিম্ন',
        generate_routine: 'রুটিন তৈরি করুন', daily_available_hours: 'দৈনিক উপলব্ধ ঘণ্টা',
        start_date: 'শুরুর তারিখ', auto_generate: 'অটো-জেনারেট',
        task_list: 'টাস্ক তালিকা', no_tasks: 'এখনো কোনো টাস্ক নেই। প্রথম টাস্ক যোগ করুন!',
        generated_schedule: 'তৈরি করা সিডিউল', no_schedule: 'আপনার টাস্ক থেকে সুষম রুটিন তৈরি করতে "অটো-জেনারেট" ক্লিক করুন।',
        focus_title: 'ডিসট্র্যাকশন শিল্ড ও ফোকাস', focus_subtitle: 'পোমোডোরো টাইমার দিয়ে ফোকাসে থাকুন',
        pomodoro_timer: 'পোমোডোরো টাইমার', work_session: 'কাজের সেশন', break_session: 'বিরতির সময়',
        start: 'শুরু', pause: 'পজ', reset: 'রিসেট', resume: 'আবার শুরু',
        work_min: 'কাজ (মিনিট)', break_min: 'বিরতি (মিনিট)', sessions: 'সেশন',
        enter_deep_focus: 'ডিপ ফোকাস মোড চালু করুন',
        distraction_counter: 'বিভ্রান্তি কাউন্টার', times_distracted_today: 'বার আজ বিভ্রান্ত হয়েছেন',
        log_distraction: 'বিভ্রান্ত হয়েছি', undo_last: 'শেষটি বাতিল করুন',
        distraction_log: 'বিভ্রান্তি লগ', no_distractions: 'পরিষ্কার! ফোকাসে থাকুন 💪',
        focus_tasks: 'ফোকাস টাস্ক', no_focus_tasks: 'রুটিন প্ল্যানারে টাস্ক যোগ করুন',
        deep_focus_active: '🔒 ডিপ ফোকাস সক্রিয়', stay_focused_msg: 'বিভ্রান্তি দূর করুন। জোনে থাকুন।',
        current_tasks: 'বর্তমান টাস্ক',
        settings_title: 'সেটিংস', settings_subtitle: 'আপনার পছন্দ ও ডেটা ম্যানেজ করুন',
        notifications: 'নোটিফিকেশন', break_reminders: 'বিরতি রিমাইন্ডার',
        break_reminders_desc: 'পোমোডোরো সেশন শেষ হলে নোটিফিকেশন পান',
        daily_reminders: 'দৈনিক পড়াশোনার রিমাইন্ডার', daily_reminders_desc: 'প্রতিদিন অ্যাক্টিভিটি লগ করতে রিমাইন্ড করুন',
        enable_notifications: 'ব্রাউজার নোটিফিকেশন সক্রিয় করুন',
        notif_status_default: 'নোটিফিকেশন অনুমতি: অনুরোধ করা হয়নি',
        notif_granted: 'নোটিফিকেশন অনুমতি: দেওয়া হয়েছে ✅',
        notif_denied: 'নোটিফিকেশন অনুমতি: প্রত্যাখ্যান করা হয়েছে ❌',
        data_management: 'ডেটা ম্যানেজমেন্ট', export_json: 'ডেটা এক্সপোর্ট (JSON)',
        import_json: 'ডেটা ইমপোর্ট (JSON)', reset_all_data: '⚠️ সমস্ত ডেটা রিসেট করুন',
        language_settings: 'ভাষা সেটিংস', lang_saved_note: 'ভাষার পছন্দ স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।',
        about: 'সম্পর্কে', about_desc: 'একটি ১০০% বিনামূল্যে, অফলাইন-ফার্স্ট প্রোডাক্টিভিটি অ্যাপ। সমস্ত ডেটা আপনার ব্রাউজারে স্থানীয়ভাবে সংরক্ষিত। কোনো অ্যাকাউন্ট, ট্র্যাকিং বা ব্যাকএন্ড নেই।',
        toast_logged: 'অ্যাক্টিভিটি সফলভাবে লগ করা হয়েছে!', toast_deleted: 'এন্ট্রি মুছে ফেলা হয়েছে।',
        toast_category_added: 'ক্যাটাগরি যোগ করা হয়েছে!', toast_category_removed: 'ক্যাটাগরি সরানো হয়েছে।',
        toast_task_added: 'টাস্ক যোগ করা হয়েছে!', toast_task_deleted: 'টাস্ক মুছে ফেলা হয়েছে।',
        toast_exported: 'ডেটা সফলভাবে এক্সপোর্ট করা হয়েছে!', toast_imported: 'ডেটা সফলভাবে ইমপোর্ট করা হয়েছে!',
        toast_reset: 'সমস্ত ডেটা রিসেট করা হয়েছে।', toast_routine_generated: 'রুটিন তৈরি হয়েছে!',
        toast_cleared: 'সব এন্ট্রি মুছে ফেলা হয়েছে।',
        confirm_clear: 'আপনি কি সব এন্ট্রি মুছে ফেলতে চান?',
        confirm_reset: 'আপনি কি সমস্ত ডেটা রিসেট করতে চান? এটি পূর্বাবস্থায় ফেরানো যাবে না।',
        confirm_delete_category: 'এই ক্যাটাগরি সরাতে চান?',
        pomodoro_work_done: '🎉 কাজের সেশন সম্পন্ন! বিরতি নিন।',
        pomodoro_break_done: '☕ বিরতি শেষ! পরবর্তী রাউন্ডের জন্য প্রস্তুত?',
        pending: 'বিচারাধীন', in_progress: 'চলমান', completed: 'সম্পন্ন',
        schedule_day: 'দিন', delete: 'মুছুন', ago: 'আগে', just_now: 'এইমাত্র',
        h: 'ঘ', m: 'মি', min_ago: 'মিনিট আগে', hr_ago: 'ঘণ্টা আগে',
        nav_learning: 'লার্নিং হাব', learning_hub_title: 'লার্নিং হাব', learning_hub_subtitle: 'আপনার বিষয়গুলো সাজান এবং প্রগ্রেস ট্র্যাক করুন',
        nav_today: 'আজ', nav_tasks: 'টাস্কস', nav_habits: 'অভ্যাস', nav_braindump: 'ব্রেইন ডাম্প', nav_analytics: 'অ্যানালিটিক্স',
        projects: 'লার্নিং ফোল্ডার', create_folder: 'ফোল্ডার তৈরি করুন', folder_name: 'ফোল্ডারের নাম',
        folder_name_placeholder: 'যেমন: Java Programming', no_folders: 'কোনো ফোল্ডার নেই। নতুন ফোল্ডার তৈরি করুন!',
        folder_stats: 'ফোল্ডার স্ট্যাটস', total_video_hours: 'ভিডিও ঘণ্টা', total_problems: 'সলভ করা প্রব্লেম', active_days: 'সক্রিয় দিন',
        log_progress: 'প্রগ্রেস লগ করুন', topics_learned: 'কী কী শিখেছেন', topics_placeholder: 'যেমন: OOP, Inheritance',
        video_hours: 'ভিডিও ঘণ্টা', problems_solved: 'সলভ করা প্রব্লেম', log_history: 'পারফরম্যান্স',
        no_logs: 'এখনো কোনো প্রগ্রেস লগ করা হয়নি।',
        session_report_title: 'সেশন রিপোর্ট', session_report_subtitle: 'ফোকাস মোড আনলক করতে কাজের বিবরণ দিন',
        select_folder: 'ফোল্ডার সিলেক্ট করুন (ঐচ্ছিক)', general_study: 'জেনারেল স্টাডি', unlock: 'সাবমিট ও আনলক করুন',
      }
    };

    // ==================== STATE ====================
    const STORAGE_KEY = 'focusforge_data';
    const defaultCategories = ['Coding', 'Video Tutorials', 'Problem Solving', 'Math Practice', 'Exam Prep', 'Reading'];

    function getDefaultState() {
      return {
        lang: 'en',
        categories: [...defaultCategories],
        activities: [], // Legacy logger
        tasks: [], // Enhanced tasks
        generatedSchedule: [],
        distractions: [],
        pomodoroSessions: 0,
        notifSettings: { breakReminders: true, dailyReminders: false },
        folders: [],
        folderLogs: [],
        habits: [],
        brainDump: [],
        productivityScore: 0,
        focusLogs: [],
        activeFocusTaskId: null
      };
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const defaults = getDefaultState();
          return { ...defaults, ...parsed };
        }
      } catch(e) { console.error('State load error:', e); }
      return getDefaultState();
    }

    let state = loadState();
    let currentLang = state.lang || 'en';
    let timerInterval = null;
    let timerRemaining = 0;
    let timerTotal = 0;
    let timerIsWork = true;
    let timerRunning = false;

    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) { console.error('State save error:', e); }
    }

    // ==================== TRANSLATION ENGINE ====================
    function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || (i18n.en[key]) || key; }

    function applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
      });
      document.querySelectorAll('[data-i18n-opt]').forEach(el => {
        const key = el.getAttribute('data-i18n-opt');
        el.textContent = t(key);
      });
      // Update lang buttons
      const enBtn = document.getElementById('langBtnEn');
      const bnBtn = document.getElementById('langBtnBn');
      if (enBtn && bnBtn) {
        enBtn.classList.toggle('border-purple-500', currentLang === 'en');
        bnBtn.classList.toggle('border-purple-500', currentLang === 'bn');
      }
      // Update sidebar lang toggle
      document.getElementById('langFlag').textContent = currentLang === 'en' ? '🇬🇧' : '🇧🇩';
      document.getElementById('langLabel').textContent = currentLang === 'en' ? 'English' : 'বাংলা';

      document.title = currentLang === 'bn' ? 'FocusForge — প্রোডাক্টিভিটি ড্যাশবোর্ড' : 'FocusForge — Productivity Dashboard';
    }

    function toggleLanguage() {
      currentLang = currentLang === 'en' ? 'bn' : 'en';
      state.lang = currentLang;
      saveState();
      applyTranslations();
      renderAll();
    };

    function setLanguage(lang) {
      currentLang = lang;
      state.lang = lang;
      saveState();
      applyTranslations();
      renderAll();
    };

    // ==================== NAVIGATION ====================
    function navigateTo(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      const target = document.getElementById('page-' + page);
      if (target) { target.classList.remove('hidden'); target.classList.add('fade-in'); }
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (navBtn) navBtn.classList.add('active');
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    };

    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // ==================== TOAST ====================
    function showToast(message, type = 'success') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      const colors = { success: 'from-purple-600 to-violet-600', error: 'from-rose-600 to-red-600', info: 'from-blue-600 to-indigo-600' };
      toast.className = `bg-gradient-to-r ${colors[type] || colors.success} text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg shadow-purple-500/20 scale-in flex items-center gap-2`;
      toast.innerHTML = `<span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ==================== DATE HELPERS ====================
    function todayStr() { return new Date().toISOString().split('T')[0]; }
    function getWeekStart() {
      const d = new Date(); const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).toISOString().split('T')[0];
    }
    function formatMinutes(totalMins) {
      const h = Math.floor(totalMins / 60); const m = Math.round(totalMins % 60);
      return `${h}${t('h')} ${m}${t('m')}`;
    }
    function timeAgo(dateStr) {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return t('just_now');
      if (mins < 60) return `${mins} ${t('min_ago')}`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} ${t('hr_ago')}`;
      return new Date(dateStr).toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric' });
    }

    // ==================== ACTIVITY LOGGER ====================
    function populateCategorySelect() {
      const sel = document.getElementById('logCategory');
      sel.innerHTML = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    function logActivity() {
      const category = document.getElementById('logCategory').value;
      const hours = parseInt(document.getElementById('logHours').value) || 0;
      const minutes = parseInt(document.getElementById('logMinutes').value) || 0;
      const date = document.getElementById('logDate').value || todayStr();
      const notes = document.getElementById('logNotes').value.trim();

      if (hours === 0 && minutes === 0) { showToast('Please enter time spent.', 'error'); return; }

      state.activities.push({
        id: Date.now(), category, hours, minutes, totalMinutes: hours * 60 + minutes,
        date, notes, createdAt: new Date().toISOString()
      });
      saveState();
      document.getElementById('logHours').value = 0;
      document.getElementById('logMinutes').value = 0;
      document.getElementById('logNotes').value = '';
      showToast(t('toast_logged'));
      renderAll();
    };

    function deleteActivity(id) {
      state.activities = state.activities.filter(a => a.id !== id);
      saveState(); showToast(t('toast_deleted')); renderAll();
    };

    function clearAllActivities() {
      if (confirm(t('confirm_clear'))) {
        state.activities = []; saveState(); showToast(t('toast_cleared')); renderAll();
      }
    };

    function renderActivityHistory() {
      const list = document.getElementById('activityHistoryList');
      if (state.activities.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-sm text-center py-12">${t('no_entries')}</p>`;
        return;
      }
      const sorted = [...state.activities].sort((a, b) => b.id - a.id);
      list.innerHTML = sorted.map(a => `
        <div class="glass rounded-xl p-4 flex items-center justify-between group hover:bg-purple-500/5 transition-all">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-white">${a.category}</span>
                <span class="text-xs text-purple-400 font-semibold">${formatMinutes(a.totalMinutes)}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>${a.date}</span>
                ${a.notes ? `<span class="text-slate-600">•</span><span class="truncate">${escHtml(a.notes)}</span>` : ''}
              </div>
            </div>
          </div>
          <button onclick="deleteActivity(${a.id})" class="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all p-1.5 rounded-lg hover:bg-rose-500/10">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      `).join('');
    }

    function renderRecentActivity() {
      const list = document.getElementById('recentActivityList');
      if (state.activities.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">${t('no_activity_yet')}</p>`;
        return;
      }
      const recent = [...state.activities].sort((a, b) => b.id - a.id).slice(0, 6);
      list.innerHTML = recent.map(a => `
        <div class="flex items-center gap-3 py-2">
          <div class="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
            <span class="text-xs">⏱</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-200 truncate">${a.category}</p>
            <p class="text-xs text-slate-500">${formatMinutes(a.totalMinutes)} • ${timeAgo(a.createdAt)}</p>
          </div>
        </div>
      `).join('');
    }

    function renderCategoryBreakdown() {
      const el = document.getElementById('categoryBreakdown');
      const catTotals = {};
      state.activities.forEach(a => {
        catTotals[a.category] = (catTotals[a.category] || 0) + a.totalMinutes;
      });
      const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
      if (entries.length === 0) {
        el.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">${t('no_categories_yet')}</p>`;
        return;
      }
      const maxMins = entries[0][1];
      el.innerHTML = entries.map(([cat, mins]) => {
        const pct = Math.round((mins / maxMins) * 100);
        return `
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-slate-300">${cat}</span>
              <span class="text-purple-400 font-medium">${formatMinutes(mins)}</span>
            </div>
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full transition-all duration-700" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ==================== STATS ====================
    function updateStats() {
      const today = todayStr();
      const weekStart = getWeekStart();

      let todayMins = 0, weekMins = 0, totalMins = 0;
      state.activities.forEach(a => {
        totalMins += a.totalMinutes;
        if (a.date === today) todayMins += a.totalMinutes;
        if (a.date >= weekStart) weekMins += a.totalMinutes;
      });

      document.getElementById('statToday').textContent = formatMinutes(todayMins);
      document.getElementById('statWeek').textContent = formatMinutes(weekMins);
      document.getElementById('statTotal').textContent = formatMinutes(totalMins);

      const todayDistractions = state.distractions.filter(d => d.date === today).length;
      document.getElementById('statDistractions').textContent = todayDistractions;
    }

    // ==================== CATEGORIES ====================
    function showAddCategoryModal() {
      document.getElementById('addCategoryModal').classList.remove('hidden');
      document.getElementById('addCategoryModal').classList.add('flex');
      document.getElementById('newCategoryInput').value = '';
      document.getElementById('newCategoryInput').focus();
    };

    function hideAddCategoryModal() {
      document.getElementById('addCategoryModal').classList.add('hidden');
      document.getElementById('addCategoryModal').classList.remove('flex');
    };

    function addCategory() {
      const name = document.getElementById('newCategoryInput').value.trim();
      if (!name) return;
      if (state.categories.includes(name)) { showToast('Category already exists', 'error'); return; }
      state.categories.push(name);
      saveState(); hideAddCategoryModal(); showToast(t('toast_category_added')); renderAll();
    };

    function removeCategory(cat) {
      if (confirm(t('confirm_delete_category'))) {
        state.categories = state.categories.filter(c => c !== cat);
        saveState(); showToast(t('toast_category_removed')); renderAll();
      }
    };

    function renderCategoryChips() {
      const el = document.getElementById('categoryChips');
      el.innerHTML = state.categories.map(c => `
        <div class="glass rounded-xl px-4 py-2 flex items-center gap-2 group hover:bg-purple-500/10 transition-all">
          <span class="text-sm text-slate-200">${c}</span>
          <button onclick="removeCategory('${escAttr(c)}')" class="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `).join('');
    }

    // ==================== TASK SCHEDULER ====================
    function addTask() {
      const name = document.getElementById('taskName').value.trim();
      const date = document.getElementById('taskDate').value;
      const priority = document.getElementById('taskPriority').value;
      const estHours = parseFloat(document.getElementById('taskEstHours').value) || 1;

      if (!name) { showToast('Please enter a task name.', 'error'); return; }

      state.tasks.push({
        id: Date.now(), name, targetDate: date || '', priority, estHours,
        status: 'pending', createdAt: new Date().toISOString()
      });
      saveState();
      document.getElementById('taskName').value = '';
      showToast(t('toast_task_added'));
      renderAll();
    };

    function deleteTask(id) {
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveState(); showToast(t('toast_task_deleted')); renderAll();
    };

    function cycleTaskStatus(id) {
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;
      const statusCycle = ['pending', 'in_progress', 'completed'];
      const idx = statusCycle.indexOf(task.status);
      task.status = statusCycle[(idx + 1) % statusCycle.length];
      saveState(); renderAll();
    };

    function clearAllTasks() {
      if (confirm(t('confirm_clear'))) {
        state.tasks = []; state.generatedSchedule = [];
        saveState(); showToast(t('toast_cleared')); renderAll();
      }
    };

    function renderTaskList() {
      const list = document.getElementById('taskList');
      if (state.tasks.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">${t('no_tasks')}</p>`;
        return;
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = [...state.tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      list.innerHTML = sorted.map(task => {
        const statusColors = { pending: 'text-slate-400', in_progress: 'text-amber-400', completed: 'text-emerald-400' };
        const statusIcons = { pending: '○', in_progress: '◐', completed: '●' };
        return `
          <div class="glass rounded-xl p-4 priority-${task.priority} group hover:bg-purple-500/5 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <button onclick="cycleTaskStatus(${task.id})" class="${statusColors[task.status]} hover:scale-110 transition-transform text-lg" title="${t(task.status)}">
                  ${statusIcons[task.status]}
                </button>
                <div class="min-w-0">
                  <p class="text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'} truncate">${escHtml(task.name)}</p>
                  <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    ${task.targetDate ? `<span>📅 ${task.targetDate}</span>` : ''}
                    <span>⏱ ${task.estHours}${t('h')}</span>
                    <span class="capitalize px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      task.priority === 'high' ? 'bg-red-500/15 text-red-400' :
                      task.priority === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-green-500/15 text-green-400'
                    }">${t(task.priority)}</span>
                  </div>
                </div>
              </div>
              <button onclick="deleteTask(${task.id})" class="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all p-1.5 rounded-lg hover:bg-rose-500/10">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // ==================== ROUTINE GENERATOR ====================
    function generateRoutine() {
      const dailyHours = parseFloat(document.getElementById('dailyHours').value) || 6;
      const startDateStr = document.getElementById('routineStartDate').value || todayStr();
      const pendingTasks = state.tasks.filter(t => t.status !== 'completed');

      if (pendingTasks.length === 0) {
        showToast('No pending tasks to schedule.', 'error'); return;
      }

      // Sort by priority then by target date
      const priorityWeight = { high: 0, medium: 1, low: 2 };
      pendingTasks.sort((a, b) => {
        if (priorityWeight[a.priority] !== priorityWeight[b.priority]) return priorityWeight[a.priority] - priorityWeight[b.priority];
        if (a.targetDate && b.targetDate) return new Date(a.targetDate) - new Date(b.targetDate);
        if (a.targetDate) return -1;
        if (b.targetDate) return 1;
        return 0;
      });

      const schedule = [];
      let currentDate = new Date(startDateStr);
      let dayHoursLeft = dailyHours;
      let dayNumber = 1;
      let dayTasks = [];

      for (const task of pendingTasks) {
        let remaining = task.estHours;
        while (remaining > 0) {
          const allocated = Math.min(remaining, dayHoursLeft);
          dayTasks.push({ name: task.name, hours: allocated, priority: task.priority });
          remaining -= allocated;
          dayHoursLeft -= allocated;

          if (dayHoursLeft <= 0.01) {
            schedule.push({
              day: dayNumber, date: currentDate.toISOString().split('T')[0],
              tasks: [...dayTasks], totalHours: dailyHours
            });
            dayTasks = [];
            dayNumber++;
            currentDate.setDate(currentDate.getDate() + 1);
            dayHoursLeft = dailyHours;
          }
        }
      }

      // Push remaining day
      if (dayTasks.length > 0) {
        schedule.push({
          day: dayNumber, date: currentDate.toISOString().split('T')[0],
          tasks: [...dayTasks], totalHours: dailyHours - dayHoursLeft
        });
      }

      state.generatedSchedule = schedule;
      saveState();
      showToast(t('toast_routine_generated'));
      renderGeneratedSchedule();
    };

    function renderGeneratedSchedule() {
      const el = document.getElementById('generatedSchedule');
      if (!state.generatedSchedule || state.generatedSchedule.length === 0) {
        el.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">${t('no_schedule')}</p>`;
        return;
      }
      el.innerHTML = state.generatedSchedule.map(day => `
        <div class="glass rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-purple-400">${t('schedule_day')} ${day.day} — ${day.date}</span>
            <span class="text-xs text-slate-500">${day.totalHours.toFixed(1)}${t('h')}</span>
          </div>
          <div class="space-y-2">
            ${day.tasks.map(task => `
              <div class="flex items-center justify-between py-1.5 px-3 rounded-lg bg-purple-500/5">
                <span class="text-sm text-slate-200">${escHtml(task.name)}</span>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-purple-400 font-medium">${task.hours.toFixed(1)}${t('h')}</span>
                  <span class="w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'}"></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    // ==================== POMODORO TIMER ====================
    function updateTimerDisplay() {
      const mins = Math.floor(timerRemaining / 60);
      const secs = timerRemaining % 60;
      const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      document.getElementById('timerDisplay').textContent = display;
      document.getElementById('dfTimerDisplay').textContent = display;

      // Update progress ring
      const progress = timerTotal > 0 ? (1 - timerRemaining / timerTotal) : 0;
      const dashOffset = 282.74 * (1 - progress);
      document.getElementById('timerProgress').style.strokeDashoffset = dashOffset;
      document.getElementById('dfTimerProgress').style.strokeDashoffset = dashOffset;

      // Update label
      const label = timerIsWork ? t('work_session') : t('break_session');
      document.getElementById('timerLabel').textContent = label;
      document.getElementById('dfTimerLabel').textContent = label;
    }

    function updateTimerSettings() {
      if (!timerRunning) {
        const workMins = parseInt(document.getElementById('pomodoroWork').value) || 25;
        timerRemaining = workMins * 60;
        timerTotal = timerRemaining;
        timerIsWork = true;
        updateTimerDisplay();
      }
    };

    function startTimer() {
      if (timerRunning) return;
      if (timerRemaining <= 0) {
        const workMins = parseInt(document.getElementById('pomodoroWork').value) || 25;
        timerRemaining = workMins * 60;
        timerTotal = timerRemaining;
        timerIsWork = true;
      }
      timerRunning = true;
      document.getElementById('timerStartBtn').classList.add('hidden');
      document.getElementById('timerPauseBtn').classList.remove('hidden');

      timerInterval = setInterval(() => {
        timerRemaining--;
        updateTimerDisplay();
        if (timerRemaining <= 0) {
          clearInterval(timerInterval);
          timerRunning = false;
          
          const btn1 = document.getElementById('timerStartBtn');
          const btn2 = document.getElementById('timerPauseBtn');
          const btn3 = document.getElementById('dfTimerStartBtn');
          const btn4 = document.getElementById('dfTimerPauseBtn');
          if(btn1) btn1.classList.remove('hidden');
          if(btn2) btn2.classList.add('hidden');
          if(btn3) btn3.classList.remove('hidden');
          if(btn4) btn4.classList.add('hidden');

          if (timerIsWork) {
            state.pomodoroSessions++;
            document.getElementById('pomodoroSessions').textContent = state.pomodoroSessions;
            saveState();
            sendNotification(t('pomodoro_work_done'));
            // Trigger session report automatically when work finishes
            endSessionEarly();
            
            // Switch to break in background
            const breakMins = parseInt(document.getElementById('pomodoroBreak').value) || 5;
            timerIsWork = false;
            timerRemaining = breakMins * 60;
            timerTotal = timerRemaining;
            updateTimerDisplay();
          } else {
            sendNotification(t('pomodoro_break_done'));
            // Switch to work
            const workMins = parseInt(document.getElementById('pomodoroWork').value) || 25;
            timerIsWork = true;
            timerRemaining = workMins * 60;
            timerTotal = timerRemaining;
            updateTimerDisplay();
          }
        }
      }, 1000);
    };

    function pauseTimer() {
      if (!timerRunning) return;
      clearInterval(timerInterval);
      timerRunning = false;
      const btn1 = document.getElementById('timerStartBtn');
      const btn2 = document.getElementById('timerPauseBtn');
      const btn3 = document.getElementById('dfTimerStartBtn');
      const btn4 = document.getElementById('dfTimerPauseBtn');
      if(btn1) {
        btn1.classList.remove('hidden');
        btn1.querySelector('span').textContent = t('resume');
      }
      if(btn2) btn2.classList.add('hidden');
      if(btn3) {
        btn3.classList.remove('hidden');
        btn3.querySelector('span').textContent = t('resume');
      }
      if(btn4) btn4.classList.add('hidden');
    };

    function resetTimer() {
      clearInterval(timerInterval);
      timerRunning = false;
      const workMins = parseInt(document.getElementById('pomodoroWork').value) || 25;
      timerRemaining = workMins * 60;
      timerTotal = timerRemaining;
      timerIsWork = true;
      const btn1 = document.getElementById('timerStartBtn');
      const btn2 = document.getElementById('timerPauseBtn');
      const btn3 = document.getElementById('dfTimerStartBtn');
      const btn4 = document.getElementById('dfTimerPauseBtn');
      if(btn1) {
        btn1.classList.remove('hidden');
        btn1.querySelector('span').textContent = t('start');
      }
      if(btn2) btn2.classList.add('hidden');
      if(btn3) {
        btn3.classList.remove('hidden');
        btn3.querySelector('span').textContent = t('start');
      }
      if(btn4) btn4.classList.add('hidden');
      updateTimerDisplay();
    };

    // ==================== DEEP FOCUS MODE ====================
    function toggleDeepFocus() {
      const overlay = document.getElementById('deepFocusOverlay');
      overlay.classList.toggle('active');
      renderFocusTasks();
    };

    function renderFocusTasks() {
      const lists = [document.getElementById('focusTaskList'), document.getElementById('dfTaskList')];
      const pendingTasks = state.tasks.filter(t => t.status !== 'completed').slice(0, 8);
      lists.forEach(list => {
        if (pendingTasks.length === 0) {
          list.innerHTML = `<p class="text-slate-500 text-xs text-center py-4">${t('no_focus_tasks')}</p>`;
          return;
        }
        list.innerHTML = pendingTasks.map(task => `
          <div class="flex items-center gap-2 py-1.5">
            <button onclick="cycleTaskStatus(${task.id})" class="${task.status === 'completed' ? 'text-emerald-400' : task.status === 'in_progress' ? 'text-amber-400' : 'text-slate-500'} text-sm">
              ${task.status === 'completed' ? '●' : task.status === 'in_progress' ? '◐' : '○'}
            </button>
            <span class="text-xs ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-300'} truncate">${escHtml(task.name)}</span>
          </div>
        `).join('');
      });
    }

    // ==================== DISTRACTION COUNTER ====================
    function logDistraction() {
      state.distractions.push({ id: Date.now(), date: todayStr(), time: new Date().toLocaleTimeString(currentLang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' }) });
      saveState();
      renderDistractions();
      updateStats();
    };

    function undoDistraction() {
      const todayD = state.distractions.filter(d => d.date === todayStr());
      if (todayD.length === 0) return;
      const lastId = todayD[todayD.length - 1].id;
      state.distractions = state.distractions.filter(d => d.id !== lastId);
      saveState();
      renderDistractions();
      updateStats();
    };

    function renderDistractions() {
      const todayD = state.distractions.filter(d => d.date === todayStr());
      document.getElementById('distractionCount').textContent = todayD.length;

      const log = document.getElementById('distractionLog');
      if (todayD.length === 0) {
        log.innerHTML = `<p class="text-slate-500 text-xs text-center py-4">${t('no_distractions')}</p>`;
        return;
      }
      log.innerHTML = todayD.reverse().map((d, i) => `
        <div class="flex items-center gap-2 text-xs py-1 text-slate-400">
          <span class="text-rose-400/60">#${todayD.length - i}</span>
          <span>${d.time}</span>
        </div>
      `).join('');
    }

    // ==================== NOTIFICATIONS ====================
    async function requestNotificationPermission() {
      if (!('Notification' in window)) {
        showToast('Notifications not supported in this browser.', 'error'); return;
      }
      const perm = await Notification.requestPermission();
      const statusEl = document.getElementById('notifStatus');
      if (perm === 'granted') {
        statusEl.textContent = t('notif_granted');
        showToast('Notifications enabled! 🔔');
      } else {
        statusEl.textContent = t('notif_denied');
      }
    };

    function sendNotification(message) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('FocusForge', { body: message, icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>' });
      }
      // Also show as toast
      showToast(message, 'info');
    }

    function toggleNotifSetting(key) {
      state.notifSettings[key] = !state.notifSettings[key];
      saveState();
      renderNotifToggles();
    };

    function renderNotifToggles() {
      ['breakReminders', 'dailyReminders'].forEach(key => {
        const btn = document.getElementById(`toggle-${key}`);
        const knob = btn.querySelector('.toggle-knob');
        if (state.notifSettings[key]) {
          btn.style.backgroundColor = '#7c3aed';
          knob.style.transform = 'translateX(24px)';
        } else {
          btn.style.backgroundColor = '#334155';
          knob.style.transform = 'translateX(0)';
        }
      });
    }

    // ==================== DATA EXPORT / IMPORT ====================
    function exportData() {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `focusforge_backup_${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast_exported'));
    };

    function importData(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const defaults = getDefaultState();
          state = { ...defaults, ...imported };
          currentLang = state.lang || 'en';
          saveState();
          showToast(t('toast_imported'));
          applyTranslations();
          renderAll();
        } catch (err) {
          showToast('Invalid JSON file.', 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    };

    function resetAllData() {
      if (confirm(t('confirm_reset'))) {
        localStorage.removeItem(STORAGE_KEY);
        state = getDefaultState();
        currentLang = 'en';
        saveState();
        showToast(t('toast_reset'));
        applyTranslations();
        renderAll();
      }
    };

    // ==================== UTILITY ====================
    function escHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
    function escAttr(str) { return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

    // ==================== LEARNING FOLDERS ====================
    let activeFolderId = null;

    function renderFolders() {
      const list = document.getElementById('foldersList');
      const select = document.getElementById('sessionFolderSelect');
      list.innerHTML = '';
      select.innerHTML = `<option value="" data-i18n-opt="general_study">${t('general_study')}</option>`;

      if (!state.folders || state.folders.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-sm text-center py-6" data-i18n="no_folders">${t('no_folders')}</p>`;
      } else {
        state.folders.forEach(f => {
          const btn = document.createElement('button');
          btn.className = `w-full text-left px-4 py-3 rounded-xl transition-all ${activeFolderId === f.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'glass hover:bg-purple-500/20 text-slate-300'}`;
          btn.innerHTML = `<div class="font-semibold">${escHtml(f.name)}</div>`;
          btn.onclick = () => openFolder(f.id);
          list.appendChild(btn);

          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = f.name;
          select.appendChild(opt);
        });
      }
    }

    function showCreateFolderModal() {
      document.getElementById('createFolderModal').classList.remove('hidden');
      document.getElementById('createFolderModal').classList.add('flex');
      document.getElementById('newFolderInput').value = '';
    }

    function hideCreateFolderModal() {
      document.getElementById('createFolderModal').classList.add('hidden');
      document.getElementById('createFolderModal').classList.remove('flex');
    }

    function createFolder() {
      const name = document.getElementById('newFolderInput').value.trim();
      if (!name) return;
      if (!state.folders) state.folders = [];
      if (state.folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        showToast('Folder already exists', 'error');
        return;
      }
      const newFolder = { id: Date.now().toString(), name, createdAt: Date.now() };
      state.folders.push(newFolder);
      saveState();
      hideCreateFolderModal();
      renderFolders();
      openFolder(newFolder.id);
      showToast('Folder created!');
    }

    function openFolder(id) {
      activeFolderId = id;
      renderFolders();
      
      const folder = state.folders.find(f => f.id === id);
      if (!folder) {
        document.getElementById('activeFolderView').classList.add('hidden');
        return;
      }
      
      document.getElementById('activeFolderView').classList.remove('hidden');
      document.getElementById('activeFolderName').textContent = folder.name;
      document.getElementById('folderLogDate').value = todayStr();
      
      renderFolderLogs();
    }

    function renderFolderLogs() {
      if (!activeFolderId) return;
      if (!state.folderLogs) state.folderLogs = [];
      
      const allLogs = state.folderLogs.filter(l => l.folderId === activeFolderId).sort((a,b) => new Date(a.date) - new Date(b.date));
      const uniqueDays = Array.from(new Set(allLogs.map(l => l.date)));
      const logs = [...allLogs].reverse();

      const list = document.getElementById('folderHistoryList');
      
      let totalVideo = 0;
      let totalProblems = 0;
      let activeDays = new Set();

      if (logs.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-sm text-center py-6" data-i18n="no_logs">${t('no_logs')}</p>`;
      } else {
        list.innerHTML = logs.map(log => {
          totalVideo += Number(log.videoHours || 0);
          totalProblems += Number(log.problemsSolved || 0);
          activeDays.add(log.date);
          
          const dateObj = new Date(log.date);
          const dateOpts = { weekday: 'short', month: 'short', day: 'numeric' };
          const displayDate = dateObj.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', dateOpts);
          
          return `
          <div class="glass-strong rounded-xl p-4 border-l-2 border-l-purple-500 relative group">
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-semibold text-purple-300 text-sm">${escHtml(log.topics || 'General Study')}</h5>
              <span class="text-[10px] text-slate-500">${displayDate}</span>
            </div>
            <div class="flex gap-4 text-xs text-slate-400 mb-2">
              ${log.videoHours ? `<span>📹 ${log.videoHours}h</span>` : ''}
              ${log.problemsSolved ? `<span>🧩 ${log.problemsSolved}</span>` : ''}
            </div>
            ${log.notes ? `<p class="text-xs text-slate-300">${escHtml(log.notes)}</p>` : ''}
          </div>
          `;
        }).join('');
      }

      document.getElementById('folderStatHours').textContent = totalVideo.toFixed(1).replace(/\.0$/, '');
      document.getElementById('folderStatProblems').textContent = totalProblems;
      document.getElementById('folderStatDays').textContent = activeDays.size;
    }

    function logFolderProgress() {
      if (!activeFolderId) return;
      const date = document.getElementById('folderLogDate').value;
      const topics = document.getElementById('folderLogTopics').value.trim();
      const videoHours = parseFloat(document.getElementById('folderLogVideoHours').value) || 0;
      const problemsSolved = parseInt(document.getElementById('folderLogProblems').value) || 0;
      const notes = document.getElementById('folderLogNotes').value.trim();

      if (!topics && videoHours === 0 && problemsSolved === 0) {
        showToast('Please enter some progress to log', 'error');
        return;
      }
      
      if (!state.folderLogs) state.folderLogs = [];
      state.folderLogs.push({ id: Date.now().toString(), folderId: activeFolderId, date, topics, videoHours, problemsSolved, notes });
      saveState();
      renderFolderLogs();
      showToast('Progress logged!');
      
      document.getElementById('folderLogTopics').value = '';
      document.getElementById('folderLogVideoHours').value = '0';
      document.getElementById('folderLogProblems').value = '0';
      document.getElementById('folderLogNotes').value = '';
    }

    // ==================== STRICT FOCUS FLOW ====================
    function endSessionEarly() {
      if(timerRunning) pauseTimer();
      document.getElementById('sessionReportModal').classList.remove('hidden');
      document.getElementById('sessionReportModal').classList.add('flex');
      
      // Auto-select active folder if one is open
      if(activeFolderId) {
        document.getElementById('sessionFolderSelect').value = activeFolderId;
      }
    }

    function submitSessionReport() {
      const folderId = document.getElementById('sessionFolderSelect').value;
      const topics = document.getElementById('sessionTopics').value.trim();
      const videoHours = parseFloat(document.getElementById('sessionVideoHours').value) || 0;
      const problems = parseInt(document.getElementById('sessionProblems').value) || 0;
      const notes = document.getElementById('sessionNotes').value.trim();

      if (!topics) {
        showToast('Please enter what you learned', 'error');
        return;
      }

      if (folderId) {
        if (!state.folderLogs) state.folderLogs = [];
        state.folderLogs.push({
          id: Date.now().toString(),
          folderId,
          date: todayStr(),
          topics,
          videoHours,
          problemsSolved: problems,
          notes: notes ? notes + ' (Focus Session)' : 'Focus Session'
        });
      } else {
        // Log as general activity if no folder
        state.activities.push({
          id: Date.now(),
          category: 'Focus Session',
          hours: videoHours,
          minutes: 0,
          notes: `${topics} - ${notes}`,
          date: todayStr(),
          timestamp: Date.now()
        });
      }
      
      saveState();
      
      // Close modal & exit focus
      document.getElementById('sessionReportModal').classList.add('hidden');
      document.getElementById('sessionReportModal').classList.remove('flex');
      
      // Reset inputs
      document.getElementById('sessionTopics').value = '';
      document.getElementById('sessionVideoHours').value = '0';
      document.getElementById('sessionProblems').value = '0';
      document.getElementById('sessionNotes').value = '';
      
      resetTimer();
      
      const overlay = document.getElementById('deepFocusOverlay');
      if (overlay.classList.contains('active')) {
        toggleDeepFocus(); // exit deep focus
      }
      
      showToast('Session saved. Great job!');
      renderAll();
      if(folderId) { openFolder(folderId); }
    }

    // ==================== RENDER ALL ====================
    function renderAll() {
      populateCategorySelect();
      renderActivityHistory();
      renderRecentActivity();
      renderCategoryBreakdown();
      renderCategoryChips();
      renderTaskList();
      renderGeneratedSchedule();
      renderDistractions();
      renderFocusTasks();
      renderNotifToggles();
      renderFolders();
      updateStats();
      document.getElementById('pomodoroSessions').textContent = state.pomodoroSessions;
    }

    // ==================== INIT ====================
    function init() {
      // Set default date on inputs
      document.getElementById('logDate').value = todayStr();
      document.getElementById('taskDate').value = todayStr();
      document.getElementById('routineStartDate').value = todayStr();

      // Set current date display
      const dateOpts = currentLang === 'bn'
        ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      document.getElementById('currentDate').textContent = new Date().toLocaleDateString(
        currentLang === 'bn' ? 'bn-BD' : 'en-US', dateOpts
      );

      // Init timer
      const workMins = parseInt(document.getElementById('pomodoroWork').value) || 25;
      timerRemaining = workMins * 60;
      timerTotal = timerRemaining;
      updateTimerDisplay();

      // Notification status
      if ('Notification' in window) {
        const statusEl = document.getElementById('notifStatus');
        if (Notification.permission === 'granted') statusEl.textContent = t('notif_granted');
        else if (Notification.permission === 'denied') statusEl.textContent = t('notif_denied');
      }

      applyTranslations();
      renderAll();
    }

    // Allow Enter key in category modal
    document.getElementById('newCategoryInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCategory();
    });

    init();

// Expose global functions to window for inline HTML events
window.pauseTimer = pauseTimer;
window.removeCategory = removeCategory;
window.renderFocusTasks = renderFocusTasks;
window.timeAgo = timeAgo;
window.openFolder = openFolder;
window.renderFolders = renderFolders;
window.getDefaultState = getDefaultState;
window.clearAllActivities = clearAllActivities;
window.renderAll = renderAll;
window.formatMinutes = formatMinutes;
window.renderDistractions = renderDistractions;
window.deleteActivity = deleteActivity;
window.populateCategorySelect = populateCategorySelect;
window.logDistraction = logDistraction;
window.renderFolderLogs = renderFolderLogs;
window.importData = importData;
window.resetAllData = resetAllData;
window.renderActivityHistory = renderActivityHistory;
window.toggleLanguage = toggleLanguage;
window.logFolderProgress = logFolderProgress;
window.renderTaskList = renderTaskList;
window.showToast = showToast;
window.init = init;
window.renderNotifToggles = renderNotifToggles;
window.t = t;
window.addCategory = addCategory;
window.loadState = loadState;
window.hideAddCategoryModal = hideAddCategoryModal;
window.logActivity = logActivity;
window.generateRoutine = generateRoutine;
window.clearAllTasks = clearAllTasks;
window.updateTimerDisplay = updateTimerDisplay;
window.updateTimerSettings = updateTimerSettings;
window.startTimer = startTimer;
window.updateStats = updateStats;
window.todayStr = todayStr;
window.renderCategoryBreakdown = renderCategoryBreakdown;
window.showCreateFolderModal = showCreateFolderModal;
window.renderCategoryChips = renderCategoryChips;
window.escHtml = escHtml;
window.hideCreateFolderModal = hideCreateFolderModal;
window.endSessionEarly = endSessionEarly;
window.renderGeneratedSchedule = renderGeneratedSchedule;
window.createFolder = createFolder;
window.deleteTask = deleteTask;
window.navigateTo = navigateTo;
window.cycleTaskStatus = cycleTaskStatus;
window.toggleNotifSetting = toggleNotifSetting;
window.applyTranslations = applyTranslations;
window.toggleDeepFocus = toggleDeepFocus;
window.setLanguage = setLanguage;
window.saveState = saveState;
window.getWeekStart = getWeekStart;
window.renderRecentActivity = renderRecentActivity;
window.escAttr = escAttr;
window.resetTimer = resetTimer;
window.undoDistraction = undoDistraction;
window.exportData = exportData;
window.submitSessionReport = submitSessionReport;
window.showAddCategoryModal = showAddCategoryModal;
window.addTask = addTask;
window.sendNotification = sendNotification;
