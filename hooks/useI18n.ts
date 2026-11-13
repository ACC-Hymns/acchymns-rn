import { useMemo, useContext } from 'react';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { translations } from '@/constants/localization';
import { PreferencesContext } from '@/hooks/usePreferences';

// Create a singleton I18n instance to avoid recreating it on every render
let i18nInstance: I18n | null = null;

function getI18nInstance(): I18n {
    if (!i18nInstance) {
        i18nInstance = new I18n(translations);
        i18nInstance.enableFallback = true;
    }
    return i18nInstance;
}

export function useI18n() {
    const preferences = useContext(PreferencesContext);
    
    const i18n = useMemo(() => {
        const instance = getI18nInstance();
        instance.locale = preferences?.languageOverride ?? getLocales()[0]?.languageCode ?? 'en';
        return instance;
    }, [preferences?.languageOverride]);
    
    return i18n;
}
