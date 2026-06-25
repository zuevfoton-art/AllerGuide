import { Text, TextInput, Pressable, StyleSheet, View, Platform, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ScanResult } from '@allerguide/ai';
import { formatDiaryDate, type SafeProduct, type ScanHistoryEntry } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { ErrorState } from '@/src/components/ErrorState';
import { UndoBanner } from '@/src/components/UndoBanner';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeScanResult } from '@/src/i18n/translate';
import { scanBarcode, scanFromOcr, scanText, extractOcrText } from '@/src/services/scanner-service';
import { listScanHistory } from '@/src/services/scan-history-service';
import {
  addSafeProduct,
  listSafeProducts,
  removeSafeProduct,
} from '@/src/services/safe-products-service';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { saveAliasFeedback } from '@/src/services/alias-feedback-service';
import { hapticDanger, hapticLight, hapticSuccess } from '@/src/services/haptics';

const UNDO_MS = 5000;

type UndoSnapshot = Pick<SafeProduct, 'name' | 'mode' | 'input' | 'savedAt'>;

const MODES = [
  { key: 'product', labelKey: 'scanner.product', icon: 'nutrition' },
  { key: 'menu', labelKey: 'scanner.menu', icon: 'restaurant' },
  { key: 'medicine', labelKey: 'scanner.medicine', icon: 'medkit' },
  { key: 'cosmetics', labelKey: 'scanner.cosmetics', icon: 'flask' },
] as const;

type ScanMode = (typeof MODES)[number]['key'];

export default function ScannerScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, content } = useTranslation();
  const localeContent = content();
  const profile = useAppStore((s) => s.activeProfile);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ScanMode>('product');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [safeList, setSafeList] = useState<SafeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [scanError, setScanError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<(() => void) | null>(null);
  const [undoItem, setUndoItem] = useState<UndoSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticResultRef = useRef<ScanResult | null>(null);

  const displayResult = useMemo(
    () => (result ? localizeScanResult(result, localeContent) : null),
    [result, localeContent],
  );

  const isDanger = displayResult != null && displayResult.level !== 'low';

  const refreshHistory = useCallback(() => {
    if (!activeProfileId) {
      setHistory([]);
      setSafeList([]);
      return;
    }
    setHistory(listScanHistory(activeProfileId).slice(0, 5));
    setSafeList(listSafeProducts(activeProfileId));
  }, [activeProfileId]);

  const isCurrentInputSaved = useMemo(
    () =>
      result != null && activeProfileId != null
        ? safeList.some((p) => p.input.trim().toLowerCase() === input.trim().toLowerCase())
        : false,
    [safeList, result, input, activeProfileId],
  );

  useFocusEffect(
    useCallback(() => {
      refreshHistory();
    }, [refreshHistory]),
  );

  useEffect(() => {
    if (loading || !result) return;
    if (lastHapticResultRef.current === result) return;
    lastHapticResultRef.current = result;
    if (isDanger) void hapticDanger();
  }, [result, loading, isDanger]);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    setUndoItem(null);
  }, []);

  useEffect(() => () => clearUndo(), [clearUndo]);

  const confirmRemoveSafe = (item: SafeProduct) => {
    const title = t('scanner.removeSafeTitle');
    const message = t('scanner.removeSafeMessage', { name: item.name });

    const performRemove = () => {
      removeSafeProduct(item.id);
      void hapticLight();
      refreshHistory();
      setUndoItem({
        name: item.name,
        mode: item.mode,
        input: item.input,
        savedAt: item.savedAt,
      });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoItem(null), UNDO_MS);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) performRemove();
      return;
    }

    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: performRemove },
    ]);
  };

  const handleUndoRemove = () => {
    if (!undoItem || !activeProfileId) return;
    addSafeProduct(activeProfileId, undoItem.name, undoItem.mode, undoItem.input);
    clearUndo();
    refreshHistory();
    void hapticSuccess();
  };

  const runCheck = async (text: string, barcodeMode = false) => {
    lastScanRef.current = () => void runCheck(text, barcodeMode);
    setLoading(true);
    setOcrHint(null);
    setScanError(false);
    try {
      if (barcodeMode && mode === 'product') {
        const scanResult = await scanBarcode({ barcode: text, profile });
        setResult(scanResult);
        return;
      }

      if (mode === 'menu' || mode === 'medicine' || mode === 'cosmetics') {
        const scanResult = await scanFromOcr({
          mode,
          ocrText: text,
          profile,
        });
        setResult(scanResult);
        if (scanResult.ocr?.warnings.length) {
          setOcrHint(scanResult.ocr.warnings.join(' '));
        }
        return;
      }

      setResult(await scanText({ mode, text, profile }));
    } catch {
      setResult(null);
      setScanError(true);
    } finally {
      setLoading(false);
      refreshHistory();
    }
  };

  const runOcrCapture = async (manualText?: string) => {
    lastScanRef.current = () => void runOcrCapture(manualText);
    setLoading(true);
    setOcrHint(null);
    setScanError(false);
    try {
      const extraction = extractOcrText(mode, manualText);
      setInput(extraction.text);
      const scanResult = await scanFromOcr({
        mode,
        ocrText: extraction.text,
        profile,
      });
      setResult(scanResult);
      if (extraction.warnings.length) {
        setOcrHint(extraction.warnings.join(' '));
      }
    } catch {
      setResult(null);
      setScanError(true);
    } finally {
      setLoading(false);
      refreshHistory();
    }
  };

  const refresh = useCallback(() => {
    setRefreshing(true);
    try {
      refreshHistory();
    } finally {
      setRefreshing(false);
    }
  }, [refreshHistory]);

  const pickMenuImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (picked.canceled) return;

    setLoading(true);
    try {
      await runOcrCapture();
    } finally {
      setLoading(false);
    }
  };

  const selectMode = (next: ScanMode) => {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setOcrHint(null);
    setScanError(false);
    lastHapticResultRef.current = null;
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

  const handleLabelPhoto = async () => {
    await runOcrCapture(input.trim() || undefined);
    setCameraOpen(false);
  };

  const openScanAction = () => {
    if (mode === 'menu' || mode === 'medicine' || mode === 'cosmetics') {
      void pickMenuImage();
      return;
    }
    void openCamera();
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
              {mode === 'product'
                ? t('scanner.cameraScanBarcode')
                : mode === 'menu'
                  ? t('scanner.cameraScanMenu')
                  : t('scanner.cameraScanLabel')}
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
                ? t('scanner.cameraBarcodeHint')
                : mode === 'menu'
                  ? t('scanner.cameraMenuHint')
                  : t('scanner.cameraLabelHint')}
            </Text>
          </View>

          {mode !== 'product' ? (
            <Pressable style={styles.menuScanBtn} onPress={handleLabelPhoto} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={theme.colors.onAccent} />
              ) : (
                <Text style={styles.menuScanBtnText}>
                  {mode === 'menu' ? t('scanner.analyzeMenu') : t('scanner.analyzeLabel')}
                </Text>
              )}
            </Pressable>
          ) : null}

          {Platform.OS === 'web' && (
            <View style={styles.webHint}>
              <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.webHintText}>{t('scanner.barcodeWebHint')}</Text>
            </View>
          )}

          <Pressable style={styles.cancelBtn} onPress={() => setCameraOpen(false)}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen
      onRefresh={activeProfileId ? () => refresh() : undefined}
      refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('scanner.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('scanner.title')}</Text>
          <Text style={ui.docMeta}>{t('scanner.subtitle')}</Text>
        </View>
        <View style={styles.headerActions}>
          <ProfileHeaderButton />
          <Pressable style={styles.cameraBtn} onPress={openScanAction} accessibilityRole="button">
            <Ionicons name="camera-outline" size={20} color={theme.colors.accent} />
          </Pressable>
        </View>
      </View>

      <ProfileSwitcher />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() => selectMode(m.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(m.labelKey)}>
              <Ionicons
                name={m.icon as any}
                size={14}
                color={active ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{t(m.labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <GlassCard>
        <View style={styles.scanRow}>
          <View style={ui.feedIcon}>
            <Ionicons
              name={
                mode === 'product'
                  ? 'barcode-outline'
                  : mode === 'menu'
                    ? 'restaurant-outline'
                    : 'medkit-outline'
              }
              size={18}
              color={theme.colors.textSecondary}
            />
          </View>
          <View style={styles.scanBody}>
            <Text style={styles.scanTitle}>
              {mode === 'product'
                ? t('scanner.scanBarcode')
                : mode === 'menu'
                  ? t('scanner.scanMenu')
                  : t('scanner.scanLabel')}
            </Text>
            <Text style={styles.scanDesc}>
              {mode === 'product'
                ? t('scanner.scanBarcodeDesc')
                : mode === 'menu'
                  ? t('scanner.scanMenuDesc')
                  : t('scanner.scanLabelDesc')}
            </Text>
          </View>
          <Button label={t('scanner.openAction')} variant="secondary" size="sm" onPress={openScanAction} />
        </View>
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('scanner.manualDivider')}</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder={
          mode === 'product'
            ? t('scanner.productPlaceholder')
            : mode === 'menu'
              ? t('scanner.menuPlaceholder')
              : t('scanner.labelPlaceholder')
        }
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={styles.input}
      />

      <Button
        label={t('scanner.check')}
        variant="primary"
        block
        disabled={loading}
        onPress={() => {
          const looksLikeBarcode = /^\d{8,14}$/.test(input.trim());
          void runCheck(input.trim(), looksLikeBarcode && mode === 'product');
        }}
      />
      {loading ? <ActivityIndicator color={theme.colors.accent} style={{ marginTop: -8 }} /> : null}
      {ocrHint ? <Text style={styles.ocrHint}>{ocrHint}</Text> : null}

      {scanError && !loading ? (
        <ErrorState
          message={t('scanner.checkFailed')}
          onRetry={() => lastScanRef.current?.()}
        />
      ) : null}

      {displayResult ? (
        <View style={[styles.resultCard, isDanger ? styles.resultDanger : styles.resultSafe]}>
          <Text style={[styles.verdict, isDanger ? styles.verdictDanger : styles.verdictSafe]}>
            {displayResult.verdict}
          </Text>
          {displayResult.productName ? <Text style={styles.productName}>{displayResult.productName}</Text> : null}
          <Text style={styles.reason}>{displayResult.reason}</Text>
          {displayResult.matches?.length > 0 ? (
            <View style={styles.matchesBadge}>
              <Text style={styles.matchesText}>
                {t('scanner.matches')} {displayResult.matches.join(', ')}
              </Text>
            </View>
          ) : null}
          {(displayResult.crossMatches?.length ?? 0) > 0 ? (
            <View style={styles.crossBadge}>
              <Text style={styles.crossText}>
                {t('scanner.crossMatches')} {displayResult.crossMatches.join(', ')}
              </Text>
            </View>
          ) : null}
          {(displayResult.traceMatches?.length ?? 0) > 0 ? (
            <View style={styles.traceBadge}>
              <Text style={styles.traceText}>
                {t('scanner.traceMatches')} {displayResult.traceMatches!.join(', ')}
              </Text>
            </View>
          ) : null}
          {displayResult.source ? (
            <Text style={styles.sourceMeta}>
              {t('scanner.source')}{' '}
              {displayResult.source === 'openfoodfacts'
                ? t('scanner.sourceOpenFoodFacts')
                : displayResult.source === 'barcodes_db'
                  ? t('scanner.sourceBarcodesDb')
                  : displayResult.source === 'barcode'
                    ? t('scanner.sourceBarcode')
                    : displayResult.source === 'ocr'
                      ? t('scanner.sourceOcr')
                      : t('scanner.sourceManual')}
            </Text>
          ) : null}
          {displayResult && activeProfileId ? (
            <Pressable
              style={styles.reportBtn}
              onPress={() => {
                const term =
                  result?.unknownMatches?.[0] ??
                  [...(result?.matches ?? []), ...(result?.crossMatches ?? [])][0] ??
                  input.trim().slice(0, 80);
                saveAliasFeedback({
                  term,
                  context: result?.productName ?? mode,
                  profileId: activeProfileId,
                  scanInput: input.trim(),
                });
                Alert.alert(t('scanner.reportIncorrect'), t('scanner.reportThanks'));
                void hapticLight();
              }}
              accessibilityRole="button">
              <Text style={styles.reportBtnText}>{t('scanner.reportIncorrect')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {displayResult && !isDanger && activeProfileId ? (
        isCurrentInputSaved ? (
          <Button label={t('scanner.savedToSafe')} variant="secondary" block disabled />
        ) : (
          <Button
            label={t('scanner.saveToSafe')}
            variant="secondary"
            block
            onPress={() => {
              const name = result?.productName || input.trim().slice(0, 60);
              addSafeProduct(activeProfileId, name, mode, input.trim());
              void hapticSuccess();
              refreshHistory();
            }}
          />
        )
      ) : null}

      {history.length > 0 ? (
        <GlassCard padded={false}>
          <Text style={[ui.cardTitle, styles.historyHead]}>{t('scanner.history')}</Text>
          {history.map((item, index) => (
            <View
              key={item.id}
              style={[styles.historyRow, index < history.length - 1 && styles.historyRowBorder]}>
              <View style={ui.feedBody}>
                <Text style={ui.feedTitle}>{item.productName || item.verdict}</Text>
                <Text style={ui.feedSub}>
                  {formatDiaryDate(item.createdAt)} · {item.source}
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>
      ) : null}

      {safeList.length > 0 ? (
        <GlassCard padded={false}>
          <Text style={[ui.cardTitle, styles.historyHead]}>{t('scanner.safeList')}</Text>
          {safeList.map((item, index) => {
            const modeLabel = MODES.find((m) => m.key === item.mode);
            return (
              <View
                key={item.id}
                style={[styles.listRow, index < safeList.length - 1 && styles.historyRowBorder]}>
                <View style={ui.feedIcon}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                </View>
                <View style={ui.feedBody}>
                  <Text style={ui.feedTitle}>{item.name}</Text>
                  <Text style={ui.feedSub}>
                    {modeLabel ? t(modeLabel.labelKey) : item.mode}
                    {' · '}
                    {formatDiaryDate(item.savedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => confirmRemoveSafe(item)}
                  hitSlop={8}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanner.removeSafe')}>
                  <Ionicons name="close-circle-outline" size={22} color={theme.colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </GlassCard>
      ) : null}

      {undoItem ? (
        <UndoBanner
          message={t('scanner.removedFromSafe')}
          actionLabel={t('common.undo')}
          onUndo={handleUndoRemove}
          onDismiss={clearUndo}
        />
      ) : null}

      <Disclaimer>{t('scanner.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cameraBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    modeRow: { gap: 6, paddingRight: 4 },
    modeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    modeChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    modeChipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeChipTextActive: { color: colors.accent },
    scanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    scanBody: { flex: 1, gap: 2, minWidth: 0 },
    scanTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    scanDesc: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 96,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
      textAlignVertical: 'top',
      lineHeight: 22,
    },
    resultCard: { borderRadius: 8, padding: 16, gap: 8, borderWidth: 1 },
    resultSafe: { backgroundColor: colors.successLight, borderColor: colors.successBorder },
    resultDanger: { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder },
    verdict: {
      fontFamily: fonts.sansBold,
      fontSize: 16,
      fontWeight: '700',
    },
    verdictSafe: { color: colors.success },
    verdictDanger: { color: colors.danger },
    productName: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
    },
    reason: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    matchesBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.dangerLight,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 4,
    },
    matchesText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.danger,
      fontWeight: '600',
    },
    crossBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.warningLight,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 4,
    },
    crossText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.warningText,
      fontWeight: '600',
    },
    traceBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 4,
    },
    traceText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    reportBtn: {
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    reportBtnText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      textDecorationLine: 'underline',
    },
    sourceMeta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    ocrHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    historyHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    historyRow: { paddingHorizontal: 16, paddingVertical: 12 },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    historyRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    removeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
    },
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
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraTitle: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
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
      borderRadius: 6,
      padding: 14,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    menuScanBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    webHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginHorizontal: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 6,
      padding: 10,
    },
    webHintText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1 },
    cancelBtn: {
      marginHorizontal: 24,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
