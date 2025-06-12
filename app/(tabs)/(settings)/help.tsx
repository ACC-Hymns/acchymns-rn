import { Colors } from '@/constants/Colors';
import { Text, StyleSheet, SafeAreaView, ScrollView, View, useColorScheme, TouchableHighlight, Linking, Alert } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useContext, useLayoutEffect } from 'react';
import { Divider } from 'react-native-elements';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HymnalContext } from '@/constants/context';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { clearCache, deleteAllHymnals, loadHymnals } from '@/scripts/hymnals';
import PostHog, { usePostHog } from 'posthog-react-native';

export default function HelpScreen() {

    const theme = useColorScheme() ?? 'light';
    const styles = makeStyles(theme);
    const router = useRouter();
    const context = useContext(HymnalContext);
    const navigation = useNavigation();

    const translations = {
        en: {
            help: 'Help',
            general: 'GENERAL',
            reportBug: 'Report a Bug',
            requestBook: 'Request a Book or Feature',
            privacyPolicy: 'Privacy Policy',
            debug: 'DEBUG',
            clearCache: 'Clear Cache',
            deleteHymnals: 'Delete All Hymnals',
            clearCacheConfirmation: 'Clear Cache?',
            deleteHymnalsConfirmation: 'Delete All Hymnals?',
            clearCacheConfirmationMessage: 'This will delete all cached files created by the app.',
            deleteHymnalsConfirmationMessage: 'This will delete all hymnals currently downloaded.',
            posthogOptOut: 'Opt Out of Data Collection',
            posthogOptIn: 'Opt In to Data Collection',
            posthogOptOutConfirmation: 'Opt Out of Data Collection?',
            posthogOptOutConfirmationMessage: 'This will opt you out of data collection. You can opt in again at any time.',
            optOut: 'Confirm',
            clear: 'Clear',
            delete: 'Delete',
            cancel: 'Cancel',
        },
        es: {
            help: 'Ayuda',
            general: 'GENERAL',
            reportBug: 'Reportar un Bug',
            requestBook: 'Solicitar un Libro o Característica',
            privacyPolicy: 'Política de Privacidad',
            debug: 'DEBUG',
            clearCache: 'Limpiar Caché',
            deleteHymnals: 'Eliminar Todos los Hymnals',
            clearCacheConfirmation: 'Limpiar Caché?',
            deleteHymnalsConfirmation: 'Eliminar Todos los Hymnals?',
            clearCacheConfirmationMessage: 'Esto eliminará todos los archivos caché creados por la aplicación.',
            deleteHymnalsConfirmationMessage: 'Esto eliminará todos los hymnals actualmente descargados.',
            posthogOptOut: 'Desactivar la recopilación de datos',
            posthogOptIn: 'Activar la recopilación de datos',
            posthogOptOutConfirmation: '¿Desactivar la recopilación de datos?',
            posthogOptOutConfirmationMessage: 'Esto desactivará la recopilación de datos. Puede activarla de nuevo en cualquier momento.',
            optOut: 'Confirmar',
            clear: 'Limpiar',
            delete: 'Eliminar',
            cancel: 'Cancelar',
        },
        fr: {
            help: 'Aide',
            general: 'GÉNÉRAL',
            reportBug: 'Signaler un Bug',
            requestBook: 'Demander un Livre ou une Fonctionnalité', 
            privacyPolicy: 'Politique de Confidentialité',
            debug: 'DEBUG',
            clearCache: 'Effacer le Cache',
            deleteHymnals: 'Supprimer Tous les Hymnals',
            clearCacheConfirmation: 'Effacer le Cache?',
            deleteHymnalsConfirmation: 'Supprimer Tous les Hymnals?',
            clearCacheConfirmationMessage: 'Cela supprimera tous les fichiers mis en cache créés par l\'application.',
            deleteHymnalsConfirmationMessage: 'Cela supprimera tous les hymnals actuellement téléchargés.',
            posthogOptOut: 'Désactiver la collecte de données',
            posthogOptIn: 'Activer la collecte de données',
            posthogOptOutConfirmation: 'Désactiver la collecte de données?',
            posthogOptOutConfirmationMessage: 'Cela désactivera la collecte de données. Vous pouvez l\'activer à nouveau à tout moment.',
            optOut: 'Confirmer',
            clear: 'Effacer',
            delete: 'Supprimer',
            cancel: 'Annuler',
        },
        de: {
            help: 'Hilfe',
            general: 'ALLGEMEIN',
            reportBug: 'Fehler melden',
            requestBook: 'Buch oder Funktion anfragen',
            privacyPolicy: 'Datenschutzrichtlinie',
            debug: 'Debuggen',
            clearCache: 'Cache löschen',
            deleteHymnals: 'Alle Hymnals löschen',
            clearCacheConfirmation: 'Cache löschen?',
            deleteHymnalsConfirmation: 'Alle Hymnals löschen?',
            clearCacheConfirmationMessage: 'Dies wird alle zwischengespeicherten Dateien löschen, die von der App erstellt wurden.',
            deleteHymnalsConfirmationMessage: 'Dies wird alle derzeit heruntergeladenen Hymnals löschen.',
            posthogOptOut: 'Datensammlung deaktivieren',
            posthogOptIn: 'Datensammlung aktivieren',
            posthogOptOutConfirmation: 'Datensammlung deaktivieren?',
            posthogOptOutConfirmationMessage: 'Dies deaktiviert die Datensammlung. Sie können sie jederzeit wieder aktivieren.',
            optOut: 'Bestätigen',
            clear: 'Löschen',
            delete: 'Löschen',
            cancel: 'Abbrechen',
        },
        ja: {
            help: 'ヘルプ',
            general: '一般',
            reportBug: 'バグを報告',
            requestBook: '本や機能をリクエスト',
            privacyPolicy: 'プライバシーポリシー',
            debug: 'デバッグ',
            clearCache: 'キャッシュをクリア',
            deleteHymnals: 'すべてのハイムナルを削除',
            clearCacheConfirmation: 'キャッシュをクリアしますか？',
            deleteHymnalsConfirmation: 'すべてのハイムナルを削除しますか？',
            clearCacheConfirmationMessage: 'これはアプリが作成したキャッシュファイルをすべて削除します。',
            deleteHymnalsConfirmationMessage: 'これは現在ダウンロードされているすべてのハイムナルを削除します。',
            posthogOptOut: 'データ収集をオフにする',
            posthogOptIn: 'データ収集をオンにする',
            posthogOptOutConfirmation: 'データ収集をオフにしますか？',
            posthogOptOutConfirmationMessage: 'これはデータ収集をオフにします。いつでもオンにすることができます。',
            optOut: '確認',
            clear: 'クリア',
            delete: '削除',
            cancel: 'キャンセル',
        },
        pt: {
            help: 'Ajuda',
            general: 'GERAL',
            reportBug: 'Reportar um Bug',
            requestBook: 'Solicitar um Livro ou Característica',
            privacyPolicy: 'Política de Privacidade',
            debug: 'Depurar',
            clearCache: 'Limpar Cache',
            deleteHymnals: 'Excluir Todos os Hymnals',
            clearCacheConfirmation: 'Limpar Cache?',
            deleteHymnalsConfirmation: 'Excluir Todos os Hymnals?',
            clearCacheConfirmationMessage: 'Isso excluirá todos os arquivos de cache criados pela aplicação.',
            deleteHymnalsConfirmationMessage: 'Isso excluirá todos os hymnals atualmente baixados.',
            posthogOptOut: 'Desativar a coleta de dados',
            posthogOptIn: 'Ativar a coleta de dados',
            posthogOptOutConfirmation: 'Desativar a coleta de dados?',
            posthogOptOutConfirmationMessage: 'Isso desativará a coleta de dados. Você pode ativá-la novamente a qualquer momento.',
            optOut: 'Confirmar',
            clear: 'Limpar',
            delete: 'Excluir',
            cancel: 'Cancelar',
        },
        sr: {
            help: 'Pomoć',
            general: 'OPŠTE',
            reportBug: 'Prijavi grešku',
            requestBook: 'Zatražite knjigu ili funkciju',
            privacyPolicy: 'Politika privatnosti',
            debug: 'Otlaži',
            clearCache: 'Očisti keš',
            deleteHymnals: 'Obriši sve himnarije',
            clearCacheConfirmation: 'Očisti keš?',
            deleteHymnalsConfirmation: 'Obriši sve himnarije?',
            clearCacheConfirmationMessage: 'Ovo će obrisati sve keš fajlove koje je napravila aplikacija.',
            deleteHymnalsConfirmationMessage: 'Ovo će obrisati sve himnarije koje su trenutno preuzete.',
            posthogOptOut: 'Deaktivirati prikupljanje podataka',
            posthogOptIn: 'Aktivirati prikupljanje podataka',
            posthogOptOutConfirmation: 'Deaktivirati prikupljanje podataka?',
            posthogOptOutConfirmationMessage: 'Ovo će deaktivirati prikupljanje podataka. Možete ih ponovno aktivirati u bilo kojem trenutku.',
            optOut: 'Potvrdi',
            clear: 'Očisti',
            delete: 'Obriši',
            cancel: 'Otkaži',
        }
    }

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';
    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n.t('help'),
        });
    }, [navigation]);

    const posthog = usePostHog()
    return (
        <>
            <ScrollView style={styles.scrollView}>
                <View style={{}}>
                    <Text style={styles.settingsLabel}>{i18n.t('general')}</Text>
                </View>
                <View style={[styles.settingsContainer]}>
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://forms.gle/Ezh7d8LFsN5eKdo87');
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.settingsText}>{i18n.t('reportBug')}</Text>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://forms.gle/1t7rtUkNaksEUtPEA');
                        }}
                            underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.settingsText}>{i18n.t('requestBook')}</Text>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => { 
                            Linking.openURL('https://docs.google.com/document/d/1zWztUrFOr_6ksqDDm4EbQ0jk7trwofaVeeSybcD5PcA');
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.settingsText}>{i18n.t('privacyPolicy')}</Text>
                            <IconSymbol name="link" size={14} weight='bold' color={Colors[theme].fadedIcon} />
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={async () => {
                            if(context?.postHogOptedIn) {
                                context?.setPostHogOptedIn(false);
                                await posthog.optIn();
                            } else {
                                Alert.alert(i18n.t('posthogOptOutConfirmation'), i18n.t('posthogOptOutConfirmationMessage'), [
                                    {
                                        text: i18n.t('cancel'),
                                        onPress: () => {
                                            context?.setPostHogOptedIn(false);
                                        },
                                        style: 'cancel',
                                        isPreferred: true
                                    },
                                    {
                                        text: i18n.t('optOut'),
                                        onPress: async () => {
                                            // opt out of posthog
                                            context?.setPostHogOptedIn(true);
                                            await posthog.optOut();
                                        },
                                        style: 'default'
                                    },
                                ]);
                            }
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.settingsText}>{context?.postHogOptedIn ? i18n.t('posthogOptIn') : i18n.t('posthogOptOut')}</Text>
                        </View>
                    </TouchableHighlight>
                </View>
                <View style={{marginTop: 24}}>
                    <Text style={styles.settingsLabel}>{i18n.t('debug')}</Text>
                </View>
                <View style={[styles.settingsContainer]}>
                    <TouchableHighlight
                        onPress={() => { 
                            Alert.alert(i18n.t('clearCacheConfirmation'), i18n.t('clearCacheConfirmationMessage'), [
                                {
                                    text: i18n.t('cancel'),
                                    onPress: () => {
                                        
                                    },
                                    style: 'cancel',
                                    isPreferred: true
                                },
                                {
                                    text: i18n.t('clear'),
                                    onPress: () => {
                                        clearCache();
                                    },
                                    style: 'destructive'
                                },
                            ]);
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.destructiveSettingsText}>{i18n.t('clearCache')}</Text>
                        </View>
                    </TouchableHighlight>
                    <Divider width={1} color={Colors[theme].divider} style={{ width: '95%', marginLeft: 'auto' }} />
                    <TouchableHighlight
                        onPress={() => {
                            Alert.alert(i18n.t('deleteHymnalsConfirmation'), i18n.t('deleteHymnalsConfirmationMessage'), [
                                {
                                    text: i18n.t('cancel'),
                                    onPress: () => {
                                        
                                    },
                                    style: 'cancel',
                                    isPreferred: true
                                },
                                {
                                    text: i18n.t('delete'),
                                    onPress: async () => {
                                        // remove progress values
                                        context?.setDownloadProgressValues({});
                                        await deleteAllHymnals();
                                        const books = await loadHymnals();
                                        context?.SET_BOOK_DATA(books);
                                    },
                                    style: 'destructive'
                                },
                            ]);
                        }}
                        underlayColor={Colors[theme].divider}
                    >
                        <View style={styles.settingsItem}>
                            <Text style={styles.destructiveSettingsText}>{i18n.t('deleteHymnals')}</Text>
                        </View>
                    </TouchableHighlight>
                </View>
            </ScrollView>
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
        destructiveSettingsText: {
            fontSize: 18,
            fontWeight: '400',
            color: Colors[theme].destructive,
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
            fontWeight: 'bold',
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