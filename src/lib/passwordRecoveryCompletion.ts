/**
 * Password-recovery completion helpers.
 * Used only by /reset-password after a successful updateUser({ password }).
 * Signup /set-password must NOT use this path (it keeps the session).
 */

export const PASSWORD_RESET_COMPLETE_KEY = 'heirway_password_reset_complete';

export function markPasswordResetComplete(): void {
  try {
    sessionStorage.setItem(PASSWORD_RESET_COMPLETE_KEY, '1');
  } catch {
    /* ignore storage errors */
  }
}

/** Returns true once if a recovery completion just happened (consumes the flag). */
export function consumePasswordResetCompleteFlag(): boolean {
  try {
    const value = sessionStorage.getItem(PASSWORD_RESET_COMPLETE_KEY);
    if (!value) return false;
    sessionStorage.removeItem(PASSWORD_RESET_COMPLETE_KEY);
    return true;
  } catch {
    return false;
  }
}

export type RecoveryCompletionDeps = {
  updatePassword: () => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<{ error: { message: string } | null }>;
  onPasswordUpdated?: () => void;
  /** Called after successful password update, before sign-out (e.g. mark UI success). */
  onBeforeSignOut?: () => void;
};

/**
 * Canonical recovery completion:
 * 1) update password
 * 2) on failure → do not sign out
 * 3) on success → notify, mark flag, sign out recovery session
 */
export async function completePasswordRecovery(
  deps: RecoveryCompletionDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await deps.updatePassword();
  if (error) {
    return { ok: false, error: error.message || 'Failed to update password' };
  }

  deps.onPasswordUpdated?.();
  deps.onBeforeSignOut?.();
  markPasswordResetComplete();

  const { error: signOutError } = await deps.signOut();
  if (signOutError) {
    // Password already changed; still force login gate via flag + caller navigation.
    return { ok: true };
  }

  return { ok: true };
}
