import { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import type { ScanMode } from '@allerguide/ai';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { classifyPhoto } from '@/src/services/scanner-service';

export type SmartScanResult = {
  type: 'barcode' | 'qr' | 'menu' | 'label' | 'other';
  mode: ScanMode;
  text: string;
  isBarcode: boolean;
};

interface Props {
  onResult: (result: SmartScanResult) => void;
  onClose: () => void;
}

type DetectionState =
  | { kind: 'idle' }
  | { kind: 'detected'; codeType: 'barcode' | 'qr'; data: string }
  | { kind: 'analyzing' }
  | { kind: 'error'; message: string };

export function SmartScannerCamera({ onResult, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [detection, setDetection] = useState<DetectionState>({ kind: 'idle' });
  const processedRef = useRef(false);

  const handleBarcode = useCallback(
    ({ data, type }: { data: string; type: string }) => {
      if (processedRef.current) return;
      processedRef.current = true;
      const codeType: 'barcode' | 'qr' = type === 'qr' ? 'qr' : 'barcode';
      setDetection({ kind: 'detected', codeType, data });
      setTimeout(() => {
        onResult({ type: codeType, mode: 'product', text: data, isBarcode: true });
      }, 350);
    },
    [onResult],
  );

  const handleCapture = useCallback(async () => {
    if (detection.kind !== 'idle') return;

    if (Platform.OS === 'web') {
      setDetection({ kind: 'error', message: t('scanner.smartNoAi') });
      setTimeout(() => setDetection({ kind: 'idle' }), 2500);
      return;
    }

    setDetection({ kind: 'analyzing' });
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        setDetection({ kind: 'error', message: t('scanner.smartClassifyFailed') });
        setTimeout(() => setDetection({ kind: 'idle' }), 2500);
        return;
      }

      const result = await classifyPhoto({ imageBase64: photo.base64 });

      if (!result) {
        setDetection({ kind: 'error', message: t('scanner.smartClassifyFailed') });
        setTimeout(() => setDetection({ kind: 'idle' }), 2500);
        return;
      }

      onResult({ type: result.type, mode: result.mode, text: result.text, isBarcode: false });
    } catch {
      setDetection({ kind: 'error', message: t('scanner.smartClassifyFailed') });
      setTimeout(() => setDetection({ kind: 'idle' }), 2500);
    }
  }, [detection.kind, t, onResult]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.7)" />
        <Text style={styles.permissionText}>{t('scanner.smartScanTitle')}</Text>
        <Pressable style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t('common.ok')}</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  const isBusy = detection.kind === 'analyzing' || detection.kind === 'detected';
  const barcodeTypes: Parameters<typeof CameraView>[0]['barcodeScannerSettings'] = {
    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={barcodeTypes}
        onBarcodeScanned={!isBusy ? handleBarcode : undefined}
      />

      <View style={styles.topBar}>
        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button">
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
        <Text style={styles.title}>{t('scanner.smartScanTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {detection.kind === 'detected' && (
        <View style={styles.detectionBanner}>
          <Ionicons
            name={detection.codeType === 'qr' ? 'qr-code-outline' : 'barcode-outline'}
            size={20}
            color="white"
          />
          <Text style={styles.detectionText}>
            {detection.codeType === 'qr'
              ? t('scanner.smartDetectedQR')
              : t('scanner.smartDetectedBarcode')}
          </Text>
        </View>
      )}

      {detection.kind === 'analyzing' && (
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.analyzingText}>{t('scanner.smartAnalyzing')}</Text>
        </View>
      )}

      {detection.kind === 'error' && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color="white" />
          <Text style={styles.errorText}>{detection.message}</Text>
        </View>
      )}

      {detection.kind === 'idle' && (
        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>{t('scanner.smartScanHint')}</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.shutterBtn, isBusy && styles.shutterBtnDisabled]}
          onPress={handleCapture}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={t('scanner.smartCapture')}>
          {isBusy ? <ActivityIndicator color="white" /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Text style={styles.captureLabel}>{t('scanner.smartCapture')}</Text>
      </View>
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  const CORNER = 20;
  const BORDER = 3;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    viewfinderWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 100,
    },
    viewfinder: {
      width: 240,
      height: 240,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: CORNER,
      height: CORNER,
      borderColor: 'white',
    },
    cornerTL: {
      top: 0,
      left: 0,
      borderTopWidth: BORDER,
      borderLeftWidth: BORDER,
      borderTopLeftRadius: 4,
    },
    cornerTR: {
      top: 0,
      right: 0,
      borderTopWidth: BORDER,
      borderRightWidth: BORDER,
      borderTopRightRadius: 4,
    },
    cornerBL: {
      bottom: 0,
      left: 0,
      borderBottomWidth: BORDER,
      borderLeftWidth: BORDER,
      borderBottomLeftRadius: 4,
    },
    cornerBR: {
      bottom: 0,
      right: 0,
      borderBottomWidth: BORDER,
      borderRightWidth: BORDER,
      borderBottomRightRadius: 4,
    },
    hint: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 20,
      paddingHorizontal: 32,
    },
    detectionBanner: {
      position: 'absolute',
      top: 140,
      left: 24,
      right: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.success + 'dd',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    detectionText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    analyzingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    analyzingText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    errorBanner: {
      position: 'absolute',
      top: 140,
      left: 24,
      right: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(220,60,60,0.9)',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    errorText: {
      color: 'white',
      fontSize: 13,
      flex: 1,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: 48,
      paddingTop: 24,
      backgroundColor: 'rgba(0,0,0,0.45)',
      gap: 8,
    },
    shutterBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 3,
      borderColor: 'white',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterBtnDisabled: {
      opacity: 0.4,
    },
    shutterInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: 'white',
    },
    captureLabel: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      letterSpacing: 0.5,
    },
    permissionText: {
      color: 'white',
      fontSize: 15,
      textAlign: 'center',
      paddingHorizontal: 32,
      marginTop: 16,
      marginBottom: 24,
    },
    permissionBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 10,
      marginBottom: 12,
    },
    permissionBtnText: {
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    cancelBtnText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 14,
    },
  });
}
