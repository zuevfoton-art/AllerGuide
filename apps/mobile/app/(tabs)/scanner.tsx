import {
  Image,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  resolveCameraChromePaddingBottom,
  resolveCameraChromePaddingTop,
} from '@/src/hooks/camera-chrome-metrics';
import {
  computeScanTrends,
  formatDiaryDate,
  type Profile,
  type RiskLevel,
  type SafeProduct,
  type ScanHistoryEntry,
  type ScannerMode,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { ErrorState } from '@/src/components/ErrorState';
import { UndoBanner } from '@/src/components/UndoBanner';
import { Disclaimer } from '@/src/components/Disclaimer';
import { ImageCropEditor } from '@/src/components/ImageCropEditor';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeScanResult } from '@/src/i18n/translate';
import {
  isDishVisionScanError,
  scanBarcode,
  scanFromOcr,
  scanText,
  type ScanResultExtended,
} from '@/src/services/scanner-service';
import { historyEntryToScanResult, listScanHistory } from '@/src/services/scan-history-service';
import {
  addSafeProduct,
  isSafeProductSaved,
  listSafeProducts,
  removeSafeProduct,
} from '@/src/services/safe-products-service';
import {
  captureScanPhotoViaPicker,
  pickScanPhotoFromLibrary,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
} from '@/src/services/scanner-photo-service';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { saveAliasFeedback } from '@/src/services/alias-feedback-service';
import { hapticDanger, hapticLight, hapticSuccess } from '@/src/services/haptics';
import { resolveMatchAliasKeyword } from '@/src/services/scan-match-display';
import {
  ensureActiveProfileLoaded,
  getOrLoadActiveProfileId,
} from '@/src/services/profile-service';
import { confirmAction, confirmDestructiveAction } from '@/src/utils/confirm-action';
import { logCaughtError } from '@/src/services/error-reporting';
import {
  SCANNER_MODE_LABEL_KEYS,
  SCANNER_MODES,
  shouldClearScannerResultOnModeChange,
  shouldShowScannerPageTrustLine,
} from '@/src/constants/scanner-mode';

const UNDO_MS = 5000;
const HISTORY_DISPLAY_LIMIT = 5;

type UndoSnapshot = Pick<SafeProduct, 'name' | 'mode' | 'input' | 'savedAt'>;
type CameraEntryMode = 'barcode' | 'scanner';
type ScanMode = ScannerMode;
type ListTab = 'recent' | 'saved';

const SAFE_MODE_LABEL_KEYS = SCANNER_MODE_LABEL_KEYS;

function placeholderKeyForMode(
  mode: ScanMode,
): 'scanner.productPlaceholder' | 'scanner.menuPlaceholder' | 'scanner.medicinePlaceholder' | 'scanner.householdPlaceholder' {
  if (mode === 'menu') return 'scanner.menuPlaceholder';
  if (mode === 'medicine') return 'scanner.medicinePlaceholder';
  if (mode === 'cosmetics') return 'scanner.householdPlaceholder';
  return 'scanner.productPlaceholder';
}

function resolveScanProfile(): Profile | null {
  return useAppStore.getState().activeProfile ?? ensureActiveProfileLoaded();
}

export default function ScannerScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ScanMode>('product');
  const [entryMode, setEntryMode] = useState<CameraEntryMode>('barcode');
  const [manualOpen, setManualOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [listTab, setListTab] = useState<ListTab>('recent');
  const [result, setResult] = useState<ScanResultExtended | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [safeList, setSafeList] = useState<SafeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [scanError, setScanError] = useState(false);
  const [scanErrorIsDishVision, setScanErrorIsDishVision] = useState(false);
  const [repeatUnsafe, setRepeatUnsafe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<CapturedScanPhoto | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const lastScanRef = useRef<(() => void) | null>(null);
  const scanRequestIdRef = useRef(0);
  const [undoItem, setUndoItem] = useState<UndoSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticResultRef = useRef<ScanResultExtended | null>(null);

  const isBarcodeEntry = entryMode === 'barcode';
  const supportsPhotoCapture = entryMode === 'scanner';
  const primaryIsBarcode = mode === 'product';

  const selectMode = (next: ScanMode) => {
    if (shouldClearScannerResultOnModeChange(mode, next)) {
      setResult(null);
      setRepeatUnsafe(false);
      setScanError(false);
    }
    setMode(next);
  };

  const scanTrends = useMemo(() => computeScanTrends(history), [history]);

  const displayResult = useMemo(
    () => (result ? localizeScanResult(result, localeContent) : null),
    [result, localeContent],
  );

  const riskLevel: RiskLevel | null = displayResult?.level ?? null;
  const isHigh = riskLevel === 'high';
  const isMedium = riskLevel === 'medium';
  const isLow = riskLevel === 'low';
  const isCautionOrWorse = isHigh || isMedium;

  const compositionText = result?.productIngredients?.trim() || input.trim();

  const refreshHistory = useCallback(() => {
    const profileId = getOrLoadActiveProfileId() ?? activeProfileId;
    if (!profileId) {
      setHistory([]);
      setSafeList([]);
      return;
    }
    setHistory(listScanHistory(profileId));
    setSafeList(listSafeProducts(profileId));
  }, [activeProfileId]);

  const recentHistory = useMemo(
    () => history.slice(0, HISTORY_DISPLAY_LIMIT),
    [history],
  );

  const isCurrentInputSaved = useMemo(
    () =>
      result != null && activeProfileId != null
        ? isSafeProductSaved(safeList, input, mode)
        : false,
    [safeList, result, input, mode, activeProfileId],
  );

  useFocusEffect(
    useCallback(() => {
      ensureActiveProfileLoaded();
      refreshHistory();
    }, [refreshHistory]),
  );

  useEffect(() => {
    if (loading || !result) return;
    if (lastHapticResultRef.current === result) return;
    lastHapticResultRef.current = result;
    if (isCautionOrWorse) void hapticDanger();
  }, [result, loading, isCautionOrWorse]);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    setUndoItem(null);
  }, []);

  useEffect(() => () => clearUndo(), [clearUndo]);

  const confirmRemoveSafe = (item: SafeProduct) => {
    const profileId = getOrLoadActiveProfileId() ?? activeProfileId;
    if (!profileId) return;

    confirmDestructiveAction({
      title: t('scanner.removeSafeTitle'),
      message: t('scanner.removeSafeMessage', { name: item.name }),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        const removed = await removeSafeProduct(item.id, profileId);
        if (!removed.ok) {
          logCaughtError('ScannerScreen.confirmRemoveSafe', new Error(removed.code));
          return;
        }
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
      },
      onError: (error) => logCaughtError('ScannerScreen.confirmRemoveSafe', error),
    });
  };

  const handleUndoRemove = async () => {
    const profileId = getOrLoadActiveProfileId() ?? activeProfileId;
    if (!undoItem || !profileId) return;
    const restored = await addSafeProduct(profileId, undoItem.name, undoItem.mode, undoItem.input);
    if (!restored.ok) {
      logCaughtError('ScannerScreen.handleUndoRemove', new Error(restored.code));
      return;
    }
    clearUndo();
    refreshHistory();
    void hapticSuccess();
  };

  const runCheck = async (text: string, barcodeMode = false) => {
    const requestId = ++scanRequestIdRef.current;
    lastScanRef.current = () => void runCheck(text, barcodeMode);
    const scanProfile = resolveScanProfile();
    setLoading(true);
    setOcrHint(null);
    setScanError(false);
    setScanErrorIsDishVision(false);
    setIngredientsOpen(false);
    try {
      let scanResult: ScanResultExtended;
      if (barcodeMode && mode === 'product') {
        scanResult = await scanBarcode({ barcode: text, profile: scanProfile });
      } else if (mode === 'menu' || mode === 'medicine' || mode === 'cosmetics') {
        scanResult = await scanFromOcr({
          mode,
          ocrText: text,
          profile: scanProfile,
        });
      } else {
        scanResult = await scanText({ mode, text, profile: scanProfile });
      }

      if (requestId !== scanRequestIdRef.current) return;
      setResult(scanResult);
      setRepeatUnsafe(Boolean(scanResult.repeatUnsafe));
      if (scanResult.ocr?.warnings.length) {
        setOcrHint(scanResult.ocr.warnings.join(' '));
      }
    } catch (error) {
      if (requestId !== scanRequestIdRef.current) return;
      setResult(null);
      setScanError(true);
      setScanErrorIsDishVision(isDishVisionScanError(error));
    } finally {
      if (requestId === scanRequestIdRef.current) {
        setLoading(false);
        refreshHistory();
      }
    }
  };

  const runOcrCapture = async (
    manualText?: string,
    image?: { base64?: string | null; mimeType?: string },
  ) => {
    const requestId = ++scanRequestIdRef.current;
    lastScanRef.current = () => void runOcrCapture(manualText, image);
    const scanProfile = resolveScanProfile();
    setLoading(true);
    setOcrHint(null);
    setScanError(false);
    setScanErrorIsDishVision(false);
    setIngredientsOpen(false);
    try {
      const scanResult = await scanFromOcr({
        mode,
        manualText,
        imageBase64: image?.base64 ?? undefined,
        mimeType: image?.mimeType,
        profile: scanProfile,
      });
      if (requestId !== scanRequestIdRef.current) return;
      if (scanResult.ocr?.text) {
        setInput(scanResult.ocr.text);
      }
      setResult(scanResult);
      if (scanResult.ocr?.warnings.length) {
        setOcrHint(scanResult.ocr.warnings.join(' '));
      }
    } catch (error) {
      if (requestId !== scanRequestIdRef.current) return;
      setResult(null);
      setScanError(true);
      setScanErrorIsDishVision(isDishVisionScanError(error));
    } finally {
      if (requestId === scanRequestIdRef.current) {
        setLoading(false);
        refreshHistory();
      }
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

  const beginCrop = (photo: CapturedScanPhoto) => {
    setCameraOpen(false);
    setPendingPhoto(photo);
  };

  const pickMenuImage = async () => {
    const photo = await pickScanPhotoFromLibrary();
    if (!photo) return;
    beginCrop(photo);
  };

  const openCamera = async (nextEntry: CameraEntryMode = entryMode) => {
    setEntryMode(nextEntry);

    if (Platform.OS === 'web' && nextEntry === 'barcode') {
      setManualOpen(true);
      Alert.alert(t('scanner.modeBarcode'), t('scanner.barcodeWebFailForward'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('scanner.failForwardPhoto'),
          onPress: () => void openCamera('scanner'),
        },
        { text: t('scanner.failForwardManual'), onPress: () => setManualOpen(true) },
      ]);
      return;
    }

    if (Platform.OS === 'web' && nextEntry === 'scanner') {
      const photo = await captureScanPhotoViaPicker();
      if (photo) beginCrop(photo);
      return;
    }

    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScanned(false);
    setCapturing(false);
    setTorchOn(false);
    setCameraOpen(true);
  };

  const handleBarcode = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setTorchOn(false);
    setCameraOpen(false);
    setInput(data);
    void runCheck(data, true);
  };

  const capturePhotoFrame = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
      });
      if (!picture?.uri) return;
      beginCrop({
        uri: picture.uri,
        width: picture.width || 0,
        height: picture.height || 0,
      });
    } catch (error) {
      logCaughtError('ScannerScreen.capturePhotoFrame', error, { level: 'warn' });
      const fallback = await captureScanPhotoViaPicker();
      if (fallback) beginCrop(fallback);
    } finally {
      setCapturing(false);
    }
  };

  const handleCropConfirm = async (cropped: CroppedScanPhoto) => {
    setPendingPhoto(null);
    await runOcrCapture(undefined, {
      base64: cropped.base64,
      mimeType: cropped.mimeType,
    });
  };

  const handleCropRetake = () => {
    setPendingPhoto(null);
    void openCamera('scanner');
  };

  const closeCamera = () => {
    setTorchOn(false);
    setCameraOpen(false);
  };

  const sourceLabel = (source?: ScanResultExtended['source']) => {
    if (source === 'openfoodfacts') return t('scanner.sourceOpenFoodFacts');
    if (source === 'barcodes_db') return t('scanner.sourceBarcodesDb');
    if (source === 'barcode') return t('scanner.sourceBarcode');
    if (source === 'ocr') return t('scanner.sourceOcr');
    if (source === 'llm') return t('scanner.sourceLlm');
    if (source === 'dish_vision') return t('scanner.sourceDishVision');
    if (source === 'catalog_api') return t('scanner.sourceCatalogApi');
    return t('scanner.sourceManual');
  };

  const isDishVisionResult =
    result?.source === 'dish_vision' || Boolean(result?.dishVision);

  const confirmSaveSafe = () => {
    const profileId = getOrLoadActiveProfileId() ?? activeProfileId;
    if (!profileId || !result) return;
    const name = result.productName || input.trim().slice(0, 60);

    confirmAction({
      title: t('scanner.confirmSafeTitle'),
      message: t('scanner.confirmSafeMessage', { name }),
      cancelLabel: t('common.cancel'),
      confirmLabel: t('scanner.confirmSafeAction'),
      onConfirm: async () => {
        const saved = await addSafeProduct(profileId, name, mode, input.trim());
        if (!saved.ok) {
          logCaughtError('ScannerScreen.confirmSaveSafe', new Error(saved.code));
          return;
        }
        void hapticSuccess();
        refreshHistory();
        setListTab('saved');
      },
      onError: (error) => logCaughtError('ScannerScreen.confirmSaveSafe', error),
    });
  };

  const openHistoryItem = (item: ScanHistoryEntry) => {
    const restored = historyEntryToScanResult(item);
    setMode(restored.mode);
    setInput(item.input);
    setResult(restored);
    setRepeatUnsafe(false);
    setIngredientsOpen(false);
    lastHapticResultRef.current = null;
  };

  const formatMatchChip = (label: string, allergenId?: string) => {
    const keyword = resolveMatchAliasKeyword(allergenId, label, compositionText);
    if (!keyword) return label;
    return t('scanner.matchAlias', { keyword, allergen: label });
  };

  const matchIdByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of result?.structuredMatches ?? []) {
      map.set(m.label, m.allergenId);
    }
    return map;
  }, [result?.structuredMatches]);

  if (pendingPhoto) {
    return (
      <ImageCropEditor
        photo={pendingPhoto}
        title={t('scanner.cropTitle')}
        hint={t('scanner.cropHint')}
        confirmLabel={t('scanner.cropConfirm')}
        cancelLabel={t('common.cancel')}
        retakeLabel={t('scanner.cropRetake')}
        errorLabel={t('scanner.cropFailed')}
        onCancel={() => setPendingPhoto(null)}
        onRetake={handleCropRetake}
        onConfirm={(cropped) => void handleCropConfirm(cropped)}
      />
    );
  }

  if (cameraOpen) {
    // Fullscreen Modal covers the absolute tab bar. Overlay chrome is pinned
    // above system bars (Android Modal often reports insets.bottom === 0 while
    // still drawing under 3-button / gesture nav). Viewfinder stays centered
    // (barcode mode has no shutter — space-between used to dump it to bottom).
    const topPad = resolveCameraChromePaddingTop(insets.top);
    const bottomPad = resolveCameraChromePaddingBottom(insets.bottom);

    return (
      <Modal
        visible
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closeCamera}>
        <View style={styles.cameraContainer} testID="scanner-camera">
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={
              isBarcodeEntry
                ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }
                : undefined
            }
            onBarcodeScanned={isBarcodeEntry ? handleBarcode : undefined}
          />

          <View style={styles.cameraOverlay} pointerEvents="box-none">
            <View style={[styles.cameraTopBar, { paddingTop: topPad }]}>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setTorchOn((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t('scanner.flashToggle')}
                accessibilityState={{ selected: torchOn }}>
                <Ionicons
                  name={torchOn ? 'flash' : 'flash-outline'}
                  size={22}
                  color={theme.colors.onAccent}
                />
              </Pressable>
              <Text style={styles.cameraTitle}>
                {isBarcodeEntry ? t('scanner.cameraScanBarcode') : t('scanner.cameraScanSimple')}
              </Text>
              <Pressable
                style={styles.closeBtn}
                onPress={closeCamera}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}>
                <Ionicons name="close" size={24} color={theme.colors.onAccent} />
              </Pressable>
            </View>

            <View style={styles.viewfinderCenter} pointerEvents="box-none">
              <View style={styles.viewfinderWrap}>
                <View style={[styles.viewfinder, !isBarcodeEntry && styles.viewfinderPhoto]}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.viewfinderHint}>
                  {isBarcodeEntry
                    ? t('scanner.cameraBarcodeHint')
                    : mode === 'menu'
                      ? t('scanner.cameraMenuHint')
                      : mode === 'medicine'
                        ? t('scanner.cameraMedicineHint')
                        : mode === 'cosmetics'
                          ? t('scanner.cameraHouseholdHint')
                          : t('scanner.cameraScannerHint')}
                </Text>
              </View>
            </View>

            {supportsPhotoCapture ? (
              <View style={[styles.shutterRow, { paddingBottom: bottomPad }]}>
                <Pressable
                  style={styles.galleryBtn}
                  onPress={() => void pickMenuImage()}
                  accessibilityRole="button"
                  accessibilityLabel={t('scanner.pickFromGallery')}>
                  <Ionicons name="images-outline" size={22} color={theme.colors.onAccent} />
                </Pressable>
                <Pressable
                  style={styles.shutterBtn}
                  onPress={() => void capturePhotoFrame()}
                  disabled={capturing}
                  testID="scanner-shutter"
                  accessibilityRole="button"
                  accessibilityLabel={t('scanner.takePhoto')}>
                  {capturing ? (
                    <ActivityIndicator color={theme.colors.onAccent} />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </Pressable>
                <View style={styles.galleryBtn} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }

  if (!activeProfileId) {
    return (
      <Screen>
        <ScreenEyebrow section={t('scanner.eyebrow')} />
        <Text style={ui.docTitle}>{t('scanner.titleShort')}</Text>
        <GlassCard>
          <Text style={ui.cardTitle}>{t('scanner.noProfileTitle')}</Text>
          <Text style={styles.emptyBody}>{t('scanner.noProfileText')}</Text>
          <Button
            label={t('scanner.noProfileCta')}
            variant="primary"
            block
            onPress={() => router.push('/profile-setup')}
          />
        </GlassCard>
        <Disclaimer>{t('scanner.disclaimer')}</Disclaimer>
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={() => refresh()}
      refreshing={refreshing}
      pinnedTop={
        displayResult ? (
          <View
            testID="scanner-verdict-pinned"
            style={[
              styles.verdictHero,
              styles.verdictPinned,
              isHigh && styles.verdictHeroHigh,
              isMedium && styles.verdictHeroMedium,
              isLow && styles.verdictHeroLow,
            ]}>
            <Text
              style={[
                styles.verdictHeroTitle,
                isHigh && styles.verdictHeroTitleHigh,
                isMedium && styles.verdictHeroTitleMedium,
                isLow && styles.verdictHeroTitleLow,
              ]}>
              {isHigh
                ? t('scanner.verdictStop')
                : isMedium
                  ? t('scanner.verdictCaution')
                  : t('scanner.verdictClear')}
            </Text>
          </View>
        ) : undefined
      }>
      <ScreenBrandHeader right={<ProfileHeaderButton />} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('scanner.eyebrow')} />
          <Text style={ui.docTitle}>{t('scanner.titleShort')}</Text>
        </View>
      </View>

      <View style={[styles.tabRow, styles.modeRow]} testID="scanner-mode-row">
        {SCANNER_MODES.map((item) => {
          const active = mode === item;
          return (
            <Pressable
              key={item}
              testID={`scanner-mode-${item}`}
              style={[styles.tabChip, styles.modeChip, active && styles.tabChipActive]}
              onPress={() => selectMode(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}>
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                {t(SCANNER_MODE_LABEL_KEYS[item])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        testID="scanner-primary-camera"
        label={t('scanner.pointCamera')}
        variant="primary"
        block
        disabled={loading}
        onPress={() => void openCamera(primaryIsBarcode ? 'barcode' : 'scanner')}
      />

      <View style={styles.secondaryRow}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => void openCamera('scanner')}
          testID="scanner-photo-ingredients"
          accessibilityRole="button">
          <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>{t('scanner.photoIngredients')}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => setManualOpen((v) => !v)}
          testID="scanner-toggle-manual"
          accessibilityRole="button"
          accessibilityState={{ expanded: manualOpen }}>
          <Ionicons name="create-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.secondaryBtnText}>
            {manualOpen ? t('scanner.hideManual') : t('scanner.enterManually')}
          </Text>
        </Pressable>
      </View>

      {!displayResult && !loading ? (
        <Text style={styles.emptyHint}>{t('scanner.emptyHint')}</Text>
      ) : null}
      {shouldShowScannerPageTrustLine(Boolean(displayResult)) ? (
        <Text style={styles.trustLine}>
          {isDishVisionResult ? t('scanner.trustLineDishVision') : t('scanner.trustLine')}
        </Text>
      ) : null}

      {manualOpen ? (
        <View style={styles.manualBlock}>
          <TextInput
            testID="scanner-input"
            value={input}
            onChangeText={setInput}
            placeholder={t(placeholderKeyForMode(mode))}
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel={t(placeholderKeyForMode(mode))}
            multiline
            style={styles.input}
          />
          <Button
            testID="scanner-check"
            label={t('scanner.check')}
            variant="primary"
            block
            disabled={loading || !input.trim()}
            onPress={() => {
              const looksLikeBarcode = /^\d{8,14}$/.test(input.trim());
              void runCheck(input.trim(), looksLikeBarcode && mode === 'product');
            }}
          />
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={theme.colors.accent} style={{ marginTop: -8 }} /> : null}
      {ocrHint ? <Text style={styles.ocrHint}>{ocrHint}</Text> : null}

      {scanError && !loading ? (
        <ErrorState
          message={t(scanErrorIsDishVision ? 'scanner.dishVisionFailed' : 'scanner.checkFailed')}
          onRetry={() => lastScanRef.current?.()}
        />
      ) : null}

      {repeatUnsafe ? (
        <Text style={[styles.repeatWarning, isMedium && styles.repeatWarningCaution]}>
          {t('scanner.repeatUnsafeWarning')}
        </Text>
      ) : null}

      {displayResult ? (
        <View testID="scanner-result" style={styles.resultStack}>
          <Text style={styles.verdictHeroHint}>
            {isHigh
              ? t('scanner.verdictStopHint')
              : isMedium
                ? t('scanner.verdictCautionHint')
                : t('scanner.verdictClearHint')}
          </Text>
          <Text style={styles.verdictClaro}>
            {t('scanner.claroVerdict', { verdict: displayResult.verdict })}
          </Text>

          <Text style={styles.resultTrust}>{t('scanner.resultTrustStrip')}</Text>

          {(result?.productBrand ||
            result?.productImageUrl ||
            displayResult.productName ||
            result?.productCategory) ? (
            <View style={styles.productIdentityRow}>
              {result?.productImageUrl ? (
                <Image
                  source={{ uri: result.productImageUrl }}
                  style={styles.productImage}
                  accessibilityLabel={displayResult.productName ?? ''}
                  resizeMode="contain"
                />
              ) : null}
              <View style={styles.productIdentityBody}>
                {displayResult.productName ? (
                  <Text style={styles.productName}>{displayResult.productName}</Text>
                ) : null}
                {result?.productBrand ? (
                  <Text style={styles.productBrand}>{result.productBrand}</Text>
                ) : null}
                {result?.productCategory ? (
                  <Text style={styles.productBrand}>
                    {t('scanner.categoryLabel')}: {result.productCategory}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {result?.barcodeScanStatus && result.barcodeScanStatus !== 'found_match' ? (
            <Text style={styles.statusBadge}>
              {result.barcodeScanStatus === 'not_found'
                ? t('scanner.statusNotFound')
                : result.barcodeScanStatus === 'found_insufficient_composition'
                  ? t('scanner.statusInsufficientComposition')
                  : t('scanner.statusNoAllergens')}
            </Text>
          ) : null}

          {result?.menuScanStatus ? (
            <Text style={styles.statusBadge}>
              {result.menuScanStatus === 'text_match'
                ? t('scanner.menuStatusMatch')
                : result.menuScanStatus === 'incomplete_composition'
                  ? t('scanner.menuStatusIncomplete')
                  : t('scanner.menuStatusNoMatch')}
            </Text>
          ) : null}

          {result?.barcodeScanStatus === 'not_found' || result?.lookupFailed ? (
            <View style={styles.failForwardRow}>
              <Button
                label={t('scanner.failForwardPhoto')}
                variant="secondary"
                block
                onPress={() => void openCamera('scanner')}
              />
              <Button
                label={t('scanner.failForwardManual')}
                variant="secondary"
                block
                onPress={() => setManualOpen(true)}
              />
            </View>
          ) : null}

          {displayResult.reason ? <Text style={styles.reason}>{displayResult.reason}</Text> : null}

          {displayResult.matches?.length > 0 ? (
            <View style={styles.chipWrap}>
              {displayResult.matches.map((label) => (
                <View key={`m-${label}`} style={styles.matchesBadge}>
                  <Text style={styles.matchesText}>
                    {formatMatchChip(label, matchIdByLabel.get(label))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {(displayResult.crossMatches?.length ?? 0) > 0 ? (
            <View style={styles.chipWrap}>
              <Text style={styles.chipSectionLabel}>{t('scanner.crossMatches')}</Text>
              {displayResult.crossMatches.map((label) => (
                <View key={`c-${label}`} style={styles.crossBadge}>
                  <Text style={styles.crossText}>
                    {formatMatchChip(label, matchIdByLabel.get(label))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {(displayResult.traceMatches?.length ?? 0) > 0 ? (
            <View style={styles.chipWrap}>
              <Text style={styles.chipSectionLabel}>{t('scanner.traceMatches')}</Text>
              {displayResult.traceMatches!.map((label) => (
                <View key={`t-${label}`} style={styles.traceBadge}>
                  <Text style={styles.traceText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {compositionText.length > 20 ? (
            <View style={styles.ingredientsBlock}>
              <Pressable
                onPress={() => setIngredientsOpen((v) => !v)}
                accessibilityRole="button"
                style={styles.ingredientsToggle}
                hitSlop={8}>
                <Text style={styles.ingredientsToggleText}>
                  {ingredientsOpen ? t('scanner.ingredientsHide') : t('scanner.ingredientsShow')}
                </Text>
                <Ionicons
                  name={ingredientsOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.colors.accent}
                />
              </Pressable>
              {ingredientsOpen ? (
                <Text style={styles.ingredientsBody}>
                  {t('scanner.ingredientsLabel')}: {compositionText}
                </Text>
              ) : null}
            </View>
          ) : null}

          {displayResult.source ? (
            <Text style={styles.sourceMeta}>
              {t('scanner.source')} {sourceLabel(displayResult.source)}
            </Text>
          ) : null}

          <Text style={styles.verifyHint}>{t('scanner.verifyPackageHint')}</Text>

          <View style={styles.actionCol}>
            {isLow && activeProfileId ? (
              isCurrentInputSaved ? (
                <Button label={t('scanner.savedToSafe')} variant="secondary" block disabled />
              ) : (
                <Button
                  label={t('scanner.saveToSafe')}
                  variant="secondary"
                  block
                  onPress={confirmSaveSafe}
                />
              )
            ) : null}
            {activeProfileId ? (
              <Pressable
                style={styles.reportBtn}
                hitSlop={8}
                onPress={() => {
                  const term =
                    result?.unknownMatches?.[0] ??
                    [...(result?.matches ?? []), ...(result?.crossMatches ?? [])][0] ??
                    input.trim().slice(0, 80);
                  void saveAliasFeedback({
                    term,
                    context: result?.productName ?? mode,
                    profileId: activeProfileId,
                    scanInput: input.trim(),
                  }).then((saved) => {
                    if (!saved.ok) {
                      logCaughtError('ScannerScreen.reportAlias', new Error(saved.code));
                      return;
                    }
                    Alert.alert(t('scanner.reportIncorrect'), t('scanner.reportThanks'));
                    void hapticLight();
                  });
                }}
                accessibilityRole="button">
                <Text style={styles.reportBtnText}>{t('scanner.reportIncorrect')}</Text>
              </Pressable>
            ) : null}
            <Button
              label={t('scanner.scanAgain')}
              variant="secondary"
              block
              onPress={() => {
                setResult(null);
                setRepeatUnsafe(false);
                void openCamera(primaryIsBarcode ? 'barcode' : 'scanner');
              }}
            />
          </View>
        </View>
      ) : null}

      {scanTrends.totalScans > 0 ? (
        <GlassCard>
          <Pressable
            onPress={() => setTrendsOpen((v) => !v)}
            style={styles.trendsToggle}
            accessibilityRole="button"
            hitSlop={8}>
            <Text style={ui.cardTitle}>
              {trendsOpen ? t('scanner.trendsHide') : t('scanner.trendsShow')}
            </Text>
            <Ionicons
              name={trendsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
          {trendsOpen ? (
            <>
              <Text style={styles.trendMeta}>
                {t('scanner.historyMeta', {
                  total: String(scanTrends.totalScans),
                  highRisk: String(scanTrends.highRiskCount),
                })}
              </Text>
              {scanTrends.topAllergens.map((item) => (
                <Text key={item.allergenId} style={styles.trendRow}>
                  {item.label}: {item.count}
                </Text>
              ))}
            </>
          ) : null}
        </GlassCard>
      ) : null}

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabChip, listTab === 'recent' && styles.tabChipActive]}
          onPress={() => setListTab('recent')}
          accessibilityRole="button"
          accessibilityState={{ selected: listTab === 'recent' }}
          hitSlop={8}>
          <Text style={[styles.tabChipText, listTab === 'recent' && styles.tabChipTextActive]}>
            {t('scanner.recentTab')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabChip, listTab === 'saved' && styles.tabChipActive]}
          onPress={() => setListTab('saved')}
          accessibilityRole="button"
          accessibilityState={{ selected: listTab === 'saved' }}
          hitSlop={8}>
          <Text style={[styles.tabChipText, listTab === 'saved' && styles.tabChipTextActive]}>
            {t('scanner.savedTab')}
          </Text>
        </Pressable>
      </View>

      {listTab === 'recent' ? (
        history.length > 0 ? (
          <GlassCard padded={false}>
            {recentHistory.map((item, index) => {
              const levelColor =
                item.level === 'high'
                  ? theme.colors.danger
                  : item.level === 'medium'
                    ? theme.colors.warning
                    : theme.colors.success;
              return (
                <Pressable
                  key={item.id}
                  testID={`scanner-history-${item.id}`}
                  onPress={() => openHistoryItem(item)}
                  style={[styles.historyRow, index < history.length - 1 && styles.historyRowBorder]}
                  accessibilityRole="button">
                  <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
                  <View style={ui.feedBody}>
                    <Text style={ui.feedTitle}>{item.productName || item.verdict}</Text>
                    <Text style={ui.feedSub}>
                      {formatDiaryDate(item.createdAt)} · {sourceLabel(item.source as ScanResultExtended['source'])}
                    </Text>
                  </View>
                  <Text style={styles.rescanLink}>{t('scanner.rescanHistory')}</Text>
                </Pressable>
              );
            })}
          </GlassCard>
        ) : (
          <Text style={styles.emptyHint}>{t('scanner.emptyHint')}</Text>
        )
      ) : safeList.length > 0 ? (
        <GlassCard padded={false}>
          {safeList.map((item, index) => {
            const modeLabelKey = SAFE_MODE_LABEL_KEYS[item.mode as ScannerMode];
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
                    {modeLabelKey ? t(modeLabelKey) : item.mode}
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
      ) : (
        <Text style={styles.emptyHint}>{t('scanner.safeListEmpty')}</Text>
      )}

      {undoItem ? (
        <UndoBanner
          message={t('scanner.removedFromSafe')}
          actionLabel={t('common.undo')}
          onUndo={handleUndoRemove}
          onDismiss={clearUndo}
        />
      ) : null}

      <Disclaimer>
        {isDishVisionResult ? t('scanner.dishVisionDisclaimer') : t('scanner.disclaimer')}
      </Disclaimer>
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
    secondaryRow: { flexDirection: 'row', gap: 10 },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.accent,
      minHeight: 44,
    },
    secondaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    emptyHint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    trustLine: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    emptyBody: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    manualBlock: { gap: 10 },
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
    resultStack: { gap: 10 },
    verdictPinned: {
      paddingVertical: 12,
    },
    verdictHero: {
      borderRadius: 10,
      paddingVertical: 18,
      paddingHorizontal: 16,
      borderWidth: 1,
      gap: 6,
    },
    verdictHeroHigh: {
      backgroundColor: colors.scannerDangerIconBg,
      borderColor: colors.scannerDangerBorder,
    },
    verdictHeroMedium: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warningBorder,
    },
    verdictHeroLow: {
      backgroundColor: colors.scannerSafeIconBg,
      borderColor: colors.scannerSafeBorder,
    },
    verdictHeroTitle: {
      fontFamily: fonts.sansBold,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    verdictHeroTitleHigh: { color: colors.danger },
    verdictHeroTitleMedium: { color: colors.warning },
    verdictHeroTitleLow: { color: colors.scannerSafeText },
    verdictHeroHint: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    verdictClaro: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: 2,
    },
    resultTrust: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    productIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    productIdentityBody: { flex: 1, gap: 2 },
    productImage: {
      width: 56,
      height: 56,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
    },
    productBrand: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    productName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    failForwardRow: { gap: 8 },
    repeatWarning: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.danger,
    },
    repeatWarningCaution: { color: colors.warning },
    trendMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    trendRow: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    trendsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    reason: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    chipSectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      width: '100%',
    },
    matchesBadge: {
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
    ingredientsBlock: { gap: 6 },
    ingredientsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
    },
    ingredientsToggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    ingredientsBody: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
    },
    reportBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
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
    verifyHint: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionCol: { gap: 8 },
    ocrHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    tabRow: { flexDirection: 'row', gap: 8 },
    modeRow: { flexWrap: 'wrap' },
    modeChip: { flexGrow: 1, flexBasis: '46%', flex: 0 },
    tabChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabChipActive: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    tabChipText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabChipTextActive: { color: colors.accent },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    historyRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    levelDot: { width: 10, height: 10, borderRadius: 5 },
    rescanLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.accent,
    },
    removeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
    },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    cameraTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
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
    viewfinderCenter: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    viewfinderWrap: { alignItems: 'center', gap: 20 },
    viewfinder: { width: 260, height: 180, position: 'relative' },
    viewfinderPhoto: { width: 280, height: 360 },
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
    shutterRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 40,
      paddingTop: 8,
    },
    galleryBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    shutterBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      borderColor: colors.onAccent,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    shutterInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.onAccent,
    },
  });
}
