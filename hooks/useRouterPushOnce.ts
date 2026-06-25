import { useCallback, useRef } from 'react';
import { router, type Href } from 'expo-router';

const ROUTER_PUSH_DEBOUNCE_MS = 400;

export function useRouterPushOnce() {
    const isNavigatingRef = useRef(false);

    return useCallback((href: Href) => {
        if (isNavigatingRef.current) return;
        isNavigatingRef.current = true;
        router.push(href);
        setTimeout(() => {
            isNavigatingRef.current = false;
        }, ROUTER_PUSH_DEBOUNCE_MS);
    }, []);
}
