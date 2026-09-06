"use client";

import { Trash2, ArrowLeft } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getMindSourceInfo, formatMindDate } from "../../utils/mindUtils";

interface ReviewAllProps {
  navigate: (view: string) => void;
  setActiveThoughtId: (id: string) => void;
}

export default function ReviewAll({ navigate, setActiveThoughtId }: ReviewAllProps) {
  const { state, deleteMindItem, updateState } = useAppContext();
  const { t, lang } = useTranslation();

  const openDetail = (id: string) => {
    setActiveThoughtId(id);
    navigate('detail');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.myMind.confirmDeleteThought)) {
      deleteMindItem(id);
    }
  };

  const handleDeleteAll = () => {
    if (confirm(t.myMind.confirmDeleteAll)) {
      updateState({
        mindItems: []
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
    }
  };

  return (
    <div className="motion-page max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <button 
          type="button"
          onClick={() => navigate('home')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Back to Capture"
        >
          <ArrowLeft size={16} />
          <span>{t.myMind.backToMyMind || "Back to Capture"}</span>
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

      <div className="space-y-2 motion-stagger-fast">
        {state.mindItems.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {t.myMind.yourMindIsEmpty}
            </p>
          </div>
        ) : (
          state.mindItems.map((item) => {
            const sourceInfo = getMindSourceInfo(item, t);
            return (
              <div
                key={item.id}
                onClick={() => openDetail(item.id)}
                className="motion-grid-item card-interactive group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 relative"
                style={{ 
                  background: "var(--color-bg-card)", 
                  borderColor: "var(--color-border-subtle)" 
                }}
              >
                <div className="flex-1 pr-6 mb-2 md:mb-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {sourceInfo.label && (
                      <span 
                        className="px-2.5 py-0.5 text-xs font-semibold rounded-lg"
                        style={{ 
                          background: "rgba(99, 102, 241, 0.12)", 
                          color: "var(--color-purple-primary)" 
                        }}
                      >
                        {sourceInfo.label}
                      </span>
                    )}
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                      {formatMindDate(item.createdAt, lang)}
                    </span>
                  </div>
                  <p 
                    className="text-sm font-medium line-clamp-2" 
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.content}
                  </p>
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
