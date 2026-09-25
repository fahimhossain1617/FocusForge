"use client";

import React, { useEffect } from "react";
import { User, Check, Plus, Trash2, X, Users, ArrowRight } from "lucide-react";
import { RememberedAccount } from "../../services/accountManager";
import { useAnimateExit } from "../../hooks/useAnimateExit";

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  accounts: RememberedAccount[];
  onSelectAccount: (account: RememberedAccount) => void;
  onAddNewAccount: () => void;
  onRemoveAccount: (accountId: string) => void;
}

export default function AccountSwitcherModal({
  isOpen,
  onClose,
  currentUserId,
  accounts,
  onSelectAccount,
  onAddNewAccount,
  onRemoveAccount,
}: AccountSwitcherModalProps) {
  const modalAnim = useAnimateExit({ isOpen, durationMs: 180 });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!modalAnim.shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
        modalAnim.isExiting ? "motion-exit-fade" : "motion-overlay"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-switcher-title"
    >
      <div
        className={`user-menu-dropdown-box relative w-full max-w-md rounded-3xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#111216] p-6 text-left shadow-2xl ${
          modalAnim.isExiting ? "motion-exit-reveal" : "motion-scale-in"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h3 id="account-switcher-title" className="text-base font-bold text-[#0F172A] dark:text-foreground">
                Switch Account
              </h3>
              <p className="text-[11px] text-[#52627A] dark:text-muted-foreground">
                Select an account or add another workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#52627A] dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Accounts List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {accounts.map((account) => {
            const isActive = account.id === currentUserId;
            return (
              <div
                key={account.id}
                className={`group flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800/50"
                    : "bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/70 dark:border-white/[0.06] hover:border-blue-400/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectAccount(account)}
                  disabled={isActive}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default"
                >
                  {/* Avatar */}
                  {account.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt={account.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#223A5E] text-white flex items-center justify-center text-sm font-bold uppercase ring-2 ring-blue-500/30 shrink-0">
                      {account.displayName ? account.displayName[0] : <User size={16} />}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#0F172A] dark:text-foreground truncate">
                        {account.displayName}
                      </p>
                      {isActive && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.2 rounded-md">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#52627A] dark:text-muted-foreground truncate">
                      {account.email}
                    </p>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isActive ? (
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Check size={14} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectAccount(account)}
                      className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Switch to this account"
                      aria-label="Switch to this account"
                    >
                      <ArrowRight size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemoveAccount(account.id)}
                    className="p-1.5 rounded-lg text-[#52627A] dark:text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-60 hover:opacity-100"
                    title="Remove from device switcher"
                    aria-label="Remove from device switcher"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Another Account Button */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] dark:border-white/10">
          <button
            type="button"
            onClick={onAddNewAccount}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Another Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
