import { PreferencesContext } from '@/hooks/usePreferences';
import { useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const preferences = useContext(PreferencesContext);
  const systemTheme = useSystemColorScheme();
  const override = preferences?.themeOverride;

  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (override === 'light' || override === 'dark') {
    return override;
  }

  const resolvedSystemTheme =
    (hasHydrated ? systemTheme : null) ?? Appearance.getColorScheme();
  return resolvedSystemTheme === 'dark' ? 'dark' : 'light';
}
