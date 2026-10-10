/**
 * Focentia Learning Roadmap Types & Contracts
 * Phase 3 — Intelligent Learning Roadmaps & Prioritization
 */

export type RoadmapPriority = 'high' | 'medium' | 'low';
export type RoadmapStatus = 'pending' | 'in_progress' | 'completed';

export interface RoadmapSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  priority: RoadmapPriority;
  prerequisites?: string[];
  status: RoadmapStatus;
  subtasks?: RoadmapSubtask[];
}

export interface RoadmapStage {
  id: string;
  stageNumber: number;
  title: string;
  description?: string;
  topics: RoadmapTopic[];
}

export interface LearningRoadmap {
  id: string;
  title: string;
  subject: string;
  targetLevel?: 'beginner' | 'intermediate' | 'advanced';
  stages: RoadmapStage[];
  rationale?: string;
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
  folderId?: string;
}

export interface RoadmapProgress {
  totalTopics: number;
  completedTopics: number;
  totalSubtasks: number;
  completedSubtasks: number;
  percentage: number;
  isFullyCompleted: boolean;
}

/**
 * Derives accurate progress strictly from completed items
 */
export function calculateRoadmapProgress(roadmap: LearningRoadmap): RoadmapProgress {
  if (!roadmap || !Array.isArray(roadmap.stages) || roadmap.stages.length === 0) {
    return {
      totalTopics: 0,
      completedTopics: 0,
      totalSubtasks: 0,
      completedSubtasks: 0,
      percentage: 0,
      isFullyCompleted: false,
    };
  }

  let totalTopics = 0;
  let completedTopics = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;

  for (const stage of roadmap.stages) {
    if (!Array.isArray(stage.topics)) continue;
    for (const topic of stage.topics) {
      totalTopics++;
      if (topic.status === 'completed') {
        completedTopics++;
      }

      if (Array.isArray(topic.subtasks)) {
        for (const sub of topic.subtasks) {
          totalSubtasks++;
          if (sub.completed) {
            completedSubtasks++;
          }
        }
      }
    }
  }

  const effectiveTotal = totalSubtasks > 0 ? totalSubtasks : totalTopics;
  const effectiveCompleted = totalSubtasks > 0 ? completedSubtasks : completedTopics;
  const percentage = effectiveTotal > 0 ? Math.round((effectiveCompleted / effectiveTotal) * 100) : 0;

  return {
    totalTopics,
    completedTopics,
    totalSubtasks,
    completedSubtasks,
    percentage,
    isFullyCompleted: percentage === 100 && totalTopics > 0,
  };
}
