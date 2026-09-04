"use client";

import { Trash2 } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";

interface ReviewAllProps {
  navigate: (view: string) => void;
  setActiveThoughtId: (id: string) => void;
}

export default function ReviewAll({ navigate, setActiveThoughtId }: ReviewAllProps) {
  const { state, updateState } = useAppContext();
  const { t } = useTranslation();
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  };

  const openDetail = (id: string) => {
    setActiveThoughtId(id);
    navigate('detail');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.myMind.confirmDeleteThought)) {
      updateState({
        mindItems: state.mindItems.filter(item => item.id !== id)
      });
    }
  };

  const handleDeleteAll = () => {
    if (confirm(t.myMind.confirmDeleteAll)) {
      updateState({
        mindItems: []
      });
    }
  };

  return (
    <div className="fade-in max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('home')}
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t.myMind.backToMyMind}
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.myMind.reviewAllTitle}
        </h1>
        <div className="w-24 flex justify-end">
          {state.mindItems.length > 0 && (
            <button 
              onClick={handleDeleteAll}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
              style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-muted)" }}
              title={t.myMind.deleteAllHistory}
            >
              {t.myMind.deleteAll}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {state.mindItems.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t.myMind.yourMindIsEmpty}
            </p>
          </div>
        ) : (
          state.mindItems.map((item) => {
            const { date, time } = formatDate(item.createdAt);
            return (
              <div
                key={item.id}
                onClick={() => openDetail(item.id)}
                className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 relative"
                style={{ 
                  background: "var(--color-bg-card)", 
                  borderColor: "var(--color-border-subtle)" 
                }}
              >
                <div className="flex-1 pr-6 mb-2 md:mb-0">
                  <p 
                    className="text-sm font-medium line-clamp-1" 
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.content}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 shrink-0 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {item.source && item.source !== 'home' && (
                    <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 capitalize hidden sm:inline-block">
                      {item.source.replace('_', ' ')}
                    </span>
                  )}
                  <div className="flex flex-col md:items-end mr-8 md:mr-10">
                    <span className="font-medium text-black/60 dark:text-white/60">{date}</span>
                    <span className="opacity-70">{time}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500"
                  style={{ color: "var(--color-text-muted)" }}
                  title={t.myMind.deleteThoughtTitle}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
