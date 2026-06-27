import { EcampDisplayState, ecampDisplayStateKey } from '@/scripts/ecampDisplay';

type DismissListener = (dismissedDisplayKey: string | null) => void;

let dismissedDisplayKey: string | null = null;
const listeners = new Set<DismissListener>();

function notifyListeners() {
    for (const listener of listeners) {
        listener(dismissedDisplayKey);
    }
}

export function getDismissedEcampDisplayKey(): string | null {
    return dismissedDisplayKey;
}

export function isEcampBannerDismissedForDisplay(
    display: EcampDisplayState | null,
): boolean {
    if (!display || !dismissedDisplayKey) {
        return false;
    }

    return ecampDisplayStateKey(display) === dismissedDisplayKey;
}

export function dismissEcampBanner(display: EcampDisplayState): void {
    const key = ecampDisplayStateKey(display);
    if (!key) {
        return;
    }

    dismissedDisplayKey = key;
    notifyListeners();
}

export function subscribeEcampBannerDismiss(
    listener: DismissListener,
): () => void {
    listener(dismissedDisplayKey);
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function syncEcampBannerDismissForDisplayKey(displayKey: string): void {
    if (!displayKey) {
        if (dismissedDisplayKey !== null) {
            dismissedDisplayKey = null;
            notifyListeners();
        }
        return;
    }

    if (dismissedDisplayKey && dismissedDisplayKey !== displayKey) {
        dismissedDisplayKey = null;
        notifyListeners();
    }
}
