import { useMemo } from 'react';
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { translations } from '@/constants/localization';
import { useContext } from 'react';
import { HymnalContext } from '@/constants/context';

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
    const context = useContext(HymnalContext);
    
    const i18n = useMemo(() => {
        const instance = getI18nInstance();
        // Update locale based on context or system locale
        instance.locale = context?.languageOverride ?? getLocales()[0]?.languageCode ?? 'en';
        return instance;
    }, [context?.languageOverride]);
    
    return i18n;
}
