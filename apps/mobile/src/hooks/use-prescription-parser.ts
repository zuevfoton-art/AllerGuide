import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { PrescriptionParseResult } from '@allerguide/ai';
import {
  shouldKeepOcrTextModal,
  shouldOpenManualParse,
  type PrescriptionCopyPrefix,
} from '@/src/components/therapy/course-editor';
import { prescriptionOcrHintMessage } from '@/src/components/therapy/prescription-ocr-copy';
import { pickPrescriptionPdf } from '@/src/services/prescription-photo-service';
import {
  recognizePrescription,
  type PrescriptionOcrHintCode,
} from '@/src/services/prescription-ocr-service';
import { useTranslation } from '@/src/store/locale-store';

export type PrescriptionMediaFields = {
  prescriptionPhotoUri?: string;
  prescriptionDocUri?: string;
};

export function usePrescriptionParser<T extends PrescriptionMediaFields>(options: {
  course: T;
  setCourse: Dispatch<SetStateAction<T>>;
  applyParse: (prev: T, parsed: PrescriptionParseResult) => T;
  copyPrefix: PrescriptionCopyPrefix;
}) {
  const { course, setCourse, applyParse, copyPrefix } = options;
  const { t } = useTranslation();
  const [parsing, setParsing] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseTextOpen, setParseTextOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const hintFromCode = useCallback(
    (code: PrescriptionOcrHintCode | undefined, cloudError?: string) =>
      prescriptionOcrHintMessage(t, copyPrefix, code, cloudError),
    [copyPrefix, t],
  );

  const onPhotoCaptured = useCallback(
    (uri: string) => {
      setCameraOpen(false);
      setCourse((prev) => ({ ...prev, prescriptionPhotoUri: uri }));
      setOcrHint(null);
    },
    [setCourse],
  );

  const pickPdf = useCallback(async () => {
    const uri = await pickPrescriptionPdf();
    if (!uri) return;
    setCourse((prev) => ({ ...prev, prescriptionDocUri: uri }));
    setOcrHint(null);
  }, [setCourse]);

  const applyOcrOutcome = useCallback(
    async (manualText?: string) => {
      setParsing(true);
      setOcrHint(null);
      try {
        const outcome = await recognizePrescription({
          photoUri: course.prescriptionPhotoUri,
          pdfUri: course.prescriptionDocUri,
          manualText,
        });
        setCourse((prev) => applyParse(prev, outcome.parsed));
        if (outcome.text) setParseText(outcome.text);
        setOcrHint(hintFromCode(outcome.hintCode, outcome.cloudError));
        setParseTextOpen(shouldKeepOcrTextModal(outcome.hintCode, outcome.text));
      } catch {
        setOcrHint(t(`${copyPrefix}.ocrParseError`));
        setParseTextOpen(true);
      } finally {
        setParsing(false);
      }
    },
    [
      applyParse,
      copyPrefix,
      course.prescriptionDocUri,
      course.prescriptionPhotoUri,
      hintFromCode,
      setCourse,
      t,
    ],
  );

  const startRecognize = useCallback(() => {
    if (
      shouldOpenManualParse(
        Boolean(course.prescriptionPhotoUri),
        Boolean(course.prescriptionDocUri),
      )
    ) {
      setParseTextOpen(true);
      return;
    }
    void applyOcrOutcome();
  }, [applyOcrOutcome, course.prescriptionDocUri, course.prescriptionPhotoUri]);

  return {
    parsing,
    parseText,
    setParseText,
    parseTextOpen,
    setParseTextOpen,
    cameraOpen,
    setCameraOpen,
    ocrHint,
    onPhotoCaptured,
    pickPdf,
    applyOcrOutcome,
    startRecognize,
  };
}
