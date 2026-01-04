import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import {
    BookSummary,
    DiscoverMatch,
    DiscoverResult,
    DiscoverSongInfo,
    Song,
    SongSearchInfo,
} from '@/constants/types';
import { getSongData } from '@/scripts/hymnals';
import { router, useFocusEffect } from 'expo-router';
import {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {
    StyleSheet,
    View,
    useColorScheme,
    Platform,
    TouchableOpacity,
    KeyboardAvoidingView,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import { FlatList, Pressable, TextInput } from 'react-native-gesture-handler';
import { useI18n } from '@/hooks/useI18n';
import { Ionicons } from '@expo/vector-icons';
import {
    BottomSheetModal,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Checkbox } from '@futurejj/react-native-checkbox';
import StyledText from '@/components/StyledText';
import { fontFamily } from '@/constants/assets';
import GenericGradientButton from '@/components/GenericGradientButton';
import { ConicGradientRenderer } from '@/components/ConicGradient';
import Animated, {
    KeyboardState,
    useAnimatedKeyboard,
    useAnimatedStyle,
    useDerivedValue,
} from 'react-native-reanimated';
import { KeyboardStickyView, useKeyboardAnimation, useKeyboardState } from 'react-native-keyboard-controller';

export default function DiscoverScreen() {
    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme as any);

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const context = useContext(HymnalContext);
    const [songList, setSongList] = useState<SongSearchInfo[]>([]);
    const [isNavigating, setIsNavigating] = useState(false);

    const i18n = useI18n();

    function stripSearchText(text: string) {
        return text
            .replace(/[.,/#!$%^&*;:{}=\-_'’"`~()]/g, "")
            .replace(/s{2,}/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
    }

    useLayoutEffect(() => {
        if (!context) return;

        const fetchData = async () => {
            try {
                setHymnalsAvailable(
                    supportedHymnals.filter((h) => context.BOOK_DATA[h] != undefined)
                );

                let songList: SongSearchInfo[] = [];
                for (const id in context.BOOK_DATA) {
                    const songData = await getSongData(id);
                    if (!songData) return;
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
            } catch (error) {
                console.error("Error loading song data:", error);
            }
        };

        fetchData();
    }, [context?.BOOK_DATA]);

    const scrollViewRef = useRef<FlatList>(null);
    const [dataSource, setDataSource] = useState<DiscoverSongInfo[]>([]);
    const [hymnalsAvailable, setHymnalsAvailable] = useState<string[]>([]);

    const supportedHymnals = ["ZH", "GH"];
    const promptSuggestions = [
        "God's Faithfulness",
        "Forgiveness and Grace",
        "The Holy Trinity",
        "Victory over Death",
    ];
    const [prompt, setPrompt] = useState("");
    const [latestPrompt, setLatestPrompt] = useState("");

    // Reanimated Keyboard Logic
    const { height, progress } = useKeyboardAnimation();

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const isModalOpenRef = useRef(false);

    const handlePress = useCallback(() => {
        if (!bottomSheetModalRef.current) return;
        if (isModalOpenRef.current) {
            bottomSheetModalRef.current.dismiss();
        } else {
            bottomSheetModalRef.current.present();
        }
    }, []);

    const handleSheetChanges = useCallback((index: number) => {
        isModalOpenRef.current = index === 0;
    }, []);

    const [selectedHymnals, setSelectedHymnals] = useState<string[]>([]);

    const ACCHYMNS_KEY = process.env.EXPO_PUBLIC_ACCHYMNS_KEY;
    async function sendPrompt(input: string) {
        if (input.trim().length === 0) return;
        setLoading(true);
        const data = await fetch('https://api.acchymns.app/discover', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': ACCHYMNS_KEY ?? '',
            },
            body: JSON.stringify({
                prompt: input,
                hymnals:
                    selectedHymnals.length > 0 ? selectedHymnals : hymnalsAvailable,
                search_type: 'both',
                top_k: 10,
            }),
        });
        setLoading(false);
        setPrompt('');
        setLatestPrompt(input);

        if (!data.ok) {
            console.error("Error sending prompt:", data.statusText);
            return;
        }

        const response = (await data.json()) as DiscoverResult;
        if (
            !response ||
            !response.top_matches ||
            response.top_matches.length === 0
        ) {
            console.warn("No matches found for the prompt:", input);
            return;
        }

        if (context?.BOOK_DATA === undefined) return;
        let results = response.top_matches.filter(
            (r) => context.BOOK_DATA[r.hymnal_id] != undefined
        );
        const dataSource: DiscoverSongInfo[] = results.map((item: DiscoverMatch) => {
            const song = songList.find(
                (s) =>
                    s.book.name.short === item.hymnal_id &&
                    s.number === item.hymn_number
            );
            return {
                title: song?.title,
                number: song?.number,
                book: context?.BOOK_DATA[item.hymnal_id],
                type: item.type,
                verses: item.verses?.sort((a, b) => a.verse_number - b.verse_number),
            } as DiscoverSongInfo;
        });

        setDataSource(dataSource);
    }

    useFocusEffect(
        useCallback(() => {
            context?.setDiscoverPageVisited(true);
        }, [])
    );

    const offset = { closed: 0, opened: Platform.OS === 'ios' ? 80 : 20 };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: Colors[theme].background }}>
                <View style={{ flex: 1 }}>
                    <KeyboardStickyView style={[styles.footerContainer]} offset={offset}>
                        {prompt.trim().length === 0 && dataSource.length == 0 && (
                            <FlatList
                                data={promptSuggestions}
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                }}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.suggestionButton}
                                        onPress={() => {
                                            setPrompt(item);
                                        }}
                                    >
                                        <StyledText style={styles.suggestionButtonText}>
                                            {item}
                                        </StyledText>
                                    </Pressable>
                                )}
                                keyExtractor={(item, index) => index.toString()}
                            />
                        )}
                        <ConicGradientRenderer
                            borderRadius={18}
                            poke={3}
                            colors={[
                                Colors[theme]['settingsButton'],
                                "#C95EFF",
                                "#94ABFF",
                                Colors[theme]['settingsButton'],
                            ]}
                            spinRate={loading ? 450 : 15}
                            enabled={prompt.trim().length > 0 || loading}
                        >
                            <View style={styles.promptBox}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons
                                        name="sparkles"
                                        size={18}
                                        color={Colors[theme]['fadedText']}
                                    />
                                    <TextInput
                                        style={styles.promptInput}
                                        placeholderTextColor={Colors[theme].fadedText}
                                        onChangeText={setPrompt}
                                        value={prompt}
                                        placeholder={`${i18n.t('promptPlaceholder')}`}
                                        keyboardType="default"
                                    />
                                </View>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <TouchableOpacity
                                        style={styles.promptButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            handlePress();
                                        }}
                                    >
                                        <Ionicons
                                            name="filter"
                                            size={24}
                                            color={Colors[theme]['fadedText']}
                                        />
                                    </TouchableOpacity>
                                    {prompt.trim().length > 0 && !loading && (
                                        <TouchableOpacity
                                            style={styles.promptButton}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                sendPrompt(prompt);
                                            }}
                                        >
                                            <Ionicons
                                                name="arrow-up"
                                                size={24}
                                                color={Colors[theme]['fadedText']}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </ConicGradientRenderer>
                    </KeyboardStickyView>

                    <FlatList
                        ref={scrollViewRef}
                        data={dataSource}
                        keyExtractor={(item) => item.book.name.short + item.number}
                        keyboardShouldPersistTaps="always"
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        renderItem={({ item }: { item: DiscoverSongInfo }) => (
                            <View key={item.book.name.short + item.number}>
                                <GenericGradientButton
                                    primaryColor={item.book.primaryColor}
                                    secondaryColor={item.book.secondaryColor}
                                    onPress={() => {
                                        if (isNavigating) return;
                                        if (item.book.name.short && item.number) {
                                            router.push({
                                                pathname: '/display/[id]/[number]',
                                                params: {
                                                    id: item.book.name.short,
                                                    number: item.number,
                                                },
                                            });
                                        }
                                        setIsNavigating(true);
                                        setTimeout(() => setIsNavigating(false), 400);
                                    }}
                                    style={{
                                        marginHorizontal: 20,
                                        borderRadius: 12,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        minHeight: 84,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            width: '100%',
                                            paddingHorizontal: 20,
                                        }}
                                    >
                                        <View style={{ width: '80%', alignSelf: 'flex-start', gap: 4 }}>
                                            <StyledText
                                                numberOfLines={1}
                                                style={{ color: '#fff', fontSize: 20, fontWeight: 400, fontFamily: 'Lato' }}
                                            >
                                                {item.title}
                                            </StyledText>
                                            <StyledText
                                                style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'Lato' }}
                                            >
                                                {item.book.name.medium}
                                            </StyledText>
                                        </View>
                                        <View style={{ width: '20%', alignItems: 'flex-end' }}>
                                            <StyledText
                                                style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'Lato' }}
                                            >
                                                #{item.number}
                                            </StyledText>
                                        </View>
                                    </View>
                                </GenericGradientButton>
                                {item.type == "VERSE" && (
                                    <>
                                        {item.verses?.map((verse, id) => (
                                            <View key={id}>
                                                <View style={{ flexDirection: 'row' }}>
                                                    <View>
                                                        {id > 0 && (
                                                            <View style={[styles.verseStraightRect, { height: 80 }]} />
                                                        )}
                                                        <View style={styles.verseArrowRect} />
                                                    </View>
                                                    <StyledText style={[styles.verseText, { fontWeight: 700, fontFamily: 'Lato' }]}>
                                                        {`${verse.verse_number}    `}
                                                        <StyledText style={[styles.verseText, { fontWeight: 400, fontFamily: 'Lato' }]}>
                                                            {verse.verse_text}
                                                        </StyledText>
                                                    </StyledText>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                )}
                            </View>
                        )}
                        style={styles.scrollView}
                        ListFooterComponent={() => <View style={{ height: 250 }} />}
                        ListHeaderComponent={
                            <>
                                <View style={styles.titleContainer}>
                                    <StyledText style={styles.textStyle}>{i18n.t('discover')}</StyledText>
                                    {dataSource.length > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 57 }}>
                                            <StyledText style={styles.subtitleTextStyle}>
                                                {i18n.t('discoverSubtitle')}
                                            </StyledText>
                                            <StyledText style={styles.subtitleTextStyleBold} numberOfLines={1}>
                                                {` "${latestPrompt}"`}
                                            </StyledText>
                                        </View>
                                    )}
                                </View>
                            </>
                        }
                    />
                </View>


                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    onChange={handleSheetChanges}
                    style={styles.bottomSheet}
                    backgroundStyle={styles.bottomSheet}
                    handleIndicatorStyle={styles.handleIndicator}
                >
                    <BottomSheetView style={styles.contentContainer}>
                        <View style={{ marginTop: -20, width: '100%' }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                }}
                            >
                                <View style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={Colors[theme]['settingsButton']} />
                                </View>
                                <StyledText style={styles.bottomSheetHeaderText}>
                                    {i18n.t('filters')}
                                </StyledText>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => bottomSheetModalRef.current?.dismiss()}
                                >
                                    <Ionicons name="close" size={24} color={Colors[theme]['fadedText']} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginLeft: 20, marginTop: 10 }}>
                                <Pressable
                                    style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
                                    onPress={() => setSelectedHymnals([])}
                                >
                                    <Checkbox
                                        status={selectedHymnals.length < 1 ? 'checked' : 'unchecked'}
                                        color={Colors[theme]['text']}
                                    />
                                    <StyledText style={styles.filterText}>{i18n.t('allHymnals')}</StyledText>
                                </Pressable>
                                {hymnalsAvailable.map((item) => (
                                    <Pressable
                                        key={item}
                                        style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}
                                        onPress={() => {
                                            if (selectedHymnals.includes(item)) {
                                                setSelectedHymnals(selectedHymnals.filter((h) => h !== item));
                                            } else {
                                                setSelectedHymnals([...selectedHymnals, item]);
                                            }
                                        }}
                                    >
                                        <Checkbox
                                            status={selectedHymnals.includes(item) ? 'checked' : 'unchecked'}
                                            color={context?.BOOK_DATA[item]?.primaryColor || Colors[theme]['primary']}
                                            uncheckedColor={context?.BOOK_DATA[item]?.primaryColor || Colors[theme]['primary']}
                                        />
                                        <StyledText style={styles.filterText}>
                                            {context?.BOOK_DATA[item]?.name.medium || item}
                                        </StyledText>
                                    </Pressable>
                                ))}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 20,
                                        marginVertical: 20,
                                    }}
                                >
                                    <TouchableOpacity onPress={() => setSelectedHymnals([])} style={styles.resetButton}>
                                        <StyledText style={styles.resetButtonText}>{i18n.t('reset')}</StyledText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                                        style={styles.applyButton}
                                    >
                                        <StyledText style={styles.applyButtonText}>{i18n.t('apply')}</StyledText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            </View>
        </TouchableWithoutFeedback>
    )
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
        verseStraightRect: {
            position: 'absolute',
            marginLeft: 45,
            marginRight: 15,
            width: 30,
            transform: [{ translateY: -80 }],
            borderLeftWidth: 1,
            borderColor: Colors[theme]['fadedIcon'],
            zIndex: -1,
        },
        verseArrowRect: {
            marginLeft: 45,
            marginRight: 15,
            width: 30,
            height: 30,
            borderLeftWidth: 1,
            borderBottomWidth: 1,
            borderBottomLeftRadius: 12,
            borderColor: Colors[theme]['fadedIcon'],
        },
        footerContainer: {
            position: 'absolute',
            zIndex: 10,
            width: '100%',
            bottom: Platform.OS === 'ios' ? 80 : 100
        },
        resetButtonText: {
            color: Colors[theme]['text'],
            fontSize: 16,
            textAlign: 'center',
        },
        applyButtonText: {
            color: 'white',
            fontSize: 16,
            textAlign: 'center',
        },
        resetButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 16,
            padding: 16,
            minWidth: 100,
        },
        applyButton: {
            backgroundColor: Colors[theme]['primary'],
            borderRadius: 16,
            padding: 16,
            minWidth: 100,
        },
        filterText: {
            color: Colors[theme]['text'],
            fontSize: 16,
            marginLeft: 10,
        },
        bottomSheetHeaderText: {
            color: Colors[theme]['text'],
            fontSize: 18,
            textAlign: 'center',
        },
        handleIndicator: {
            backgroundColor: Colors[theme]['border'],
            height: 0,
        },
        contentContainer: {
            flex: 1,
            padding: 8,
            paddingBottom: 20,
            alignItems: 'center',
        },
        bottomSheet: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 7 },
            shadowOpacity: 0.43,
            shadowRadius: 9.51,
            elevation: 15,
            backgroundColor: Colors[theme]['settingsButton'],
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        closeButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 32,
            padding: 8,
        },
        promptButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 32,
            padding: 15,
            shadowColor: Colors[theme]['text'],
            shadowRadius: 2,
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 0 },
            elevation: 1,
        },
        promptBox: {
            backgroundColor: Colors[theme]['settingsButton'],
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingBottom: 20,
            marginHorizontal: 15,
            marginTop: 3,
            marginBottom: 20,
            shadowColor: Colors[theme]['text'],
            shadowRadius: 4,
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 0 },
            elevation: 2,
        },
        suggestionButtonText: {
            color: Colors[theme]['fadedText'],
            fontSize: 16,
            textAlign: 'center',
        },
        suggestionButton: {
            backgroundColor: Colors[theme]['settingsButton'],
            padding: 10,
            borderRadius: 8,
            margin: 5,
            height: 40,
            justifyContent: 'center',
            shadowColor: Colors[theme]['text'],
            shadowRadius: 2,
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 0 },
            elevation: 1,
        },
        promptInput: {
            height: 40,
            borderColor: Colors[theme]['text'],
            margin: 12,
            paddingLeft: 10,
            color: Colors[theme]['text'],
            width: '100%',
            fontSize: 16,
            fontFamily: fontFamily.regular,
            maxWidth: '90%',
        },
        scrollView: {
            paddingTop: 15,
            paddingBottom: 15,
            backgroundColor: Colors[theme].background,
        },
        titleContainer: {
            marginTop: 18,
            marginBottom: 10,
            marginLeft: 30,
        },
        textStyle: {
            fontSize: 32,
            fontWeight: 500, 
            fontFamily: 'Lato',
            color: Colors[theme]['text'],
        },
        subtitleTextStyle: {
            fontSize: 18,
            color: Colors[theme]['text'],
        },
        subtitleTextStyleBold: {
            fontSize: 18,
            fontWeight: 500, 
            fontFamily: 'Lato',
            color: Colors[theme]['text'],
            maxWidth: '60%',
        },
        verseText: {
            marginTop: 8,
            maxWidth: '70%',
            fontSize: 12,
            color: Colors[theme]['fadedText'],
        },
    });
}