import { PreferencesContext } from '@/hooks/usePreferences';
import { useContext } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const preferences = useContext(PreferencesContext);
  const systemTheme = useSystemColorScheme();
  const initialSystemTheme = Appearance.getColorScheme();
  const override = preferences?.themeOverride;

  if (override === 'light' || override === 'dark') {
    return override;
  }

  const resolvedSystemTheme = systemTheme ?? initialSystemTheme;
  return resolvedSystemTheme === 'dark' ? 'dark' : 'light';
}
