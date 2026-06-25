import {
    authenticateLocalBroadcastPin,
    ECAMP_CHURCH_ID,
    ECAMP_HYMNSIGN_PIN,
    ECAMP_LOCAL_BROADCAST_TOKEN,
    getBroadcastTargetForChurch,
} from '@/constants/broadcastAuth';

describe('broadcastAuth', () => {
    it('authenticates the ECAMP HymnSign PIN locally', () => {
        expect(authenticateLocalBroadcastPin('0000')).toBeNull();
        expect(authenticateLocalBroadcastPin(ECAMP_HYMNSIGN_PIN)).toEqual({
            token: ECAMP_LOCAL_BROADCAST_TOKEN,
            church_id: ECAMP_CHURCH_ID,
        });
    });

    it('routes ECAMP to hymn sign and other churches to aws', () => {
        expect(getBroadcastTargetForChurch(ECAMP_CHURCH_ID)).toBe('hymnsign');
        expect(getBroadcastTargetForChurch('OTHER')).toBe('aws');
    });
});
