/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { I18n } from "i18n-js";

const tintColorLight = '#000';
const tintColorDark = '#fff';
export const Colors = {
  light: {
    text: '#000000',
    fadedText: '#8A9199', // More faded text color
    background: '#F2F2F7',
    songBackground: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#007AFF',
    headerBackground: '#F8F8F8',
    headerTransparent: 'rgba(255, 255, 255, 0.0)',
    searchBarBackground: '#E3E3E9',
    iosBlue: '#007AFF',
    border: 'rgba(0, 0, 0, 0.12)',
    handleBar: '#0a0a0a',
    fadedIcon: '#C5C8CC',
    divider: '#e8e8e8',
    destructive: '#fd3b31',
    settingsButton: '#fff'
  },
  dark: {
    text: '#FFFFFF',
    fadedText: '#787E83', // More faded text color
    background: '#000',
    songBackground: '#000',
    settingsButton: '#141414',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#007AFF',
    headerTransparent: 'rgba(255, 255, 255, 0.0)',
    headerBackground: '#1C1C1E',
    searchBarBackground: '#1C1C1E',
    iosBlue: '#007AFF',
    border: 'rgba(255, 255, 255, 0.4)',
    handleBar: '#dcdcdc',
    fadedIcon: '#9BA1A6',
    divider: '#333333',
    destructive: '#fd3b31'
  },
};


export const supportedThemes = ['system', 'light', 'dark'];