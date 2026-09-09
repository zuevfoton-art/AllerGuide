import { HINT_TOUR_IDS, type HintTourId } from '@allerguide/core';
import type { HintStepView } from '@/src/store/hints-store';

export type HintTourStepDef = {
  id: string;
  anchorId: string;
  titleKey: string;
  bodyKey: string;
};

export const HINT_TOURS: Record<HintTourId, HintTourStepDef[]> = {
  home: [
    {
      id: 'profile',
      anchorId: 'home.profile',
      titleKey: 'hints.tours.home.profile.title',
      bodyKey: 'hints.tours.home.profile.body',
    },
    {
      id: 'wellness',
      anchorId: 'home.wellness',
      titleKey: 'hints.tours.home.wellness.title',
      bodyKey: 'hints.tours.home.wellness.body',
    },
    {
      id: 'insights',
      anchorId: 'home.insights',
      titleKey: 'hints.tours.home.insights.title',
      bodyKey: 'hints.tours.home.insights.body',
    },
    {
      id: 'scanner',
      anchorId: 'tab.scanner',
      titleKey: 'hints.tours.home.scanner.title',
      bodyKey: 'hints.tours.home.scanner.body',
    },
    {
      id: 'sos',
      anchorId: 'tab.sos',
      titleKey: 'hints.tours.home.sos.title',
      bodyKey: 'hints.tours.home.sos.body',
    },
  ],
  diary: [
    {
      id: 'newEntry',
      anchorId: 'diary.newEntry',
      titleKey: 'hints.tours.diary.newEntry.title',
      bodyKey: 'hints.tours.diary.newEntry.body',
    },
    {
      id: 'course',
      anchorId: 'diary.course',
      titleKey: 'hints.tours.diary.course.title',
      bodyKey: 'hints.tours.diary.course.body',
    },
    {
      id: 'report',
      anchorId: 'diary.report',
      titleKey: 'hints.tours.diary.report.title',
      bodyKey: 'hints.tours.diary.report.body',
    },
  ],
  scanner: [
    {
      id: 'photo',
      anchorId: 'scanner.photo',
      titleKey: 'hints.tours.scanner.photo.title',
      bodyKey: 'hints.tours.scanner.photo.body',
    },
    {
      id: 'barcode',
      anchorId: 'scanner.barcode',
      titleKey: 'hints.tours.scanner.barcode.title',
      bodyKey: 'hints.tours.scanner.barcode.body',
    },
    {
      id: 'manual',
      anchorId: 'scanner.manual',
      titleKey: 'hints.tours.scanner.manual.title',
      bodyKey: 'hints.tours.scanner.manual.body',
    },
  ],
  map: [
    {
      id: 'status',
      anchorId: 'map.status',
      titleKey: 'hints.tours.map.status.title',
      bodyKey: 'hints.tours.map.status.body',
    },
    {
      id: 'layers',
      anchorId: 'map.layers',
      titleKey: 'hints.tours.map.layers.title',
      bodyKey: 'hints.tours.map.layers.body',
    },
  ],
  sos: [
    {
      id: 'call',
      anchorId: 'sos.call',
      titleKey: 'hints.tours.sos.call.title',
      bodyKey: 'hints.tours.sos.call.body',
    },
    {
      id: 'passport',
      anchorId: 'sos.passport',
      titleKey: 'hints.tours.sos.passport.title',
      bodyKey: 'hints.tours.sos.passport.body',
    },
    {
      id: 'contacts',
      anchorId: 'sos.contacts',
      titleKey: 'hints.tours.sos.contacts.title',
      bodyKey: 'hints.tours.sos.contacts.body',
    },
  ],
};

export function resolveHintTourSteps(
  tourId: HintTourId,
  t: (key: string) => string,
): HintStepView[] {
  return HINT_TOURS[tourId].map((step) => ({
    id: step.id,
    anchorId: step.anchorId,
    title: t(step.titleKey),
    body: t(step.bodyKey),
  }));
}

export function listHintTourIds(): readonly HintTourId[] {
  return HINT_TOUR_IDS;
}
