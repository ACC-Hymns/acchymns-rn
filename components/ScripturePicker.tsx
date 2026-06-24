import { Reading } from '@/constants/bible';
import {
    formatScriptureSelection,
    getScriptureReference,
    ScriptureSelection,
    selectionToReading,
    subscribeScriptureReferences,
} from '@/constants/scripturePicker';
import { openScripturePicker } from '@/constants/scripturePickerNavigation';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from './StyledText';
import { makeScripturePickerStyles } from './scripturePicker/scripturePickerStyles';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useI18n } from '@/hooks/useI18n';

export type { ScriptureSelection } from '@/constants/scripturePicker';

interface ScripturePickerProps {
    pickerIndex: number;
    send: (input: Reading) => void;
}

export default function ScripturePicker({ pickerIndex, send }: ScripturePickerProps) {
    const theme = useColorScheme() ?? 'light';
    const styles = makeScripturePickerStyles(theme);
    const [selection, setSelection] = useState<ScriptureSelection | null>(
        () => getScriptureReference(pickerIndex),
    );
    const i18n = useI18n();
    useEffect(() => {
        return subscribeScriptureReferences((references) => {
            setSelection(references[pickerIndex] ?? null);
        });
    }, [pickerIndex]);

    return (
        <View style={styles.triggerContainer}>
            <View style={styles.triggerRow}>
                <TouchableOpacity
                    style={styles.triggerInput}
                    onPress={() => openScripturePicker(pickerIndex, selection)}
                >
                    <StyledText style={styles.triggerInputText}>
                        {formatScriptureSelection(selection)}
                    </StyledText>
                </TouchableOpacity>
                {selection?.rangeStart != null && (
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => send(selectionToReading(selection))}
                    >
                        <Ionicons name="send" size={18} color="white" />
                        <StyledText style={styles.actionButtonLabel}>{i18n.t('send')}</StyledText>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
