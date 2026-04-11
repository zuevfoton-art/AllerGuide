import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: 'Главная' }} />
      <Tabs.Screen name="diary" options={{ title: 'Дневник' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Сканер' }} />
      <Tabs.Screen name="market" options={{ title: 'Маркет' }} />
      <Tabs.Screen name="map" options={{ title: 'Карта' }} />
      <Tabs.Screen name="sos" options={{ title: 'SOS' }} />
    </Tabs>
  );
}
