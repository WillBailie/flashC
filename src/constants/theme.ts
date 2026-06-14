export {
  lightColors as colors,
  darkColors,
  spacing,
  borderRadius,
  withAlpha,
  useTheme,
  ThemeProvider,
  typography,
} from '../theme/ThemeContext';
export type { ColorScheme } from '../theme/ThemeContext';

import { typography as t } from '../theme/ThemeContext';
export const fontSize = t.fontSize;
export const fontWeight = t.fontWeight;
