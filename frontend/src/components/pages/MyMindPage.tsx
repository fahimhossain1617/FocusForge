"use client";

import { useState } from "react";
import MindHome from "../mymind/MindHome";
import ReviewAll from "../mymind/ReviewAll";
import ProblemSolver from "../mymind/ProblemSolver";
import IdeaCapture from "../mymind/IdeaCapture";
import ThoughtDetail from "../mymind/ThoughtDetail";

export type MindView = 'home' | 'review_all' | 'problem_solver' | 'idea_capture' | 'detail';

export default function MyMindPage() {
  const [activeView, setActiveView] = useState<MindView>('home');
  const [activeThoughtId, setActiveThoughtId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<MindView>('home');

  const navigate = (view: string) => {
    const nextView = view as MindView;
    if (activeView !== nextView) {
      setPreviousView(activeView);
      setActiveView(nextView);
    }
  };

  return (
    <div className="w-full">
      {activeView === 'home' && (
        <MindHome navigate={navigate} setActiveThoughtId={setActiveThoughtId} />
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
        <ThoughtDetail
          thoughtId={activeThoughtId}
          navigate={navigate}
          previousView={previousView}
        />
      )}
    </div>
  );
}
