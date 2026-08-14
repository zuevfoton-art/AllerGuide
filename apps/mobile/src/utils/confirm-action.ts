import { Alert, Platform } from 'react-native';

export type ConfirmActionOptions = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmStyle?: 'destructive' | 'default';
  onConfirm: () => void | Promise<void>;
  onError?: (error: unknown) => void;
};

function executeConfirmation(
  onConfirm: ConfirmActionOptions['onConfirm'],
  onError?: ConfirmActionOptions['onError'],
): void {
  try {
    void Promise.resolve(onConfirm()).catch((error: unknown) => {
      onError?.(error);
    });
  } catch (error) {
    onError?.(error);
  }
}

/**
 * Cross-platform confirmation. `Alert.alert` on react-native-web does not run
 * button callbacks, so web uses `globalThis.confirm`.
 */
export function confirmAction({
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmStyle = 'default',
  onConfirm,
  onError,
}: ConfirmActionOptions): void {
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
      style: confirmStyle,
      onPress: () => executeConfirmation(onConfirm, onError),
    },
  ]);
}

export function confirmDestructiveAction(options: ConfirmActionOptions): void {
  confirmAction({ ...options, confirmStyle: 'destructive' });
}
