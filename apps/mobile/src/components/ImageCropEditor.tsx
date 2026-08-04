import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  applyDisplayCropDrag,
  computeContainLayout,
  cropImageToBase64,
  initialCropInDisplay,
  mapDisplayCropToImagePixels,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
  type DisplayCropBox,
  type DisplayCropDragKind,
  type DisplayLayout,
} from '@/src/services/scanner-photo-service';

const HANDLE_SIZE = 28;
const MIN_CROP_DISPLAY = 64;

type DragMode = {
  kind: DisplayCropDragKind;
  start: DisplayCropBox;
};

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
  const [crop, setCrop] = useState<DisplayCropBox | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const layoutRef = useRef<DisplayLayout>({
    displayWidth: 0,
    displayHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const cropRef = useRef<DisplayCropBox | null>(null);
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

  const applyDrag = (dx: number, dy: number) => {
    const mode = dragRef.current;
    const bounds = layoutRef.current;
    if (!mode || bounds.displayWidth <= 0) return;

    const next = applyDisplayCropDrag({
      start: mode.start,
      kind: mode.kind,
      dx,
      dy,
      bounds,
      minSize: MIN_CROP_DISPLAY,
    });
    cropRef.current = next;
    setCrop(next);
  };

  const beginDrag = (kind: DisplayCropDragKind) => {
    if (!cropRef.current) return;
    dragRef.current = { kind, start: cropRef.current };
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        // Do not capture on touch start — corner handles are siblings and need the gesture.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => beginDrag('move'),
        onPanResponderMove: (_evt, gesture) => applyDrag(gesture.dx, gesture.dy),
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [],
  );

  const makeCornerResponder = (corner: 'tl' | 'tr' | 'bl' | 'br') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => beginDrag(corner),
      onPanResponderMove: (_evt, gesture) => applyDrag(gesture.dx, gesture.dy),
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    });

  const cornerResponders = useMemo(
    () => ({
      tl: makeCornerResponder('tl'),
      tr: makeCornerResponder('tr'),
      bl: makeCornerResponder('bl'),
      br: makeCornerResponder('br'),
    }),
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

  const handleHalf = HANDLE_SIZE / 2;

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
        <View style={styles.stageClip} pointerEvents="none">
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
              <View style={[styles.dim, { top: 0, left: 0, right: 0, height: crop.y }]} />
              <View
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
            </>
          ) : null}
        </View>

        {crop && layout ? (
          <>
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
              {...moveResponder.panHandlers}
            />

            {/* Corner handles are siblings so move PanResponder cannot steal resize gestures. */}
            <View
              testID="crop-handle-tl"
              style={[styles.handle, { left: crop.x - handleHalf, top: crop.y - handleHalf }]}
              {...cornerResponders.tl.panHandlers}
            />
            <View
              testID="crop-handle-tr"
              style={[
                styles.handle,
                { left: crop.x + crop.width - handleHalf, top: crop.y - handleHalf },
              ]}
              {...cornerResponders.tr.panHandlers}
            />
            <View
              testID="crop-handle-bl"
              style={[
                styles.handle,
                { left: crop.x - handleHalf, top: crop.y + crop.height - handleHalf },
              ]}
              {...cornerResponders.bl.panHandlers}
            />
            <View
              testID="crop-handle-br"
              style={[
                styles.handle,
                {
                  left: crop.x + crop.width - handleHalf,
                  top: crop.y + crop.height - handleHalf,
                },
              ]}
              {...cornerResponders.br.panHandlers}
            />
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
      backgroundColor: '#000',
      // Keep overflow visible so corner handles remain touchable near edges.
      overflow: 'visible',
    },
    stageClip: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 8,
      overflow: 'hidden',
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
      zIndex: 1,
    },
    handle: {
      position: 'absolute',
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: 4,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.onAccent,
      zIndex: 2,
    },
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
