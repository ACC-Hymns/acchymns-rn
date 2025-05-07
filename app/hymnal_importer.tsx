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
import { useContext, useRef, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';

export default function HymnalImporter() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const isPresented = router.canGoBack();
    const context = useContext(HymnalContext);

    const desired_sort = [
        'ZH',
        'GH',
        'JH',
        'HZ',
        'CH',
        'HG',
        'ZG',
        'ZGE',
        'HSZ',
        'XC',
        'ZHG',
        'ZHH',
        'ZHJ',
        'ZHR',
        'ZHSP',
        'BS',
        'ES',
        'HS',
        'LDH',
        'MO',
        'PC'
    ]

    function sortHymnals(data: BookSummary[]) {
        data.sort((a, b) => {
            const aExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === a.name.short);
            const bExists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === b.name.short);

            if (aExists && !bExists) return -1; // a exists, push to top
            if (!aExists && bExists) return 1; // b exists, push to top

            const aIndex = desired_sort.indexOf(a.name.short);
            const bIndex = desired_sort.indexOf(b.name.short);
            if (aIndex === -1 && bIndex === -1) return 0; // both not found, keep original order
            if (aIndex === -1) return 1; // a not found, move to end
            if (bIndex === -1) return -1; // b not found, move to end
            return aIndex - bIndex; // both found, sort by index
        });
    }

    // fetch github folder structure from api and return the data
    async function fetchHymnals() {
        const res = await fetch('https://dy6yndxt29.execute-api.us-east-2.amazonaws.com/default/FetchHymnalsRN');
        const data: BookSummary[] = await res.json();
        // sort the data based on the desired_sort array
        sortHymnals(data);
        return data;
    }

    const { data, status, refetch } = useQuery({
        queryKey: ['hymnals'],
        queryFn: fetchHymnals,
    })

    // fetch the data and log it to the console
    const [progressValues, setProgressValues] = useState<Record<string, number>>({});

    if(status === 'pending') {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', margin: 16 }} hitSlop={5}>
                    <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                    <Text style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{'Back'}</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <ActivityIndicator size="large" color={Colors[theme]['text']} />
                </View>
            </SafeAreaView>
        )
    }
    if(status === 'error') {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', margin: 16 }} hitSlop={5}>
                    <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                    <Text style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{'Back'}</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <IconSymbol name="network.slash" size={64} color={Colors[theme]['fadedText']} />
                    <Text style={{ color: Colors[theme]['fadedText'], fontSize: 18, marginTop: 16, fontWeight: '500' }}>
                        Failed to load Hymnals
                    </Text>
                    <Text style={{ color: Colors[theme]['fadedText'], fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                        Please check your internet connection and try again.
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={{
                            marginTop: 20,
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            backgroundColor: Colors[theme]['primary'],
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                {isPresented && (
                    <>
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', margin: 16 }} hitSlop={5}>
                            <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                            <Text style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{'Back'}</Text>
                        </TouchableOpacity>
                        
                        <FlatList
                            data={data.filter((item) => {
                                // check if the item is already in the context
                                const exists = context?.BOOK_DATA && Object.keys(context.BOOK_DATA).some(book => context.BOOK_DATA[book].name.short === item.name.short);
                                return !exists;
                            })}
                            keyExtractor={(item) => item.name.short}
                            contentContainerStyle={[styles.scrollView, { flexGrow: 1 }]}
                            ListHeaderComponent={(
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={styles.fadedText}>Add Hymnals</Text>
                                    <View style={{ height: 5 }} />
                                    <Text style={styles.descriptionText}>Download hymnals to access them offline.</Text>
                                </View>
                            )}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={async () => {
                                        // if already downloading don't do anything
                                        if (progressValues[item.name.short] === -1 || progressValues[item.name.short] > 0) return;


                                        setProgressValues((prev) => ({
                                            ...prev,
                                            [item.name.short]: -1,
                                        }));
                                        await downloadHymnal(item.name.short, (progress) => {
                                            setProgressValues((prev) => ({
                                                ...prev,
                                                [item.name.short]: progress,
                                            }));
                                        });

                                        // reload the data
                                        const data = await loadHymnals();

                                        if (!context) return;
                                        context?.SET_BOOK_DATA(data);
                                        
                                        refetch();
                                    }}
                                    style={styles.buttonContainer}
                                    activeOpacity={0.7} // Adjust this value to control the darkness
                                >
                                    <LinearGradient
                                        colors={[item.primaryColor, item.secondaryColor]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.gradient]}
                                    >
                                        <Text style={styles.buttonText}>{item.name.medium}</Text>
                                        {progressValues[item.name.short] === -1 ? (
                                            <Text style={{ color: 'white', marginTop: 5 }}>{'Starting download...'}</Text>
                                        ) : progressValues[item.name.short] > 0 ? (
                                            <Text style={{ color: 'white', marginTop: 5 }}>{`Progress: ${(progressValues[item.name.short] ?? 0).toFixed(2)}%`}</Text>
                                        ) : (
                                            <Text style={{ color: 'white', marginTop: 5 }}>{`Size: ${((item.size ?? 0) / (1024 * 1024)).toFixed(2)} MB`}</Text>
                                        )}
                                        <View style={{ position: 'absolute', right: 20 }}>
                                            <IconSymbol name="plus.circle" size={32} weight='light' color="white" />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        />
                    </>
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