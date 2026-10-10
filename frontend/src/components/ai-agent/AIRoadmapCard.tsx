"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  Award
} from "lucide-react";
import type { LearningRoadmap, RoadmapPriority } from "@/types/roadmap";
import { calculateRoadmapProgress } from "@/types/roadmap";
import { roadmapService } from "@/services/roadmapService";

interface AIRoadmapCardProps {
  roadmap: LearningRoadmap;
  isBn?: boolean;
  onSave?: (roadmap: LearningRoadmap) => void;
  onNavigate?: (route: string) => void;
}

export function AIRoadmapCard({
  roadmap: initialRoadmap,
  isBn = false,
  onSave,
  onNavigate,
}: AIRoadmapCardProps) {
  const [roadmap, setRoadmap] = useState<LearningRoadmap>(initialRoadmap);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(initialRoadmap.isSaved));
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});

  const progress = useMemo(() => calculateRoadmapProgress(roadmap), [roadmap]);

  const toggleStageCollapse = (stageId: string) => {
    setCollapsedStages((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleToggleItem = useCallback(
    (topicId: string, subtaskId?: string) => {
      const updated = roadmapService.toggleItemCompletion(roadmap.id, topicId, subtaskId);
      if (updated) {
        setRoadmap({ ...updated });
      } else {
        // Update local state in-place if not yet saved to local storage
        const nextRoadmap = JSON.parse(JSON.stringify(roadmap)) as LearningRoadmap;
        for (const stage of nextRoadmap.stages) {
          for (const topic of stage.topics) {
            if (topic.id === topicId) {
              if (subtaskId && topic.subtasks) {
                const sub = topic.subtasks.find((s) => s.id === subtaskId);
                if (sub) {
                  sub.completed = !sub.completed;
                  topic.status = topic.subtasks.every((s) => s.completed) ? "completed" : "in_progress";
                }
              } else {
                const nextStatus = topic.status === "completed" ? "pending" : "completed";
                topic.status = nextStatus;
                if (topic.subtasks) {
                  topic.subtasks.forEach((s) => (s.completed = nextStatus === "completed"));
                }
              }
            }
          }
        }
        setRoadmap(nextRoadmap);
      }
    },
    [roadmap]
  );

  const handleSaveRoadmap = () => {
    const saved = roadmapService.saveRoadmap(roadmap);
    setIsSaved(true);
    if (onSave) {
      onSave(saved);
    }
  };

  const getPriorityBadge = (priority: RoadmapPriority) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            {isBn ? "উচ্চ অগ্রাধিকার" : "High Priority"}
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
            {isBn ? "মাঝারি" : "Medium"}
          </span>
        );
      case "low":
      default:
        return (
          <span className="px-2 py-0.5 text-[10.5px] font-medium tracking-wide uppercase rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
            {isBn ? "সাধারণ" : "Low"}
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-2xl my-3 overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-xl backdrop-blur-md transition-all">
      {/* HEADER */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Layers size={13} />
              {roadmap.subject || (isBn ? "লার্নিং রোডম্যাপ" : "Learning Roadmap")}
            </span>
            {roadmap.targetLevel && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {roadmap.targetLevel.toUpperCase()}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveRoadmap}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isSaved
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            }`}
          >
            {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
            <span>{isSaved ? (isBn ? "সংরক্ষিত" : "Saved") : (isBn ? "সেভ করুন" : "Save Plan")}</span>
          </button>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {roadmap.title}
        </h3>

        {roadmap.rationale && (
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {roadmap.rationale}
          </p>
        )}

        {/* PROGRESS BAR */}
        <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-zinc-600 dark:text-zinc-400">
              {isBn ? "অর্জিত অগ্রগতি" : "Overall Progress"}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {progress.percentage}% • {progress.completedTopics}/{progress.totalTopics} {isBn ? "টপিক" : "Topics"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 transition-all duration-500 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* STAGES & TOPICS LIST */}
      <div className="p-3 sm:p-4 space-y-3.5 max-h-[480px] overflow-y-auto">
        {roadmap.stages.map((stage, sIdx) => {
          const isCollapsed = collapsedStages[stage.id];
          const stageDoneCount = stage.topics.filter((t) => t.status === "completed").length;

          return (
            <div
              key={stage.id || sIdx}
              className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 overflow-hidden"
            >
              {/* STAGE HEADER */}
              <button
                type="button"
                onClick={() => toggleStageCollapse(stage.id)}
                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {stage.stageNumber || sIdx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {stage.title}
                    </h4>
                    {stage.description && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {stage.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="text-[11px]">
                    {stageDoneCount}/{stage.topics.length}
                  </span>
                  {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </div>
              </button>

              {/* TOPIC ITEMS */}
              {!isCollapsed && (
                <div className="p-2 sm:p-3 pt-0 space-y-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
                  {stage.topics.map((topic, tIdx) => {
                    const isCompleted = topic.status === "completed";

                    return (
                      <div
                        key={topic.id || tIdx}
                        className={`p-3 rounded-lg border transition-all ${
                          isCompleted
                            ? "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border-emerald-500/30"
                            : "bg-white dark:bg-zinc-900/80 border-zinc-200/60 dark:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(topic.id)}
                            className="flex items-start gap-2.5 text-left group flex-1"
                          >
                            <span className="mt-0.5 text-zinc-400 group-hover:text-indigo-500 transition-colors">
                              {isCompleted ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : (
                                <Circle size={16} />
                              )}
                            </span>
                            <div>
                              <span
                                className={`text-xs sm:text-sm font-semibold tracking-tight transition-colors ${
                                  isCompleted
                                    ? "text-zinc-400 dark:text-zinc-500 line-through"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                {topic.title}
                              </span>
                              {topic.description && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                                  {topic.description}
                                </p>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {getPriorityBadge(topic.priority)}
                          </div>
                        </div>

                        {/* PREREQUISITES */}
                        {Array.isArray(topic.prerequisites) && topic.prerequisites.length > 0 && (
                          <div className="mt-2.5 pt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-zinc-500 border-t border-zinc-200/30 dark:border-zinc-800/30">
                            <span className="font-medium text-zinc-400">{isBn ? "প্রয়োজনীয় ভিত্তি:" : "Prereq:"}</span>
                            {topic.prerequisites.map((prereq, pIdx) => (
                              <span
                                key={pIdx}
                                className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10.5px]"
                              >
                                {prereq}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* SUBTASKS */}
                        {Array.isArray(topic.subtasks) && topic.subtasks.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 pl-6">
                            {topic.subtasks.map((sub, sIndex) => (
                              <button
                                key={sub.id || sIndex}
                                type="button"
                                onClick={() => handleToggleItem(topic.id, sub.id)}
                                className="w-full flex items-center gap-2 text-left text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                              >
                                <span className="text-zinc-400">
                                  {sub.completed ? (
                                    <CheckCircle2 size={13} className="text-emerald-500" />
                                  ) : (
                                    <Circle size={13} />
                                  )}
                                </span>
                                <span className={sub.completed ? "line-through text-zinc-400" : ""}>
                                  {sub.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-3 sm:p-4 border-t border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
          {progress.isFullyCompleted ? (
            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
              <Award size={14} />
              {isBn ? "রোডম্যাপ সম্পূর্ণ সম্পন্ন হয়েছে! 🎉" : "Roadmap Completed! 🎉"}
            </span>
          ) : (
            <span>
              {isBn ? "প্রতিটি টপিক শেখার পর সম্পন্ন মার্ক করো।" : "Check off items as you learn."}
            </span>
          )}
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("learning")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            <Compass size={13} />
            <span>{isBn ? "টাইম লগ খুলুন" : "Open Time Log"}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default AIRoadmapCard;
