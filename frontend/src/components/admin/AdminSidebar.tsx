"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Footprints,
  Inbox,
  Bug,
  Activity,
  Shield,
  RefreshCw,
  GitBranch,
  Bell,
  ScrollText,
  Bot,
  Flag,
  HeartPulse,
  UserX,
  KeyRound,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "overview", label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { id: "analytics", label: "Product Analytics", href: "/admin/analytics", icon: BarChart3 },
  { id: "users", label: "Users & Activity", href: "/admin/users", icon: Users },
  { id: "guests", label: "Guest Activity", href: "/admin/guests", icon: Footprints },
  { id: "feedback", label: "Feedback & Support", href: "/admin/feedback", icon: Inbox },
  { id: "issues", label: "Bugs & Crashes", href: "/admin/issues", icon: Bug },
  { id: "performance", label: "Performance", href: "/admin/performance", icon: Activity },
  { id: "security", label: "Security & Abuse", href: "/admin/security", icon: Shield },
  { id: "sync-health", label: "Data & Sync Health", href: "/admin/sync-health", icon: RefreshCw },
  { id: "release", label: "Release & Deploy", href: "/admin/release", icon: GitBranch },
  { id: "alerts", label: "Alert Center", href: "/admin/alerts", icon: Bell },
  { id: "audit-log", label: "Admin Audit Log", href: "/admin/audit-log", icon: ScrollText },
  { id: "ai-usage", label: "AI Usage & Quotas", href: "/admin/ai-usage", icon: Bot },
  { id: "flags", label: "Feature Flags", href: "/admin/flags", icon: Flag },
  { id: "monitoring-health", label: "Monitoring Health", href: "/admin/monitoring-health", icon: HeartPulse },
  { id: "privacy-requests", label: "Privacy Requests", href: "/admin/privacy-requests", icon: UserX },
  { id: "admin-security", label: "Admin Security", href: "/admin/admin-security", icon: KeyRound },
];

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 h-screen h-dvh bg-white dark:bg-[#070a14] text-[#52627A] dark:text-muted-foreground border-r border-[#DCE5F0] dark:border-border transition-all duration-200 z-40 select-none ${
        isCollapsed ? "w-[76px] px-2" : "w-[260px] px-3.5"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between py-4 px-1 min-h-[56px] border-b border-[#DCE5F0] dark:border-white/[0.06] shrink-0">
        <Link
          href="/admin/overview"
          className="flex items-center gap-2.5 rounded-xl p-1 text-left group outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Focentia Admin Control Center"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-none">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-[#0F172A] dark:text-foreground leading-none truncate">
                Admin Center
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase mt-1">
                Focentia
              </span>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 space-y-0.5">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin/overview" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center rounded-xl text-left transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isCollapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "w-full px-3 py-2 gap-2.5"
              } ${
                isActive
                  ? "bg-[#E7F0FF] dark:bg-blue-950/50 text-[#1E3A8A] dark:text-blue-300 font-bold"
                  : "text-[#52627A] dark:text-muted-foreground hover:bg-[#E8F1FC] dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-foreground font-medium"
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.75}
                className={`shrink-0 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}
              />
              {!isCollapsed && (
                <span className="text-[13px] leading-tight truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Back Button */}
      <div className="pt-3 pb-4 border-t border-[#DCE5F0] dark:border-white/[0.06] shrink-0">
        <Link
          href="/"
          className={`flex items-center rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isCollapsed
              ? "w-10 h-10 mx-auto justify-center"
              : "w-full px-3 py-2.5 gap-2.5"
          }`}
          title="Return to Focentia App"
        >
          <ArrowLeft size={16} strokeWidth={2} className="shrink-0 text-slate-500" />
          {!isCollapsed && <span>Return to App</span>}
        </Link>
      </div>
    </aside>
  );
}
