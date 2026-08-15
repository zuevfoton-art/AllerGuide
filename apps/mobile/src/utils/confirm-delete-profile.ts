import { confirmDestructiveAction } from './confirm-action';

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
  confirmDestructiveAction({
    title,
    message,
    cancelLabel,
    confirmLabel: deleteLabel,
    onConfirm,
  });
}
