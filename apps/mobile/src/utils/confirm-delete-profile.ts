import { Alert, Platform } from 'react-native';

type ConfirmDeleteProfileOptions = {
  title: string;
  message: string;
  cancelLabel: string;
  deleteLabel: string;
  onConfirm: () => void | Promise<void>;
};

export function confirmDeleteProfile({
  title,
  message,
  cancelLabel,
  deleteLabel,
  onConfirm,
}: ConfirmDeleteProfileOptions): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      void onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: deleteLabel,
      style: 'destructive',
      onPress: () => {
        void onConfirm();
      },
    },
  ]);
}
