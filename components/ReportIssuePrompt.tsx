import Alert from '@blazejkustra/react-native-alert';
import type { I18n } from 'i18n-js';

export function showReportIssuePrompt(i18n: I18n, onSubmit: (description: string) => void) {
    Alert.prompt(
        i18n.t('reportIssue'),
        i18n.t('reportIssueMessage'),
        [
            { text: i18n.t('cancel'), style: 'cancel' },
            {
                text: i18n.t('reportIssueSubmit'),
                style: 'default',
                onPress: (value?: string) => {
                    const trimmed = (value ?? '').trim();
                    if (!trimmed) {
                        Alert.alert(i18n.t('reportIssue'), i18n.t('reportIssueDescriptionRequired'));
                        return;
                    }
                    onSubmit(trimmed);
                },
            },
        ],
        'plain-text',
        '',
    );
}
