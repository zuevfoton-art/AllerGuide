// Native entry (Gradle `entryFile`). Runtime patches first — see src/install-runtime.
import './src/install-runtime';
import '@expo/metro-runtime';

import { Head } from 'expo-router/build/head';
import { ExpoRoot } from 'expo-router/build/ExpoRoot';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import React from 'react';

const ctx = require.context(
  './app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)))\.[tj]sx?$).*(?:\.ios|\.web)?\.[tj]sx?$/,
  process.env.EXPO_ROUTER_IMPORT_MODE
);

function App() {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} />
    </Head.Provider>
  );
}

renderRootComponent(App);
