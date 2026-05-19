import { HymnalContext } from '@/constants/context';
import { useContext } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  const context = useContext(HymnalContext);
  const systemTheme = useSystemColorScheme();
  const initialSystemTheme = Appearance.getColorScheme();
  const override = context?.themeOverride;

  if (override === 'light' || override === 'dark') {
    return override;
  }

  const resolvedSystemTheme = systemTheme ?? initialSystemTheme;
  return resolvedSystemTheme === 'dark' ? 'dark' : 'light';
}
