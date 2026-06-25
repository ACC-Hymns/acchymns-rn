import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { SCRIPTURE_PICKER_TILE_MARGIN } from '@/constants/scripturePickerLayout';

export function makeScripturePickerStyles(theme: 'light' | 'dark') {
    return StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor: Colors[theme].background,
        },
        actionButtonLabel: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
            fontFamily: 'Lato',
        },
        listContent: {
            paddingHorizontal: 20,
            paddingBottom: 24,
        },
        sectionHeader: {
            fontSize: 13,
            fontWeight: '600',
            color: Colors[theme].text,
            opacity: 0.6,
            letterSpacing: 1,
            marginTop: 16,
            marginBottom: 8,
            marginLeft: SCRIPTURE_PICKER_TILE_MARGIN,
        },
        sectionHeaderFirst: {
            marginTop: 0,
        },
        bookRow: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        gridRow: {
            justifyContent: 'flex-start',
        },
        bookTile: {
            margin: SCRIPTURE_PICKER_TILE_MARGIN,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors[theme].settingsButton,
            borderRadius: 15,
        },
        tile: {
            margin: SCRIPTURE_PICKER_TILE_MARGIN,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: Colors[theme].settingsButton,
            borderRadius: 15,
        },
        tileSelected: {
            backgroundColor: Colors[theme].primary,
        },
        tileText: {
            fontSize: 16,
            color: Colors[theme].text,
            textAlign: 'center',
        },
        tileBookText: {
            fontSize: 14,
            color: Colors[theme].text,
            textAlign: 'center',
        },
        tileTextSelected: {
            color: '#fff',
            fontWeight: '700',
        },
        triggerContainer: {
            paddingVertical: 20,
            width: '100%',
        },
        triggerRow: {
            flexDirection: 'row',
            gap: 10,
            width: '100%',
        },
        triggerInput: {
            flex: 1,
            backgroundColor: Colors[theme].settingsButton,
            padding: 15,
            borderRadius: 15,
        },
        triggerInputText: {
            color: Colors[theme].text,
            textAlign: 'center',
        },
        actionButtonGroup: {
            flexDirection: 'row',
            gap: 8,
        },
        clearButton: {
            backgroundColor: Colors[theme].destructive,
            padding: 5,
            paddingHorizontal: 12,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sendButton: {
            backgroundColor: Colors[theme].primary,
            padding: 5,
            paddingHorizontal: 15,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 8,
        },
    });
}
