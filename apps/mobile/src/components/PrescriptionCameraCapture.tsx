import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  resolveCameraChromePaddingBottom,
  resolveCameraChromePaddingTop,
} from '@/src/hooks/camera-chrome-metrics';
import {
  capturePrescriptionPhotoViaPicker,
  pickPrescriptionPhotoFromLibrary,
} from '@/src/services/prescription-photo-service';

type Props = {
  visible: boolean;
  title: string;
  hint: string;
  galleryLabel: string;
  shutterLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onCaptured: (uri: string) => void;
};

/**
 * Camera-first prescription photo capture (scanner-style):
 * live viewfinder + shutter, gallery as secondary action.
 * Web uses the system picker immediately.
 */
export function PrescriptionCameraCapture({
  visible,
  title,
  hint,
  galleryLabel,
  shutterLabel,
  cancelLabel,
  onCancel,
  onCaptured,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const cameraRef = useRef<CameraView>(null);
  const topPad = resolveCameraChromePaddingTop(insets.top);
  const bottomPad = resolveCameraChromePaddingBottom(insets.bottom);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const webStartedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      webStartedRef.current = false;
      setTorchOn(false);
      setCapturing(false);
      return;
    }

    if (Platform.OS !== 'web') return;
    if (webStartedRef.current) return;
    webStartedRef.current = true;

    void (async () => {
      const uri = await capturePrescriptionPhotoViaPicker();
      if (uri) onCaptured(uri);
      else onCancel();
    })();
  }, [visible, onCancel, onCaptured]);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    if (permission?.granted) return;
    void requestPermission();
  }, [visible, permission?.granted, requestPermission]);

  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.permissionWrap} testID="prescription-camera-web">
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.permissionText}>{hint}</Text>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={cancelLabel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const pickGallery = async () => {
    const uri = await pickPrescriptionPhotoFromLibrary();
    if (uri) onCaptured(uri);
  };

  const capture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (picture?.uri) {
        onCaptured(picture.uri);
        return;
      }
      const fallback = await capturePrescriptionPhotoViaPicker();
      if (fallback) onCaptured(fallback);
    } catch {
      const fallback = await capturePrescriptionPhotoViaPicker();
      if (fallback) onCaptured(fallback);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionWrap}>
        <Text style={styles.permissionText}>{hint}</Text>
        <Pressable
          style={styles.permissionBtn}
          onPress={() => void requestPermission()}
          accessibilityRole="button">
          <Text style={styles.permissionBtnText}>{shutterLabel}</Text>
        </Pressable>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={cancelLabel}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer} testID="prescription-camera">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torchOn}
      />

      <View style={styles.cameraOverlay} pointerEvents="box-none">
        <View style={[styles.cameraTopBar, { paddingTop: topPad }]}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => setTorchOn((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ selected: torchOn }}>
            <Ionicons
              name={torchOn ? 'flash' : 'flash-outline'}
              size={22}
              color={theme.colors.onAccent}
            />
          </Pressable>
          <Text style={styles.cameraTitle}>{title}</Text>
          <Pressable
            style={styles.closeBtn}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}>
            <Ionicons name="close" size={24} color={theme.colors.onAccent} />
          </Pressable>
        </View>

        <View style={styles.viewfinderCenter} pointerEvents="box-none">
          <View style={styles.viewfinderWrap}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.viewfinderHint}>{hint}</Text>
          </View>
        </View>

        <View style={[styles.shutterRow, { paddingBottom: bottomPad }]}>
          <Pressable
            style={styles.galleryBtn}
            onPress={() => void pickGallery()}
            accessibilityRole="button"
            accessibilityLabel={galleryLabel}
            testID="prescription-camera-gallery">
            <Ionicons name="images-outline" size={22} color={theme.colors.onAccent} />
          </Pressable>
          <Pressable
            style={styles.shutterBtn}
            onPress={() => void capture()}
            disabled={capturing}
            testID="prescription-camera-shutter"
            accessibilityRole="button"
            accessibilityLabel={shutterLabel}>
            {capturing ? (
              <ActivityIndicator color={theme.colors.onAccent} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
          <View style={styles.galleryBtn} />
        </View>
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    cameraContainer: { flex: 1, backgroundColor: colors.overlay },
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
    viewfinder: { width: 280, height: 360, position: 'relative' },
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
    permissionWrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 16,
    },
    permissionText: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
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
    cancelText: {
      fontFamily: fonts.sans,
      color: colors.textMuted,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
  });
}
