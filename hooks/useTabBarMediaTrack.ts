import { useCallback, useEffect, useRef, useState } from 'react';
import TrackPlayer, { Event, MediaItem } from '@rntp/player';

const DEBUG_MEDIA_ACCESSORY = __DEV__;

export function useTabBarMediaTrack(watch: boolean): MediaItem | null {
    const [track, setTrack] = useState<MediaItem | null>(null);
    const debugSnapshotRef = useRef<string>('');

    const refreshTrack = useCallback(async () => {
        if (!watch) {
            setTrack(null);
            return;
        }
        const next = await TrackPlayer.getActiveMediaItem();
        setTrack(next);

        if (!DEBUG_MEDIA_ACCESSORY) {
            return;
        }
        try {
            const playback = await TrackPlayer.getPlaybackState();
            const index = TrackPlayer.getActiveMediaItemIndex();
            const queue = await TrackPlayer.getQueue();
            const snapshot = JSON.stringify({
                playbackState: TrackPlayer.getPlaybackState(),
                activeIndex: index ?? null,
                queueLen: queue?.length ?? 0,
                mediaId: next?.mediaId ?? null,
                title: next?.title ?? null,
                artist: next?.artist ?? null,
                artworkUrl: next?.artworkUrl ?? null,
            });
            if (snapshot !== debugSnapshotRef.current) {
                debugSnapshotRef.current = snapshot;
            }
        } catch (e) {
            console.warn('[MediaBottomAccessory:state] refresh failed', e);
        }
    }, [watch]);

    useEffect(() => {
        if (!watch) {
            return;
        }

        const playbackSub = TrackPlayer.addEventListener(Event.PlaybackStateChanged, () => {
            void refreshTrack();
        });
        const transitionSub = TrackPlayer.addEventListener(Event.MediaItemTransition, () => {
            void refreshTrack();
        });
        const queueSub = TrackPlayer.addEventListener(Event.QueueChanged, () => {
            void refreshTrack();
        });

        return () => {
            playbackSub.remove();
            transitionSub.remove();
            queueSub.remove();
        };
    }, [watch, refreshTrack]);

    useEffect(() => {
        if (!watch) {
            setTrack(null);
            return;
        }
        let alive = true;
        void refreshTrack();
        const interval = setInterval(() => {
            if (alive) void refreshTrack();
        }, 2000);
        return () => {
            alive = false;
            clearInterval(interval);
        };
    }, [watch, refreshTrack]);

    return watch ? track : null;
}
