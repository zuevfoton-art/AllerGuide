import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmAction, confirmDestructiveAction } from './confirm-action';

const { alertMock, confirmMock, platformMock } = vi.hoisted(() => ({
  alertMock: vi.fn(),
  confirmMock: vi.fn(),
  platformMock: { OS: 'web' },
}));

vi.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => alertMock(...args) },
  Platform: platformMock,
}));

const options = {
  title: 'Delete entry?',
  message: 'This cannot be undone.',
  cancelLabel: 'Cancel',
  confirmLabel: 'Delete',
};

describe('confirmAction', () => {
  beforeEach(() => {
    alertMock.mockClear();
    confirmMock.mockReset();
    platformMock.OS = 'web';
    vi.stubGlobal('confirm', confirmMock);
  });

  it('executes the action only after web confirmation', () => {
    const onConfirm = vi.fn();
    confirmMock.mockReturnValueOnce(false).mockReturnValueOnce(true);

    confirmAction({ ...options, onConfirm });
    expect(onConfirm).not.toHaveBeenCalled();

    confirmAction({ ...options, onConfirm });
    expect(confirmMock).toHaveBeenLastCalledWith('Delete entry?\n\nThis cannot be undone.');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('preserves native destructive alert behavior', () => {
    const onConfirm = vi.fn();
    platformMock.OS = 'android';

    confirmDestructiveAction({ ...options, onConfirm });

    expect(alertMock).toHaveBeenCalledTimes(1);
    const buttons = alertMock.mock.calls[0]?.[2] ?? [];
    expect(buttons).toMatchObject([
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive' },
    ]);
    buttons[1]?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('reports rejected actions', async () => {
    const error = new Error('delete failed');
    const onError = vi.fn();
    confirmMock.mockReturnValue(true);

    confirmAction({
      ...options,
      onConfirm: async () => {
        throw error;
      },
      onError,
    });
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error));
  });
});
