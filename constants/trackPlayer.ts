import TrackPlayer, { Event, PlayerCommand, type RemoteControlConfig } from '@rntp/player';

/** Remote / notification media controls for single-track piano playback. */
export const TRACK_PLAYER_COMMANDS: RemoteControlConfig = {
    capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Seek,
        PlayerCommand.SkipForward,
        PlayerCommand.SkipBackward,
    ],
    handling: 'native',
    forwardInterval: 10,
    backwardInterval: 10,
};

export function configureTrackPlayerCommands(): void {
    TrackPlayer.setCommands(TRACK_PLAYER_COMMANDS);
}

/**
 * Re-apply media-session commands when the queue or active item changes.
 * setupPlayer() only enables play/pause; other clients can also mutate the
 * shared MPRemoteCommandCenter, so refresh after track transitions.
 */
export function registerTrackPlayerMediaSessionRefresh(): () => void {
    const refresh = () => configureTrackPlayerCommands();
    const subscriptions = [
        TrackPlayer.addEventListener(Event.QueueChanged, refresh),
        TrackPlayer.addEventListener(Event.MediaItemTransition, refresh),
        TrackPlayer.addEventListener(Event.PlaybackStateChanged, (event) => {
            if (event.state === 'ready' || event.state === 'buffering') {
                refresh();
            }
        }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
}
