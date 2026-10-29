import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  field: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
  green: string;
  paywall: string;
  paywallBorder: string;
  access: string;
  subtle: string;
  overlay: string;
};

export const AppColors: AppColors = {
  background: '#f7f6f1', surface: '#ffffff', field: '#f1f0e9', border: '#deddd4',
  text: '#25271f', muted: '#6d7165', accent: '#85621f', danger: '#a93e35', green: '#467246',
  paywall: '#f3efe5', paywallBorder: '#d9cba8', access: '#edf3e8', subtle: '#77796f', overlay: '#f7f6f177',
};

const DarkColors: AppColors = {
  background: '#151612', surface: '#20211c', field: '#2a2b25', border: '#393a32',
  text: '#f4f2e9', muted: '#b3b1a5', accent: '#d1aa61', danger: '#ef8e83', green: '#94c98e',
  paywall: '#29261f', paywallBorder: '#5c4c2d', access: '#252e23', subtle: '#aaa99e', overlay: '#151612dd',
};

type ThemeContextValue = { colors: AppColors; mode: ThemeMode; isDark: boolean; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue>({ colors: AppColors, mode: 'light', isDark: false, setMode: () => {} });
const THEME_MODE_KEY = 'seekreality_theme_mode';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    const readMode = async () => {
      try {
        const saved = Platform.OS === 'web'
          ? localStorage.getItem(THEME_MODE_KEY)
          : await SecureStore.getItemAsync(THEME_MODE_KEY);
        if (active && (saved === 'system' || saved === 'light' || saved === 'dark')) setModeState(saved);
      } catch { /* Keep the system default when storage is unavailable. */ }
    };
    void readMode();
    return () => { active = false; };
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      if (Platform.OS === 'web') localStorage.setItem(THEME_MODE_KEY, nextMode);
      else void SecureStore.setItemAsync(THEME_MODE_KEY, nextMode).catch(() => {});
    } catch { /* The selected appearance still applies for this session. */ }
  }, []);
  const value = useMemo(() => ({ colors: isDark ? DarkColors : AppColors, mode, isDark, setMode }), [mode, isDark, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
