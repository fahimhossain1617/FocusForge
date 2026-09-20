"use client";

import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon = <FolderOpen className="w-7 h-7 text-[#5B8DEF] dark:text-indigo-400" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E7F0FF] dark:bg-white/5 border border-[#DCE5F0] dark:border-white/10 shadow-xs text-[#5B8DEF] dark:text-blue-400">
        {icon}
      </div>
      <h3
        className="text-base sm:text-lg font-semibold mb-1.5 text-[#111827] dark:text-foreground tracking-tight"
      >
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm max-w-sm text-[#52627A] dark:text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button 
          onClick={action.onClick} 
          className="btn-primary mt-5 px-5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
