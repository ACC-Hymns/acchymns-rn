import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { BookSummary, Song, SongList, SongSearchInfo } from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { router } from 'expo-router';
import { useContext, useLayoutEffect, useState } from 'react';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, Platform, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import SearchBar from 'react-native-platform-searchbar';



export default function SearchScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const context = useContext(HymnalContext);
    const [songList, setSongList] = useState<SongSearchInfo[]>([]);
    const [isNavigating, setIsNavigating] = useState(false);

    function stripSearchText(text: string) {
        return text
            .replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")
            .replace(/s{2,}/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
    }


    useLayoutEffect(() => {
        if (!context) return;

        const fetchData = async () => {
            try {
                let songList: SongSearchInfo[] = [];
                for (const id in context.BOOK_DATA) {
                    const songData = await getSongData(id);
                    Object.keys(songData).forEach((key: string) => {
                        const song: Song = songData[key];
                        const book: BookSummary = context.BOOK_DATA[id];
                        const searchInfo: SongSearchInfo = {
                            stripped_title: stripSearchText(song.title ?? ""),
                            stripped_first_line: stripSearchText(song.first_line ?? ""),
                            title: song.title,
                            first_line: song.first_line,
                            number: key,
                            book: book,
                        };
                        songList.push(searchInfo);
                    });
                }
                setSongList(songList);
                
                console.log("Loaded song data.");
                setLoading(false);
            } catch (error) {
                console.error("Error loading song data:", error);
            } finally {
            }
        };

        fetchData();
    }, [context?.BOOK_DATA]);
    return (
        <>
            {loading ? (
            <ActivityIndicator size="large" color={Colors[theme]['text']} />
            ) : (
            <FlatList 
                data={[...(search.trim().length > 0 ? songList : [])]
                .filter((s) => 
                    s.stripped_title?.includes(stripSearchText(search)) ||
                    s?.stripped_first_line?.includes(stripSearchText(search)) ||
                    s?.number == stripSearchText(search)
                )
                .sort((a, b) => 
                    a.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "").localeCompare(
                    b.title.replace(/[.,/#!$%^&*;:{}=\-_'"`~()]/g, "")
                    )
                )}
                keyboardShouldPersistTaps='always'
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={{
                        margin: 4,
                        width: Dimensions.get('window').width - 60,
                        borderRadius: 12,
                        backgroundColor: item.book.primaryColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 10, // Add padding to allow content to grow
                        minHeight: 60, // Ensure a minimum height of 60
                        }}

                        onPress={() => {
                        if (isNavigating) return;
                        if (item.book.name.short && item.number) {
                            router.push({ pathname: '/display/[id]/[number]', params: { id: item.book.name.short, number: item.number } });
                        } else {
                            console.error("Invalid item data: ", item);
                        }
                        setIsNavigating(true);
                        setTimeout(() => setIsNavigating(false), 400); // or after navigation completes
                        }}

                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
                        <View style={{ width: '80%', alignSelf: 'flex-start' }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'medium', textAlign: 'left' }}>{item.title}</Text>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'left' }}>{item.book.name.medium}</Text>
                        </View>
                        <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'normal', textAlign: 'right' }}>#{item.number}</Text>
                        </View>
                        </View>
                        
                    </TouchableOpacity>
                )}
                style={[styles.scrollView]}
                ListHeaderComponent={
                    <>
                        <View style={styles.titleContainer}>
                        <Text style={styles.textStyle}>Search</Text>
                        </View>
                        <SearchBar
                        value={search}
                        onChangeText={setSearch}
                        inputStyle={styles.searchBarContainer}
                        placeholder="Search"
                        style={styles.searchBar}
                        />
                    </>
                }
            />
            )}
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        searchBar: {
            marginBottom: 20
        },
        searchBarContainer: {
            backgroundColor: '#EEEEF0',
            fontSize: 18,
            height: 35,
        },
        rowItem: {
            height: 100,
            width: 100,
            alignItems: "center",
            justifyContent: "center",
        },
        text: {
            color: "black",
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
        },
        scrollView: {
            paddingTop: 15,
            paddingBottom: 15,
            paddingRight: 20,
            paddingLeft: 20,
            backgroundColor: Colors[theme]['background']
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
            fontFamily: 'Lato'
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
        }
    });

};