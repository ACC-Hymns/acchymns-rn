import { Colors, supportedThemes } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, Switch, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Divider } from 'react-native-elements';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HymnalContext } from '@/constants/context';
import { useI18n } from '@/hooks/useI18n';
import StyledText from '@/components/StyledText';

export default function ThemeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);
    const router = useRouter();
    const context = useContext(HymnalContext);

    const i18n = useI18n();

    const [selectedTheme, setSelectedTheme] = useState<string>(context?.themeOverride ?? 'system');

    const themeName = (theme: string) => {
        return theme === 'system' ? i18n.t('systemDefault') : theme === 'light' ? i18n.t('lightMode') : i18n.t('darkMode');
    }

    useEffect(() => {
        context?.setThemeOverride(selectedTheme);
    }, [selectedTheme]);

    return (
        <>
            <View style={{ flex: 1, backgroundColor: Colors[theme]['background'] }}>
                <ScrollView style={styles.scrollView}>
                    <View style={{}}>
                        <StyledText style={styles.settingsLabel}>{i18n.t('theme').toUpperCase()}</StyledText>
                    </View>
                    <View style={[styles.settingsContainer]}>
                        {supportedThemes.map((themeItem) => (
                            <React.Fragment key={themeItem}>
                                <TouchableHighlight
                                    onPress={() => setSelectedTheme(themeItem)}
                                    underlayColor={Colors[theme].divider}
                                >
                                    <View style={styles.settingsItem}>
                                        <StyledText style={styles.settingsText}>
                                            {themeName(themeItem)}
                                        </StyledText>
                                        {selectedTheme === themeItem && (
                                            <IconSymbol name="checkmark" size={18} weight='medium' color={Colors[theme].primary} />
                                        )}
                                    </View>
                                </TouchableHighlight>
                                {themeItem !== supportedThemes[supportedThemes.length - 1] && (
                                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                    {theme === 'dark' && (
                        <>
                            <View style={{ marginTop: 24 }}>
                                <StyledText style={styles.settingsLabel}>{i18n.t('other').toUpperCase()}</StyledText>
                            </View>
                            <View style={[styles.settingsContainer]}>
                                <TouchableHighlight
                                    underlayColor={Colors[theme].divider}
                                >
                                    <View style={styles.settingsItem}>
                                        <StyledText style={styles.settingsText}>{i18n.t('invertSheetMusic')}</StyledText>
                                        <View>
                                            <Switch
                                                trackColor={{ true: Platform.OS === 'ios' ? Colors[theme].primary : Colors[theme].primaryFaded }}
                                                thumbColor={Platform.OS === 'ios' ? 'white' : context?.invertSheetMusic ? Colors[theme].primary : Colors[theme].fadedIcon}
                                                value={context?.invertSheetMusic ?? false}
                                                onValueChange={(value) => {
                                                    context?.setInvertSheetMusic(value);
                                                }}
                                            />
                                        </View>
                                    </View>
                                </TouchableHighlight>
                            </View>
                        </>
                    )}
                </ScrollView>
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
            paddingTop: 125,
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
            fontWeight: '700',
            fontFamily: 'Lato',
            textAlign: 'center'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
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
            color: Colors[theme]['text'], // Dynamically set text color using useThemeColor
            fontFamily: 'Lato'
        },
    });

};