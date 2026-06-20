export const APP_LOCALES = ['ru', 'en', 'es', 'fr', 'de', 'it'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'ru';

export type LocaleMessages = {
  language: {
    title: string;
    ru: string;
    en: string;
    es: string;
    fr: string;
    de: string;
    it: string;
  };
  common: {
    cancel: string;
    delete: string;
    edit: string;
    save: string;
    loading: string;
    wait: string;
    back: string;
    more: string;
    refresh: string;
    email: string;
    phone: string;
    password: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    phoneLabel: string;
    phonePlaceholder: string;
    passwordPlaceholder: string;
    passwordMinPlaceholder: string;
    confirmPassword: string;
    confirmPasswordPlaceholder: string;
    loginButton: string;
    registerButton: string;
    noAccount: string;
    registerLink: string;
    hasAccount: string;
    loginLink: string;
    errors: {
      emailRequired: string;
      phoneRequired: string;
      emailInvalid: string;
      phoneInvalid: string;
      passwordRequired: string;
      passwordMin: string;
      passwordMismatch: string;
      wrongCredentials: string;
      emailTaken: string;
      phoneTaken: string;
      createFailed: string;
    };
  };
  profiles: {
    title: string;
    subtitle: string;
    self: string;
    child: string;
    noAllergens: string;
    edit: string;
    delete: string;
    add: string;
    logout: string;
    logoutTitle: string;
    logoutMessage: string;
    logoutConfirm: string;
    deleteTitle: string;
    deleteMessage: string;
  };
  theme: {
    title: string;
    light: string;
    dark: string;
    system: string;
  };
  tabs: {
    home: string;
    diary: string;
    scanner: string;
    market: string;
    map: string;
    sos: string;
  };
  home: {
    today: string;
    profilePrefix: string;
    selectProfile: string;
    wellnessTitle: string;
    details: string;
    pollen: string;
    air: string;
    index: string;
    diary: string;
    symptoms: string;
    symptomsSub: string;
    food: string;
    foodSub: string;
    medicine: string;
    medicineSub: string;
    expert: string;
    disclaimer: string;
  };
  diary: {
    title: string;
    subtitle: string;
    newEntry: string;
    quickAdd: string;
    history: string;
    refresh: string;
    doctorReport: string;
    disclaimer: string;
  };
  scanner: {
    title: string;
    subtitle: string;
    product: string;
    menu: string;
    medicine: string;
    cosmetics: string;
    scanBarcode: string;
    scanBarcodeDesc: string;
    scanMenu: string;
    scanMenuDesc: string;
    manualDivider: string;
    check: string;
    history: string;
    disclaimer: string;
  };
  market: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    banner: string;
    empty: string;
    disclaimer: string;
  };
  map: {
    title: string;
    subtitle: string;
    places: string;
    pollen: string;
    adair: string;
    recommended: string;
    mapWebHint: string;
    disclaimerPlaces: string;
    disclaimerPollen: string;
    disclaimerAdair: string;
  };
  settings: {
    title: string;
    subtitle: string;
    emergencyNumber: string;
    emergencyHint: string;
    saveNumber: string;
    saved: string;
    backup: string;
    backupDesc: string;
    export: string;
    import: string;
    reminder: string;
    reminderWeb: string;
    legal: string;
    privacy: string;
    terms: string;
  };
  profileSwitcher: {
    add: string;
    hint: string;
  };
};
