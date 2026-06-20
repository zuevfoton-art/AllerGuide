import { Text, TextInput, Pressable, StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { useMemo, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ScanResult } from '@allerguide/ai';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { scanBarcode, scanMenuPhoto, scanText } from '@/src/services/scanner-service';

const MODES = [
  { key: 'product', label: 'Продукт', icon: 'nutrition' },
  { key: 'menu', label: 'Меню', icon: 'restaurant' },
  { key: 'medicine', label: 'Лекарство', icon: 'medkit' },
] as const;

export default function ScannerScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profile = useAppStore((s) => s.activeProfile);
  const [input, setInput] = useState('молоко, арахис, сахар');
  const [mode, setMode] = useState<'product' | 'menu' | 'medicine'>('product');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const isDanger = result != null && result.matches.length > 0;

  const runCheck = async (text: string, barcodeMode = false) => {
    setLoading(true);
    try {
      if (barcodeMode && mode === 'product') {
        const scanResult = await scanBarcode({ barcode: text, profile });
        setResult(scanResult);
        return;
      }

      if (mode === 'menu' && !barcodeMode && text === input && text.includes(',')) {
        setResult(scanMenuPhoto({ profile }));
        return;
      }

      setResult(scanText({ mode, text, profile }));
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanned(false);
    setCameraOpen(true);
  };

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCameraOpen(false);
    setInput(data);
    void runCheck(data, true);
  };

  const handleMenuPhoto = async () => {
    setLoading(true);
    try {
      setResult(scanMenuPhoto({ profile }));
    } finally {
      setLoading(false);
    }
  };

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={mode === 'product' ? handleBarcode : undefined}
        />

        <View style={styles.cameraOverlay}>
          <View style={styles.cameraTopBar}>
            <Pressable style={styles.closeBtn} onPress={() => setCameraOpen(false)}>
              <Ionicons name="close" size={24} color={theme.colors.onAccent} />
            </Pressable>
            <Text style={styles.cameraTitle}>
              {mode === 'product' ? 'Сканируйте штрихкод' : 'Наведите на текст меню'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.viewfinderHint}>
              {mode === 'product'
                ? 'Штрихкод будет проверен через Open Food Facts'
                : 'Демо: нажмите кнопку ниже для анализа типичного меню'}
            </Text>
          </View>

          {mode === 'menu' ? (
            <Pressable style={styles.menuScanBtn} onPress={handleMenuPhoto} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.colors.onAccent} />
              ) : (
                <Text style={styles.menuScanBtnText}>Проанализировать меню</Text>
              )}
            </Pressable>
          ) : null}

          {Platform.OS === 'web' && (
            <View style={styles.webHint}>
              <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.webHintText}>
                Сканирование штрихкодов доступно в мобильном приложении
              </Text>
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={() => setCameraOpen(false)}>
            <Text style={styles.cancelBtnText}>Отмена</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Умный сканер</Text>
          <Text style={styles.subtitle}>Open Food Facts + проверка аллергенов</Text>
        </View>
        <Pressable style={styles.cameraIconBtn} onPress={openCamera}>
          <Ionicons name="camera" size={22} color={theme.colors.accent} />
        </Pressable>
      </View>

      <ProfileSwitcher />

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => setMode(m.key)}>
            <Ionicons
              name={m.icon as any}
              size={18}
              color={mode === m.key ? theme.colors.accent : theme.colors.textMuted}
            />
            <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.scanBanner} onPress={openCamera}>
        <View style={styles.scanBannerIcon}>
          <Ionicons name={mode === 'product' ? 'barcode' : 'restaurant'} size={26} color={theme.colors.accent} />
        </View>
        <View style={styles.scanBannerText}>
          <Text style={styles.scanBannerTitle}>
            {mode === 'product' ? 'Сканировать штрихкод' : 'Снять меню на фото'}
          </Text>
          <Text style={styles.scanBannerDesc}>
            {mode === 'product' ? 'Поиск состава в Open Food Facts' : 'Демо-анализ типичного меню'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>или введите вручную</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="list" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            mode === 'product'
              ? 'Штрихкод или состав продукта...'
              : 'Введите состав блюда или меню...'
          }
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={styles.input}
        />
      </View>

      <Pressable
        style={styles.button}
        disabled={loading}
        onPress={() => {
          const looksLikeBarcode = /^\d{8,14}$/.test(input.trim());
          void runCheck(input.trim(), looksLikeBarcode && mode === 'product');
        }}>
        {loading ? (
          <ActivityIndicator color={theme.colors.onAccent} />
        ) : (
          <>
            <Ionicons name="search" size={18} color={theme.colors.onAccent} />
            <Text style={styles.buttonText}>Проверить</Text>
          </>
        )}
      </Pressable>

      {result && (
        <View style={[styles.resultCard, isDanger ? styles.resultDanger : styles.resultSafe]}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultIcon, isDanger ? styles.resultIconDanger : styles.resultIconSafe]}>
              <Ionicons
                name={isDanger ? 'warning' : 'checkmark-circle'}
                size={24}
                color={isDanger ? theme.colors.danger : theme.colors.success}
              />
            </View>
            <View style={styles.resultText}>
              <Text style={[styles.verdict, isDanger ? styles.verdictDanger : styles.verdictSafe]}>
                {result.verdict}
              </Text>
              {result.productName ? (
                <Text style={styles.productName}>{result.productName}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.reason}>{result.reason}</Text>
          {result.matches?.length > 0 && (
            <View style={styles.matchesBadge}>
              <Ionicons name="alert-circle" size={13} color={theme.colors.danger} />
              <Text style={styles.matchesText}>Совпадения: {result.matches.join(', ')}</Text>
            </View>
          )}
          {result.source ? (
            <Text style={styles.sourceMeta}>
              Источник:{' '}
              {result.source === 'openfoodfacts'
                ? 'Open Food Facts'
                : result.source === 'barcode'
                  ? 'штрихкод'
                  : 'ручной ввод'}
            </Text>
          ) : null}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Результат носит предварительный характер и не исключает индивидуальной реакции.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    cameraIconBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    modeRow: { flexDirection: 'row', gap: 8 },
    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    modeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    modeTextActive: { color: colors.accent },
    scanBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.accentMid,
      ...(shadows.sm as object),
    },
    scanBannerIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanBannerText: { flex: 1, gap: 3 },
    scanBannerTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    scanBannerDesc: { fontSize: 13, color: colors.textSecondary },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    inputWrap: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingTop: 12,
      paddingHorizontal: 14,
      paddingBottom: 14,
      minHeight: 100,
    },
    inputIcon: { marginBottom: 6 },
    input: { fontSize: 15, color: colors.text, textAlignVertical: 'top', lineHeight: 22 },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.accent,
      padding: 16,
      borderRadius: 16,
      ...(shadows.accent as object),
    },
    buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    resultCard: { borderRadius: 18, padding: 16, gap: 10, borderWidth: 1.5 },
    resultSafe: { backgroundColor: colors.successLight, borderColor: colors.scannerSafeBorder },
    resultDanger: { backgroundColor: colors.dangerLight, borderColor: colors.scannerDangerBorder },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    resultIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultIconSafe: { backgroundColor: colors.scannerSafeIconBg },
    resultIconDanger: { backgroundColor: colors.scannerDangerIconBg },
    resultText: { flex: 1 },
    verdict: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    verdictSafe: { color: colors.scannerSafeText },
    verdictDanger: { color: colors.danger },
    productName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    reason: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    matchesBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.scannerDangerIconBg,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    matchesText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
    sourceMeta: { fontSize: 12, color: colors.textMuted },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
    cameraContainer: { flex: 1, backgroundColor: colors.overlay },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
      paddingBottom: 48,
    },
    cameraTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingHorizontal: 20,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraTitle: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
    viewfinderWrap: { alignItems: 'center', gap: 20 },
    viewfinder: { width: 260, height: 180, position: 'relative' },
    corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.accent, borderWidth: 3 },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
    viewfinderHint: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
      paddingHorizontal: 24,
    },
    menuScanBtn: {
      marginHorizontal: 24,
      backgroundColor: colors.accent,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    menuScanBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    webHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
      padding: 10,
    },
    webHintText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },
    cancelBtn: {
      marginHorizontal: 24,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    cancelBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  });
}
