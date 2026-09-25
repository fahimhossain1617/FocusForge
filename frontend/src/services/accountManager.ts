/**
 * FocusForge Account & Session Management Service
 * Handles unlimited multi-account registry, remembered account selection,
 * and permanent one-way guest transition enforcement.
 */

export interface RememberedAccount {
  id: string; // Supabase Auth user UUID
  email: string;
  displayName: string;
  fullName?: string;
  avatarUrl?: string | null;
  authMethod: 'email' | 'google' | 'phone';
  lastUsedAt: string; // ISO string
}

const REMEMBERED_ACCOUNTS_KEY = 'focusforge_remembered_accounts';
const GUEST_DISABLED_KEY = 'focusforge_guest_permanently_disabled';
const GUEST_WARNING_SEEN_KEY = 'focusforge_guest_warning_acknowledged';

export const accountManager = {
  /**
   * Returns all remembered accounts from local storage, sorted by most recently used.
   * No application-imposed maximum limit.
   */
  getRememberedAccounts(): RememberedAccount[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime());
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Adds or updates a remembered account entry.
   * Only stores non-sensitive profile information for the switcher UI.
   */
  saveRememberedAccount(account: RememberedAccount): void {
    if (typeof window === 'undefined' || !account.id) return;
    try {
      const current = this.getRememberedAccounts();
      const filtered = current.filter((acc) => acc.id !== account.id && acc.email.toLowerCase() !== account.email.toLowerCase());
      const updated: RememberedAccount[] = [
        {
          id: account.id,
          email: account.email.trim().toLowerCase(),
          displayName: account.displayName || account.fullName || account.email.split('@')[0] || 'User',
          fullName: account.fullName,
          avatarUrl: account.avatarUrl || null,
          authMethod: account.authMethod || 'email',
          lastUsedAt: new Date().toISOString(),
        },
        ...filtered,
      ];
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[accountManager] Failed to save remembered account:', err);
    }
  },

  /**
   * Removes a remembered account entry from the switcher list.
   * Does NOT delete the user in Supabase or remove their database records.
   */
  removeRememberedAccount(accountId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getRememberedAccounts();
      const updated = current.filter((acc) => acc.id !== accountId);
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[accountManager] Failed to remove remembered account:', err);
    }
  },

  /**
   * Checks whether Guest Mode has been permanently disabled for this browser profile.
   */
  isGuestModePermanentlyDisabled(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(GUEST_DISABLED_KEY) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Permanently disables Guest Mode for this browser profile after the first successful login.
   */
  setGuestModePermanentlyDisabled(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GUEST_DISABLED_KEY, 'true');
    } catch (err) {
      console.warn('[accountManager] Failed to set guest mode disabled:', err);
    }
  },

  /**
   * Checks if user has acknowledged or seen the first-time guest transition warning.
   */
  hasSeenGuestTransitionWarning(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(GUEST_WARNING_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marks that the user acknowledged the guest mode transition dialog.
   */
  setSeenGuestTransitionWarning(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GUEST_WARNING_SEEN_KEY, 'true');
    } catch {}
  },
};
