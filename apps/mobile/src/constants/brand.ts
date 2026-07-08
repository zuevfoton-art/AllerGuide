/** Aclearo × A-Claro — product brand constants (UI + PDF). */
export const BRAND_PRODUCT_NAME = 'A-Claro';
export const BRAND_MASTER_NAME = 'Aclearo';
export const BRAND_LEGAL_URL = 'https://aclearo.com/legal';
export const BRAND_WEBSITE_URL = 'https://aclearo.com';
export const BRAND_SUPPORT_EMAIL = 'support@aclearo.com';
export const BRAND_LOG_PREFIX = 'A-Claro';

export function doctorReportTitleRu(): string {
  return `Отчёт ${BRAND_PRODUCT_NAME} для врача`;
}

export function doctorReportPdfFooterRu(): string {
  return `Сформировано в ${BRAND_PRODUCT_NAME} · © ${BRAND_MASTER_NAME} · ${BRAND_LEGAL_URL}`;
}
