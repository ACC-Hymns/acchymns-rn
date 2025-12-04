import TrackPlayer from 'react-native-track-player';

// Module-scoped flag to ensure we only call setupPlayer once during the JS runtime.
let _playerIsSetup = false;

export const isPlayerSetup = () => _playerIsSetup;

/**
 * Ensures TrackPlayer is set up exactly once per JS runtime.
 * Uses a module-level flag so repeated calls are NOPs after the first successful setup.
 */
export async function ensurePlayerSetup(): Promise<void> {
    if (_playerIsSetup) return;

    try {
        await TrackPlayer.setupPlayer();
        _playerIsSetup = true;
    } catch (error) {
        // Forward the error but log for easier debugging.
        console.error('ensurePlayerSetup error:', error);
        throw error;
    }
}

// For tests/debugging we can clear the flag (not exported by default).
export function _resetPlayerSetupForTests() {
    _playerIsSetup = false;
}
