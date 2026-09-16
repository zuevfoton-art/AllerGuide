import { create } from 'zustand';

export type BannerTone = 'success' | 'error' | 'info';

/** Nightly 34451477109: Maestro must observe the snackbar after upload. */
export const BANNER_AUTO_HIDE_MS = 10_000;

export type StatusBannerState = {
  id: number;
  tone: BannerTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type BannerStore = {
  banner: StatusBannerState | null;
  show: (input: Omit<StatusBannerState, 'id'>) => void;
  hide: () => void;
};

let nextId = 1;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useBannerStore = create<BannerStore>((set) => ({
  banner: null,
  show: (input) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const id = nextId;
    nextId += 1;
    set({ banner: { ...input, id } });
    hideTimer = setTimeout(() => {
      set({ banner: null });
      hideTimer = null;
    }, BANNER_AUTO_HIDE_MS);
  },
  hide: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ banner: null });
  },
}));

export function showStatusBanner(input: Omit<StatusBannerState, 'id'>) {
  useBannerStore.getState().show(input);
}
