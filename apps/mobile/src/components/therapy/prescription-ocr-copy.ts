import type { PrescriptionCopyPrefix } from '@/src/components/therapy/course-editor';
import type { PrescriptionOcrHintCode } from '@/src/services/prescription-ocr-service';

const HINT_KEY: Record<PrescriptionOcrHintCode, string> = {
  cloud_failed: 'ocrCloudFailed',
  cloud_disabled: 'ocrCloudDisabled',
  empty_media: 'ocrEmptyMedia',
  fields_incomplete: 'ocrFieldsIncomplete',
  parse_error: 'ocrParseError',
  demo: 'ocrDemoHint',
};

export function prescriptionOcrHintMessage(
  t: (key: string, params?: Record<string, string>) => string,
  prefix: PrescriptionCopyPrefix,
  code: PrescriptionOcrHintCode | undefined,
  cloudError?: string,
): string | null {
  if (!code) return null;
  const key = `${prefix}.${HINT_KEY[code]}`;
  if (code === 'cloud_failed') {
    return t(key, { error: cloudError || 'error' });
  }
  return t(key);
}
