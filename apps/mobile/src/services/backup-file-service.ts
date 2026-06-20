import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportLocalBackup, importLocalBackup } from '@/src/services/sync-service';

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

export async function shareLocalBackupFile(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const json = exportLocalBackup();

    if (Platform.OS === 'web') {
      return shareOnWeb(json);
    }

    const uri = `${FileSystem.cacheDirectory}allerguide-backup.json`;
    await FileSystem.writeAsStringAsync(uri, json);

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, error: 'Sharing недоступен на этом устройстве' };
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Экспорт данных AllerGuide',
    });

    return { ok: true };
  } catch {
    return { ok: false, error: 'Не удалось экспортировать данные' };
  }
}

export async function pickAndImportLocalBackup(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (Platform.OS === 'web') {
      return { ok: false, error: 'Импорт на web пока недоступен. Используйте мобильное приложение.' };
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { ok: false, error: 'Файл не выбран' };
    }

    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    return importLocalBackup(raw);
  } catch {
    return { ok: false, error: 'Не удалось импортировать файл' };
  }
}
