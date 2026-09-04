"use client";

import { useState } from "react";
import MindHome from "../mymind/MindHome";
import EmptySession from "../mymind/EmptySession";
import ReviewAll from "../mymind/ReviewAll";
import ProblemSolver from "../mymind/ProblemSolver";
import IdeaCapture from "../mymind/IdeaCapture";
import ThoughtDetail from "../mymind/ThoughtDetail";
import DiaryHome from "../diary/DiaryHome";

export type MindView = 'home' | 'empty_session' | 'review_all' | 'problem_solver' | 'idea_capture' | 'detail' | 'diary';

export default function MyMindPage() {
  const [activeView, setActiveView] = useState<MindView>('home');
  const [activeThoughtId, setActiveThoughtId] = useState<string | null>(null);

  const navigate = (view: string) => {
    setActiveView(view as MindView);
  };

  return (
    <div className="w-full">
      {activeView === 'home' && (
        <MindHome navigate={navigate} setActiveThoughtId={setActiveThoughtId} />
      )}
      {activeView === 'empty_session' && (
        <EmptySession navigate={navigate} />
      )}
      {activeView === 'review_all' && (
        <ReviewAll navigate={navigate} setActiveThoughtId={setActiveThoughtId} />
      )}
      {activeView === 'problem_solver' && (
        <ProblemSolver navigate={navigate} />
      )}
      {activeView === 'idea_capture' && (
        <IdeaCapture navigate={navigate} />
      )}
      {activeView === 'detail' && activeThoughtId && (
        <ThoughtDetail thoughtId={activeThoughtId} navigate={navigate} />
      )}
      {activeView === 'diary' && (
        <DiaryHome onBackToMind={() => navigate('home')} />
      )}
    </div>
  );
}
