import type { ExpertArticleCategory } from '@allerguide/core';

export type LocalizedDiaryStep = {
  label: string;
  placeholder?: string;
  choices?: string[];
};

export type LocalizedDiarySection = {
  title: string;
  steps: Record<string, LocalizedDiaryStep>;
};

/** Keys are Russian diary type strings stored in the database */
export type DiarySectionContentMap = Record<string, LocalizedDiarySection>;

export type LocalizedExpertArticle = {
  title: string;
  summary: string;
  body: string;
};

export type LocaleContent = {
  diarySections: DiarySectionContentMap;
  diaryTypes: Record<string, string>;
  reportBlocks: Record<string, string>;
  emergencyRelations: Record<string, string>;
  allergenCategories: Record<string, string>;
  allergyConditions: Record<string, { label: string; description?: string }>;
  expertHero: { name: string; role: string; subtitle: string };
  expertDisclaimer: string;
  expertCategories: Record<ExpertArticleCategory, string>;
  expertArticles: Record<string, LocalizedExpertArticle>;
  wellness: {
    status: Record<string, { title: string; summary: string }>;
    pollenTier: Record<string, string>;
    aqiTier: Record<string, string> & { noData?: string };
    recommendations: Record<string, { title: string; text: string }> & {
      symptomsWeek: { title: string; text: string };
      clinicalScale: { title: string; text: string };
      crossReaction: { title: string; text: string };
    };
    pollenLabels: Record<string, string>;
    locationDefault: string;
    envUnavailableSummary: string;
  };
  scanner: {
    verdicts: Record<string, string>;
    reasons: Record<string, string>;
    crossSuffix: string;
    traceSuffix: string;
    productNotFound: string;
    restaurantMenu: string;
  };
  diaryValidation: {
    fillField: string;
    noDescription: string;
  };
};
