import { DiaryTopic, DiaryEntry } from "../types";

export function generateDiaryId(): string {
  return "diary_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function formatTopicNumber(order: number): string {
  return String(order).padStart(2, "0");
}

export function formatDiaryDate(isoString: string, lang: "en" | "bn" = "en"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function formatDiaryDateTime(isoString: string, lang: "en" | "bn" = "en"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString(lang === "bn" ? "bn-BD" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return isoString;
  }
}

/**
 * Creates a new Diary Topic with an initial blank page (entry).
 */
export function createDiaryTopic(
  title: string,
  description: string = "",
  existingTopics: DiaryTopic[] = []
): { topic: DiaryTopic; updatedTopics: DiaryTopic[] } {
  const now = new Date().toISOString();
  const nextOrder = existingTopics.length + 1;

  const firstEntry: DiaryEntry = {
    id: generateDiaryId(),
    title: "",
    content: "",
    createdAt: now,
    updatedAt: now,
  };

  const newTopic: DiaryTopic = {
    id: generateDiaryId(),
    order: nextOrder,
    title: title.trim(),
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    entries: [firstEntry],
  };

  const updatedTopics = [...existingTopics, newTopic];
  return { topic: newTopic, updatedTopics };
}

/**
 * Updates a topic's title or description.
 */
export function updateDiaryTopic(
  topicId: string,
  updates: Partial<Pick<DiaryTopic, "title" | "description">>,
  topics: DiaryTopic[] = []
): DiaryTopic[] {
  const now = new Date().toISOString();
  return topics.map((t) => {
    if (t.id === topicId) {
      return {
        ...t,
        ...updates,
        updatedAt: now,
      };
    }
    return t;
  });
}

/**
 * Deletes a topic and re-indexes remaining topic orders cleanly.
 */
export function deleteDiaryTopic(topicId: string, topics: DiaryTopic[] = []): DiaryTopic[] {
  const filtered = topics.filter((t) => t.id !== topicId);
  return filtered.map((t, index) => ({
    ...t,
    order: index + 1,
  }));
}

/**
 * Creates a new page (entry) in the given topic.
 */
export function createDiaryEntry(
  topicId: string,
  title: string = "",
  content: string = "",
  topics: DiaryTopic[] = []
): { newEntry: DiaryEntry; updatedTopics: DiaryTopic[] } {
  const now = new Date().toISOString();
  const newEntry: DiaryEntry = {
    id: generateDiaryId(),
    title: title.trim(),
    content: content,
    createdAt: now,
    updatedAt: now,
  };

  const updatedTopics = topics.map((t) => {
    if (t.id === topicId) {
      return {
        ...t,
        updatedAt: now,
        entries: [...t.entries, newEntry],
      };
    }
    return t;
  });

  return { newEntry, updatedTopics };
}

/**
 * Updates an entry's title or content.
 */
export function updateDiaryEntry(
  topicId: string,
  entryId: string,
  updates: Partial<Pick<DiaryEntry, "title" | "content" | "images">>,
  topics: DiaryTopic[] = []
): DiaryTopic[] {
  const now = new Date().toISOString();
  return topics.map((t) => {
    if (t.id === topicId) {
      let found = false;
      const updatedEntries = t.entries.map((entry) => {
        if (entry.id === entryId) {
          found = true;
          return {
            ...entry,
            ...updates,
            updatedAt: now,
          };
        }
        return entry;
      });

      if (!found) {
        updatedEntries.push({
          id: entryId,
          title: updates.title || "",
          content: updates.content || "",
          images: updates.images || [],
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        ...t,
        updatedAt: now,
        entries: updatedEntries,
      };
    }
    return t;
  });
}

/**
 * Deletes an entry from a topic.
 * If all entries are deleted, automatically initializes one fresh blank page.
 */
export function deleteDiaryEntry(
  topicId: string,
  entryId: string,
  topics: DiaryTopic[] = []
): { updatedTopics: DiaryTopic[]; remainingEntriesCount: number } {
  const now = new Date().toISOString();
  let remainingCount = 0;

  const updatedTopics = topics.map((t) => {
    if (t.id === topicId) {
      let filteredEntries = t.entries.filter((e) => e.id !== entryId);
      if (filteredEntries.length === 0) {
        // Keep at least one blank page
        filteredEntries = [
          {
            id: generateDiaryId(),
            title: "",
            content: "",
            createdAt: now,
            updatedAt: now,
          },
        ];
      }
      remainingCount = filteredEntries.length;
      return {
        ...t,
        updatedAt: now,
        entries: filteredEntries,
      };
    }
    return t;
  });

  return { updatedTopics, remainingEntriesCount: remainingCount };
}

export interface DiarySearchResult {
  topic: DiaryTopic;
  entry?: DiaryEntry;
  pageIndex?: number;
  matchType: "topic_title" | "topic_description" | "entry_title" | "entry_content";
  snippet: string;
}

/**
 * Full-text search across all topics and diary entry contents.
 */
export function searchDiary(query: string, topics: DiaryTopic[] = []): DiarySearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results: DiarySearchResult[] = [];

  for (const topic of topics) {
    // 1. Topic Title Match
    if (topic.title.toLowerCase().includes(trimmed)) {
      results.push({
        topic,
        matchType: "topic_title",
        snippet: topic.title,
      });
    } else if (topic.description && topic.description.toLowerCase().includes(trimmed)) {
      results.push({
        topic,
        matchType: "topic_description",
        snippet: topic.description,
      });
    }

    // 2. Entries Match
    topic.entries.forEach((entry, pageIndex) => {
      const titleMatch = entry.title && entry.title.toLowerCase().includes(trimmed);
      const contentIndex = entry.content.toLowerCase().indexOf(trimmed);

      if (titleMatch) {
        results.push({
          topic,
          entry,
          pageIndex,
          matchType: "entry_title",
          snippet: entry.title || `Page ${pageIndex + 1}`,
        });
      } else if (contentIndex !== -1) {
        // Extract 80-char context window around the matched keyword
        const start = Math.max(0, contentIndex - 35);
        const end = Math.min(entry.content.length, contentIndex + trimmed.length + 35);
        let snippet = entry.content.substring(start, end).replace(/\n/g, " ");
        if (start > 0) snippet = "..." + snippet;
        if (end < entry.content.length) snippet = snippet + "...";

        results.push({
          topic,
          entry,
          pageIndex,
          matchType: "entry_content",
          snippet: snippet,
        });
      }
    });
  }

  return results;
}
