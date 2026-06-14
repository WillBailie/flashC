import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';

export interface ColorScheme {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
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
}

export const lightColors: ColorScheme = {
  primary: '#4A90D9',
  primaryDark: '#3A7BC8',
  secondary: '#6C63FF',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceVariant: '#F0F2F7',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  again: '#EF4444',
  hard: '#F59E0B',
  good: '#10B981',
  easy: '#3B82F6',
  shadow: '#0000001A',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkColors: ColorScheme = {
  primary: '#5B9FE0',
  primaryDark: '#4A90D9',
  secondary: '#8B83FF',
  background: '#0F1117',
  surface: '#1A1D26',
  surfaceVariant: '#222531',
  text: '#E4E6EB',
  textSecondary: '#9CA3AF',
  border: '#2D3039',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  again: '#EF4444',
  hard: '#F59E0B',
  good: '#10B981',
  easy: '#3B82F6',
  shadow: '#00000040',
  overlay: 'rgba(0,0,0,0.7)',
};

export function withAlpha(hex: string, opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  const alpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hex}${alpha}`;
}

type ThemeMode = 'system' | 'light' | 'dark';

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

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setModeStable = useCallback((m: ThemeMode) => setMode(m), []);

  const value = useMemo(
    () => ({ colors, mode, isDark, setMode: setModeStable }),
    [colors, mode, isDark, setModeStable]
  );

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
