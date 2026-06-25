import { BroadcastTarget, DEFAULT_HYMNSIGN_PORT } from '@/constants/displayCommand';

/** PIN that authenticates ECAMP church broadcasts via the local HymnSign. */
export const ECAMP_HYMNSIGN_PIN = '6132';

export const ECAMP_CHURCH_ID = 'ECAMP';

/** Local token stored for ECAMP HymnSign sessions (not validated by AWS Lambda). */
export const ECAMP_LOCAL_BROADCAST_TOKEN = 'local:ecamp-hymnsign';

/** HymnSign WebSocket host on the ECAMP church LAN. */
export const ECAMP_HYMNSIGN_HOST = '192.168.2.102';

export function isLocalBroadcastToken(token: string | null | undefined): boolean {
    return token === ECAMP_LOCAL_BROADCAST_TOKEN;
}

export function isEcampHymnSignChurch(churchId: string | null | undefined): boolean {
    return churchId === ECAMP_CHURCH_ID;
}

export function getBroadcastTargetForChurch(churchId: string | null | undefined): BroadcastTarget {
    return isEcampHymnSignChurch(churchId) ? 'hymnsign' : 'aws';
}

export function getHymnSignHostForChurch(
    churchId: string | null | undefined,
    configuredHost?: string | null,
): string | null {
    if (!isEcampHymnSignChurch(churchId)) {
        return null;
    }

    const host = configuredHost?.trim();
    return host || ECAMP_HYMNSIGN_HOST;
}

export function getHymnSignPortForChurch(configuredPort?: number | null): number {
    if (configuredPort && configuredPort > 0) {
        return configuredPort;
    }

    return DEFAULT_HYMNSIGN_PORT;
}

export type LocalBroadcastAuth = {
    token: string;
    church_id: string;
};

export function authenticateLocalBroadcastPin(pin: string): LocalBroadcastAuth | null {
    if (pin !== ECAMP_HYMNSIGN_PIN) {
        return null;
    }

    return {
        token: ECAMP_LOCAL_BROADCAST_TOKEN,
        church_id: ECAMP_CHURCH_ID,
    };
}
