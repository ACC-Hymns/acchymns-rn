import { useEffect } from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { usePostHog } from 'posthog-react-native';

type PostHogIdentityProps = {
    stableUserId: string;
    user: FirebaseAuthTypes.User | null;
};

/**
 * Enriches the stable distinct_id with auth properties on login.
 * The distinct_id itself never changes — see PostHog identity resolution golden path.
 */
export function PostHogIdentity({ stableUserId, user }: PostHogIdentityProps) {
    const posthog = usePostHog();

    useEffect(() => {
        if (!posthog || !user) {
            return;
        }

        posthog.identify(stableUserId, {
            email: user.email ?? undefined,
            firebase_uid: user.uid,
        });
    }, [posthog, stableUserId, user]);

    return null;
}
