import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef } from 'react';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  resolveCameraChromePaddingBottom,
  resolveCameraChromePaddingTop,
} from '@/src/hooks/camera-chrome-metrics';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { logCaughtError } from '@/src/services/error-reporting';
import { captureScanPhotoViaPicker, type CapturedScanPhoto } from '@/src/services/scanner-photo-service';
import type { CameraEntryMode } from '@/src/components/scanner/scanner-display';
import { createStyles } from '@/src/components/scanner/scanner-styles';

type Props = {
  entryMode: CameraEntryMode;
  torchOn: boolean;
  capturing: boolean;
  onTorchToggle: () => void;
  onClose: () => void;
  onBarcode: (payload: { data: string }) => void;
  onPickGallery: () => void;
  onPhotoCaptured: (photo: CapturedScanPhoto) => void;
  onCapturingChange: (value: boolean) => void;
};

export function ScannerCameraModal({
  entryMode,
  torchOn,
  capturing,
  onTorchToggle,
  onClose,
  onBarcode,
  onPickGallery,
  onPhotoCaptured,
  onCapturingChange,
}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);
  const isBarcodeEntry = entryMode === 'barcode';
  const supportsPhotoCapture = entryMode === 'scanner';
  const topPad = resolveCameraChromePaddingTop(insets.top);
  const bottomPad = resolveCameraChromePaddingBottom(insets.bottom);

  const capturePhotoFrame = async () => {
    if (capturing) return;
    onCapturingChange(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (!picture?.uri) return;
      onPhotoCaptured({
        uri: picture.uri,
        width: picture.width || 0,
        height: picture.height || 0,
      });
    } catch (error) {
      logCaughtError('ScannerScreen.capturePhotoFrame', error, { level: 'warn' });
      const fallback = await captureScanPhotoViaPicker();
      if (fallback) onPhotoCaptured(fallback);
    } finally {
      onCapturingChange(false);
    }
  };

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
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
          onBarcodeScanned={isBarcodeEntry ? onBarcode : undefined}
        />

        <View style={styles.cameraOverlay} pointerEvents="box-none">
          <View style={[styles.cameraTopBar, { paddingTop: topPad }]}>
            <Pressable
              style={styles.closeBtn}
              hitSlop={8}
              onPress={onTorchToggle}
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
              hitSlop={8}
              onPress={onClose}
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
                {isBarcodeEntry ? t('scanner.cameraBarcodeHint') : t('scanner.cameraScannerHint')}
              </Text>
            </View>
          </View>

          {supportsPhotoCapture ? (
            <View style={[styles.shutterRow, { paddingBottom: bottomPad }]}>
              <Pressable
                style={styles.galleryBtn}
                onPress={onPickGallery}
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
