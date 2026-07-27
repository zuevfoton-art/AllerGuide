import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  computeContainLayout,
  cropImageToBase64,
  initialCropInDisplay,
  mapDisplayCropToImagePixels,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
  type DisplayLayout,
} from '@/src/services/scanner-photo-service';

const HANDLE_SIZE = 28;
const MIN_CROP_DISPLAY = 64;

type CropBox = { x: number; y: number; width: number; height: number };

type DragMode =
  | { kind: 'move'; start: CropBox }
  | { kind: 'corner'; corner: 'tl' | 'tr' | 'bl' | 'br'; start: CropBox };

type ImageCropEditorProps = {
  photo: CapturedScanPhoto;
  title: string;
  hint: string;
  confirmLabel: string;
  cancelLabel: string;
  retakeLabel: string;
  errorLabel: string;
  onCancel: () => void;
  onRetake: () => void;
  onConfirm: (cropped: CroppedScanPhoto) => void;
};

export function ImageCropEditor({
  photo,
  title,
  hint,
  confirmLabel,
  cancelLabel,
  retakeLabel,
  errorLabel,
  onCancel,
  onRetake,
  onConfirm,
}: ImageCropEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({
    width: photo.width || 0,
    height: photo.height || 0,
  });
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const layoutRef = useRef<DisplayLayout>({
    displayWidth: 0,
    displayHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const cropRef = useRef<CropBox | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  const layout = useMemo(() => {
    if (!imageSize.width || !imageSize.height || !container.width || !container.height) {
      return null;
    }
    return computeContainLayout(
      container.width,
      container.height,
      imageSize.width,
      imageSize.height,
    );
  }, [container, imageSize]);

  useEffect(() => {
    cropRef.current = null;
    setCrop(null);
    setImageSize({ width: photo.width || 0, height: photo.height || 0 });
    setError(false);
  }, [photo.uri, photo.width, photo.height]);

  useEffect(() => {
    if (!layout) return;
    layoutRef.current = layout;
    if (cropRef.current) return;
    const initial = initialCropInDisplay(layout);
    cropRef.current = initial;
    setCrop(initial);
  }, [layout, photo.uri]);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainer({ width, height });
  };

  const onImageLoad = (event: { nativeEvent: { source: { width: number; height: number } } }) => {
    const width = event.nativeEvent.source.width || photo.width;
    const height = event.nativeEvent.source.height || photo.height;
    if (!width || !height) return;
    cropRef.current = null;
    setCrop(null);
    setImageSize({ width, height });
  };

  const clampCrop = (box: CropBox, bounds: DisplayLayout): CropBox => {
    const minX = bounds.offsetX;
    const minY = bounds.offsetY;
    const maxX = bounds.offsetX + bounds.displayWidth;
    const maxY = bounds.offsetY + bounds.displayHeight;

    let { x, y, width, height } = box;
    width = Math.max(MIN_CROP_DISPLAY, Math.min(width, bounds.displayWidth));
    height = Math.max(MIN_CROP_DISPLAY, Math.min(height, bounds.displayHeight));
    x = Math.min(Math.max(x, minX), maxX - width);
    y = Math.min(Math.max(y, minY), maxY - height);
    return { x, y, width, height };
  };

  const applyDrag = (gesture: PanResponderGestureState) => {
    const mode = dragRef.current;
    const bounds = layoutRef.current;
    if (!mode || bounds.displayWidth <= 0) return;

    let next: CropBox = { ...mode.start };
    if (mode.kind === 'move') {
      next = {
        ...mode.start,
        x: mode.start.x + gesture.dx,
        y: mode.start.y + gesture.dy,
      };
    } else {
      const { corner, start } = mode;
      const right = start.x + start.width;
      const bottom = start.y + start.height;
      if (corner === 'tl') {
        next = {
          x: start.x + gesture.dx,
          y: start.y + gesture.dy,
          width: right - (start.x + gesture.dx),
          height: bottom - (start.y + gesture.dy),
        };
      } else if (corner === 'tr') {
        next = {
          x: start.x,
          y: start.y + gesture.dy,
          width: start.width + gesture.dx,
          height: bottom - (start.y + gesture.dy),
        };
      } else if (corner === 'bl') {
        next = {
          x: start.x + gesture.dx,
          y: start.y,
          width: right - (start.x + gesture.dx),
          height: start.height + gesture.dy,
        };
      } else {
        next = {
          x: start.x,
          y: start.y,
          width: start.width + gesture.dx,
          height: start.height + gesture.dy,
        };
      }
    }

    const clamped = clampCrop(next, bounds);
    cropRef.current = clamped;
    setCrop(clamped);
  };

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          if (!cropRef.current) return;
          dragRef.current = { kind: 'move', start: cropRef.current };
        },
        onPanResponderMove: (_evt, gesture) => applyDrag(gesture),
        onPanResponderRelease: () => {
          dragRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragRef.current = null;
        },
      }),
    // applyDrag reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const makeCornerResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (!cropRef.current) return;
        dragRef.current = { kind: 'corner', corner, start: cropRef.current };
      },
      onPanResponderMove: (_evt, gesture) => applyDrag(gesture),
      onPanResponderRelease: () => {
        dragRef.current = null;
      },
      onPanResponderTerminate: () => {
        dragRef.current = null;
      },
    });

  const cornerResponders = useMemo(
    () => ({
      tl: makeCornerResponder('tl'),
      tr: makeCornerResponder('tr'),
      bl: makeCornerResponder('bl'),
      br: makeCornerResponder('br'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleConfirm = async () => {
    if (!crop || !layout || !imageSize.width || !imageSize.height || busy) return;
    setBusy(true);
    setError(false);
    try {
      const pixelCrop = mapDisplayCropToImagePixels({
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        layout,
        cropX: crop.x,
        cropY: crop.y,
        cropWidth: crop.width,
        cropHeight: crop.height,
      });
      const cropped = await cropImageToBase64(photo.uri, pixelCrop);
      onConfirm(cropped);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="scanner-crop-editor">
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={onCancel} accessibilityRole="button">
          <Ionicons name="close" size={24} color={theme.colors.onAccent} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stage} onLayout={onStageLayout}>
        {layout ? (
          <Image
            source={{ uri: photo.uri }}
            style={{
              position: 'absolute',
              left: layout.offsetX,
              top: layout.offsetY,
              width: layout.displayWidth,
              height: layout.displayHeight,
            }}
            resizeMode="stretch"
            onLoad={onImageLoad}
          />
        ) : (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="contain"
            onLoad={onImageLoad}
          />
        )}

        {crop && layout ? (
          <>
            <View
              pointerEvents="none"
              style={[styles.dim, { top: 0, left: 0, right: 0, height: crop.y }]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  top: crop.y + crop.height,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  top: crop.y,
                  left: 0,
                  width: crop.x,
                  height: crop.height,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.dim,
                {
                  top: crop.y,
                  left: crop.x + crop.width,
                  right: 0,
                  height: crop.height,
                },
              ]}
            />

            <View
              style={[
                styles.cropBox,
                {
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                },
              ]}
              {...moveResponder.panHandlers}>
              <View style={[styles.handle, styles.handleTL]} {...cornerResponders.tl.panHandlers} />
              <View style={[styles.handle, styles.handleTR]} {...cornerResponders.tr.panHandlers} />
              <View style={[styles.handle, styles.handleBL]} {...cornerResponders.bl.panHandlers} />
              <View style={[styles.handle, styles.handleBR]} {...cornerResponders.br.panHandlers} />
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.hint}>{hint}</Text>
      {error ? <Text style={styles.errorText}>{errorLabel}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onRetake} disabled={busy}>
          <Text style={styles.secondaryBtnText}>{retakeLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
          onPress={() => void handleConfirm()}
          disabled={busy || !crop}
          testID="scanner-crop-confirm">
          {busy ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={styles.primaryBtnText}>{confirmLabel}</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={busy}>
        <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.overlay,
      paddingBottom: 32,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
    stage: {
      flex: 1,
      marginHorizontal: 12,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#000',
    },
    dim: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    cropBox: {
      position: 'absolute',
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: 'transparent',
    },
    handle: {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: 4,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.onAccent,
    },
    handleTL: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    handleTR: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    handleBL: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
    handleBR: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
    hint: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      textAlign: 'center',
      paddingHorizontal: 24,
      paddingTop: 14,
      fontFamily: fonts.sans,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
      fontFamily: fonts.sans,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 24,
      marginTop: 16,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      minHeight: 48,
      justifyContent: 'center',
    },
    secondaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 14,
    },
    primaryBtn: {
      flex: 1.2,
      backgroundColor: colors.accent,
      borderRadius: 6,
      padding: 14,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 14,
    },
    cancelBtn: {
      marginHorizontal: 24,
      marginTop: 10,
      backgroundColor: 'transparent',
      borderRadius: 6,
      padding: 12,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontFamily: fonts.sansSemiBold,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
      fontSize: 14,
    },
  });
}
