export function createThrottledProgress(
    onProgress: ((progress: number) => void) | undefined,
    intervalMs = 120,
): (progress: number) => void {
    if (!onProgress) {
        return () => undefined;
    }

    let pending: number | undefined;
    let lastEmitTime = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const emit = (value: number) => {
        pending = undefined;
        timer = undefined;
        lastEmitTime = Date.now();
        onProgress(value);
    };

    return (progress: number) => {
        const isImmediate = progress < 0 || progress >= 100;
        if (isImmediate) {
            if (timer !== undefined) {
                clearTimeout(timer);
            }
            emit(progress);
            return;
        }

        const now = Date.now();
        if (now - lastEmitTime >= intervalMs) {
            emit(progress);
            return;
        }

        pending = progress;
        if (timer === undefined) {
            timer = setTimeout(() => {
                if (pending !== undefined) {
                    emit(pending);
                }
            }, intervalMs - (now - lastEmitTime));
        }
    };
}
