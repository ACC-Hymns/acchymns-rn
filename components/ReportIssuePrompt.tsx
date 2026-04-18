import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { useI18n } from '@/hooks/useI18n';

type ReportIssuePromptProps = {
    visible: boolean;
    onClose: () => void;
    onSubmit: (description: string) => void;
};

export function ReportIssuePrompt({ visible, onClose, onSubmit }: ReportIssuePromptProps) {
    const theme = useColorScheme() ?? 'light';
    const c = Colors[theme];
    const i18n = useI18n();
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (visible) {
            setDescription('');
        }
    }, [visible]);

    const handleSubmit = () => {
        const trimmed = description.trim();
        if (!trimmed) {
            Alert.alert(i18n.t('reportIssue'), i18n.t('reportIssueDescriptionRequired'));
            return;
        }
        onSubmit(trimmed);
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: c.songBackground,
                            borderColor: c.border,
                        },
                    ]}
                >
                    <StyledText style={[styles.title, { color: c.text }]}>{i18n.t('reportIssue')}</StyledText>
                    <StyledText style={[styles.message, { color: c.fadedText }]}>
                        {i18n.t('reportIssueMessage')}
                    </StyledText>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                color: c.text,
                                borderColor: c.border,
                                backgroundColor: theme === 'dark' ? c.settingsButton : c.background,
                            },
                        ]}
                        placeholder={i18n.t('reportIssueDescriptionPlaceholder')}
                        placeholderTextColor={c.fadedText}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                    />
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={onClose} style={styles.button}>
                            <StyledText style={{ color: c.primary }}>{i18n.t('cancel')}</StyledText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSubmit} style={[styles.button, styles.submitButton]}>
                            <StyledText style={{ color: c.destructive }}>{i18n.t('reportIssueSubmit')}</StyledText>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
    },
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 20,
        maxHeight: '80%',
        zIndex: 1,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        marginBottom: 12,
    },
    input: {
        minHeight: 100,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    submitButton: {
        marginLeft: 16,
    },
});
