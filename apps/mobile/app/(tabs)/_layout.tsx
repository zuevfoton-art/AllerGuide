import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { HintSpotlight } from '@/src/components/hints/HintSpotlight';
import { useHintAnchor } from '@/src/components/hints/HintAnchor';
import { BrandTabIcon, type BrandTabIconName } from '@/src/components/brand/BrandTabIcon';
import { density } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useTranslation } from '@/src/store/locale-store';

function TabIcon({
  name,
  focused,
  color,
  muted,
  size,
}: {
  name: BrandTabIconName;
  focused: boolean;
  color: string;
  muted: string;
  size: number;
}) {
  return <BrandTabIcon name={name} size={size} color={focused ? color : muted} focused={focused} />;
}

function tabAnchorId(testID: string): string {
  return testID.replace(/^tab-/, 'tab.');
}

function TabBarButton({
  testID,
  accessibilityState,
  style,
  onLayout: tabOnLayout,
  ...props
}: BottomTabBarButtonProps & { testID: string }) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  const { ref, onLayout } = useHintAnchor(tabAnchorId(testID));

  return (
    <Pressable
      {...(props as ComponentProps<typeof Pressable>)}
      ref={ref}
      onLayout={(event) => {
        tabOnLayout?.(event);
        onLayout();
      }}
      collapsable={false}
      testID={testID}
      accessibilityState={accessibilityState}
      style={[
        tabBarStyles.button,
        focused && {
          backgroundColor: colors.accentLight,
          borderWidth: 1,
          borderColor: colors.accentMid,
        },
        style,
      ]}>
      {props.children}
    </Pressable>
  );
}

/**
 * SOS is not a peer of the four navigation tabs: it is an emergency control that
 * keeps a permanent danger tint so it reads as a call button, not as a section.
 */
function SosTabBarButton({
  accessibilityState,
  style,
  onLayout: tabOnLayout,
  ...props
}: BottomTabBarButtonProps) {
  const { colors } = useTheme();
  const { ref, onLayout } = useHintAnchor('tab.sos');

  return (
    <Pressable
      {...(props as ComponentProps<typeof Pressable>)}
      ref={ref}
      onLayout={(event) => {
        tabOnLayout?.(event);
        onLayout();
      }}
      collapsable={false}
      testID="tab-sos"
      accessibilityState={accessibilityState}
      style={[
        tabBarStyles.button,
        tabBarStyles.emergencyButton,
        { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder },
        style,
      ]}>
      {props.children}
    </Pressable>
  );
}

const tabBarStyles = StyleSheet.create({
  shell: { flex: 1 },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginHorizontal: 2,
    minHeight: density.tapMinHeight,
  },
  emergencyButton: {
    borderWidth: 1,
    minWidth: density.tapMinHeight,
  },
});

export default function TabsLayout() {
  const { colors } = useTheme();
  const { isCompact, showTabLabels, tabBarHeight, tabBarPaddingBottom } = useResponsiveLayout();
  const { t } = useTranslation();
  const iconSize = isCompact ? 22 : 24;
  const sosSlotWidth = isCompact ? 60 : 68;

  return (
    <View style={tabBarStyles.shell}>
    <Tabs
      screenOptions={{
        headerShown: false,
        // Keep the absolute tab bar from competing with the software keyboard
        // on diary / login-adjacent forms (Expo keyboard handling guide).
        tabBarHideOnKeyboard: true,
        // Absolute tab bar disables React Navigation's default inset handling —
        // apply safe-area bottom padding ourselves (Android system nav overlap).
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBarHeight,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          borderRadius: 0,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          paddingHorizontal: 4,
          ...(Platform.OS === 'web'
            ? {
                maxWidth: 720,
                alignSelf: 'center',
                marginHorizontal: 'auto',
              }
            : null),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: showTabLabels,
        tabBarLabelStyle: {
          fontSize: isCompact ? 10 : 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingHorizontal: isCompact ? 0 : 4,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.today'),
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-home" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="home"
              focused={focused}
              color={colors.accent}
              muted={colors.textMuted}
              size={iconSize}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: t('tabs.journal'),
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-diary" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="diary"
              focused={focused}
              color={colors.accent}
              muted={colors.textMuted}
              size={iconSize}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('tabs.scan'),
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-scanner" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="scanner"
              focused={focused}
              color={colors.accent}
              muted={colors.textMuted}
              size={iconSize}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-map" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="map"
              focused={focused}
              color={colors.accent}
              muted={colors.textMuted}
              size={iconSize}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: t('tabs.sos'),
          tabBarButton: (props) => <SosTabBarButton {...props} />,
          tabBarIcon: () => (
            <BrandTabIcon name="sos" size={iconSize} color={colors.danger} focused />
          ),
          tabBarActiveTintColor: colors.danger,
          tabBarInactiveTintColor: colors.danger,
          tabBarItemStyle: { flex: 0, paddingHorizontal: 0, width: sosSlotWidth },
        }}
      />
    </Tabs>
    <HintSpotlight />
    </View>
  );
}
