import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Divider } from 'react-native-elements';
import Constants from 'expo-constants';
import { HymnalContext } from '@/constants/context';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { TokenAuthResponse, validate_token } from '@/scripts/broadcast';

export default function BroadcastScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);

    async function check_code(code: string) {
        let response = await axios.post("https://iahifuumb7zasmzuv5xqpmi7fu0pwtkt.lambda-url.us-east-2.on.aws/", {
            code: code,
        });
        return response;
    }

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    const [loading, setLoading] = useState<boolean>(true);
    const [pin, setPin] = useState<string>("");
    const [authorized, setAuthorized] = useState(false);

    const lockPosition = useSharedValue<number>(0);
    const pinPosition = useSharedValue<number>(0);
    const pinIncorrectStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pinPosition.value }],
    }));
    const pinCorrectStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: lockPosition.value }],
    }));

    function signout() {
        setAuthorized(false);
        context?.setBroadcastingToken(null);
        context?.setBroadcastingChurch(null);
        setPin("");
    }

    let init = false;
    useEffect(() => {
        if (!init) {
            init = true;            

            if (!context)
                return;

            if (!context.broadcastingToken) {
                setLoading(false);
                return;
            }
            const validate = async () => {
                let token_response = await validate_token(context.broadcastingToken || "");
                if (token_response.status != 200) return signout();
                let token_response_data = token_response.data as TokenAuthResponse;
                context.setBroadcastingChurch(token_response_data.church_id);
                setAuthorized(true);
                router.replace('/(tabs)/(settings)/broadcast_options');
            }
            validate();
        }
    }, []);


    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, -1, 0, 10]
    const DX = 5;
    const TIME = 50;
    const EASING = Easing.elastic(0.5);


    const animFinishCallback = () => {
        setPin("");
    }
    async function login(code: string) {
        console.log("Validating code...")
        let response = await check_code(code);
        let authorized = response.status == 200;
        console.log('Code is ' + authorized)
        if (!authorized) {
            setAuthorized(false);
            pinPosition.value = withSequence(
                // deviate left to start from -ANGLE
                withTiming(-DX, { duration: TIME / 2, easing: EASING }),
                // wobble between -ANGLE and ANGLE 7 times
                withRepeat(
                    withTiming(DX, {
                        duration: TIME,
                        easing: EASING,
                    }),
                    2,
                    true
                ),
                // go back to 0 at the end
                withTiming(0, { duration: TIME / 2, easing: EASING }, () => {
                    runOnJS(animFinishCallback)();
                }),
            );
        } else {
            setAuthorized(true);
            lockPosition.value = withSequence(
                // deviate left to start from -ANGLE
                withTiming(0, { duration: TIME / 2, easing: EASING }),
                // wobble between -ANGLE and ANGLE 7 times
                withRepeat(
                    withTiming(DX, {
                        duration: TIME,
                        easing: EASING,
                    }),
                    1,
                    true
                ),
                // go back to 0 at the end
                withTiming(0, { duration: TIME / 2, easing: EASING }, () => {
                    runOnJS(animFinishCallback)();
                }),
            );
            context?.setBroadcastingToken(response.data.token);
            console.log('rerouting')
            router.replace('/(tabs)/(settings)/broadcast_options');
        }
    }
    return (
        <>
            <View style={{
                flex: 1, backgroundColor: Colors[theme]['background'], justifyContent: 'center', alignItems: 'center',
            }}>
                {loading ? (
                    <>
                        <ActivityIndicator size="large" />
                    </>
                ) : (
                    <>
                        <Animated.View style={styles.titleContainer}>
                            <Animated.View
                                style={pinCorrectStyle}
                            >
                                <Ionicons
                                    name={authorized ? "lock-open-outline" : "lock-closed-outline"}
                                    size={24}
                                    color={Colors[theme]['text']}
                                />
                            </Animated.View>
                            <StyledText
                                style={{
                                    marginTop: 15,
                                    fontSize: 16,
                                    color: Colors[theme]['text']
                                }}
                            >
                                Please enter 4-digit PIN
                            </StyledText>
                        </Animated.View>
                        <Animated.View
                            style={[{
                                flexDirection: 'row',
                                marginBottom: 40,
                                gap: 10
                            }, pinIncorrectStyle]}
                        >
                            {
                                [...Array(4).keys()].map(i => (
                                    <View
                                        key={i}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: (i == pin.length) ? Colors[theme]['primary'] : 'gray',
                                            borderRadius: 5,

                                            width: 60,
                                            height: 60,

                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {
                                            ((pin?.charAt(i).length || 0) > 0) && (
                                                <Ionicons
                                                    name='ellipse'
                                                    size={12}
                                                    color={Colors[theme]['text']}
                                                />
                                            )
                                        }
                                    </View>
                                ))
                            }
                        </Animated.View>
                        <View style={[{
                            justifyContent: 'center',
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            width: '75%',
                        }]}>
                            {

                                keys.map((i) => (
                                    (i < 10) ? (
                                        <TouchableHighlight
                                            underlayColor={Colors[theme]['buttonTap']}
                                            key={i}
                                            style={{
                                                width: 100,
                                                height: 100,
                                                borderRadius: 75,

                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                opacity: (i < 0) ? 0 : 1
                                            }}

                                            onPress={() => {
                                                if (i < 0)
                                                    return;

                                                setPin(prev => {
                                                    if (prev.length > 3) {
                                                        return prev;
                                                    }

                                                    const pin = prev.concat(String(i));
                                                    if (pin.length == 4) {
                                                        login(pin);
                                                    }

                                                    return pin;
                                                })
                                            }}
                                        >
                                            <StyledText
                                                style={{ fontSize: 24, color: Colors[theme]['text'] }}
                                            >
                                                {i}
                                            </StyledText>
                                        </TouchableHighlight>
                                    ) : (
                                        <TouchableHighlight
                                            underlayColor={Colors[theme]['buttonTap']}
                                            key={i}
                                            style={{
                                                width: 100,
                                                height: 100,
                                                borderRadius: 75,

                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}

                                            onPress={() => {
                                                setPin(prev => {
                                                    return prev.substring(0, prev.length - 1);
                                                })
                                            }}
                                        >
                                            <Ionicons
                                                name="backspace-outline"
                                                size={28}
                                                color={Colors[theme]['text']}
                                            />
                                        </TouchableHighlight>
                                    )

                                ))
                            }
                        </View>
                    </>
                )}
            </View>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        settingsLabel: {
            fontSize: 14,
            fontWeight: '400',
            color: Colors[theme]['fadedText'],
            fontFamily: 'Lato',
            marginLeft: '5%',
            marginVertical: 8,
        },
        settingsContainer: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 12,
            overflow: 'hidden',
        },
        settingsItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: '5%',
            paddingVertical: 14,
        },
        settingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme]['text'],
            fontFamily: 'Lato',
        },

        scrollView: {
            flex: 1,
            width: '100%',
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
        },
        button: {
            paddingVertical: 20,
            borderRadius: 16,
            marginBottom: 15,
            paddingHorizontal: 20,
            justifyContent: 'center',
        },
        buttonText: {
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold',
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        titleContainer: {
            marginBottom: 20,
            marginLeft: 10,
            justifyContent: 'center',
            alignItems: 'center'
        },
        stepContainer: {
            gap: 8,
            marginBottom: 8
        },
        reactLogo: {
            height: 178,
            width: 290,
            bottom: 0,
            left: 0,
            position: 'absolute'
        },
        textStyle: {
            fontSize: 32,
            fontWeight: '500',
            color: Colors[theme]['text'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
    });

};