"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Menu,
  X,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { ADMIN_NAV_ITEMS } from "./AdminSidebar";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const effectivePath = pendingHref || pathname;
  const activeItem = ADMIN_NAV_ITEMS.find(
    (item) => effectivePath === item.href || (item.href !== "/admin/overview" && effectivePath.startsWith(item.href))
  ) || ADMIN_NAV_ITEMS[0];

  return (
    <>
      <header
        className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-white/95 dark:bg-[#0A0E1A]/95 border-b border-[#DCE5F0] dark:border-white/[0.08] backdrop-blur-xl shrink-0 select-none min-h-[52px]"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 -ml-1 rounded-lg"
          aria-label="Back to Focentia"
        >
          <ArrowLeft size={16} />
          <span>App</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <ShieldCheck size={14} />
          </div>
          <span className="font-bold text-sm text-[#0F172A] dark:text-foreground">
            {activeItem.label}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
          aria-label={isOpen ? "Close menu" : "Open sections menu"}
        >
          {isOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="w-full max-h-[80vh] bg-white dark:bg-[#0A0E1A] rounded-t-3xl border-t border-[#DCE5F0] dark:border-white/10 flex flex-col p-4 shadow-xl overflow-hidden"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 16px))" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <span className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                Admin Sections (17)
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isCurrent = pathname === item.href || (item.href !== "/admin/overview" && pathname.startsWith(item.href));
                const isPending = pendingHref === item.href;
                const isActive = isPending || (pendingHref === null && isCurrent);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={true}
                    onClick={() => {
                      setPendingHref(item.href);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {isPending ? (
                      <Loader2 size={17} className="animate-spin text-blue-600 shrink-0" />
                    ) : (
                      <Icon size={17} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    )}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
