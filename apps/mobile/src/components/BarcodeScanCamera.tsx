import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  resolveCameraChromePaddingTop,
} from '@/src/hooks/camera-chrome-metrics';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

type Props = {
  visible: boolean;
  onCancel: () => void;
  onScan: (barcode: string) => void;
};

/**
 * Fullscreen live barcode viewfinder — same chrome as Scanner barcode mode.
 * Web callers should not open this; use a digits field instead.
 */
export function BarcodeScanCamera({ visible, onCancel, onScan }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      scannedRef.current = false;
      setScanned(false);
      setTorchOn(false);
      return;
    }
    if (Platform.OS === 'web') return;
    if (permission?.granted) return;
    void requestPermission();
  }, [visible, permission?.granted, requestPermission]);

  if (!visible || Platform.OS === 'web') return null;

  const close = () => {
    setTorchOn(false);
    onCancel();
  };

  const handleBarcode = ({ data }: { data: string }) => {
    if (scannedRef.current || scanned) return;
    scannedRef.current = true;
    setScanned(true);
    setTorchOn(false);
    onScan(data);
  };

  const topPad = resolveCameraChromePaddingTop(insets.top);

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}>
      <View style={styles.cameraContainer} testID="diary-barcode-camera">
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchOn}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcode}
          />
        ) : (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionText}>{t('scanner.cameraBarcodeHint')}</Text>
            <Pressable
              style={styles.permissionBtn}
              onPress={() => void requestPermission()}
              accessibilityRole="button">
              <Text style={styles.permissionBtnText}>{t('scanner.scanBarcode')}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          <View style={[styles.cameraTopBar, { paddingTop: topPad }]}>
            <Pressable
              style={styles.closeBtn}
              hitSlop={8}
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
            <Text style={styles.cameraTitle}>{t('scanner.cameraScanBarcode')}</Text>
            <Pressable
              style={styles.closeBtn}
              hitSlop={8}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}>
              <Ionicons name="close" size={24} color={theme.colors.onAccent} />
            </Pressable>
          </View>

          {permission?.granted ? (
            <View style={styles.viewfinderCenter} pointerEvents="box-none">
              <View style={styles.viewfinderWrap}>
                <View style={styles.viewfinder}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.viewfinderHint}>{t('scanner.cameraBarcodeHint')}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
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
    corner: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderColor: colors.accent,
      borderWidth: 3,
    },
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
    permissionWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    permissionText: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.onAccent,
      textAlign: 'center',
      lineHeight: 22,
    },
    permissionBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    permissionBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
