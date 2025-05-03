import GradientButton from '@/components/GradientButton';
import { Colors } from '@/constants/Colors';
import { HymnalContext } from '@/constants/context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useRouter } from 'expo-router';
import { use, useContext, useEffect } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HomeScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const context = useContext(HymnalContext);
    const router = useRouter();

    // before rendering, check if the user has any books
    // if not, push the user to the hymnal importer

    useEffect(() => {
        if(!context)
            return;

        const bookCount = Object.keys(context.BOOK_DATA).length;
    });


    return (
        <>
            <SafeAreaView style={styles.screenContainer}>
                <ScrollView style={styles.scrollView}>
                    
                    <View style={styles.titleContainer}>
                        <Text style={styles.textStyle}>Home</Text>
                    </View>
                    {context && Object.keys(context.BOOK_DATA).map((bookKey) => (
                        <GradientButton 
                            key={bookKey}
                            title={context.BOOK_DATA[bookKey].name.medium}
                            primaryColor={context.BOOK_DATA[bookKey].primaryColor}
                            secondaryColor={context.BOOK_DATA[bookKey].secondaryColor}
                            onPress={() => {
                                router.push({ pathname: '/home/selection/[id]', params: { id: bookKey } });
                            }}
                        />
                    ))}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

function makeStyles(theme: "light" | "dark") {
    return StyleSheet.create({
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
            fontFamily: 'Lato'
        },
        screenContainer: {
            flex: 1, // Ensures the container takes up the full screen
            backgroundColor: Colors[theme]['background'] // Dynamically set background color using useThemeColor
        },
        titleContainer: {
            marginTop: 30,
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