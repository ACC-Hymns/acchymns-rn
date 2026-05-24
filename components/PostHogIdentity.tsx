import { useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';

type PostHogIdentityProps = {
    stableUserId: string;
};

/**
 * Enriches the stable distinct_id with auth properties on login.
 * The distinct_id itself never changes — see PostHog identity resolution golden path.
 */
export function PostHogIdentity({ stableUserId }: PostHogIdentityProps) {
    const posthog = usePostHog();

    useEffect(() => {
        if (!posthog) {
            return;
        }

        posthog.identify(stableUserId);
    }, [posthog, stableUserId]);

    return null;
}
