import { Colors } from '@/constants/Colors';

import { StyleSheet, ScrollView, View } from 'react-native';

import { TouchableOpacity } from 'react-native';

import { router, useNavigation } from 'expo-router';

import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { HymnalContext } from '@/constants/context';

import { useColorScheme } from '@/hooks/useColorScheme';

import ScripturePicker from '@/components/ScripturePicker';

import { Reading } from '@/constants/bible';

import {
    ensureScriptureReferencesLoaded,
    SCRIPTURE_PICKER_COUNT,
} from '@/constants/scripturePicker';

import { request_client, set } from '@/scripts/broadcast';

import { isIOS26DesignDisabled } from '@/constants/iosDesign';

import Ionicons from '@react-native-vector-icons/ionicons';
import StyledText from '@/components/StyledText';
import { useI18n } from '@/hooks/useI18n';



export default function BroadcastBibleScreen() {


    const i18n = useI18n();

    const theme = useColorScheme() ?? 'light';

    const styles = makeStyles(theme as any);

    const navigation = useNavigation();

    useLayoutEffect(() => {

        if (isIOS26DesignDisabled()) {



            navigation.setOptions({

                unstable_headerLeftItems: () => [

                    {

                        type: 'button',

                        label: 'Back',

                        icon: {

                            type: 'sfSymbol',

                            name: 'chevron.left'

                        },

                        tintColor: Colors[theme].icon,

                        onPress: () => {

                            router.back();

                        }

                    }

                ]

            });

        }

    }, []);

    const context = useContext(HymnalContext);

    const contextRef = useRef(context);

    contextRef.current = context;



    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        ensureScriptureReferencesLoaded()
            .catch((error) => console.error('Error loading bible references:', error))
            .finally(() => setIsLoaded(true));
    }, []);



    async function handle_send(data: Reading) {

        const currentContext = contextRef.current;

        if (!currentContext) {

            return;

        }



        if (!currentContext.broadcastingChurch) {

            return;

        }



        let top_text = data.book;

        let bottom_text = "";

        if (data.verse_start && data.verse_end) {

            bottom_text = `${data.chapter_start}:${data.verse_start}-${data.verse_end}`;

        } else {

            bottom_text = `${data.chapter_start}:${data.verse_start}`;

        }



        await set(request_client(), currentContext.broadcastingChurch, top_text, "BIBLE", [], bottom_text);

    }



    async function clearScreen() {

        if (!context?.broadcastingChurch) {

            return;

        }



        await set(request_client(), context.broadcastingChurch, "", "", [-1], "");

    }



    return (

        <>

            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>

                <ScrollView style={styles.scrollView}>

                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>

                        {isLoaded && Array.from({ length: SCRIPTURE_PICKER_COUNT }, (_, index) => (

                            <ScripturePicker

                                key={index}

                                pickerIndex={index}

                                send={handle_send}

                            />

                        ))}



                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={clearScreen}
                            >
                                <Ionicons
                                    name='trash-outline'
                                    size={18}
                                    color='white'
                                />
                                <StyledText style={styles.actionButtonLabel}>{i18n.t('clearScreen')}</StyledText>
                            </TouchableOpacity>

                    </View>

                </ScrollView>

            </View>

        </>

    );

}



function makeStyles(theme: "light" | "dark") {

    return StyleSheet.create({

        clearButton: {
            backgroundColor: Colors[theme].destructive,
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },
        actionButton: {
            backgroundColor: Colors[theme]['primary'],
            paddingVertical: 15,
            paddingHorizontal: 24,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 8,
            justifyContent: 'center',
            alignItems: 'center',
        },

        destructiveSettingsText: {

            fontSize: 18,

            fontWeight: '400',

            color: Colors[theme].destructive,

            fontFamily: 'Lato',

        },

        settingsLabel: {

            fontSize: 14,

            fontWeight: '400',

            color: Colors[theme]['fadedText'],

            fontFamily: 'Lato',

            marginLeft: 20,

            marginVertical: 8,

        },
        actionButtonLabel: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            fontFamily: 'Lato',
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

            paddingHorizontal: 20,

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

            paddingTop: 140,

            paddingBottom: 15,

            paddingRight: 20,

            paddingLeft: 20

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

            fontWeight: '700',

            fontFamily: 'Lato',

            textAlign: 'center'

        },

        screenContainer: {

            flex: 1,

            backgroundColor: Colors[theme]['background']

        },

        titleContainer: {

            marginTop: 80,

            marginBottom: 20,

            marginLeft: 10,

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

            color: Colors[theme]['text'],

            fontFamily: 'Lato'

        },

    });



};


