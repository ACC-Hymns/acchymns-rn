import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import StyledText from '@/components/StyledText';
interface GradientButtonProps {
    title: string;
    onPress?: () => void;
    onLongPress?: () => void;
    primaryColor: string;
    secondaryColor: string;
    coverImageUrl?: string;
}

const failedCoverUrls = new Set<string>();

const GradientButton: React.FC<GradientButtonProps> = ({
    title,
    onPress,
    onLongPress,
    primaryColor,
    secondaryColor,
    coverImageUrl,
}) => {
    const [coverLoadFailed, setCoverLoadFailed] = React.useState(
        coverImageUrl ? failedCoverUrls.has(coverImageUrl) : false,
    );

    React.useEffect(() => {
        setCoverLoadFailed(coverImageUrl ? failedCoverUrls.has(coverImageUrl) : false);
    }, [coverImageUrl]);

    return (
            <TouchableOpacity
                onPress={() => {
                    onPress?.();
                }}
                onLongPress={onLongPress}
                style={styles.buttonContainer}
                activeOpacity={0.7}
                >
                <LinearGradient
                    colors={[primaryColor, secondaryColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                >
                    {!coverLoadFailed && coverImageUrl ? (
                        <Image
                            source={coverImageUrl}
                            style={styles.coverImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={180}
                            onError={() => {
                                failedCoverUrls.add(coverImageUrl);
                                setCoverLoadFailed(true);
                            }}
                        />
                    ) : null}
                    <StyledText style={styles.buttonText}>{title}</StyledText>
                </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: 16,
        justifyContent: 'center',
    },
    gradient: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'flex-start',
        justifyContent: 'center',
        height: 110,
        flex: 1,
        overflow: 'hidden',
    },
    coverImage: {
        position: 'absolute',
        right: 0,
        top: 16,
        width: 86,
        height: 125,
        opacity: 0.35,
        borderRadius: 4,
        transform: [{ rotate: '-15deg' }],
    },
    buttonText: {
        color: '#fff',
        fontSize: 23,
        fontFamily: 'Lato',
        fontWeight: 700,
    },
});

export default GradientButton;