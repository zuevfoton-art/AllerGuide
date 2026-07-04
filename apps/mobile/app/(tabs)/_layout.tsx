import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useTranslation } from '@/src/store/locale-store';
import { BrandTabIcon, BrandFeatureIcon, type BrandTabIconName } from '@/src/components/brand/BrandTabIcon';

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

function TabBarButton({ testID, ...props }: BottomTabBarButtonProps & { testID: string }) {
  // BottomTabBarButtonProps ref typing is wider than Pressable; safe at runtime.
  return <Pressable {...(props as ComponentProps<typeof Pressable>)} testID={testID} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { isCompact, showTabLabels, tabBarHeight } = useResponsiveLayout();
  const { t } = useTranslation();
  const iconSize = isCompact ? 22 : 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          paddingBottom: Platform.OS === 'ios' ? 22 : Platform.OS === 'web' ? 8 : 6,
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
          title: t('tabs.home'),
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
          title: t('tabs.diary'),
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
          title: t('tabs.scanner'),
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
        name="market"
        options={{
          title: t('tabs.market'),
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-market" />,
          tabBarIcon: ({ focused }) => (
            <BrandFeatureIcon
              name="market"
              size={iconSize}
              color={focused ? colors.accent : colors.textMuted}
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
          tabBarButton: (props) => <TabBarButton {...props} testID="tab-sos" />,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="sos"
              focused={focused}
              color={colors.danger}
              muted={colors.textMuted}
              size={iconSize}
            />
          ),
          tabBarActiveTintColor: colors.danger,
        }}
      />
    </Tabs>
  );
}
