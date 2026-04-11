import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDb } from '@/src/db/init';

export default function RootLayout() {
  useEffect(() => {
    initDb();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
