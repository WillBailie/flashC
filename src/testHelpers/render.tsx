import React from 'react';
import { render, RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../theme/ThemeContext';

export async function renderWithTheme(ui: React.ReactElement): Promise<RenderResult> {
  return render(
    React.createElement(SafeAreaProvider, {
      initialMetrics: {
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, bottom: 34, left: 0, right: 0 },
      },
    },
      React.createElement(ThemeProvider, null, ui)
    )
  );
}
