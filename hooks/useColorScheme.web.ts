import { HymnalContext } from '@/constants/context';
import { useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const context = useContext(HymnalContext);
  const systemTheme = useSystemColorScheme();
  const override = context?.themeOverride;

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
