import { describe, expect, it, vi, beforeEach } from 'vitest';
import { confirmDeleteAccount } from './confirm-delete-account';
import { confirmLogout } from './confirm-logout';

const deleteAccountMock = vi.fn(async () => ({ ok: true as const }));
const logoutUserMock = vi.fn();
const alertMock = vi.fn();

vi.mock('react-native', () => ({
  Alert: {
    alert: (...args: unknown[]) => alertMock(...args),
  },
}));

vi.mock('@/src/services/auth-service', () => ({
  deleteAccount: () => deleteAccountMock(),
  logoutUser: () => logoutUserMock(),
}));

vi.mock('@/src/store/locale-store', () => ({
  useLocaleStore: {
    getState: () => ({
      t: (key: string) => key,
    }),
  },
}));

describe('account action confirmations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    alertMock.mockClear();
    deleteAccountMock.mockClear();
    logoutUserMock.mockClear();
  });

  it('shows two-step confirm before deleting account', async () => {
    const router = { replace: vi.fn() } as any;

    confirmDeleteAccount(router);

    expect(alertMock).toHaveBeenCalledTimes(1);
    const firstButtons = alertMock.mock.calls[0]?.[2] ?? [];
    const firstConfirm = firstButtons[1];
    expect(firstConfirm?.text).toBe('profiles.deleteAccountConfirm');
    firstConfirm?.onPress?.();

    expect(alertMock).toHaveBeenCalledTimes(2);
    const secondButtons = alertMock.mock.calls[1]?.[2] ?? [];
    const secondConfirm = secondButtons[1];
    expect(secondConfirm?.text).toBe('profiles.deleteAccountConfirm');
    secondConfirm?.onPress?.();

    await Promise.resolve();
    await Promise.resolve();

    expect(deleteAccountMock).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  it('logs out and redirects to login after confirm', () => {
    const router = { replace: vi.fn() } as any;

    confirmLogout(router);

    expect(alertMock).toHaveBeenCalledTimes(1);
    const buttons = alertMock.mock.calls[0]?.[2] ?? [];
    const confirm = buttons[1];
    expect(confirm?.text).toBe('profiles.logoutConfirm');
    confirm?.onPress?.();

    expect(logoutUserMock).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
