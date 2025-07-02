import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { HymnalContext } from "@/constants/context";
import { SongList } from "@/constants/types";
import { getSongData } from "@/scripts/hymnals";
import { compareTitles, searchHymnary, SearchResult } from "@/scripts/hymnary_api";
import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { useContext } from "react";
import { Text, FlatList, SafeAreaView, TouchableOpacity, useColorScheme, StyleSheet, View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { translations } from "@/constants/localization";
import StyledText from '@/components/StyledText';

export default function HymnalImporter() {

    const params = useLocalSearchParams<{ id: string, number: string }>();
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);
    const [loading, setLoading] = useState(false);
    const [songData, setSongData] = useState<SongList>();
    const [songDetails, setSongDetails] = useState<SearchResult>();

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    useEffect(() => {
        // load song details
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getSongData(params.id as string);
                setSongData(data);


                // load song details
                searchHymnary(data[params.number].title).then((detailData) => {

                    let details = detailData.filter(d => compareTitles(d, data[params.number], 1));
                    if (!details || details.length === 0) {
                        console.log("No details found. Trying without special characters...");
                        details = detailData.filter(d => compareTitles(d, data[params.number], 3));
                        if (!details || details.length === 0) {
                            console.log("No details found.");
                        } else {
                            // if more than one, take the one with the highest instances (totalInstances)
                            details = details.sort((a, b) => Number.parseInt(b.totalInstances) - Number.parseInt(a.totalInstances));
                            details = details.slice(0, 1);
                            // set song details
                            setSongDetails(details[0]);
                        }
                    } else {
                        // if one has the same first line, take it
                        const firstLine = data[params.number].first_line;
                        if (firstLine) {
                            // set to lower case
                            const lowerFirstLine = firstLine.toLowerCase();
                            // remove special characters
                            const specialFirstLine = lowerFirstLine.replace(/[^a-z0-9]/gi, '');
                            details = details.filter(d => d.firstLine.toLowerCase().replace(/[^a-z0-9]/gi, '').startsWith(specialFirstLine));
                        }

                        // if more than one, take the one with the highest instances (totalInstances)
                        details = details.sort((a, b) => Number.parseInt(b.totalInstances) - Number.parseInt(a.totalInstances));
                        details = details.slice(0, 1);
                        // set song details
                        setSongDetails(details[0]);
                    }
                });
            } catch (error) {
                console.error('Error fetching song data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                {songDetails?.textAuthNumber ? (
                    <WebView
                        originWhitelist={['*']}
                        style={styles.webView}
                        source={{ uri: `https://www.hymnary.org/text/${songDetails.textAuthNumber}` }}
                        renderError={() => (
                            <View style={styles.detailsContainer}>
                                <StyledText style={styles.fadedText}>
                                    {i18n.t('noDetailsFound')}
                                </StyledText>
                            </View>
                        )}
                    />
                ) : loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors[theme].text} />
                    </View>
                ) : (
                    <View style={styles.detailsContainer}>
                        <StyledText style={styles.fadedText}>
                            {i18n.t('noDetailsFound')}
                        </StyledText>
                    </View>
                )}
            </SafeAreaView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        webView: {
            flex: 1,
            width: '100%',
            height: '100%'
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        detailsContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        titleText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors[theme]['text']
        },
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
            color: Colors[theme]['text'] // Dynamically set text color using useThemeColor
        },
    });

};