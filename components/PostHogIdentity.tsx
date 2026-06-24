import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';

type PostHogIdentityProps = {
    stableUserId: string;
    onFeatureFlagsReady?: () => void;
};

/**
 * Enriches the stable distinct_id with auth properties on login.
 * The distinct_id itself never changes — see PostHog identity resolution golden path.
 */
export function PostHogIdentity({ stableUserId, onFeatureFlagsReady }: PostHogIdentityProps) {
    const posthog = usePostHog();

    useEffect(() => {
        if (!posthog) {
            return;
        }

        posthog.identify(stableUserId);
    }, [posthog, stableUserId]);

    useEffect(() => {
        if (!posthog || !onFeatureFlagsReady) {
            return;
        }

        let cancelled = false;
        const notifyReady = () => {
            if (cancelled) {
                return;
            }
            onFeatureFlagsReady();
        };

        if (posthog.getFeatureFlags()) {
            notifyReady();
            return;
        }

        const unsubscribe = posthog.onFeatureFlags(notifyReady);
        const timeout = setTimeout(notifyReady, 4000);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            unsubscribe?.();
        };
    }, [posthog, onFeatureFlagsReady]);

    return null;
}
