"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Star, Clock, User, CheckCircle2, Save } from "lucide-react";
import { adminApiClient } from "../../../services/adminApiClient";
import { FeedbackTicket } from "../../../types/admin";
import { AdminLoadingView, AdminUnconnectedView, AdminErrorView } from "../AdminStateViews";

export function FeedbackDetailSection({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<FeedbackTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnconnected, setIsUnconnected] = useState(false);

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<FeedbackTicket["status"]>("new");
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnconnected(false);
    try {
      const res = await adminApiClient.getFeedbackDetail(ticketId);
      if (res.status === "not_connected") {
        setIsUnconnected(true);
      } else if (res.success && res.data) {
        setTicket(res.data);
        setNotes(res.data.internalNotes || "");
        setStatus(res.data.status);
      } else {
        setError(res.error || "Failed to load ticket detail");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to feedback API");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await adminApiClient.addFeedbackNotes(ticketId, notes);
      await adminApiClient.updateFeedbackStatus(ticketId, status);
      fetchDetail();
    } catch {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/feedback"
          className="p-1.5 rounded-xl border border-[#DCE5F0] dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Back to inbox"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-foreground">
            Ticket #{ticketId.slice(0, 8)}
          </h1>
          <p className="text-xs text-[#52627A] dark:text-muted-foreground mt-0.5">
            Channel: <strong className="capitalize">{ticket?.category || "Feedback"}</strong>
          </p>
        </div>
      </div>

      {loading && <AdminLoadingView message="Loading ticket..." />}
      {isUnconnected && (
        <AdminUnconnectedView endpoint={`/api/admin/feedback/${ticketId}`} onRetry={fetchDetail} />
      )}
      {error && !isUnconnected && (
        <AdminErrorView error={error} onRetry={fetchDetail} />
      )}

      {ticket && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-3">
              {ticket.subject && (
                <h2 className="text-lg font-bold text-[#111827] dark:text-foreground">
                  {ticket.subject}
                </h2>
              )}

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04] text-xs text-[#111827] dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {ticket.message}
              </div>

              {ticket.rating && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  <Star size={14} className="fill-amber-500" />
                  <span>Rating: {ticket.rating} out of 5 stars</span>
                </div>
              )}
            </div>

            {/* Internal Notes Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-[#111827] dark:text-foreground">
                Internal Administrative Notes
              </h3>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private staff notes, resolution summary, or triage logs..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSaving ? "Saving..." : "Save Status & Notes"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Metadata Column */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c101d] border border-[#DCE5F0] dark:border-white/10 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#111827] dark:text-foreground block mb-1">
                Ticket Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-[#DCE5F0] dark:border-white/10 text-xs text-[#111827] dark:text-foreground outline-none cursor-pointer"
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-xs">
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Submitter</span>
                <span className="font-semibold text-[#111827] dark:text-foreground">{ticket.userName}</span>
              </div>
              {ticket.userEmail && (
                <div>
                  <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Email</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">{ticket.userEmail}</span>
                </div>
              )}
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">User Type</span>
                <span className="capitalize">{ticket.userType}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">Submitted</span>
                <span>{new Date(ticket.submittedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#52627A] dark:text-muted-foreground block text-[11px]">App Version</span>
                <span className="font-mono">{ticket.appVersion}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
