/**
 * Focentia Learning Roadmap Service
 * Phase 3 — Local-first persistent storage & progress tracker for AI Roadmaps
 */

import { LearningRoadmap, calculateRoadmapProgress } from '@/types/roadmap';

function getRoadmapStorageKey(userId?: string | null): string {
  if (userId && userId !== 'guest') return `focusforge_saved_roadmaps_${userId}`;
  return 'focusforge_saved_roadmaps_v1';
}

export const roadmapService = {
  /**
   * Retrieves all saved roadmaps for the current user
   */
  getSavedRoadmaps(userId?: string | null): LearningRoadmap[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = getRoadmapStorageKey(userId);
      let raw = localStorage.getItem(key);
      if (!raw && userId) {
        // Migration fallback: check legacy key
        raw = localStorage.getItem('focusforge_saved_roadmaps_v1');
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[roadmapService] Error reading saved roadmaps:', err);
      return [];
    }
  },

  /**
   * Retrieves a specific roadmap by ID
   */
  getRoadmapById(id: string, userId?: string | null): LearningRoadmap | null {
    const list = this.getSavedRoadmaps(userId);
    return list.find((r) => r.id === id) || null;
  },

  /**
   * Saves or updates a complete roadmap in local persistence
   */
  saveRoadmap(roadmap: LearningRoadmap, userId?: string | null): LearningRoadmap {
    if (typeof window === 'undefined') return roadmap;
    const key = getRoadmapStorageKey(userId);
    const list = this.getSavedRoadmaps(userId);
    const existingIndex = list.findIndex((r) => r.id === roadmap.id);

    const updatedRoadmap: LearningRoadmap = {
      ...roadmap,
      isSaved: true,
      updatedAt: new Date().toISOString(),
      createdAt: roadmap.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updatedRoadmap;
    } else {
      list.unshift(updatedRoadmap);
    }

    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      console.warn('[roadmapService] Error writing roadmap to storage:', err);
    }

    return updatedRoadmap;
  },

  /**
   * Toggles completion status of a topic or subtask within a roadmap
   */
  toggleItemCompletion(
    roadmapId: string,
    topicId: string,
    subtaskId?: string,
    userId?: string | null
  ): LearningRoadmap | null {
    const roadmap = this.getRoadmapById(roadmapId, userId);
    if (!roadmap) return null;

    let modified = false;

    for (const stage of roadmap.stages) {
      if (!Array.isArray(stage.topics)) continue;
      for (const topic of stage.topics) {
        if (topic.id === topicId) {
          if (subtaskId && Array.isArray(topic.subtasks)) {
            const sub = topic.subtasks.find((s) => s.id === subtaskId);
            if (sub) {
              sub.completed = !sub.completed;
              modified = true;
              // Check if all subtasks completed
              const allSubsDone = topic.subtasks.every((s) => s.completed);
              topic.status = allSubsDone ? 'completed' : 'in_progress';
            }
          } else {
            // Toggle whole topic
            const nextStatus = topic.status === 'completed' ? 'pending' : 'completed';
            topic.status = nextStatus;
            if (Array.isArray(topic.subtasks)) {
              topic.subtasks.forEach((s) => (s.completed = nextStatus === 'completed'));
            }
            modified = true;
          }
        }
      }
    }

    if (modified) {
      return this.saveRoadmap(roadmap, userId);
    }

    return roadmap;
  },

  /**
   * Deletes a saved roadmap
   */
  deleteRoadmap(id: string, userId?: string | null): boolean {
    if (typeof window === 'undefined') return false;
    const key = getRoadmapStorageKey(userId);
    const list = this.getSavedRoadmaps(userId);
    const filtered = list.filter((r) => r.id !== id);
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    } catch (err) {
      console.warn('[roadmapService] Error deleting roadmap:', err);
      return false;
    }
  },
};
