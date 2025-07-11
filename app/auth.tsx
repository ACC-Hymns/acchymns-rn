import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { downloadHymnal, loadHymnals } from '@/scripts/hymnals';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Alert, Image, TextInput, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { usePostHog } from 'posthog-react-native';
import { translations } from '@/constants/localization';
import StyledText from '@/components/StyledText';
import { loginIconImage } from '@/constants/assets';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { AppleAuthProvider, getAuth, signInWithCredential } from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function Auth() {

    async function onAppleButtonPress() {
        // Start the sign-in request
        const appleAuthRequestResponse = await appleAuth.performRequest({
            requestedOperation: appleAuth.Operation.LOGIN,
            // As per the FAQ of react-native-apple-authentication, the name should come first in the following array.
            // See: https://github.com/invertase/react-native-apple-authentication#faqs
            requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        });

        // Ensure Apple returned a user identityToken
        if (!appleAuthRequestResponse.identityToken) {
            throw new Error('Apple Sign-In failed - no identify token returned');
        }

        // Create a Firebase credential from the response
        const { identityToken, nonce } = appleAuthRequestResponse;
        const appleCredential = AppleAuthProvider.credential(identityToken, nonce);

        // Sign the user in with the credential
        return signInWithCredential(getAuth(), appleCredential);
    }

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);
    const posthog = usePostHog()

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                {isPresented && (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <KeyboardAvoidingView style={{
                            alignItems: 'center',
                            flex: 1
                        }}>
                            <Image
                                style={styles.loginLogo}
                                source={loginIconImage}
                            />

                            <View style={{
                                paddingHorizontal: 20,
                                width: '100%',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <StyledText style={styles.textStyle}>Log in or sign up</StyledText>

                                <View style={{
                                    width: '100%',
                                    marginTop: 20,
                                    padding: 15,
                                    borderRadius: 15,
                                    backgroundColor: Colors[theme]['settingsButton'],
                                }}>
                                    <TextInput
                                        style={{
                                            fontSize: 18,
                                            fontFamily: 'Lato'
                                        }}
                                        placeholder='Email address'
                                    >

                                    </TextInput>
                                </View>
                                <TouchableOpacity style={{
                                    width: '100%',
                                    margin: 15,
                                    padding: 15,
                                    borderRadius: 15,
                                    backgroundColor: Colors[theme]['primary'],
                                }}>
                                    <StyledText
                                        style={{
                                            fontSize: 18,
                                            fontFamily: 'Lato',
                                            textAlign: 'center',
                                            color: 'white'
                                        }}
                                    >
                                        Continue
                                    </StyledText>
                                </TouchableOpacity>
                            </View>
                            <StyledText style={{
                                fontSize: 18
                            }}>or</StyledText>
                            <View style={{
                                paddingHorizontal: 20,
                                width: '100%',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <TouchableOpacity style={{
                                    width: '100%',
                                    marginTop: 15,
                                    padding: 15,
                                    borderRadius: 15,
                                    backgroundColor: Colors[theme]['settingsButton'],
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <AntDesign
                                        name="google"
                                        size={24}
                                        color={Colors[theme]['text']}
                                    />
                                    <StyledText
                                        style={{
                                            fontSize: 18,
                                            fontFamily: 'Lato',
                                            textAlign: 'center',
                                            color: Colors[theme]['text']
                                        }}
                                    >
                                        Continue with Google
                                    </StyledText>
                                    <AntDesign
                                        name="google"
                                        size={24}
                                        color={Colors[theme]['settingsButton']}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity style={{
                                    width: '100%',
                                    marginTop: 15,
                                    padding: 15,
                                    borderRadius: 15,
                                    backgroundColor: Colors[theme]['settingsButton'],
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                                    onPress={() => onAppleButtonPress().then(() => console.log('Apple sign-in complete!'))}
                                >
                                    <AntDesign
                                        name="apple1"
                                        size={24}
                                        color={Colors[theme]['text']}
                                    />
                                    <StyledText
                                        style={{
                                            fontSize: 18,
                                            fontFamily: 'Lato',
                                            textAlign: 'center',
                                            color: Colors[theme]['text']
                                        }}
                                    >
                                        Continue with Apple
                                    </StyledText>
                                    <AntDesign
                                        name="apple1"
                                        size={24}
                                        color={Colors[theme]['settingsButton']}
                                    />
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                )}
            </SafeAreaView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        fadedText: {
            fontSize: 24,
            fontWeight: '500',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
        descriptionText: {
            fontSize: 16,
            fontWeight: '400',
            color: Colors[theme]['fadedText'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato',
            textAlign: 'center'
        },
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
            flex: 1
        },
        scrollView: {
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
            height: 110,
        },
        buttonText: {
            color: 'white',
            fontSize: 24,
            fontWeight: 'bold'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginLeft: 30,
            marginTop: 55
        },
        stepContainer: {
            gap: 8,
            marginBottom: 8
        },
        loginLogo: {
            height: 150,
            width: 250,
        },
        textStyle: {
            fontSize: 32,
            fontWeight: '500',
            color: Colors[theme]['text'] // Dynamically set text color using useThemeColor
        },
    });

};