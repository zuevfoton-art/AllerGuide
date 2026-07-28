import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportLocalBackup, importLocalBackup } from '@/src/services/sync-service';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';

async function shareOnWeb(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof document === 'undefined') {
    return { ok: false, error: 'Экспорт недоступен на этой платформе' };
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `allerguide-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

function importLocalBackupFromWebFileInput(): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ ok: false, error: 'Импорт недоступен на этой платформе' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, error: 'Файл не выбран' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result ?? '');
        const importResult = importLocalBackup(raw);
        if (importResult.ok) trackEvent('backup_imported');
        resolve(importResult);
      };
      reader.onerror = () => resolve({ ok: false, error: 'Не удалось прочитать файл' });
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function shareLocalBackupFile(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const json = exportLocalBackup();

    if (Platform.OS === 'web') {
      const webResult = await shareOnWeb(json);
      if (webResult.ok) trackEvent('backup_exported');
      return webResult;
    }

    const uri = `${FileSystem.cacheDirectory}allerguide-backup.json`;
    await FileSystem.writeAsStringAsync(uri, json);

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Sharing недоступен на этом устройстве' };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Экспорт данных A-Claro',
    });

    trackEvent('backup_exported');
    return { ok: true };
  } catch (error) {
    logCaughtError('shareLocalBackupFile', error);
    return { ok: false, error: 'Не удалось экспортировать данные' };
  }
}

export async function pickAndImportLocalBackup(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (Platform.OS === 'web') {
      return importLocalBackupFromWebFileInput();
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { ok: false, error: 'Файл не выбран' };
    }

    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const importResult = importLocalBackup(raw);
    if (importResult.ok) trackEvent('backup_imported');
    return importResult;
  } catch (error) {
    logCaughtError('pickAndImportLocalBackup', error);
    return { ok: false, error: 'Не удалось импортировать файл' };
  }
}
