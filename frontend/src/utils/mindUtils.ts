import { MindItem } from "../types";

export function formatMindDate(dateStr: string, lang: string = 'en'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';

  const formattedDate = d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formattedDate} • ${formattedTime}`;
}

export function formatCompactMindDate(dateStr: string, lang: string = 'en'): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  if (lang === 'bn') {
    const datePart = d.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return datePart;
  }

  // English compact date: "29 Sep 2026"
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

export function getMindSourceInfo(
  item: { source?: string; content?: string },
  t: { myMind?: { problemSolver?: string; captureAnIdea?: string; freeFlow?: string } }
): { type: 'problem_solver' | 'idea_capture' | 'home'; label: string | null } {
  const content = item.content || '';
  const source = item.source;

  const isProblemSolver =
    source === 'problem_solver' ||
    content.startsWith('Problem Solver Reflection') ||
    content.startsWith('সমস্যা সমাধানকারীর ভাবনা');

  const isIdeaCapture =
    source === 'idea_capture' ||
    content.startsWith('Idea Capture') ||
    content.startsWith('💡 Idea Capture') ||
    content.startsWith('ধারণা ক্যাপচার') ||
    content.startsWith('💡 ধারণা ক্যাপচার');

  if (isProblemSolver) {
    return {
      type: 'problem_solver',
      label: t?.myMind?.problemSolver || 'Problem Solver',
    };
  }

  if (isIdeaCapture) {
    return {
      type: 'idea_capture',
      label: t?.myMind?.captureAnIdea || 'Idea Vault',
    };
  }

  return {
    type: 'home',
    label: t?.myMind?.freeFlow || 'Free Flow',
  };
}

export interface ThoughtCategoryAccent {
  key: 'problem_solver' | 'idea_capture' | 'free_flow';
  labelClass: string;
  foldFill: string;
  badgeClass: string;
  tabClass: string;
  dotColor: string;
}

export interface ThoughtDisplayData {
  title: string;
  preview: string;
  categoryType: 'problem_solver' | 'idea_capture' | 'free_flow';
  categoryLabel: string;
  formattedDate: string;
  accent: ThoughtCategoryAccent;
}

export function getThoughtDisplayData(
  item: MindItem | { id: string; content: string; createdAt: string; source?: string; title?: string },
  t: { myMind?: Record<string, string> },
  lang: string = 'en'
): ThoughtDisplayData {
  const content = item.content || '';
  const source = item.source;

  const isProblemSolver =
    source === 'problem_solver' ||
    content.startsWith('Problem Solver Reflection') ||
    content.startsWith('সমস্যা সমাধানকারীর ভাবনা');

  const isIdeaCapture =
    source === 'idea_capture' ||
    content.startsWith('Idea Capture') ||
    content.startsWith('💡 Idea Capture') ||
    content.startsWith('ধারণা ক্যাপচার') ||
    content.startsWith('💡 ধারণা ক্যাপচার');

  let categoryType: 'problem_solver' | 'idea_capture' | 'free_flow' = 'free_flow';
  let categoryLabel = t?.myMind?.freeFlow || 'Free Flow';
  let accent: ThoughtCategoryAccent = {
    key: 'free_flow',
    labelClass: 'text-purple-600 dark:text-purple-400',
    foldFill: '#8B5CF6',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25',
    tabClass: 'bg-purple-500/80',
    dotColor: '#8B5CF6',
  };

  if (isProblemSolver) {
    categoryType = 'problem_solver';
    categoryLabel = t?.myMind?.problemSolver || 'Problem Solver';
    accent = {
      key: 'problem_solver',
      labelClass: 'text-blue-600 dark:text-blue-400',
      foldFill: '#3B82F6',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25',
      tabClass: 'bg-blue-500/80',
      dotColor: '#3B82F6',
    };
  } else if (isIdeaCapture) {
    categoryType = 'idea_capture';
    categoryLabel = t?.myMind?.captureAnIdea || 'Idea Vault';
    accent = {
      key: 'idea_capture',
      labelClass: 'text-teal-600 dark:text-teal-400',
      foldFill: '#14B8A6',
      badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-500/25',
      tabClass: 'bg-teal-500/80',
      dotColor: '#14B8A6',
    };
  }

  const formattedDate = formatCompactMindDate(item.createdAt, lang);

  let title = (item as { title?: string }).title?.trim() || '';
  let preview = '';

  if (title) {
    preview = content.trim();
  } else {
    // Structured extraction
    if (isProblemSolver && (content.startsWith('Problem Solver Reflection') || content.startsWith('সমস্যা সমাধানকারীর ভাবনা'))) {
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      let answerLine = '';
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (
          !line.endsWith('?') &&
          !line.endsWith(':') &&
          !line.includes('What happened') &&
          !line.includes('কী হয়েছে')
        ) {
          answerLine = line;
          break;
        }
      }
      title = answerLine || categoryLabel;
      const previewLines = lines.filter(
        (l) => !l.includes('Problem Solver Reflection') && !l.includes('সমস্যা সমাধানকারীর ভাবনা')
      );
      preview = previewLines.join(' ');
    } else if (
      isIdeaCapture &&
      (content.startsWith('Idea Capture') ||
        content.startsWith('💡 Idea Capture') ||
        content.startsWith('ধারণা ক্যাপচার') ||
        content.startsWith('💡 ধারণা ক্যাপচার'))
    ) {
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      let answerLine = '';
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (
          !line.endsWith('?') &&
          !line.endsWith(':') &&
          !line.includes('What is') &&
          !line.includes('কী')
        ) {
          answerLine = line;
          break;
        }
      }
      title = answerLine || categoryLabel;
      const previewLines = lines.filter(
        (l) => !l.includes('Idea Capture') && !l.includes('ধারণা ক্যাপচার')
      );
      preview = previewLines.join(' ');
    } else {
      // Free Flow / Standard note
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        title = t?.myMind?.myMindThought || 'Thought';
        preview = '';
      } else if (lines.length === 1) {
        const line = lines[0];
        if (line.length <= 65) {
          title = line;
          preview = line;
        } else {
          const cut = line.slice(0, 50);
          const lastSpace = cut.lastIndexOf(' ');
          title = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '...';
          preview = line;
        }
      } else {
        const firstLine = lines[0];
        if (firstLine.length <= 70) {
          title = firstLine;
          preview = lines.slice(1).join(' ');
        } else {
          const cut = firstLine.slice(0, 50);
          const lastSpace = cut.lastIndexOf(' ');
          title = (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '...';
          preview = lines.join(' ');
        }
      }
    }
  }

  return {
    title,
    preview,
    categoryType,
    categoryLabel,
    formattedDate,
    accent,
  };
}
