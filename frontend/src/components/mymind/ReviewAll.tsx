"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Search, X, Trash2, ArrowUpDown, Brain, Lightbulb, PenLine, Sparkles } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getThoughtDisplayData } from "../../utils/mindUtils";
import ThoughtPaperCard from "./ThoughtPaperCard";

interface ReviewAllProps {
  navigate: (view: string) => void;
  setActiveThoughtId: (id: string) => void;
}

type CategoryFilter = 'all' | 'free_flow' | 'idea_capture' | 'problem_solver';
type SortOrder = 'newest' | 'oldest';

const PAGE_SIZE = 16;

export default function ReviewAll({ navigate, setActiveThoughtId }: ReviewAllProps) {
  const { state, deleteMindItem, updateState, showToast } = useAppContext();
  const { t, lang } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const openDetail = (id: string) => {
    setActiveThoughtId(id);
    navigate('detail');
  };

  const handleDelete = (id: string) => {
    if (confirm(t.myMind.confirmDeleteThought)) {
      deleteMindItem(id);
      showToast(t.myMind.toastThoughtDeleted, "success");
    }
  };

  const handleDeleteAll = () => {
    if (confirm(t.myMind.confirmDeleteAll)) {
      updateState({
        mindItems: [],
      });
      // Also delete from backend database
      import("../../services/mindService").then(({ mindService }) => {
        import("../../lib/supabaseClient").then(({ supabase }) => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              mindService.deleteAllMindItems(session.user.id);
            }
          });
        });
      });
      showToast(t.myMind.toastThoughtDeleted, "success");
    }
  };

  // Pre-calculate category counts across all saved thoughts
  const counts = useMemo(() => {
    let freeFlowCount = 0;
    let ideaCount = 0;
    let problemCount = 0;

    for (const item of state.mindItems) {
      const data = getThoughtDisplayData(item, t, lang);
      if (data.categoryType === 'problem_solver') problemCount++;
      else if (data.categoryType === 'idea_capture') ideaCount++;
      else freeFlowCount++;
    }

    return {
      all: state.mindItems.length,
      free_flow: freeFlowCount,
      idea_capture: ideaCount,
      problem_solver: problemCount,
    };
  }, [state.mindItems, t, lang]);

  // Filter and sort all saved thoughts without modifying state
  const filteredAndSortedThoughts = useMemo(() => {
    return state.mindItems
      .filter((item) => {
        const data = getThoughtDisplayData(item, t, lang);

        // 1. Category filter
        if (selectedCategory !== 'all' && data.categoryType !== selectedCategory) {
          return false;
        }

        // 2. Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = data.title.toLowerCase().includes(q);
          const matchPreview = data.preview.toLowerCase().includes(q);
          const matchContent = item.content.toLowerCase().includes(q);
          const matchCategory = data.categoryLabel.toLowerCase().includes(q);

          if (!matchTitle && !matchPreview && !matchContent && !matchCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [state.mindItems, selectedCategory, searchQuery, sortOrder, t, lang]);

  const displayedThoughts = useMemo(() => {
    return filteredAndSortedThoughts.slice(0, visibleCount);
  }, [filteredAndSortedThoughts, visibleCount]);

  const hasMore = filteredAndSortedThoughts.length > visibleCount;

  return (
    <div className="motion-page w-full max-w-3xl mx-auto px-4 sm:px-6 pt-1 pb-20 space-y-5">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Back Button */}
        <button 
          type="button"
          onClick={() => navigate('home')}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          aria-label={t.myMind.backToMyMind || "Back to Capture"}
          title={t.myMind.backToMyMind || "Back to Capture"}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Page Title */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t.myMind.reviewAllTitle || "All Thoughts"}
        </h1>

        {/* Delete All Action */}
        <div className="flex justify-end">
          {state.mindItems.length > 0 && (
            <button 
              type="button"
              onClick={handleDeleteAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 cursor-pointer"
              style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-muted)" }}
              title={t.myMind.deleteAllHistory}
            >
              <Trash2 size={12} />
              <span>{t.myMind.deleteAll}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Search, Filters, and Sorting Controls (Compact & Clean) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {/* Search Input */}
        <div className="relative min-w-[160px] flex-1 sm:max-w-xs flex items-center h-9">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={t.myMind.searchPlaceholder || "Search thoughts..."}
            style={{ paddingLeft: "2.1rem", paddingRight: searchQuery ? "2rem" : "0.85rem" }}
            className="w-full h-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-blue-500 transition-colors shadow-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filters and Sort Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* All */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setVisibleCount(PAGE_SIZE);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-none flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/40'
            }`}
          >
            <span>{t.myMind.allFilter || "All"}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
              {counts.all}
            </span>
          </button>

          {/* Free Flow */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('free_flow');
              setVisibleCount(PAGE_SIZE);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-none flex items-center gap-1.5 ${
              selectedCategory === 'free_flow'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-purple-500/40'
            }`}
          >
            <PenLine size={11} />
            <span>{t.myMind.freeFlow || "Free Flow"}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'free_flow' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
              {counts.free_flow}
            </span>
          </button>

          {/* Idea Vault */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('idea_capture');
              setVisibleCount(PAGE_SIZE);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-none flex items-center gap-1.5 ${
              selectedCategory === 'idea_capture'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-teal-500/40'
            }`}
          >
            <Lightbulb size={11} />
            <span>{t.myMind.captureAnIdea || "Idea Vault"}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'idea_capture' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
              {counts.idea_capture}
            </span>
          </button>

          {/* Problem Solver */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('problem_solver');
              setVisibleCount(PAGE_SIZE);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-none flex items-center gap-1.5 ${
              selectedCategory === 'problem_solver'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-blue-500/40'
            }`}
          >
            <Brain size={11} />
            <span>{t.myMind.problemSolver || "Problem Solver"}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'problem_solver' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'}`}>
              {counts.problem_solver}
            </span>
          </button>

          {/* Sort Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-none flex items-center gap-1 border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-400"
            title="Toggle sort order"
          >
            <ArrowUpDown size={11} />
            <span>{sortOrder === 'newest' ? (t.myMind.newestFirst || "Newest first") : (t.myMind.oldestFirst || "Oldest first")}</span>
          </button>
        </div>
      </div>

      {/* ── Responsive Paper-Card Grid ── */}
      {displayedThoughts.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-4.5">
            {displayedThoughts.map((item, index) => (
              <ThoughtPaperCard
                key={item.id}
                item={item}
                index={index}
                onOpenDetail={() => openDetail(item.id)}
              />
            ))}
          </div>

          {/* Incremental Rendering / Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-none border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200"
              >
                {t.myMind.loadMore || "Load More"} ({filteredAndSortedThoughts.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      ) : state.mindItems.length === 0 ? (
        /* Empty State: No thoughts exist at all */
        <div className="text-center py-24 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-500 dark:text-blue-400 mx-auto mb-3">
            <Sparkles size={22} />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            {t.myMind.noThoughtsYet || "No thoughts yet. Capture something first."}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-5">
            {t.myMind.writeYourFirstThought || "Capture your first thought to see it here."}
          </p>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white shadow-none hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <PenLine size={13} />
            <span>{t.myMind.backToMyMind || "Back to Capture"}</span>
          </button>
        </div>
      ) : (
        /* Empty State: Filter or Search returned 0 matches */
        <div className="text-center py-20 px-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          <p className="text-sm font-semibold text-foreground mb-1">
            {t.myMind.noMatchingThoughts || "No matching thoughts found."}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Try adjusting your search query or category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory('all');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={13} />
            <span>{t.myMind.clearSearch || "Clear filters"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
