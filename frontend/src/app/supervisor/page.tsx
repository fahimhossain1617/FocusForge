"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchBackend } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useAppContext } from "@/context/AppContext";
import { 
  Shield, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  RefreshCw, 
  User, 
  Mail, 
  Smartphone, 
  Globe, 
  Check, 
  ChevronRight,
  Inbox,
  Sparkles,
  Lock
} from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: string;
  type: "report" | "contact" | "feedback" | "problem";
  category?: string;
  subject: string;
  message: string;
  attachments?: string[];
  userId?: string | null;
  name?: string;
  email?: string;
  isGuest: boolean;
  appVersion?: string;
  browserInfo?: string;
  language: string;
  status: "new" | "in_review" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo?: string | null;
  internalNotes?: string;
  readBySupervisor: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  senderRole: "supervisor" | "user" | "system";
  senderId?: string | null;
  senderName: string;
  message: string;
  createdAt: string;
}

export default function SupervisorPortal() {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const { showToast } = useAppContext();

  const [isSupervisor, setIsSupervisor] = useState<boolean | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [internalNotesText, setInternalNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Check role
  useEffect(() => {
    async function verifyRole() {
      if (authLoading) return;
      if (!user || isGuest) {
        setIsSupervisor(false);
        setLoadingRole(false);
        return;
      }

      try {
        const res = await fetchBackend<{ isSupervisor: boolean; roles: string[] }>("/api/supervisor/role");
        setIsSupervisor(Boolean(res?.isSupervisor));
      } catch {
        setIsSupervisor(false);
      } finally {
        setLoadingRole(false);
      }
    }
    verifyRole();
  }, [user, isGuest, authLoading]);

  // Load tickets
  const fetchTickets = useCallback(async () => {
    if (!isSupervisor) return;
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (unreadOnly) params.set("unread", "true");
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const data = await fetchBackend<Ticket[]>(`/api/supervisor/tickets?${params.toString()}`);
      setTickets(Array.isArray(data) ? data : []);

      // If selected ticket is updated in the list, sync it
      if (selectedTicket) {
        const updated = (data || []).find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to load support tickets", "error");
    } finally {
      setLoadingTickets(false);
    }
  }, [isSupervisor, typeFilter, statusFilter, priorityFilter, unreadOnly, searchQuery, selectedTicket, showToast]);

  useEffect(() => {
    if (isSupervisor) {
      fetchTickets();
      const interval = setInterval(fetchTickets, 15000); // Poll every 15s for real-time updates
      return () => clearInterval(interval);
    }
  }, [isSupervisor, fetchTickets]);

  // Load ticket details and replies
  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setInternalNotesText(ticket.internalNotes || "");
    setReplyText("");
    setLoadingReplies(true);

    try {
      // Mark ticket as read if unread
      if (!ticket.readBySupervisor) {
        await fetchBackend(`/api/supervisor/tickets/${ticket.id}`, {
          method: "PATCH",
          body: JSON.stringify({ readBySupervisor: true }),
        });
        setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, readBySupervisor: true } : t)));
      }

      const res = await fetchBackend<{ ticket: Ticket; replies: TicketReply[] }>(`/api/supervisor/tickets/${ticket.id}`);
      if (res && res.ticket) {
        setSelectedTicket(res.ticket);
        setReplies(res.replies || []);
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to load ticket thread", "error");
    } finally {
      setLoadingReplies(false);
    }
  };

  // Update status or priority
  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    if (!selectedTicket) return;
    try {
      const updated = await fetchBackend<Ticket>(`/api/supervisor/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Ticket updated successfully", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update ticket", "error");
    }
  };

  // Save internal notes
  const handleSaveInternalNotes = async () => {
    if (!selectedTicket) return;
    setSavingNotes(true);
    try {
      const updated = await fetchBackend<Ticket>(`/api/supervisor/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ internalNotes: internalNotesText }),
      });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast("Internal notes saved", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save internal notes", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  // Send supervisor reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetchBackend<{ success: boolean; reply: TicketReply }>(
        `/api/supervisor/tickets/${selectedTicket.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({
            message: replyText.trim(),
            supervisorName: user?.displayName || user?.fullName || "Supervisor",
          }),
        }
      );

      if (res && res.reply) {
        setReplies((prev) => [...prev, res.reply]);
        setReplyText("");
        showToast("Reply sent to customer and saved to thread", "success");

        // If ticket is new, automatically advance status to in_progress
        if (selectedTicket.status === "new") {
          handleUpdateTicket({ status: "in_progress" });
        }
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to send reply", "error");
    } finally {
      setSendingReply(false);
    }
  };

  // Ticket counts
  const counts = useMemo(() => {
    const res = { total: tickets.length, newTickets: 0, report: 0, contact: 0, feedback: 0 };
    for (const t of tickets) {
      if (!t.readBySupervisor || t.status === "new") res.newTickets++;
      if (t.type === "report" || t.type === "problem") res.report++;
      else if (t.type === "contact") res.contact++;
      else if (t.type === "feedback") res.feedback++;
    }
    return res;
  }, [tickets]);

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span>Verifying supervisor authorization...</span>
        </div>
      </div>
    );
  }

  if (!isSupervisor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <div className="max-w-md w-full p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-center shadow-lg">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Supervisor Access Required</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            This management console is restricted to designated FocusForge Supervisors and Administrators.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium text-sm transition hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Application
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Top Navbar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition text-[var(--color-text-muted)]"
            title="Back to App"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg leading-none">Supervisor Portal</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                FocusForge Support Engine
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Real-time support ticket operations and customer reply</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTickets()}
            disabled={loadingTickets}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs font-medium hover:opacity-80 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] pl-2 border-l border-[var(--color-border)]">
            <User className="w-4 h-4 text-primary" />
            <span>{user?.displayName || user?.fullName || "Supervisor"}</span>
          </div>
        </div>
      </header>

      {/* Main Layout: Master-Detail view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Tickets List & Filter */}
        <aside className="w-full md:w-[420px] lg:w-[460px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-card)]">
          {/* Metrics summary */}
          <div className="p-4 border-b border-[var(--color-border)] grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="font-bold text-base text-primary">{counts.total}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Total</div>
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="font-bold text-base text-amber-500">{counts.newTickets}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Unread/New</div>
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="font-bold text-base text-rose-500">{counts.report}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Problems</div>
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-bg-secondary)]">
              <div className="font-bold text-base text-emerald-500">{counts.feedback}</div>
              <div className="text-[11px] text-[var(--color-text-muted)]">Feedback</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-[var(--color-border)] space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search ticket #, subject, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex gap-2 text-xs">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              >
                <option value="all">All Types</option>
                <option value="report">Problem Report</option>
                <option value="contact">Contact Support</option>
                <option value="feedback">Feedback & Ideas</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in_review">In Review</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-[var(--color-text-muted)]">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No tickets match criteria</p>
                <p className="text-xs mt-1">Try adjusting the filter options above.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                const isUnread = !t.readBySupervisor;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left p-4 transition flex flex-col gap-1.5 hover:bg-[var(--color-bg-secondary)]/60 ${
                      isSelected ? "bg-primary/10 border-l-4 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{t.ticketNumber}</span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unread" />
                        )}
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                          {t.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="font-semibold text-xs truncate">{t.subject}</div>

                    <div className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">
                      {t.message}
                    </div>

                    <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-[var(--color-border)]/50">
                      <span className="text-[var(--color-text-muted)] truncate max-w-[180px]">
                        {t.name || t.email || (t.isGuest ? "Guest" : "User")}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          t.status === "new"
                            ? "bg-amber-500/15 text-amber-500"
                            : t.status === "resolved"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-blue-500/15 text-blue-500"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: Ticket Details & Action Panel */}
        <main className="flex-1 flex flex-col bg-[var(--color-bg-primary)] overflow-y-auto">
          {selectedTicket ? (
            <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full space-y-6">
              {/* Header card */}
              <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-primary">{selectedTicket.ticketNumber}</span>
                      <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {selectedTicket.type}
                      </span>
                      {selectedTicket.category && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
                          {selectedTicket.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mt-1">{selectedTicket.subject}</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicket({ status: e.target.value as any })}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] capitalize"
                    >
                      <option value="new">New</option>
                      <option value="in_review">In Review</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdateTicket({ priority: e.target.value as any })}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] capitalize"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Metadata info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50 p-3 rounded-xl">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">Sender</div>
                    <div className="font-medium text-[var(--color-text-primary)] mt-0.5 truncate">
                      {selectedTicket.name || "Anonymous"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">Email</div>
                    <div className="font-medium text-[var(--color-text-primary)] mt-0.5 truncate">
                      {selectedTicket.email || "None provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">User Type</div>
                    <div className="font-medium text-[var(--color-text-primary)] mt-0.5">
                      {selectedTicket.isGuest ? "Guest User" : "Registered User"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[var(--color-text-muted)]">App Version</div>
                    <div className="font-medium text-[var(--color-text-primary)] mt-0.5">
                      {selectedTicket.appVersion || "1.0.0"}
                    </div>
                  </div>
                </div>

                {/* Original Message */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Customer Message</div>
                  <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Attachments / Screenshot */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Attachments</div>
                    <div className="flex flex-wrap gap-3">
                      {selectedTicket.attachments.map((att, idx) => (
                        <div key={idx} className="relative rounded-xl border border-[var(--color-border)] overflow-hidden max-w-xs">
                          {att.startsWith("data:image") || att.startsWith("http") ? (
                            <img src={att} alt="Attachment" className="max-h-48 object-contain bg-black/5" />
                          ) : (
                            <div className="p-3 text-xs font-mono">{att}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase text-amber-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Internal Supervisor Notes (Not visible to customer)
                  </div>
                  <button
                    onClick={handleSaveInternalNotes}
                    disabled={savingNotes}
                    className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-500 text-xs font-semibold hover:bg-amber-500/25 transition disabled:opacity-50"
                  >
                    {savingNotes ? "Saving..." : "Save Notes"}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={internalNotesText}
                  onChange={(e) => setInternalNotesText(e.target.value)}
                  placeholder="Add internal investigation notes, actions taken, or assignee info..."
                  className="w-full p-3 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Conversation Thread & Replies */}
              <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-sm space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Conversation Thread & Customer Replies
                </h3>

                {loadingReplies ? (
                  <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">Loading thread...</div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/50 rounded-xl">
                    No supervisor replies sent yet. Use the form below to respond to the customer.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies.map((r) => (
                      <div
                        key={r.id}
                        className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                          r.senderRole === "supervisor"
                            ? "bg-primary/10 border-primary/20 ml-6"
                            : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={r.senderRole === "supervisor" ? "text-primary" : ""}>
                            {r.senderName} ({r.senderRole})
                          </span>
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap">{r.message}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span>Reply will be sent via email to: <strong>{selectedTicket.email || "No email (in-app only)"}</strong></span>
                  </div>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the customer..."
                    className="w-full p-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-xs shadow hover:opacity-90 transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingReply ? "Sending Email & Saving..." : "Send Reply to Customer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[var(--color-text-muted)]">
              <Shield className="w-12 h-12 mb-3 text-primary/30" />
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Select a Support Ticket</h2>
              <p className="text-xs max-w-sm mt-1">
                Choose any ticket from the left panel to review submission details, write internal notes, or reply to the user.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
