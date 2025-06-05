const supportedLanguages = ["en", "es", "fr", "de", "pt", "sr", "ja"];

function getLanguageName(languageCode: string) {
    switch(languageCode) {
        case 'en': return 'English';
        case 'es': return 'Español';
        case 'fr': return 'Français';
        case 'de': return 'Deutsch';
        case 'pt': return 'Português';
        case 'sr': return 'Srpski';
        case 'ja': return '日本語';
        default: return languageCode;
    }
}

export { supportedLanguages, getLanguageName };