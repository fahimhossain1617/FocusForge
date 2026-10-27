"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { adminApiClient } from "../services/adminApiClient";
import { AdminMeResponse, AdminReleaseNotice } from "../types/admin";
import { useAuth } from "./AuthContext";

export type AdminAuthStatus = "loading" | "authorized" | "denied" | "unconnected";

interface AdminAuthContextType {
  isAdmin: boolean;
  status: AdminAuthStatus;
  adminData: AdminMeResponse | null;
  releaseNotice: AdminReleaseNotice | null;
  checkAdminStatus: () => Promise<void>;
  dismissReleaseNotice: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  status: "loading",
  adminData: null,
  releaseNotice: null,
  checkAdminStatus: async () => {},
  dismissReleaseNotice: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [status, setStatus] = useState<AdminAuthStatus>("loading");
  const [adminData, setAdminData] = useState<AdminMeResponse | null>(null);
  const [releaseNotice, setReleaseNotice] = useState<AdminReleaseNotice | null>(null);

  const checkAdminStatus = useCallback(async () => {
    // DEFAULT = DENY
    // If not authenticated or in guest mode, immediately deny without leaking
    if (authLoading) return;
    if (!user || isGuest) {
      setIsAdmin(false);
      setStatus("denied");
      setAdminData(null);
      setReleaseNotice(null);
      return;
    }

    try {
      // Check ONLY with server endpoint GET /api/admin/me
      const res = await adminApiClient.getMe();
      if (res.success && res.data && res.data.isAdmin) {
        setIsAdmin(true);
        setStatus("authorized");
        setAdminData(res.data);

        // Fetch release status to see if there is an admin-only release notice
        try {
          const relRes = await adminApiClient.getRelease();
          if (relRes.success && relRes.data) {
            const rel = relRes.data;
            if (rel.lastSeenAdminRelease !== rel.currentAppVersion && rel.changelogItems.length > 0) {
              setReleaseNotice({
                version: rel.currentAppVersion,
                releasedAt: rel.deployedAt || new Date().toISOString(),
                summary: rel.changelogItems[0] || "New updates deployed to production.",
                isNew: true,
              });
            }
          }
        } catch {}
      } else if (res.status === "not_connected") {
        // Backend not implemented yet (Part 2 pending)
        setIsAdmin(false);
        setStatus("unconnected");
        setAdminData(null);
      } else {
        setIsAdmin(false);
        setStatus("denied");
        setAdminData(null);
      }
    } catch {
      setIsAdmin(false);
      setStatus("denied");
      setAdminData(null);
    }
  }, [user, isGuest, authLoading]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const dismissReleaseNotice = async () => {
    if (releaseNotice) {
      try {
        await adminApiClient.markReleaseSeen(releaseNotice.version);
      } catch {}
      setReleaseNotice(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdmin,
        status,
        adminData,
        releaseNotice,
        checkAdminStatus,
        dismissReleaseNotice,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
