import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { computeScanTrends, type Profile, type SafeProduct, type ScanHistoryEntry } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTranslation } from '@/src/store/locale-store';
import { localizeScanResult } from '@/src/i18n/translate';
import { useDishSuggestions } from '@/src/hooks/use-dish-suggestions';
import { zoneFromScanRisk } from '@/src/hooks/use-zone-colors';
import {
  isDishVisionScanError,
  isScanCloudAuthError,
  scanBarcode,
  scanFromOcr,
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
  prepareScanPhotoForCrop,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
} from '@/src/services/scanner-photo-service';
import { resolveDishVisionPhotoUri } from '@/src/services/scanner-dish-vision-display';
import { saveAliasFeedback } from '@/src/services/alias-feedback-service';
import { hapticDanger, hapticLight, hapticSuccess } from '@/src/services/haptics';
import { resolveMatchAliasKeyword } from '@/src/services/scan-match-display';
import {
  ensureActiveProfileLoaded,
  getOrLoadActiveProfileId,
} from '@/src/services/profile-service';
import { confirmAction, confirmDestructiveAction } from '@/src/utils/confirm-action';
import { logCaughtError } from '@/src/services/error-reporting';
import { isManualBarcodeInput, SMART_SCAN_MODE } from '@/src/constants/scanner-mode';
import type { CameraEntryMode, ScannerListTab } from '@/src/components/scanner/scanner-display';

const UNDO_MS = 5000;
const HISTORY_DISPLAY_LIMIT = 5;

export type UndoSnapshot = Pick<SafeProduct, 'name' | 'mode' | 'input' | 'savedAt'>;

function resolveScanProfile(): Profile | null {
  return useAppStore.getState().activeProfile ?? ensureActiveProfileLoaded();
}

export function useScannerController() {
  const { t, content } = useTranslation();
  const localeContent = content();
  const activeProfileId = useAppStore((s) => s.activeProfileId);

  const [input, setInput] = useState('');
  const [entryMode, setEntryMode] = useState<CameraEntryMode>('scanner');
  const [manualOpen, setManualOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [listTab, setListTab] = useState<ScannerListTab>('recent');
  const [result, setResult] = useState<ScanResultExtended | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [safeList, setSafeList] = useState<SafeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [scanError, setScanError] = useState(false);
  const [scanErrorIsDishVision, setScanErrorIsDishVision] = useState(false);
  const [scanErrorIsCloudAuth, setScanErrorIsCloudAuth] = useState(false);
  const [repeatUnsafe, setRepeatUnsafe] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<CapturedScanPhoto | null>(null);
  const [resultPhotoUri, setResultPhotoUri] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<(() => void) | null>(null);
  const scanRequestIdRef = useRef(0);
  const [undoItem, setUndoItem] = useState<UndoSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticResultRef = useRef<ScanResultExtended | null>(null);

  const isBarcodeEntry = entryMode === 'barcode';
  const supportsPhotoCapture = entryMode === 'scanner';
  const scanTrends = useMemo(() => computeScanTrends(history), [history]);
  const displayResult = useMemo(
    () => (result ? localizeScanResult(result, localeContent) : null),
    [result, localeContent],
  );

  const riskLevel = displayResult?.level ?? null;
  const isHigh = riskLevel === 'high';
  const isMedium = riskLevel === 'medium';
  const isLow = riskLevel === 'low';
  const isCautionOrWorse = isHigh || isMedium;
  const verdictZone = riskLevel ? zoneFromScanRisk(riskLevel) : null;
  const compositionText = result?.productIngredients?.trim() || input.trim();
  const { suggestions: dishSuggestions, searching: dishSearching } = useDishSuggestions(input, {
    enabled: manualOpen,
  });

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

  const recentHistory = useMemo(() => history.slice(0, HISTORY_DISPLAY_LIMIT), [history]);
  const isCurrentInputSaved = useMemo(
    () =>
      result != null && activeProfileId != null
        ? isSafeProductSaved(safeList, input, SMART_SCAN_MODE)
        : false,
    [safeList, result, input, activeProfileId],
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
    setScanErrorIsCloudAuth(false);
    setIngredientsOpen(false);
    setResultPhotoUri(null);
    try {
      const scanResult =
        barcodeMode || isManualBarcodeInput(text)
          ? await scanBarcode({ barcode: text, profile: scanProfile })
          : await scanFromOcr({
              mode: SMART_SCAN_MODE,
              ocrText: text,
              profile: scanProfile,
            });

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
      setScanErrorIsCloudAuth(isScanCloudAuthError(error));
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
    setScanErrorIsCloudAuth(false);
    setIngredientsOpen(false);
    try {
      const scanResult = await scanFromOcr({
        mode: SMART_SCAN_MODE,
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
      setScanErrorIsCloudAuth(isScanCloudAuthError(error));
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

  const beginCrop = async (photo: CapturedScanPhoto) => {
    setCameraOpen(false);
    const prepared = await prepareScanPhotoForCrop(photo);
    setPendingPhoto(prepared);
  };

  const pickMenuImage = async () => {
    const photo = await pickScanPhotoFromLibrary();
    if (!photo) return;
    await beginCrop(photo);
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
      if (photo) await beginCrop(photo);
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

  const handleCropConfirm = async (cropped: CroppedScanPhoto) => {
    setPendingPhoto(null);
    setResultPhotoUri(
      resolveDishVisionPhotoUri({
        fileUri: cropped.uri,
        base64: cropped.base64,
        mimeType: cropped.mimeType,
      }),
    );
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

  const hasVisionEvidence = Boolean(result?.dishVision);
  const isVisionOnly = result?.source === 'dish_vision';
  const isDishVisionResult = hasVisionEvidence || isVisionOnly;

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
        const saved = await addSafeProduct(profileId, name, SMART_SCAN_MODE, input.trim());
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
    setInput(item.input);
    setResult(restored);
    setRepeatUnsafe(false);
    setIngredientsOpen(false);
    setResultPhotoUri(null);
    lastHapticResultRef.current = null;
  };

  const formatMatchChip = (label: string, allergenId?: string) => {
    const keyword = resolveMatchAliasKeyword(allergenId, label, compositionText);
    if (!keyword) return label;
    return t('scanner.matchAlias', { keyword, allergen: label });
  };

  const matchIdByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of result?.structuredMatches ?? []) {
      map.set(match.label, match.allergenId);
    }
    return map;
  }, [result?.structuredMatches]);

  const reportAlias = () => {
    if (!activeProfileId) return;
    const term =
      result?.unknownMatches?.[0] ??
      [...(result?.matches ?? []), ...(result?.crossMatches ?? [])][0] ??
      input.trim().slice(0, 80);
    void saveAliasFeedback({
      term,
      context: result?.productName ?? SMART_SCAN_MODE,
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
  };

  const retryLastScan = () => lastScanRef.current?.();
  const scanAgain = () => {
    setResult(null);
    setRepeatUnsafe(false);
    void openCamera('scanner');
  };

  return {
    activeProfileId,
    input,
    setInput,
    entryMode,
    manualOpen,
    setManualOpen,
    ingredientsOpen,
    setIngredientsOpen,
    trendsOpen,
    setTrendsOpen,
    listTab,
    setListTab,
    result,
    history,
    safeList,
    loading,
    ocrHint,
    scanError,
    scanErrorIsDishVision,
    scanErrorIsCloudAuth,
    repeatUnsafe,
    refreshing,
    cameraOpen,
    torchOn,
    setTorchOn,
    capturing,
    setCapturing,
    pendingPhoto,
    setPendingPhoto,
    resultPhotoUri,
    isBarcodeEntry,
    supportsPhotoCapture,
    scanTrends,
    displayResult,
    isHigh,
    isMedium,
    isLow,
    verdictZone,
    compositionText,
    dishSuggestions,
    dishSearching,
    recentHistory,
    isCurrentInputSaved,
    undoItem,
    hasVisionEvidence,
    isVisionOnly,
    isDishVisionResult,
    matchIdByLabel,
    confirmRemoveSafe,
    handleUndoRemove,
    clearUndo,
    runCheck,
    refresh,
    pickMenuImage,
    beginCrop,
    openCamera,
    handleBarcode,
    handleCropConfirm,
    handleCropRetake,
    closeCamera,
    confirmSaveSafe,
    openHistoryItem,
    formatMatchChip,
    reportAlias,
    retryLastScan,
    scanAgain,
  };
}
