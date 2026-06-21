import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useTranslation } from '@/src/store/locale-store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  color,
  muted,
  size,
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
  muted: string;
  size: number;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={size}
      color={focused ? color : muted}
    />
  );
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
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="journal"
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
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="scan"
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: t('tabs.sos'),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="medkit"
              size={iconSize}
              color={focused ? colors.danger : colors.textMuted}
            />
          ),
          tabBarActiveTintColor: colors.danger,
        }}
      />
    </Tabs>
  );
}
