import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode } from '../utils/settings';

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  success: string;
  danger: string;
  warning: string;
  again: string;
  hard: string;
  good: string;
  easy: string;
  shadow: string;
  overlay: string;
  tabBarBackground: string;
  tabActive: string;
  tabInactive: string;
  toastBackground: string;
  toastText: string;
  canvasAlpha: number;
  headingFontFamily: string;
  numFontFamily: string;
  ringTrack: string;
  ringFill: string;
}

export const lightColors: ColorScheme = {
  primary: '#C45D3E',
  secondary: '#5B8A72',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F0E9',
  text: '#2C2420',
  textSecondary: '#8C7E74',
  textTertiary: '#B5A899',
  textInverse: '#FFFFFF',
  border: '#EDE6DC',
  success: '#5B8A72',
  danger: '#D14D4D',
  warning: '#D4A03C',
  again: '#D14D4D',
  hard: '#D4A03C',
  good: '#5B8A72',
  easy: '#5B8A9E',
  shadow: '#2C2420',
  overlay: 'rgba(44,36,32,0.5)',
  tabBarBackground: 'rgba(250,247,242,0.94)',
  tabActive: '#C45D3E',
  tabInactive: '#B5A899',
  toastBackground: '#2C2420',
  toastText: '#FAF7F2',
  canvasAlpha: 0,
  headingFontFamily: 'Playfair Display',
  numFontFamily: 'Space Grotesk',
  ringTrack: '#EDE6DC',
  ringFill: '#C45D3E',
};

export const darkColors: ColorScheme = {
  primary: '#00E5A0',
  secondary: '#3FB950',
  background: '#08080D',
  surface: '#14141E',
  surfaceVariant: '#1A1A26',
  text: '#E8E6E3',
  textSecondary: '#6B6B7B',
  textTertiary: '#4A4A5A',
  textInverse: '#08080D',
  border: 'rgba(255,255,255,0.08)',
  success: '#3FB950',
  danger: '#FF4D5A',
  warning: '#F0A840',
  again: '#FF4D5A',
  hard: '#F0A840',
  good: '#3FB950',
  easy: '#4A9EFF',
  shadow: 'transparent',
  overlay: 'rgba(0,0,0,0.7)',
  tabBarBackground: 'rgba(8,8,13,0.92)',
  tabActive: '#00E5A0',
  tabInactive: '#4A4A5A',
  toastBackground: 'rgba(0,229,160,0.15)',
  toastText: '#00E5A0',
  canvasAlpha: 1,
  headingFontFamily: 'Space Grotesk',
  numFontFamily: 'JetBrains Mono',
  ringTrack: 'rgba(255,255,255,0.06)',
  ringFill: '#00E5A0',
};

type ThemeMode = 'system' | 'light' | 'dark';

export function resolveIsDark(mode: ThemeMode, systemScheme: string | null | undefined): boolean {
  return mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
}

export function withAlpha(hex: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  const alpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${alpha}`;
}

interface ThemeContextValue {
  colors: ColorScheme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getThemeMode().then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setMode(saved);
      }
      setLoaded(true);
    });
  }, []);

  const isDark = resolveIsDark(mode, systemScheme);
  const colors = isDark ? darkColors : lightColors;

  const setModeStable = useCallback((m: ThemeMode) => {
    setMode(m);
    setThemeMode(m);
  }, []);

  const value = useMemo(
    () => ({ colors, mode, isDark, setMode: setModeStable }),
    [colors, mode, isDark, setModeStable]
  );

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const typography = {
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
