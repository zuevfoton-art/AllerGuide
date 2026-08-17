import { describe, expect, it } from 'vitest';
import { APP_LOCALES } from '@/src/i18n/types';
import { getLegalDocs } from '@/src/i18n/legal-docs';

describe('getLegalDocs', () => {
  it('returns a distinct document for each of the six locales (no EN fallback)', () => {
    const english = getLegalDocs('en');

    for (const locale of APP_LOCALES) {
      const docs = getLegalDocs(locale);
      expect(docs.privacyTitle.trim().length).toBeGreaterThan(0);
      expect(docs.termsTitle.trim().length).toBeGreaterThan(0);
      expect(docs.privacyBody.trim().length).toBeGreaterThan(0);
      expect(docs.termsBody.trim().length).toBeGreaterThan(0);

      if (locale === 'en') continue;
      expect(docs.privacyTitle).not.toBe(english.privacyTitle);
      expect(docs.termsTitle).not.toBe(english.termsTitle);
      expect(docs.privacyBody).not.toBe(english.privacyBody);
      expect(docs.termsBody).not.toBe(english.termsBody);
    }
  });

  it('marks de/es/fr/it drafts as pending legal review', () => {
    expect(getLegalDocs('de').privacyBody).toMatch(/juristische Prüfung \(P3\.3\)/);
    expect(getLegalDocs('es').privacyBody).toMatch(/revisión jurídica \(P3\.3\)/);
    expect(getLegalDocs('fr').privacyBody).toMatch(/relecture juridique \(P3\.3\)/);
    expect(getLegalDocs('it').privacyBody).toMatch(/revisione legale \(P3\.3\)/);
  });
});
