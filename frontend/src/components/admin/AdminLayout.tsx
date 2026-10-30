"use client";

import React, { useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { AdminLoadingView, AdminDeniedView } from "./AdminStateViews";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { AdminReleaseBanner } from "./AdminReleaseBanner";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, status } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Default = DENY: While checking, show loading with 3D Morphing Orb
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F3F7FC] dark:bg-[#0A0E1A] flex items-center justify-center">
        <AdminLoadingView fullScreen message="Verifying admin credentials..." />
      </div>
    );
  }

  // If not admin, show neutral access denied (never leak that admin exists)
  if (!isAdmin && status !== "unconnected") {
    return (
      <div className="min-h-screen bg-[#F3F7FC] dark:bg-[#0A0E1A] flex items-center justify-center">
        <AdminDeniedView />
      </div>
    );
  }

  return (
    <div className="flex h-screen h-dvh max-h-screen max-h-dvh w-full overflow-hidden bg-[#F3F7FC] dark:bg-[#0A0E1A] text-foreground select-none">
      {/* Desktop Sidebar */}
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-[margin] duration-200 ${
          isSidebarCollapsed ? "md:ml-[76px]" : "md:ml-[260px]"
        }`}
      >
        {/* Release notice banner (admin-only) */}
        <AdminReleaseBanner />

        {/* Mobile Header */}
        <AdminMobileNav />

        {/* Page Viewport - Renders children directly for instant, snappy SPA transitions */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
