"use client";

import React from "react";
import { Sparkles } from "lucide-react";

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
  icon = <Sparkles className="w-8 h-8 text-indigo-400" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex items-center justify-center">{icon}</div>
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: "var(--color-text-muted)" }}>
          {description}
        </p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-5 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}
