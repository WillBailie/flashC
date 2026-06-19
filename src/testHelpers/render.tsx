import React from 'react';
import { render, RenderResult } from '@testing-library/react-native';
import { ThemeProvider } from '../theme/ThemeContext';

export async function renderWithTheme(ui: React.ReactElement): Promise<RenderResult> {
  return render(
    React.createElement(ThemeProvider, null, ui)
  );
}
