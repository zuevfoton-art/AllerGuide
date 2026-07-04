import fs from 'node:fs';

const locales = ['es', 'fr', 'de', 'it'];

for (const loc of locales) {
  const file = `apps/mobile/src/i18n/locales/${loc}.ts`;
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes('trendsTitle:')) {
    content = content.replace(
      /actPromptButton: '[^']+',\n  \},/,
      `actPromptButton: 'Complete ACT',
    trendsTitle: 'Symptom trend (7 days)',
    heatmapTitle: 'Symptom calendar',
    temporalCorrelationTitle: 'Trigger correlations (±4h)',
  },`,
    );
  }

  if (!content.includes('repeatUnsafeWarning:')) {
    content = content.replace(
      /removedFromSafe: '[^']+',\n  \},/,
      `removedFromSafe: 'Removed from safe list',
    trendsTitle: 'Scan trends (30 days)',
    repeatUnsafeWarning: 'Previously scanned as high risk.',
  },`,
    );
  }

  if (!content.includes('buyLink:')) {
    content = content.replace(
      /(disclaimer: '[^']+',)\n  \},\n  map:/,
      `$1
    buyLink: 'View product',
  },
  map:`,
    );
  }

  if (!content.includes('localBackupDesc:')) {
    content = content.replace(
      /recoveryKeyRequired: '[^']+',\n  \},\n  notifications:/,
      `recoveryKeyRequired: 'Enter your recovery key.',
    localBackupDesc: 'Export/import JSON backup on this device.',
    localBackupExportSuccess: 'Backup saved.',
    localBackupImportSuccess: 'Data restored.',
    localBackupImportTitle: 'Import data',
    localBackupImportMessage: 'Replace current data?',
    recoveryKeyBannerTitle: 'Save recovery key',
    recoveryKeyBannerDesc: 'Required for cross-device restore.',
    pollenRegionTitle: 'Pollen region',
    pollenRegionHint: 'When GPS unavailable',
    locationDefaultHint: 'Default region',
    appLockTitle: 'App lock',
    appLockHint: 'Biometrics for SOS and diary',
    appLockEnable: 'Enable',
    appLockDisable: 'Disable',
  },
  legal: {
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Service',
    privacyBody: '',
    termsBody: '',
  },
  notifications:`,
    );
  }

  if (!content.includes('map: {') || !content.match(/onboardingIntro:[\s\S]*map:/)) {
    content = content.replace(
      /(care: \{[\s\S]*?\},)\n    \},\n  \},\n  profileSetup:/,
      `$1
      map: { title: 'Map & environment', desc: 'Places, pollen calendar and clinics.' },
      sos: { title: 'Emergency SOS', desc: 'Allergy passport and emergency contacts.' },
    },
  },
  profileSetup:`,
    );
  }

  fs.writeFileSync(file, content);
  console.log('patched', loc);
}
