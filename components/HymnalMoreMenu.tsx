import { Alert, Button, Pressable, TouchableOpacity, useColorScheme } from 'react-native'
import * as DropdownMenu from 'zeego/dropdown-menu'
import { IconSymbol } from './ui/IconSymbol'
import { Colors } from '@/constants/Colors';
import React, { useContext } from 'react';
import { HymnalContext } from '@/constants/context';
import { BookSummary, SortMode } from '@/constants/types';
import { router } from 'expo-router';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { HeaderButton } from './HeaderButton';

interface HymnalMoreMenuProps {
    bookSummary: BookSummary;
}

export function HymnalMoreMenu({ bookSummary }: HymnalMoreMenuProps) {
    const theme = useColorScheme() ?? 'light';
    const context = useContext(HymnalContext);



    const translations = {
        en: {
            sortingLabel: 'Sorting Options',
            numerical: 'Numerical',
            alphabetical: 'Alphabetical',
            topical: 'Topical',
            deleteHymnal: 'Delete Hymnal',
            deleteAlertTitle: 'Delete ',
            deleteAlertMessage: 'You can always download the hymnal again later.',
            cancel: 'Cancel',
            delete: 'Delete',
        },
        es: {
            sortingLabel: 'Opciones de Ordenamiento',
            numerical: 'Numérico',
            alphabetical: 'Alfabético',
            topical: 'Tópico',
            deleteHymnal: 'Borrar Himnario',
            deleteAlertTitle: 'Borrar ',
            deleteAlertMessage: 'Siempre puedes descargar el himnario de nuevo más tarde.',
            cancel: 'Cancelar',
            delete: 'Borrar',
        },
        fr: {
            sortingLabel: 'Options de Tri',
            numerical: 'Numérique',
            alphabetical: 'Alphabétique',
            topical: 'Topique',
            deleteHymnal: 'Supprimer le Livre de Hymnes',
            deleteAlertTitle: 'Supprimer ',
            deleteAlertMessage: 'Vous pouvez toujours télécharger le livre de hymnes plus tard.',
            cancel: 'Annuler',
            delete: 'Supprimer',
        },
        de: {
            sortingLabel: 'Sortieroptionen',
            numerical: 'Numerisch',
            alphabetical: 'Alphabetisch',
            topical: 'Thematisch',
            deleteHymnal: 'Gesangbuch löschen',
            deleteAlertTitle: 'Löschen ',
            deleteAlertMessage: 'Sie können das Gesangbuch später jederzeit erneut herunterladen.',
            cancel: 'Stornieren',
            delete: 'Löschen',
        },
        sr: {
            sortingLabel: 'Sortiranje',
            numerical: 'Numerički',
            alphabetical: 'Abecedni',
            topical: 'Tematički',
            deleteHymnal: 'Obriši himnolog',
            deleteAlertTitle: 'Obriši ',
            deleteAlertMessage: 'Možete u ljubom trenutku ponovo preuzeti himnolog.',
            cancel: 'Otkaži',
            delete: 'Obriši',
        },
        ja: {
            sortingLabel: '並べ替えオプション',
            numerical: '数字順',
            alphabetical: 'アルファベット順',
            topical: 'トピック順',
            deleteHymnal: '賛美歌を削除する',
            deleteAlertTitle: '削除 ',
            deleteAlertMessage: '賛美歌集はいつでも再ダウンロードできます。',
            cancel: 'キャンセル',
            delete: '削除',
        },
        pt: {
            sortingLabel: 'Opções de Ordenação',
            numerical: 'Numérico',
            alphabetical: 'Alfabético',
            topical: 'Tópico',
            deleteHymnal: 'Deletar Hinário',
            deleteAlertTitle: 'Deletar ',
            deleteAlertMessage: 'Você pode sempre baixar o hinário novamente mais tarde.',
            cancel: 'Cancelar',
            delete: 'Deletar',
        }
    }

    const i18n = new I18n(translations);
    i18n.enableFallback = true;
    i18n.locale = context?.languageOverride ?? getLocales()[0].languageCode ?? 'en';

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <HeaderButton onPress={() => {}}>
                    <IconSymbol
                        name="ellipsis.circle"
                        size={24}
                        color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
                    />
                </HeaderButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Group>
                    <DropdownMenu.Label>{i18n.t('sortingLabel')}</DropdownMenu.Label>
                    <DropdownMenu.Item key="numerical-sort" onSelect={() => { context?.setSortMode?.(SortMode.NUMERICAL) }}>
                        <DropdownMenu.ItemTitle>{i18n.t('numerical')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'textformat.123' }}>
                            <IconSymbol name='textformat.123' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item key="alphabetical-sort" onSelect={() => { context?.setSortMode?.(SortMode.ALPHABETICAL) }}>
                        <DropdownMenu.ItemTitle>{i18n.t('alphabetical')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'textformat.abc' }}>
                            <IconSymbol name='textformat.abc' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                    {bookSummary.indexAvailable && (
                        <DropdownMenu.Item key="topical-sort" onSelect={() => { context?.setSortMode?.(SortMode.TOPICAL) }}>
                            <DropdownMenu.ItemTitle>{i18n.t('topical')}</DropdownMenu.ItemTitle>
                            <DropdownMenu.ItemIcon ios={{ name: 'book' }}>
                                <IconSymbol name='book' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                            </DropdownMenu.ItemIcon>
                        </DropdownMenu.Item>
                    )}
                </DropdownMenu.Group>

                <DropdownMenu.Group>
                    <DropdownMenu.Item key="delete-action" destructive={true} onSelect={async () => {
                        Alert.alert(`${i18n.t('deleteAlertTitle')}"${bookSummary.name.medium}"`, i18n.t('deleteAlertMessage'), [
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
                                    // navigate back
                                    router.back();
                                    await context?.deleteHymnal?.(bookSummary.name.short);
                                },
                                style: 'destructive'
                            },
                        ]);
                    }}>
                        <DropdownMenu.ItemTitle>{i18n.t('deleteHymnal')}</DropdownMenu.ItemTitle>
                        <DropdownMenu.ItemIcon ios={{ name: 'trash' }}>
                            <IconSymbol name='trash' size={16} color={theme === 'light' ? Colors.light.icon : Colors.dark.icon} />
                        </DropdownMenu.ItemIcon>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}