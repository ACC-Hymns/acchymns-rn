import { DownloadProgressContext, HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useI18n } from '@/hooks/useI18n';
import { downloadHymnal, isHymnalDownloading, registerHymnalInstallCompletion, unregisterHymnalInstallCompletion } from '@/scripts/hymnals';
import { RemoteHymnalPackage } from '@/scripts/hymnalUpdates';
import Ionicons from '@react-native-vector-icons/ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';
import React, { useContext } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import StyledText from './StyledText';

const ProgressLine = ({ progress, isIntermediate }: { progress: number; isIntermediate: boolean }) => {
    const animatedWidth = React.useRef(new Animated.Value(0)).current;
    const slideAnimation = React.useRef(new Animated.Value(0)).current;
    const [containerWidth, setContainerWidth] = React.useState(Dimensions.get('window').width);
    const segmentWidth = 100;

    React.useEffect(() => {
        const targetProgress = Math.min(Math.max(progress, 0), 100);
        Animated.spring(animatedWidth, {
            toValue: targetProgress,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    React.useEffect(() => {
        if (isIntermediate) {
            slideAnimation.setValue(0);
            const slide = Animated.loop(
                Animated.sequence([
                    Animated.timing(slideAnimation, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnimation, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            );
            slide.start();
            return () => slide.stop();
        }

        slideAnimation.setValue(0);
    }, [isIntermediate, slideAnimation]);

    const widthInterpolate = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const slideTranslateX = slideAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [-segmentWidth, containerWidth + segmentWidth],
    });

    return (
        <View
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                if (width > 0) {
                    setContainerWidth(width);
                }
            }}
            style={styles.progressTrack}
        >
            {!isIntermediate && (
                <Animated.View style={[styles.progressFill, { width: widthInterpolate }]} />
            )}
            {isIntermediate && (
                <View style={styles.progressIntermediateContainer}>
                    <Animated.View
                        style={[
                            styles.progressIntermediateSegment,
                            { transform: [{ translateX: slideTranslateX }] },
                        ]}
                    />
                </View>
            )}
        </View>
    );
};

type HymnalPackageRowProps = {
    item: RemoteHymnalPackage;
    bookSummary?: BookSummary;
    mode: 'download' | 'update';
    onComplete?: () => void;
};

export default function HymnalPackageRow({ item, bookSummary, mode, onComplete }: HymnalPackageRowProps) {
    const context = useContext(HymnalContext);
    const downloadProgressValues = useContext(DownloadProgressContext);
    const posthog = usePostHog();
    const i18n = useI18n();

    const hymnalId = item.id;
    const bookData = bookSummary || context?.BOOK_DATA?.[item.id];
    const primaryColor = bookData?.primaryColor || '#4A90E2';
    const secondaryColor = bookData?.secondaryColor || '#357ABD';
    const displayName = bookData?.name?.medium || item.id;
    const progress = downloadProgressValues[hymnalId] ?? 0;
    const isDismissed = context?.dismissedHymnalPackages?.[hymnalId] === true;
    const isBusy = isHymnalDownloading(hymnalId) || progress === -1 || progress > 0;

    const handlePress = async () => {
        if (isBusy) {
            return;
        }

        context?.clearDismissedHymnalPackage?.(hymnalId);
        posthog.capture(mode === 'update' ? 'hymnal_update_started' : 'hymnal_download_started', {
            hymnal_id: hymnalId,
        });

        registerHymnalInstallCompletion(hymnalId, () => context?.completeHymnalPackage?.(hymnalId, item.sha256));

        let downloadSucceeded = false;

        await downloadHymnal(
            hymnalId,
            item.sha256,
            item.downloadUrl,
            item.size,
            mode === 'update',
            undefined,
            (success) => {
                downloadSucceeded = success;
                if (!success) {
                    posthog.capture(mode === 'update' ? 'hymnal_update_failed' : 'hymnal_download_failed', {
                        hymnal_id: hymnalId,
                    });
                    Alert.alert(i18n.t('verificationFailed'), i18n.t('verificationFailedMessage'), [
                        {
                            text: i18n.t('ignore'),
                            onPress: () => undefined,
                            style: 'destructive',
                        },
                        {
                            text: i18n.t('ok'),
                            onPress: () => {
                                context?.deleteHymnal?.(hymnalId);
                            },
                            style: 'default',
                        },
                    ]);
                } else if (mode === 'update') {
                    posthog.capture('hymnal_update_completed', { hymnal_id: hymnalId });
                }
            },
        );

        if (!downloadSucceeded) {
            unregisterHymnalInstallCompletion(hymnalId);
            return;
        }

        onComplete?.();
    };

    if (isDismissed) {
        return null;
    }

    const subtitle = progress === -1
        ? i18n.t('startingDownload')
        : progress >= 110
            ? i18n.t('extracting')
            : progress > 100
                ? i18n.t('verifying')
                : progress > 0
                    ? `${i18n.t('progress')}: ${Math.min(progress, 100).toFixed(1)}%`
                    : mode === 'update'
                        ? i18n.t('updateAvailable')
                        : `${i18n.t('size')}: ${((item.size ?? 0) / (1024 * 1024)).toFixed(2)} MB`;

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.buttonContainer}
            activeOpacity={0.7}
            disabled={isBusy}
        >
            <View style={[styles.gradient, { position: 'relative', overflow: 'hidden' }]}>
                <LinearGradient
                    colors={[primaryColor, secondaryColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
            {(progress > 0 || progress === -1 || progress > 100) && (
                <ProgressLine
                    progress={progress === -1 ? 0 : progress >= 110 ? 100 : progress > 100 ? 100 : Math.min(Math.max(progress, 0), 100)}
                    isIntermediate={progress === -1 || progress > 100}
                />
            )}
                <View style={{ zIndex: 1 }}>
                    <StyledText style={styles.buttonText}>{displayName}</StyledText>
                    <StyledText style={styles.subtitleText}>{subtitle}</StyledText>
                </View>
                {!isBusy && (
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={mode === 'update' ? 'arrow-down-circle-outline' : 'add-circle-outline'}
                            size={32}
                            color="white"
                        />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: 16,
        justifyContent: 'center',
        height: 110,
    },
    gradient: {
        paddingVertical: 15,
        marginBottom: 15,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: 110,
        flex: 1,
    },
    buttonText: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'Lato',
        fontWeight: '700',
    },
    subtitleText: {
        color: 'white',
        marginTop: 5,
    },
    iconContainer: {
        position: 'absolute',
        right: 20,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    progressTrack: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2.5,
        overflow: 'hidden',
    },
    progressFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 2.5,
    },
    progressIntermediateContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        overflow: 'hidden',
    },
    progressIntermediateSegment: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 100,
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 2.5,
    },
});
