import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

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
  const { colors, shadows } = useTheme();
  const { isCompact, showTabLabels, tabBarHeight } = useResponsiveLayout();
  const iconSize = isCompact ? 22 : 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? 24 : Platform.OS === 'web' ? 10 : 8,
          paddingTop: 8,
          paddingHorizontal: Platform.OS === 'web' && isCompact ? 2 : 0,
          ...(shadows.none as object),
          ...(Platform.OS === 'web'
            ? {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
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
          title: 'Главная',
          tabBarAccessibilityLabel: 'Главная',
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
          title: 'Дневник',
          tabBarAccessibilityLabel: 'Дневник',
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
          title: 'Сканер',
          tabBarAccessibilityLabel: 'Сканер аллергенов',
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
          title: 'Маркет',
          tabBarAccessibilityLabel: 'Маркет',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="bag"
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
          title: 'Карта',
          tabBarAccessibilityLabel: 'Карта мест',
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
          title: 'SOS',
          tabBarAccessibilityLabel: 'Экстренная помощь SOS',
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
