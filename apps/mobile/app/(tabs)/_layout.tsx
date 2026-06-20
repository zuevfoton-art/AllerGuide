import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  focused,
  color,
  muted,
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
  muted: string;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={24}
      color={focused ? color : muted}
    />
  );
}

export default function TabsLayout() {
  const { colors, shadows } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...(shadows.none as object),
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} color={colors.accent} muted={colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Дневник',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="journal" focused={focused} color={colors.accent} muted={colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Сканер',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="scan" focused={focused} color={colors.accent} muted={colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Маркет',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bag" focused={focused} color={colors.accent} muted={colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Карта',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="map" focused={focused} color={colors.accent} muted={colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ focused }) => (
            <Ionicons name="medkit" size={24} color={focused ? colors.danger : colors.textMuted} />
          ),
          tabBarActiveTintColor: colors.danger,
        }}
      />
    </Tabs>
  );
}
