import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  findNodeHandle,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalKeyboardAvoid } from '@/src/components/ModalKeyboardAvoid';
import { diaryEditorScrollMaxHeight } from '@/src/components/diary/wizard/diary-editor-layout';
import { radii, space } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface DiaryEditorModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

type DiaryEditorScrollApi = {
  scrollFieldIntoView: (node: unknown) => void;
};

const DiaryEditorScrollContext = createContext<DiaryEditorScrollApi | null>(null);

export function useDiaryEditorScroll(): DiaryEditorScrollApi | null {
  return useContext(DiaryEditorScrollContext);
}

type FooterRenderer = () => ReactNode;
type FooterRegistry = (render: FooterRenderer | null) => void;

const DiaryEditorFooterContext = createContext<FooterRegistry | null>(null);

/**
 * Renders children in the pinned sheet footer (sibling of ScrollView).
 * Without a host, children stay in place — used by unit tests / web previews.
 */
export function DiaryEditorFooter({
  children,
  deps,
}: {
  children: ReactNode;
  deps: readonly (string | number | boolean | null | undefined)[];
}) {
  const register = useContext(DiaryEditorFooterContext);
  const childrenRef = useRef(children);
  childrenRef.current = children;
  const depKey = deps.join('\u0001');

  useLayoutEffect(() => {
    if (!register) return;
    register(() => childrenRef.current);
  }, [register, depKey]);

  useLayoutEffect(() => {
    if (!register) return;
    return () => register(null);
  }, [register]);

  if (!register) return <>{children}</>;
  return null;
}

function measureAndScroll(scrollRef: RefObject<ScrollView | null>, node: unknown) {
  const scroll = scrollRef.current;
  if (!scroll || node == null) return;
  const target = findNodeHandle(node as Parameters<typeof findNodeHandle>[0]);
  const scrollNode = findNodeHandle(scroll);
  if (target == null || scrollNode == null) return;

  UIManager.measureLayout(
    target,
    scrollNode,
    () => undefined,
    (_x, y) => {
      scroll.scrollTo({ y: Math.max(0, y - space[3]), animated: true });
    },
  );
}

/** Bottom-sheet diary editor matching `docs/design-mockup.html` (#screen-diary-editor). */
export function DiaryEditorModal({ visible, onClose, children }: DiaryEditorModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const pendingFocusNode = useRef<unknown>(null);
  const footerRenderRef = useRef<FooterRenderer | null>(null);
  const [hasFooter, setHasFooter] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(0);

  const [footerEpoch, setFooterEpoch] = useState(0);

  const registerFooter = useCallback<FooterRegistry>((render) => {
    footerRenderRef.current = render;
    if (!render) {
      setHasFooter(false);
      setFooterHeight(0);
      return;
    }
    setHasFooter(true);
    setFooterEpoch((epoch) => epoch + 1);
  }, []);

  const scrollFieldIntoView = useCallback((node: unknown) => {
    pendingFocusNode.current = node;
    if (Platform.OS === 'web') {
      const maybeEl = node as { scrollIntoView?: (opts: ScrollIntoViewOptions) => void } | null;
      requestAnimationFrame(() => {
        maybeEl?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      });
      return;
    }

    // Keyboard inset is applied as padding after layout; wait one frame so
    // the focused field lands above the IME instead of under it.
    requestAnimationFrame(() => {
      setTimeout(() => measureAndScroll(scrollRef, node), 80);
    });
  }, []);

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const shown = Keyboard.addListener(event, () => {
      if (pendingFocusNode.current) {
        measureAndScroll(scrollRef, pendingFocusNode.current);
      }
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      pendingFocusNode.current = null;
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const scrollApi = useMemo(() => ({ scrollFieldIntoView }), [scrollFieldIntoView]);

  useEffect(() => {
    if (visible) return;
    footerRenderRef.current = null;
    setHasFooter(false);
    setFooterHeight(0);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <ModalKeyboardAvoid style={styles.root}>
        {({ keyboardInset }) => {
          const sheetPaddingBottom = Math.max(insets.bottom, space[4]) + keyboardInset;
          const scrollMaxHeight = diaryEditorScrollMaxHeight({
            windowHeight,
            headerHeight,
            footerHeight,
            sheetPaddingBottom,
          });
          return (
          <>
            <Pressable
              style={styles.backdrop}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            />
            <View
              style={[styles.sheet, { paddingBottom: sheetPaddingBottom }]}
              accessibilityViewIsModal>
              <View
                onLayout={(event) => {
                  const next = Math.ceil(event.nativeEvent.layout.height);
                  setHeaderHeight((prev) => (prev === next ? prev : next));
                }}>
                <View style={styles.grabberWrap}>
                  <View style={styles.grabber} />
                </View>
                <View style={styles.header}>
                  <Pressable
                    style={styles.headerBtn}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.cancel')}>
                    <Text style={styles.headerBtnText}>{t('common.cancel')}</Text>
                  </Pressable>
                  {/* Pinned chrome. Nightly 33736400731: extra sheet lift + IME
                      padding hid this header under the status bar. */}
                  <View testID="diary-editor-title" collapsable={false}>
                    <Text style={styles.headerTitle}>{t('diary.title')}</Text>
                  </View>
                  <View style={styles.headerBtn} />
                </View>
              </View>
              <DiaryEditorFooterContext.Provider value={registerFooter}>
                <DiaryEditorScrollContext.Provider value={scrollApi}>
                  <ScrollView
                    ref={scrollRef}
                    style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                    bounces={false}>
                    {children}
                  </ScrollView>
                </DiaryEditorScrollContext.Provider>
                {hasFooter ? (
                  <View
                    key={footerEpoch}
                    testID="diary-editor-footer"
                    collapsable={false}
                    style={styles.footer}
                    onLayout={(event) => {
                      const next = Math.ceil(event.nativeEvent.layout.height);
                      setFooterHeight((prev) => (prev === next ? prev : next));
                    }}>
                    {footerRenderRef.current?.()}
                  </View>
                ) : null}
              </DiaryEditorFooterContext.Provider>
            </View>
          </>
          );
        }}
      </ModalKeyboardAvoid>
    </Modal>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    sheet: {
      maxHeight: '88%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      borderTopWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    grabberWrap: {
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 2,
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: radii.full,
      backgroundColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    headerBtn: {
      minWidth: 72,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    headerBtnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.accent,
    },
    headerTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
    },
    scroll: { flexGrow: 0 },
    scrollContent: {
      paddingHorizontal: space[4],
      paddingTop: space[3],
      paddingBottom: space[2],
      gap: space[4],
    },
    footer: {
      paddingHorizontal: space[4],
      paddingTop: space[2],
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.bg,
      gap: space[2],
    },
  });
}
