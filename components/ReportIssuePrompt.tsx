import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import StyledText from '@/components/StyledText';
import { Colors } from '@/constants/Colors';
import { useI18n } from '@/hooks/useI18n';
import { fontFamily } from '@/constants/assets';

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
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.root}>
                <Pressable style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose} />
                <View style={styles.centerLayer} pointerEvents="box-none">
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.kav}
                    >
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
                                    <StyledText style={{ color: c.primary, fontSize: 18 }}>{i18n.t('cancel')}</StyledText>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSubmit} style={[styles.button, styles.submitButton]}>
                                    <StyledText style={{ color: c.destructive, fontSize: 18 }}>{i18n.t('reportIssueSubmit')}</StyledText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
    },
    centerLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        padding: 24,
    },
    kav: {
        width: '100%',
        maxHeight: '90%',
    },
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    title: {
        fontSize: 17,
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        marginBottom: 12,
    },
    input: {
        minHeight: 100,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        fontFamily: fontFamily.regular,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    submitButton: {
        fontSize: 16,
        marginLeft: 16,
    },
});
