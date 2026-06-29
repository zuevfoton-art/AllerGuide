/**
 * Type declarations for modules replaced by Metro stubs (see metro.config.js).
 * Runtime uses locale-store; i18next is only initialized as a no-op in _layout.
 */
declare module 'i18next' {
  interface I18n {
    isInitialized: boolean;
    use(plugin: unknown): I18n;
    init(options?: unknown): Promise<I18n>;
  }
  const i18n: I18n;
  export default i18n;
}

declare module 'react-i18next' {
  export const initReactI18next: {
    type: string;
    init: (i18n: unknown) => void;
  };
}
