import GradientButton from '@/components/GradientButton';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { BookSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { downloadHymnal } from '@/scripts/hymnals';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HymnalImporter() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const isPresented = router.canGoBack();

    type GithubFolderStructure = {
        name: string;
        path: string;
        sha: string;
        size: number;
        url: string;
        html_url: string;
        git_url: string;
        download_url: string | null;
        type: "file" | "dir";
        _links: {
            self: string;
            git: string;
            html: string;
        };
    }

    // fetch github folder structure from api and return the data
    async function fetchHymnals() {
        // fetch the folder structure from the github api
        const res = fetch('https://api.github.com/repos/ACC-Hymns/books/contents/');
        const data = await ((await res).json() as Promise<GithubFolderStructure[]>);

        // filter the data to only include directories
        const filteredData = data.filter((item) => item.type === 'dir');
        // for each item, fetch the summary.json file 

        const promises = filteredData.map(async (item) => {
            const res = await fetch(`https://raw.githubusercontent.com/ACC-Hymns/books/main/${item.name}/summary.json`);
            const json = await res.json() as BookSummary;
            return {
                summary: json
            };
        });

        return Promise.all(promises).then((values) => {
            return values.map((item) => {
                return item.summary;
            })
        });
    }

    const { data, status } = useQuery({
        queryKey: ['hymnals'],
        queryFn: fetchHymnals,
    })

    if(status === 'pending') {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <Text style={styles.textStyle}>Loading...</Text>
            </SafeAreaView>
        )
    }
    if(status === 'error') {
        return (
            <SafeAreaView style={styles.screenContainer}>
                <Text style={styles.textStyle}>Error loading hymnals</Text>
            </SafeAreaView>
        )
    }

    // fetch the data and log it to the console

    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                {isPresented && (
                    <>
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginTop: 16 }}>
                            <IconSymbol name="chevron.left" size={18} color="#007AFF" />
                            <Text style={{ color: '#007AFF', fontSize: 18, marginLeft: 5 }}>{'Back'}</Text>
                        </TouchableOpacity>
                        
                        <ScrollView contentContainerStyle={[styles.scrollView, { flexGrow: 1 }]}>
                            {data?.map((item) => (
                                <TouchableOpacity
                                    key={item.name.short}
                                    onPress={async () => {
                                        await downloadHymnal(item.name.short);
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

                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}
            </SafeAreaView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
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