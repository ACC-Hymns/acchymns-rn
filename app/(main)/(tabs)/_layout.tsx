import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import { useHymnalUpdates } from '@/hooks/useHymnalUpdates';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import StyledText from '@/components/StyledText';
import { router, usePathname } from 'expo-router';
import { isIOS26DesignEnabled } from '@/constants/iosDesign';
import { useTabBarMediaTrack } from '@/hooks/useTabBarMediaTrack';
import TrackPlayer, { MediaItem, useIsPlaying } from '@rntp/player';
import { useFeatureFlag } from 'posthog-react-native';
import Ionicons from '@react-native-vector-icons/ionicons'

function parseMediaId(mediaId?: string) {
    if (!mediaId) return null;
    const [bookId, songId] = mediaId.split(':');
    if (!bookId || !songId) return null;
    return { bookId, songId };
}

const BOTTOM_ACCESSORY_REMOUNT_DELAY_MS = 150;
const REGULAR_COLLAPSED_HEIGHT = 8;

type BottomAccessoryLayoutContextValue = {
    activePlacement: 'regular' | 'inline';
    usesDualPlacement: boolean;
    setRegularHeight: (height: number) => void;
};

const BottomAccessoryLayoutContext = createContext<BottomAccessoryLayoutContextValue>({
    activePlacement: 'regular',
    usesDualPlacement: false,
    setRegularHeight: () => {},
});

/**
 * Fully unmounts the bottom accessory while the window resizes, then remounts once
 * dimensions settle. Matches a fresh launch layout without reloading the app.
 */
function useBottomAccessoryRemountOnResize(enabled: boolean) {
    const { width, height } = useWindowDimensions();
    const [mounted, setMounted] = useState(true);
    const [mountKey, setMountKey] = useState(0);
    const remountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipInitialResizeRef = useRef(true);

    useEffect(() => {

        if (!enabled) {
            setMounted(true);
            return;
        }

        if (skipInitialResizeRef.current) {
            skipInitialResizeRef.current = false;
            return;
        }

        setMounted(false);

        if (remountTimerRef.current) {
            clearTimeout(remountTimerRef.current);
        }

        remountTimerRef.current = setTimeout(() => {
            setMountKey((key) => key + 1);
            setMounted(true);
            remountTimerRef.current = null;
        }, BOTTOM_ACCESSORY_REMOUNT_DELAY_MS);

        return () => {
            if (remountTimerRef.current) {
                clearTimeout(remountTimerRef.current);
            }
        };
    }, [enabled, width, height]);

    return { mounted, mountKey };
}

function RegularAccessoryPlayer({
    theme,
    track,
    playing,
    onTogglePlayback,
    onOpenTrack,
    onLayout,
}: {
    theme: 'light' | 'dark';
    track: MediaItem;
    playing: boolean;
    onTogglePlayback: () => void;
    onOpenTrack: () => void;
    onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
}) {
    return (
        <View
            pointerEvents="box-none"
            style={styles.measurementRoot}
            collapsable={false}
            onLayout={onLayout}
        >
            <View style={[styles.regularAccessorySlot, { backgroundColor: Colors[theme].liquidGlass }]}>
                <View style={styles.regularAccessory}>
                    {track.artworkUrl ? (
                        <Image source={{ uri: track.artworkUrl as string }} style={styles.trackArtwork} />
                    ) : (
                        <View style={[styles.trackArtwork, styles.trackArtworkFallback]}>
                            <Ionicons name="musical-notes" size={16} color={Colors[theme].text} />
                        </View>
                    )}
                    <Pressable style={styles.trackInfo} onPress={onOpenTrack}>
                        <StyledText numberOfLines={1} style={[styles.trackTitle, { color: Colors[theme].text }]}>
                            {track.title || 'Now Playing'}
                        </StyledText>
                        <StyledText numberOfLines={1} style={[styles.trackArtist, { color: Colors[theme].artistText }]}>
                            {track.artist || 'Hymnal'}
                        </StyledText>
                    </Pressable>
                </View>
                <Pressable style={styles.playButton} onPress={onTogglePlayback}>
                    <Ionicons
                        name={playing ? 'pause' : 'play'}
                        size={22}
                        color={Colors[theme].text}
                    />
                </Pressable>
            </View>
        </View>
    );
}

function MediaBottomAccessoryContent({
    theme,
    track,
    playing,
    onTogglePlayback,
    onOpenTrack,
}: {
    theme: 'light' | 'dark';
    track: MediaItem;
    playing: boolean;
    onTogglePlayback: () => void;
    onOpenTrack: () => void;
}) {
    const placement = NativeTabs.BottomAccessory.usePlacement?.() ?? 'regular';
    const { activePlacement, usesDualPlacement, setRegularHeight } = useContext(BottomAccessoryLayoutContext);

    const handleRegularLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
        setRegularHeight(event.nativeEvent.layout.height);
    }, [setRegularHeight]);

    const regularPlayerProps = {
        theme,
        track,
        playing,
        onTogglePlayback,
        onOpenTrack,
    };

    // RN 0.82+ mounts regular + inline accessory content at once. Native toggles visibility
    // with layer opacity, but the inline layer stays on top and still receives touches.
    // When regular is active, mirror the full player in the inline slot so taps reach controls.
    if (placement === 'inline') {
        if (activePlacement === 'inline') {
            return (
                <View pointerEvents="box-none" style={styles.measurementRoot} collapsable={false}>
                    <Pressable
                        style={[styles.inlineAccessory, { backgroundColor: Colors[theme].liquidGlass }]}
                        onPress={onTogglePlayback}
                        accessibilityLabel={playing ? 'Pause' : 'Play'}
                    >
                        <Ionicons
                            name={playing ? 'pause' : 'play'}
                            size={20}
                            color={Colors[theme].text}
                        />
                    </Pressable>
                </View>
            );
        }

        return <RegularAccessoryPlayer {...regularPlayerProps} />;
    }

    if (activePlacement === 'inline') {
        return <View pointerEvents="none" style={styles.measurementRoot} collapsable={false} />;
    }

    return (
        <RegularAccessoryPlayer
            {...regularPlayerProps}
            onLayout={usesDualPlacement ? handleRegularLayout : undefined}
        />
    );
}

export default function TabLayout() {

    const context = useContext(HymnalContext);
    const theme = useColorScheme() ?? 'light';
    const effectiveTheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
    const pathname = usePathname();
    const isDiscoverRoute = pathname === '/discover';
    const ios26DesignEnabled = isIOS26DesignEnabled();
    const tabBarMediaTrack = useTabBarMediaTrack(ios26DesignEnabled);
    const { mounted: bottomAccessoryMounted, mountKey: bottomAccessoryMountKey } =
        useBottomAccessoryRemountOnResize(Platform.OS === 'ios' && Platform.isPad);
    const showBottomAccessory =
        ios26DesignEnabled && tabBarMediaTrack && !isDiscoverRoute && bottomAccessoryMounted;
    const discoverPageFlagEnabled = useFeatureFlag('discover-page');

    const i18n = useI18n();
    const { data: hymnalUpdates } = useHymnalUpdates();
    const hymnalUpdateCount = hymnalUpdates?.outdatedHymnals.length ?? 0;
    const hymnalUpdateBadge = hymnalUpdateCount > 0
        ? (hymnalUpdateCount > 9 ? '9+' : String(hymnalUpdateCount))
        : null;
    const [regularAccessoryHeight, setRegularAccessoryHeight] = useState<number | null>(null);
    const usesDualPlacement = Platform.OS === 'ios';
    const activePlacement: 'regular' | 'inline' =
        !usesDualPlacement || regularAccessoryHeight === null || regularAccessoryHeight >= REGULAR_COLLAPSED_HEIGHT
            ? 'regular'
            : 'inline';
    const bottomAccessoryLayoutContext = useMemo(
        () => ({
            activePlacement,
            usesDualPlacement,
            setRegularHeight: setRegularAccessoryHeight,
        }),
        [activePlacement, usesDualPlacement],
    );

    const playing = useIsPlaying();
    const openBottomAccessoryTrack = useCallback(() => {
        const routeParams = parseMediaId(tabBarMediaTrack?.mediaId);
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
    }, [tabBarMediaTrack?.mediaId]);
    const toggleBottomAccessoryPlayback = useCallback(async () => {
        if (playing) {
            await TrackPlayer.pause();
            return;
        }
        await TrackPlayer.play();
    }, [playing]);

    useEffect(() => {
        if (!bottomAccessoryMounted || !usesDualPlacement) {
            setRegularAccessoryHeight(null);
        }
    }, [bottomAccessoryMounted, usesDualPlacement]);

    return (
        <BottomAccessoryLayoutContext.Provider value={bottomAccessoryLayoutContext}>
            <NativeTabs 
            indicatorColor={Colors[theme].primaryFaded} 
            labelVisibilityMode='labeled' 
            disableTransparentOnScrollEdge={true} 
            backgroundColor={Colors[theme].settingsButton} 
            iconColor={Colors[theme].tabIconDefault} 
            labelStyle={{ color: Colors[theme].tabIconDefault }} 
            badgeBackgroundColor={Colors[theme].primary}
            >
                {showBottomAccessory ? (
                    <NativeTabs.BottomAccessory key={bottomAccessoryMountKey}>
                        <MediaBottomAccessoryContent
                            theme={theme}
                            track={tabBarMediaTrack}
                            playing={playing}
                            onTogglePlayback={toggleBottomAccessoryPlayback}
                            onOpenTrack={openBottomAccessoryTrack}
                        />
                    </NativeTabs.BottomAccessory>
                ) : null}
                <NativeTabs.Trigger name="(home)"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('home')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={{
                        default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='home-outline' />,
                        selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='home' />,
                    }} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="search"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('search')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={{
                        default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='search-outline' />,
                        selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='search' />,
                    }} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>

                
                {discoverPageFlagEnabled && (
                    context?.discoverPageVisited !== true ? (
                        <NativeTabs.Trigger name="discover"
                            contentStyle={{ backgroundColor: Colors[theme].background }}
                        >
                            <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</NativeTabs.Trigger.Label>
                            <NativeTabs.Trigger.Icon src={{
                                default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope-outline' />,
                                selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope' />,
                            }} selectedColor={Colors[theme].tabIconSelected} />
                            <NativeTabs.Trigger.Badge>New</NativeTabs.Trigger.Badge>
                        </NativeTabs.Trigger>
                    ) : (
                        <NativeTabs.Trigger name="discover"
                            contentStyle={{ backgroundColor: Colors[theme].background }}
                        >
                            <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('discover')}</NativeTabs.Trigger.Label>
                            <NativeTabs.Trigger.Icon src={{
                                default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope-outline' />,
                                selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='telescope' />,
                            }} selectedColor={Colors[theme].tabIconSelected} />
                        </NativeTabs.Trigger>
                    )
                )}
               
                <NativeTabs.Trigger name="bookmarks"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('bookmarks')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={{
                        default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='bookmark-outline' />,
                        selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='bookmark' />,
                    }} selectedColor={Colors[theme].tabIconSelected} />
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="(settings)"
                    contentStyle={{ backgroundColor: Colors[theme].background }}
                >
                    <NativeTabs.Trigger.Label selectedStyle={{ color: Colors[theme].text }}>{i18n.t('settings')}</NativeTabs.Trigger.Label>
                    <NativeTabs.Trigger.Icon src={{
                        default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='settings-outline' />,
                        selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name='settings' />,
                    }} selectedColor={Colors[theme].tabIconSelected} />
                    {hymnalUpdateBadge ? (
                        <NativeTabs.Trigger.Badge>{hymnalUpdateBadge}</NativeTabs.Trigger.Badge>
                    ) : null}
                </NativeTabs.Trigger>
        </NativeTabs>
        </BottomAccessoryLayoutContext.Provider>
        );
}

const styles = StyleSheet.create({
    measurementRoot: {
        ...StyleSheet.absoluteFill,
    },
    inlineAccessory: {
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 999,
    },
    regularAccessorySlot: {
        ...StyleSheet.absoluteFill,
        borderRadius: 14,
        overflow: 'hidden',
    },
    regularAccessory: {
        flex: 1,
        paddingLeft: 16,
        paddingRight: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackInfo: {
        flex: 1,
        minWidth: 0,
        marginRight: 12,
        marginLeft: 10,
        justifyContent: 'center',
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
        position: 'absolute',
        right: 8,
        top: 0,
        bottom: 0,
        width: 34,
        zIndex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
