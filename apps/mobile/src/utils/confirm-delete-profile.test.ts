import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmDeleteProfile } from './confirm-delete-profile';

const { alertMock, confirmMock, platformMock } = vi.hoisted(() => ({
  alertMock: vi.fn(),
  confirmMock: vi.fn(),
  platformMock: { OS: 'web' },
}));

vi.mock('react-native', () => ({
  Alert: {
    alert: (...args: unknown[]) => alertMock(...args),
  },
  Platform: platformMock,
}));

describe('confirmDeleteProfile', () => {
  beforeEach(() => {
    alertMock.mockClear();
    confirmMock.mockReset();
    platformMock.OS = 'web';
    vi.stubGlobal('confirm', confirmMock);
  });

  it('deletes after browser confirmation on web', () => {
    const onConfirm = vi.fn();
    confirmMock.mockReturnValue(true);

    confirmDeleteProfile({
      title: 'Delete profile',
      message: 'Delete Runtime QA?',
      cancelLabel: 'Cancel',
      deleteLabel: 'Delete',
      onConfirm,
    });

    expect(confirmMock).toHaveBeenCalledWith('Delete profile\n\nDelete Runtime QA?');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('keeps the profile when browser confirmation is cancelled', () => {
    const onConfirm = vi.fn();
    confirmMock.mockReturnValue(false);

    confirmDeleteProfile({
      title: 'Delete profile',
      message: 'Delete Runtime QA?',
      cancelLabel: 'Cancel',
      deleteLabel: 'Delete',
      onConfirm,
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('preserves native destructive Alert behavior', () => {
    const onConfirm = vi.fn();
    platformMock.OS = 'ios';

    confirmDeleteProfile({
      title: 'Delete profile',
      message: 'Delete Runtime QA?',
      cancelLabel: 'Cancel',
      deleteLabel: 'Delete',
      onConfirm,
    });

    expect(alertMock).toHaveBeenCalledTimes(1);
    const buttons = alertMock.mock.calls[0]?.[2] ?? [];
    expect(buttons).toMatchObject([
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
    ]);

    buttons[1]?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
