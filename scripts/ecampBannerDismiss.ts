import { EcampDisplayState, ecampDisplaySongKey } from '@/scripts/ecampDisplay';

type DismissListener = (dismissedSongKey: string | null) => void;

let dismissedSongKey: string | null = null;
const listeners = new Set<DismissListener>();

function notifyListeners() {
    for (const listener of listeners) {
        listener(dismissedSongKey);
    }
}

export function getDismissedEcampSongKey(): string | null {
    return dismissedSongKey;
}

export function isEcampBannerDismissedForDisplay(
    display: EcampDisplayState | null,
): boolean {
    if (!display || !dismissedSongKey) {
        return false;
    }

    return ecampDisplaySongKey(display) === dismissedSongKey;
}

export function dismissEcampBanner(display: EcampDisplayState): void {
    const key = ecampDisplaySongKey(display);
    if (!key) {
        return;
    }

    dismissedSongKey = key;
    notifyListeners();
}

export function subscribeEcampBannerDismiss(
    listener: DismissListener,
): () => void {
    listener(dismissedSongKey);
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function syncEcampBannerDismissForSongKey(songKey: string): void {
    if (!songKey) {
        return;
    }

    if (dismissedSongKey && dismissedSongKey !== songKey) {
        dismissedSongKey = null;
        notifyListeners();
    }
}
