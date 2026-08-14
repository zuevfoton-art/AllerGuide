import { Alert, Platform } from 'react-native';

export type ConfirmDestructiveActionOptions = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onError?: (error: unknown) => void;
};

function executeConfirmation(
  onConfirm: ConfirmDestructiveActionOptions['onConfirm'],
  onError?: ConfirmDestructiveActionOptions['onError'],
): void {
  try {
    void Promise.resolve(onConfirm()).catch((error: unknown) => {
      onError?.(error);
    });
  } catch (error) {
    onError?.(error);
  }
}

export function confirmDestructiveAction({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onError,
}: ConfirmDestructiveActionOptions): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) {
      executeConfirmation(onConfirm, onError);
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => executeConfirmation(onConfirm, onError),
    },
  ]);
}
