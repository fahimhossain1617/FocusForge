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

export function getMindSourceInfo(
  item: { source?: string; content?: string },
  t: { myMind?: { problemSolver?: string; captureAnIdea?: string } }
): { type: 'problem_solver' | 'idea_capture' | 'home'; label: string | null } {
  const content = item.content || '';
  const source = item.source;

  const isProblemSolver =
    source === 'problem_solver' ||
    content.startsWith('Problem Solver Reflection') ||
    content.startsWith('সমস্যা সমাধানকারীর ভাবনা');

  const isIdeaCapture =
    source === 'idea_capture' ||
    content.startsWith('💡 Idea Capture') ||
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
      label: t?.myMind?.captureAnIdea || 'Capture an Idea',
    };
  }

  return {
    type: 'home',
    label: null,
  };
}
