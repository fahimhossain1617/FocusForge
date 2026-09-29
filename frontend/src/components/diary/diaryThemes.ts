import React from "react";
import { 
  Code2, 
  GraduationCap, 
  Heart, 
  Brain, 
  Briefcase, 
  Target, 
  Bookmark, 
} from "lucide-react";
import { DiaryTopic } from "../../types";

export interface DiaryThemeDef {
  id: string;
  name: string;
  // Cover styling
  coverBg: string;
  coverBorder: string;
  coverShadow: string;
  innerSheen: string;
  // Page stack edge (right side physical depth)
  pageEdgeBg: string;
  pageEdgeBorder: string;
  // Spine & ring binding
  spineBg: string;
  ringColor: string;
  ringGlow?: string;
  ringHoleColor: string;
  // Bookmark ribbon
  bookmarkColor: string;
  // Chip & Tag pills
  dateChipBg: string;
  dateChipText: string;
  dateChipBorder: string;
  categoryTagText: string;
  // Typography
  titleColor: string;
  excerptColor: string;
  isLightCover: boolean;
}

export const DIARY_THEMES: Record<string, DiaryThemeDef> = {
  indigo: {
    id: "indigo",
    name: "Deep Indigo",
    coverBg: "linear-gradient(145deg, #1E293B 0%, #293854 55%, #182234 100%)",
    coverBorder: "rgba(99, 130, 246, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#F4EBE1",
    pageEdgeBorder: "#E2D9CD",
    spineBg: "#121824",
    ringColor: "#FF7369", // Coral / Salmon
    ringHoleColor: "rgba(10, 14, 22, 0.5)",
    bookmarkColor: "#FF7369",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#93C5FD",
    titleColor: "#F8FAFC",
    excerptColor: "#94A3B8",
    isLightCover: false,
  },
  ivory: {
    id: "ivory",
    name: "Soft Ivory Paper",
    coverBg: "linear-gradient(145deg, #F8FAFC 0%, #FFFFFF 55%, #EDF2F7 100%)",
    coverBorder: "rgba(203, 213, 225, 0.85)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#0284C7",
    pageEdgeBorder: "#0369A1",
    spineBg: "#E2E8F0",
    ringColor: "#0284C7", // Sky blue
    ringHoleColor: "rgba(148, 163, 184, 0.4)",
    bookmarkColor: "#0284C7",
    dateChipBg: "rgba(15, 23, 42, 0.06)",
    dateChipText: "#475569",
    dateChipBorder: "rgba(15, 23, 42, 0.1)",
    categoryTagText: "#0284C7",
    titleColor: "#0F172A",
    excerptColor: "#475569",
    isLightCover: true,
  },
  purple: {
    id: "purple",
    name: "Midnight Purple",
    coverBg: "linear-gradient(145deg, #2A1F42 0%, #382A59 55%, #201734 100%)",
    coverBorder: "rgba(168, 85, 247, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#FDE68A",
    pageEdgeBorder: "#F59E0B",
    spineBg: "#170F26",
    ringColor: "#FF7369", // Coral / Salmon
    ringHoleColor: "rgba(18, 10, 30, 0.5)",
    bookmarkColor: "#FF7369",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#FDA4AF",
    titleColor: "#F8FAFC",
    excerptColor: "#A8A29E",
    isLightCover: false,
  },
  teal: {
    id: "teal",
    name: "Slate Teal",
    coverBg: "linear-gradient(145deg, #153342 0%, #1F455A 55%, #102733 100%)",
    coverBorder: "rgba(45, 212, 191, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#F4EBE1",
    pageEdgeBorder: "#E2D9CD",
    spineBg: "#0B1A22",
    ringColor: "#34D399", // Mint green
    ringHoleColor: "rgba(8, 20, 28, 0.5)",
    bookmarkColor: "#34D399",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#6EE7B7",
    titleColor: "#F8FAFC",
    excerptColor: "#94A3B8",
    isLightCover: false,
  },
  ocean: {
    id: "ocean",
    name: "Deep Ocean",
    coverBg: "linear-gradient(145deg, #152B4E 0%, #1E3B6B 55%, #10213E 100%)",
    coverBorder: "rgba(56, 189, 248, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#F4EBE1",
    pageEdgeBorder: "#E2D9CD",
    spineBg: "#0B1526",
    ringColor: "#2DD4BF", // Mint / Turquoise
    ringHoleColor: "rgba(8, 18, 32, 0.5)",
    bookmarkColor: "#38BDF8",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#7DD3FC",
    titleColor: "#F8FAFC",
    excerptColor: "#94A3B8",
    isLightCover: false,
  },
  wine: {
    id: "wine",
    name: "Burgundy Wine",
    coverBg: "linear-gradient(145deg, #3D1C2E 0%, #52253E 55%, #2F1523 100%)",
    coverBorder: "rgba(244, 63, 94, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#FFE4E6",
    pageEdgeBorder: "#FECDD3",
    spineBg: "#220D19",
    ringColor: "#FBBF24", // Warm Amber
    ringHoleColor: "rgba(26, 8, 18, 0.5)",
    bookmarkColor: "#FB7185",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#FDA4AF",
    titleColor: "#F8FAFC",
    excerptColor: "#A8A29E",
    isLightCover: false,
  },
  emerald: {
    id: "emerald",
    name: "Forest Emerald",
    coverBg: "linear-gradient(145deg, #15392B 0%, #1E4D3B 55%, #102B21 100%)",
    coverBorder: "rgba(16, 185, 129, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#F4EBE1",
    pageEdgeBorder: "#E2D9CD",
    spineBg: "#0B1F17",
    ringColor: "#F59E0B", // Warm Amber
    ringHoleColor: "rgba(8, 22, 16, 0.5)",
    bookmarkColor: "#10B981",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#A7F3D0",
    titleColor: "#F8FAFC",
    excerptColor: "#94A3B8",
    isLightCover: false,
  },
  charcoal: {
    id: "charcoal",
    name: "Charcoal Slate",
    coverBg: "linear-gradient(145deg, #1F2633 0%, #2C3647 55%, #181E29 100%)",
    coverBorder: "rgba(148, 163, 184, 0.2)",
    coverShadow: "none",
    innerSheen: "none",
    pageEdgeBg: "#F1F5F9",
    pageEdgeBorder: "#CBD5E1",
    spineBg: "#11141B",
    ringColor: "#A78BFA", // Lavender
    ringHoleColor: "rgba(12, 15, 20, 0.5)",
    bookmarkColor: "#818CF8",
    dateChipBg: "rgba(255, 255, 255, 0.08)",
    dateChipText: "#E2E8F0",
    dateChipBorder: "rgba(255, 255, 255, 0.12)",
    categoryTagText: "#C7D2FE",
    titleColor: "#F8FAFC",
    excerptColor: "#94A3B8",
    isLightCover: false,
  },
};

export const THEME_SEQUENCE = [
  "indigo",
  "ivory",
  "purple",
  "teal",
  "ivory",
  "purple",
  "ocean",
  "wine",
  "emerald",
  "charcoal",
];

export function getDiaryTheme(topic: DiaryTopic, index: number = 0): DiaryThemeDef {
  if (topic.theme && DIARY_THEMES[topic.theme]) {
    return DIARY_THEMES[topic.theme];
  }

  const normalizedCategory = (topic.category || "").toLowerCase();
  const normalizedTitle = (topic.title || "").toLowerCase();

  if (normalizedCategory.includes("program") || normalizedCategory.includes("code") || normalizedTitle.includes("java")) {
    return DIARY_THEMES.indigo;
  }
  if (normalizedCategory.includes("study") || normalizedTitle.includes("plan") || normalizedTitle.includes("web")) {
    return DIARY_THEMES.ivory;
  }
  if (normalizedCategory.includes("life") || normalizedCategory.includes("mindset") || normalizedTitle.includes("thought") || normalizedTitle.includes("reflection")) {
    return DIARY_THEMES.purple;
  }
  if (normalizedCategory.includes("physics") || normalizedTitle.includes("physics") || normalizedTitle.includes("science")) {
    return DIARY_THEMES.teal;
  }
  if (normalizedCategory.includes("math") || normalizedTitle.includes("math")) {
    return DIARY_THEMES.ocean;
  }

  const themeKey = THEME_SEQUENCE[index % THEME_SEQUENCE.length];
  return DIARY_THEMES[themeKey] || DIARY_THEMES.indigo;
}

export function getDiaryCategory(topic: DiaryTopic): string {
  if (topic.category && topic.category.trim()) {
    return topic.category.trim();
  }
  const title = (topic.title || "").toLowerCase();
  if (title.includes("code") || title.includes("java") || title.includes("web") || title.includes("dev") || title.includes("python") || title.includes("js") || title.includes("react")) {
    return "Programming";
  }
  if (title.includes("study") || title.includes("math") || title.includes("physic") || title.includes("exam") || title.includes("learn") || title.includes("class")) {
    return "Study";
  }
  if (title.includes("reflect") || title.includes("mind") || title.includes("meditat") || title.includes("peace")) {
    return "Mindset";
  }
  if (title.includes("thought") || title.includes("life") || title.includes("person") || title.includes("daily") || title.includes("feel")) {
    return "Life";
  }
  if (title.includes("work") || title.includes("project") || title.includes("job") || title.includes("meeting")) {
    return "Work";
  }
  return "";
}

export function getCategoryIcon(category: string, size: number = 10): React.ReactElement {
  const cat = category.toLowerCase();
  if (cat.includes("program") || cat.includes("code") || cat.includes("dev")) {
    return React.createElement(Code2, { size, className: "shrink-0 opacity-80" });
  }
  if (cat.includes("study") || cat.includes("learn") || cat.includes("edu") || cat.includes("math") || cat.includes("physic")) {
    return React.createElement(GraduationCap, { size, className: "shrink-0 opacity-80" });
  }
  if (cat.includes("life") || cat.includes("person") || cat.includes("heart")) {
    return React.createElement(Heart, { size, className: "shrink-0 opacity-80" });
  }
  if (cat.includes("mind") || cat.includes("reflect") || cat.includes("psycho")) {
    return React.createElement(Brain, { size, className: "shrink-0 opacity-80" });
  }
  if (cat.includes("work") || cat.includes("project") || cat.includes("job")) {
    return React.createElement(Briefcase, { size, className: "shrink-0 opacity-80" });
  }
  if (cat.includes("goal") || cat.includes("target") || cat.includes("habit")) {
    return React.createElement(Target, { size, className: "shrink-0 opacity-80" });
  }
  return React.createElement(Bookmark, { size, className: "shrink-0 opacity-80" });
}

export function formatCardDateChip(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Today";
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return "Recent";
  }
}
