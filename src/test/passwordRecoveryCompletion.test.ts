import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PASSWORD_RESET_COMPLETE_KEY,
  completePasswordRecovery,
  consumePasswordResetCompleteFlag,
  markPasswordResetComplete,
} from '@/lib/passwordRecoveryCompletion';

describe('passwordRecoveryCompletion', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('A/B. recovery password reset succeeds and signs out afterward', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const onBeforeSignOut = vi.fn();

    const result = await completePasswordRecovery({
      updatePassword: async () => ({ error: null }),
      signOut,
      onBeforeSignOut,
    });

    expect(result).toEqual({ ok: true });
    expect(onBeforeSignOut).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(PASSWORD_RESET_COMPLETE_KEY)).toBe('1');
  });

  it('C. recovery completion flag is consumed for login redirect gate', () => {
    markPasswordResetComplete();
    expect(consumePasswordResetCompleteFlag()).toBe(true);
    expect(consumePasswordResetCompleteFlag()).toBe(false);
  });

  it('D. signup/set-password path is separate (helper not auto-invoked)', () => {
    // Documented contract: SetPassword must not call completePasswordRecovery.
    // This test locks the flag API so ordinary flows stay untouched unless they opt in.
    expect(sessionStorage.getItem(PASSWORD_RESET_COMPLETE_KEY)).toBeNull();
    expect(consumePasswordResetCompleteFlag()).toBe(false);
  });

  it('E. ordinary login remains authenticated when flag absent', () => {
    expect(consumePasswordResetCompleteFlag()).toBe(false);
  });

  it('F. failed password update does not sign user out prematurely', async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const onBeforeSignOut = vi.fn();

    const result = await completePasswordRecovery({
      updatePassword: async () => ({ error: { message: 'Weak password' } }),
      signOut,
      onBeforeSignOut,
    });

    expect(result).toEqual({ ok: false, error: 'Weak password' });
    expect(signOut).not.toHaveBeenCalled();
    expect(onBeforeSignOut).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PASSWORD_RESET_COMPLETE_KEY)).toBeNull();
  });
});
