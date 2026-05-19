import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import StyledText from '@/components/StyledText';
import { router, usePathname } from 'expo-router';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import TrackPlayer, { Event, MediaItem, PlaybackState, PlaybackStateChangedEvent, useIsPlaying } from '@rntp/player';
import { useFeatureFlag } from 'posthog-react-native';

const DEBUG_MEDIA_ACCESSORY = __DEV__;

function parseMediaId(mediaId?: string) {
    if (!mediaId) return null;
    const [bookId, songId] = mediaId.split(':');
    if (!bookId || !songId) return null;
    return { bookId, songId };
}

function MediaBottomAccessoryContent({
    theme,
    track,
}: {
    theme: 'light' | 'dark';
    track: MediaItem;
}) {
    const placement = NativeTabs.BottomAccessory.usePlacement?.() ?? 'regular';
    const playing = useIsPlaying();     
    const placementLogRef = useRef<string | null>(null);

    useEffect(() => {
        if (!DEBUG_MEDIA_ACCESSORY) return;
        if (placementLogRef.current === placement) return;
        placementLogRef.current = placement;
        console.log('[MediaBottomAccessory:placement]', { placement, trackId: track.mediaId });
    }, [placement, track.mediaId]);

    const routeParams = parseMediaId(track.mediaId);
    const togglePlayback = async () => {
        if (playing) {
            TrackPlayer.pause();
            return;
        }
        await TrackPlayer.play();
    };

    return (
        <View style={[styles.regularAccessory, { backgroundColor: Colors[theme].liquidGlass }]}>
            {track.artworkUrl ? (
                <Image source={{ uri: track.artworkUrl as string }} style={styles.trackArtwork} />
            ) : (
                <View style={[styles.trackArtwork, styles.trackArtworkFallback]}>
                    <Ionicons name="musical-notes" size={16} color={Colors[theme].text} />
                </View>
            )}
            <Pressable
                style={styles.trackInfo}
                onPress={() => {
                    if (!routeParams) return;
                    router.push({
                        pathname: '/display/[id]/[number]',
                        params: {
                            id: routeParams.bookId,
                            number: routeParams.songId,
                            openSheet: String(Date.now()),
                            openPiano: '1',
                        },
                    });
                }}
            >
                <StyledText numberOfLines={1} style={[styles.trackTitle, { color: Colors[theme].text }]}>
                    {track.title || 'Now Playing'}
                </StyledText>
                <StyledText numberOfLines={1} style={[styles.trackArtist, { color: Colors[theme].artistText }]}>
                    {track.artist || 'Hymnal'}
                </StyledText>
            </Pressable>
            <Pressable style={styles.playButton} onPress={togglePlayback}>
                <Ionicons
                    name={playing ? 'pause' : 'play'}
                    size={24}
                    color={Colors[theme].text}
                />
            </Pressable>
        </View>
    );
}

/**
 * Keeps tab-bar media state in the layout so `<NativeTabs.BottomAccessory>` can be omitted when idle.
 * (Mounting BottomAccessory with null children still makes iOS reserve an empty strip.)
 */
function useTabBarMediaTrack(watch: boolean): MediaItem | null {
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
                console.log('[MediaBottomAccessory:state]', JSON.parse(snapshot));
            }
        } catch (e) {
            console.warn('[MediaBottomAccessory:state] refresh failed', e);
        }
    }, [watch]);

    TrackPlayer.addEventListener(Event.PlaybackStateChanged, () => {
        void refreshTrack();
    });
    TrackPlayer.addEventListener(Event.MediaItemTransition, () => {
        void refreshTrack();
    });
    TrackPlayer.addEventListener(Event.QueueChanged, () => {
        void refreshTrack();
    });
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

export default function TabLayout() {

    const context = useContext(HymnalContext);
    const theme = useColorScheme() ?? 'light';
    const effectiveTheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
    const pathname = usePathname();
    const isDiscoverRoute = pathname === '/discover';
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const tabBarMediaTrack = useTabBarMediaTrack(ios26DesignEnabled);
    const discoverPageFlagEnabled = useFeatureFlag('discover-page');

    const i18n = useI18n();

    return (
            <NativeTabs 
            indicatorColor={Colors[theme].primaryFaded} 
            labelVisibilityMode='labeled' 
            disableTransparentOnScrollEdge={true} 
            backgroundColor={Colors[theme].settingsButton} 
            iconColor={Colors[theme].tabIconDefault} 
            labelStyle={{ color: Colors[theme].tabIconDefault }} 
            badgeBackgroundColor={Colors[theme].primary}
            >
                {ios26DesignEnabled && tabBarMediaTrack && !isDiscoverRoute ? (
                    <NativeTabs.BottomAccessory>
                        <MediaBottomAccessoryContent theme={theme} track={tabBarMediaTrack} />
                    </NativeTabs.BottomAccessory>
                ) : null}
                <NativeTabs.Trigger name="(home)"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('home')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='home-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="search"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('search')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='search-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>

                
                {discoverPageFlagEnabled && (
                    !context?.discoverPageVisited ? (
                        <NativeTabs.Trigger name="discover"
                            contentStyle={{ backgroundColor: Colors[theme].background }}
                        >
                            <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</NativeTabs.Trigger.Label>
                            <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                            <NativeTabs.Trigger.Badge>New</NativeTabs.Trigger.Badge>
                        </NativeTabs.Trigger>
                    ) : (
                        <NativeTabs.Trigger name="discover"
                            contentStyle={{ backgroundColor: Colors[theme].background }}
                        >
                            <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</NativeTabs.Trigger.Label>
                            <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                        </NativeTabs.Trigger>
                    )
                )}
               
                <NativeTabs.Trigger name="bookmarks"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('bookmarks')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='bookmark-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="(settings)"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('settings')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name='settings-outline' />} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>
        </NativeTabs>
        );
}

const styles = StyleSheet.create({
    inlineAccessory: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 999,
    },
    regularAccessory: {
        borderRadius: 14,
        paddingVertical: 5,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    trackInfo: {
        flex: 1,
        marginRight: 12,
        marginLeft: 10,
    },
    trackArtwork: {
        width: 30,
        height: 30,
        borderRadius: 8,
    },
    trackArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackTitle: {
        fontSize: 14,
        fontWeight: '400',
    },
    trackArtist: {
        fontSize: 12,
    },
    playButton: {
        width: 38,
        height: 38,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
