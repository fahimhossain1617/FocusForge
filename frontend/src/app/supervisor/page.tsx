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
  Lock,
  Star,
  Calendar,
  Users,
  MapPin
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

interface SupervisorUser {
  id: string;
  identifier: string;
  email: string;
  displayName?: string;
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  country?: string;
  city?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface SupervisorReview {
  id: string;
  userId: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  displayName: string;
  fullName: string;
  email: string;
}

export default function SupervisorPortal() {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const { showToast } = useAppContext();

  const [isSupervisor, setIsSupervisor] = useState<boolean | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<"tickets" | "users" | "reviews">("tickets");

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Users state
  const [users, setUsers] = useState<SupervisorUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Reviews state
  const [reviews, setReviews] = useState<SupervisorReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewSearchQuery, setReviewSearchQuery] = useState("");

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

  // Load users
  const fetchUsers = useCallback(async () => {
    if (!isSupervisor) return;
    setLoadingUsers(true);
    try {
      const data = await fetchBackend<SupervisorUser[]>("/api/supervisor/users?limit=100");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isSupervisor]);

  // Load reviews
  const fetchReviews = useCallback(async () => {
    if (!isSupervisor) return;
    setLoadingReviews(true);
    try {
      const data = await fetchBackend<SupervisorReview[]>("/api/supervisor/reviews?limit=100");
      setReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Failed to load reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  }, [isSupervisor]);

  useEffect(() => {
    if (isSupervisor) {
      if (activeTab === "tickets") {
        fetchTickets();
        const interval = setInterval(fetchTickets, 15000);
        return () => clearInterval(interval);
      } else if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "reviews") {
        fetchReviews();
      }
    }
  }, [isSupervisor, activeTab, fetchTickets, fetchUsers, fetchReviews]);

  // Load ticket details and replies
  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setInternalNotesText(ticket.internalNotes || "");
    setReplyText("");
    setLoadingReplies(true);

    try {
      if (!ticket.readBySupervisor) {
        await fetchBackend(`/api/supervisor/tickets/${ticket.id}`, {
          method: "PATCH",
          body: JSON.stringify({ readBySupervisor: true }),
        });
        setTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? { ...t, readBySupervisor: true } : t))
        );
      }

      const replyData = await fetchBackend<TicketReply[]>(`/api/supervisor/tickets/${ticket.id}/replies`);
      setReplies(Array.isArray(replyData) ? replyData : []);
    } catch (err: any) {
      showToast("Error loading ticket thread", "error");
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleUpdateStatus = async (newStatus: Ticket["status"]) => {
    if (!selectedTicket) return;
    try {
      await fetchBackend(`/api/supervisor/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );
      showToast(`Status updated to ${newStatus.replace("_", " ")}`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update status", "error");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;
    setSavingNotes(true);
    try {
      await fetchBackend(`/api/supervisor/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ internalNotes: internalNotesText }),
      });
      setSelectedTicket((prev) => (prev ? { ...prev, internalNotes: internalNotesText } : null));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, internalNotes: internalNotesText } : t))
      );
      showToast("Internal notes saved", "success");
    } catch (err: any) {
      showToast("Failed to save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await fetchBackend<TicketReply>(`/api/supervisor/tickets/${selectedTicket.id}/replies`, {
        method: "POST",
        body: JSON.stringify({
          message: replyText.trim(),
          senderName: user?.displayName || user?.fullName || "Supervisor",
        }),
      });

      setReplies((prev) => [...prev, res]);
      setReplyText("");
      showToast("Reply sent and email delivered to customer", "success");

      if (selectedTicket.status === "new" || selectedTicket.status === "in_review") {
        handleUpdateStatus("in_progress");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to send reply", "error");
    } finally {
      setSendingReply(false);
    }
  };

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

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const q = userSearchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q) ||
        u.country?.toLowerCase().includes(q)
    );
  }, [users, userSearchQuery]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (!reviewSearchQuery.trim()) return reviews;
    const q = reviewSearchQuery.toLowerCase();
    return reviews.filter(
      (r) =>
        r.comment?.toLowerCase().includes(q) ||
        r.displayName?.toLowerCase().includes(q) ||
        r.fullName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
    );
  }, [reviews, reviewSearchQuery]);

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
        <div className="max-w-md w-full p-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] text-center shadow-none">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Supervisor Access Required</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            This management console is restricted to designated Focentia Supervisors and Administrators.
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
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
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
                Focentia Control Room
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Real-time supervision, personal info, and user feedback</p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-primary text-white shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Support Tickets ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-primary text-white shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            User Profiles ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "reviews"
                ? "bg-primary text-white shadow-xs"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            User Reviews ({reviews.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === "tickets") fetchTickets();
              if (activeTab === "users") fetchUsers();
              if (activeTab === "reviews") fetchReviews();
            }}
            disabled={loadingTickets || loadingUsers || loadingReviews}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs font-medium hover:opacity-80 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets || loadingUsers || loadingReviews ? "animate-spin text-primary" : ""}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] pl-2 border-l border-[var(--color-border)]">
            <User className="w-4 h-4 text-primary" />
            <span>{user?.displayName || user?.fullName || "Supervisor"}</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TAB 1: SUPPORT TICKETS (Master-Detail)                                    */}
      {/* ========================================================================= */}
      {activeTab === "tickets" && (
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
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                >
                  <option value="all">All Types</option>
                  <option value="report">Problem/Bug</option>
                  <option value="contact">Contact</option>
                  <option value="feedback">Feedback</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="in_review">In Review</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                >
                  <option value="all">Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-primary focus:ring-0"
                />
                <span>Show unread tickets only</span>
              </label>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
              {loadingTickets ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--color-text-muted)]">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No tickets found matching filters.
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  const isUnread = !t.readBySupervisor;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-4 transition cursor-pointer hover:bg-[var(--color-bg-secondary)] relative ${
                        isSelected ? "bg-primary/5 border-l-4 border-primary" : ""
                      }`}
                    >
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary absolute top-4 right-4" title="Unread" />
                      )}
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--color-text-muted)]">
                        <span className="font-mono font-semibold text-primary">{t.ticketNumber}</span>
                        <span>•</span>
                        <span className="capitalize">{t.type}</span>
                        <span>•</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-semibold truncate text-[var(--color-text-primary)]">{t.subject}</h4>
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">{t.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            t.status === "new"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : t.status === "in_progress"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : t.status === "resolved"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {t.name || t.email || (t.isGuest ? "Guest User" : "User")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Side: Ticket Thread & Actions */}
          <main className="flex-1 flex flex-col bg-[var(--color-bg-primary)] overflow-y-auto">
            {selectedTicket ? (
              <div className="p-6 max-w-4xl w-full mx-auto space-y-6">
                {/* Header card */}
                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-primary">{selectedTicket.ticketNumber}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">• {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{selectedTicket.subject}</h2>
                    </div>

                    {/* Status switcher */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-[var(--color-text-muted)]">Status:</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        className="p-1.5 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-medium text-[var(--color-text-primary)]"
                      >
                        <option value="new">New</option>
                        <option value="in_review">In Review</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Sender details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[var(--color-text-muted)] text-[11px]">Sender</div>
                      <div className="font-medium text-[var(--color-text-primary)] mt-0.5">
                        {selectedTicket.name || (selectedTicket.isGuest ? "Guest User" : "Registered User")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--color-text-muted)] text-[11px]">Email / Contact</div>
                      <div className="font-medium text-[var(--color-text-primary)] mt-0.5 truncate">
                        {selectedTicket.email || "None (guest)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--color-text-muted)] text-[11px]">Account Type</div>
                      <div className="font-medium text-[var(--color-text-primary)] mt-0.5">
                        {selectedTicket.isGuest ? "Guest" : "Authenticated"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--color-text-muted)] text-[11px]">Language / Version</div>
                      <div className="font-medium text-[var(--color-text-primary)] mt-0.5">
                        {selectedTicket.language} • {selectedTicket.appVersion || "v2.0"}
                      </div>
                    </div>
                  </div>

                  {/* Original message */}
                  <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.message}
                  </div>
                </div>

                {/* Internal Notes card */}
                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      Supervisor Internal Notes (Private)
                    </h3>
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-3 py-1 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs font-semibold hover:opacity-80 transition disabled:opacity-50"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={internalNotesText}
                    onChange={(e) => setInternalNotesText(e.target.value)}
                    placeholder="Add internal notes visible only to supervisors..."
                    className="w-full p-3 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Thread / Replies card */}
                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Customer Communication Thread
                  </h3>

                  {loadingReplies ? (
                    <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                      Loading thread...
                    </div>
                  ) : replies.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                      No replies sent yet. Send the first message to the user below.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {replies.map((r) => (
                        <div
                          key={r.id}
                          className={`p-3.5 rounded-xl text-xs space-y-1 ${
                            r.senderRole === "supervisor"
                              ? "bg-primary/10 border border-primary/20 ml-6"
                              : "bg-[var(--color-bg-secondary)] border border-[var(--color-border)] mr-6"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{r.senderName} ({r.senderRole})</span>
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-xs shadow hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER PROFILES & PERSONAL DETAILS (Point 6)                         */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Registered User Directory & Personal Information
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Direct supervisor view of user account information, contact details, and profiles.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search user name, email, phone..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-20 text-center text-xs text-[var(--color-text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading user profiles from database...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-sm text-[var(--color-text-muted)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No user profiles found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] flex flex-col justify-between gap-4 shadow-none transition hover:border-primary/40"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar / Initial */}
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={u.fullName || u.displayName || "Avatar"}
                        className="w-14 h-14 rounded-full object-cover border border-primary/20 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0">
                        {(u.fullName || u.displayName || u.email || "U")[0].toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                          {u.fullName || u.displayName || "Unnamed User"}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                          Verified
                        </span>
                      </div>

                      {u.displayName && (
                        <p className="text-xs text-primary font-medium mt-0.5">@{u.displayName}</p>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{u.email || u.identifier}</span>
                      </div>

                      {u.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-1">
                          <Smartphone className="w-3.5 h-3.5 shrink-0" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[var(--color-border)] text-[11px]">
                    <div>
                      <span className="text-[var(--color-text-muted)] block">Date of Birth:</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {u.dob || "Not specified"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[var(--color-text-muted)] block">Gender:</span>
                      <span className="font-semibold text-[var(--color-text-primary)] capitalize">
                        {u.gender || "Not specified"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[var(--color-text-muted)] block">Location:</span>
                      <span className="font-semibold text-[var(--color-text-primary)] truncate block">
                        {[u.city, u.country].filter(Boolean).join(", ") || "Not specified"}
                      </span>
                    </div>
                  </div>

                  {u.bio && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold block text-[10px] uppercase text-[var(--color-text-muted)] mb-0.5">Bio:</span>
                      {u.bio}
                    </div>
                  )}

                  <div className="text-[10.5px] text-[var(--color-text-muted)] pt-1 flex items-center justify-between">
                    <span>ID: <code className="font-mono text-[9.5px]">{u.id.substring(0, 12)}...</code></span>
                    <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USER REVIEWS & RATINGS (Point 2)                                   */}
      {/* ========================================================================= */}
      {activeTab === "reviews" && (
        <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                Customer Experience Reviews & Ratings
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Real-time feedback submitted by users via the in-app Focentia review prompt.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search reviews or feedback..."
                value={reviewSearchQuery}
                onChange={(e) => setReviewSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {loadingReviews ? (
            <div className="py-20 text-center text-xs text-[var(--color-text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading reviews from database...
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-20 text-center text-sm text-[var(--color-text-muted)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <Star className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
              No customer reviews submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((r) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] space-y-2.5 shadow-none"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= (r.rating || 0)
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300 dark:text-zinc-600"
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold ml-1 text-[var(--color-text-primary)]">
                        {r.rating ? `${r.rating}/5 Stars` : "No rating"}
                      </span>
                    </div>

                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {r.comment && (
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                      "{r.comment}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {r.fullName || r.displayName || "Focentia User"}
                      </span>
                      {r.email && <span>({r.email})</span>}
                    </div>
                    {r.userId && (
                      <span className="font-mono text-[10px]">User: {r.userId.substring(0, 8)}...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
