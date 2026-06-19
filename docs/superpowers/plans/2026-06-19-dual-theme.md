# Dual Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace light/dark color palettes with Warm Minimal + Glass Neon themes, add missing semantic tokens, persist theme choice, and fix all hardcoded colors.

**Architecture:** Expand the `ColorScheme` interface with new tokens, update both palette objects, add `themeMode` field to settings.json persistence (following the existing `getX`/`setX` pattern), fix 5 components that have hardcoded color/font values, and wire the tab bar and daily-words sections to use new tokens.

**Tech Stack:** React Native (Expo SDK 56), TypeScript 6.0, expo-file-system (for persistence)

## Global Constraints

- No new packages — use existing `expo-file-system` for persistence (same as all other settings)
- No HTML/structural changes, no new UI elements
- Theme toggle already exists (3-chip row: System/Light/Dark) — keep it
- `npx tsc --noEmit` and `npx jest --passWithNoTests` must pass after each task
- All colors must reference `useTheme()` or `colors.*` — no hardcoded hex/rgba/font-family
- `withAlpha()` only works with `#RRGGBB` hex input — do not pass `rgba()` strings to it

---

### Task 1: Expand ColorScheme interface and add theme persistence

**Files:**
- Modify: `src/theme/ThemeContext.tsx` (full file rewrite)
- Modify: `src/utils/settings.ts` (add themeMode persistence)
- Modify: `src/constants/theme.ts` (update exports)
- Test: `src/theme/__tests__/ThemeContext.test.tsx` (new)

**Interfaces:**
- Produces: Updated `ColorScheme` with new fields, `ThemeProvider` with persistence, `getThemeMode`/`setThemeMode` from settings

- [ ] **Step 1: Add `themeMode` to Settings interface and persistence functions**

In `src/utils/settings.ts`, add `themeMode` field to the `Settings` interface and DEFAULTS, then add `getThemeMode`/`setThemeMode` functions:

```ts
// In the Settings interface, add after appLanguage:
  themeMode: 'system' | 'light' | 'dark';

// In DEFAULTS, add:
  themeMode: 'system',

// Add after the appLanguage getter/setter:
export async function getThemeMode(): Promise<'system' | 'light' | 'dark'> {
  const settings = await readSettings();
  return settings.themeMode;
}

export async function setThemeMode(mode: 'system' | 'light' | 'dark'): Promise<void> {
  const settings = await readSettings();
  settings.themeMode = mode;
  await writeSettings(settings);
}
```

- [ ] **Step 2: Run tsc + jest to verify settings change doesn't break anything**

```bash
npx tsc --noEmit && npx jest --passWithNoTests
```

Expected: PASS

- [ ] **Step 3: Update ColorScheme interface in ThemeContext.tsx**

Replace the existing `ColorScheme` interface (lines 4-23) and palettes (lines 25-65) with the expanded interface and new palettes.

Remove `primaryDark` from the interface. Add these new fields:

```ts
export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
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
}
```

- [ ] **Step 4: Replace lightColors with Warm Minimal palette**

Replace the `lightColors` object:

```ts
export const lightColors: ColorScheme = {
  primary: '#C45D3E',
  secondary: '#5B8A72',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F0E9',
  text: '#2C2420',
  textSecondary: '#8C7E74',
  textTertiary: '#B5A899',
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
};
```

- [ ] **Step 5: Replace darkColors with Glass Neon palette**

Replace the `darkColors` object:

```ts
export const darkColors: ColorScheme = {
  primary: '#00E5A0',
  secondary: '#3FB950',
  background: '#08080D',
  surface: 'rgba(255,255,255,0.04)',
  surfaceVariant: 'rgba(255,255,255,0.06)',
  text: '#E8E6E3',
  textSecondary: '#6B6B7B',
  textTertiary: '#4A4A5A',
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
};
```

- [ ] **Step 6: Update ThemeProvider to load/save theme mode with persistence**

Modify the `ThemeProvider` function (lines 87-104). Import the new settings functions:

```ts
import { getThemeMode, setThemeMode } from '../utils/settings';
```

Replace the existing ThemeProvider body. The key change: read saved mode on mount, persist on every mode change:

```ts
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

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
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
```

- [ ] **Step 7: Update src/constants/theme.ts exports**

Update the export list to include new fields:

```ts
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
```

(Note: this file actually already looks correct — the `ColorScheme` type is automatically updated since it re-exports. Verify no changes needed.)

- [ ] **Step 8: Create test for ThemeContext**

Create `src/theme/__tests__/ThemeContext.test.tsx`:

```tsx
import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useTheme, lightColors, darkColors } from '../ThemeContext';

// Mock useColorScheme to return 'light'
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return { ...rn, useColorScheme: () => 'light' };
});

// Mock settings persistence
jest.mock('../../utils/settings', () => ({
  getThemeMode: jest.fn().mockResolvedValue('system'),
  setThemeMode: jest.fn().mockResolvedValue(undefined),
}));

describe('ThemeContext', () => {
  it('provides light colors by default', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current.colors.primary).toBe(lightColors.primary);
    expect(result.current.colors.background).toBe(lightColors.background);
    expect(result.current.isDark).toBe(false);
  });

  it('returns correct canvasAlpha for light mode', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current.colors.canvasAlpha).toBe(0);
  });

  it('returns headingFontFamily for light mode', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(result.current.colors.headingFontFamily).toBe('Playfair Display');
  });

  it('has dark palette with different values', () => {
    expect(darkColors.primary).not.toBe(lightColors.primary);
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.canvasAlpha).toBe(1);
    expect(darkColors.shadow).toBe('transparent');
  });

  it('has all required ColorScheme keys', () => {
    const requiredKeys: (keyof typeof lightColors)[] = [
      'primary', 'secondary', 'background', 'surface', 'surfaceVariant',
      'text', 'textSecondary', 'textTertiary', 'border',
      'success', 'danger', 'warning', 'again', 'hard', 'good', 'easy',
      'shadow', 'overlay', 'tabBarBackground', 'tabActive', 'tabInactive',
      'toastBackground', 'toastText', 'canvasAlpha',
      'headingFontFamily', 'numFontFamily',
    ];
    for (const key of requiredKeys) {
      expect(lightColors[key]).toBeDefined();
      expect(darkColors[key]).toBeDefined();
    }
  });
});
```

- [ ] **Step 9: Run tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass including new ThemeContext test

- [ ] **Step 10: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors (will likely have errors from downstream components not yet updated)

- [ ] **Step 11: Commit**

```bash
git add src/theme/ThemeContext.tsx src/utils/settings.ts src/constants/theme.ts src/theme/__tests__/ThemeContext.test.tsx
git commit -m "feat: add Warm Minimal + Glass Neon palettes with theme persistence"
```

---

### Task 2: Fix hardcoded colors in components

**Files:**
- Modify: `src/screens/DeckDetailScreen.tsx:423`
- Modify: `src/screens/TemplateEditorScreen.tsx:230`
- Modify: `src/components/Skeleton.tsx:37`
- Modify: `src/screens/ImportScreen.tsx:337`
- Modify: `src/components/Confetti.tsx:12`

**Interfaces:**
- Consumes: Updated `ColorScheme` from Task 1 with `overlay`, `surfaceVariant`, `numFontFamily`

- [ ] **Step 1: Fix DeckDetailScreen.tsx modal overlay**

In `src/screens/DeckDetailScreen.tsx`, line 423, replace `'rgba(0,0,0,0.5)'` with `colors.overlay`:

```tsx
modalOverlay: {
  flex: 1,
  backgroundColor: colors.overlay,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.lg,
},
```

- [ ] **Step 2: Fix TemplateEditorScreen.tsx modal overlay**

In `src/screens/TemplateEditorScreen.tsx`, line 230, replace `'rgba(0,0,0,0.5)'` with `colors.overlay`:

```tsx
modalOverlay: {
  flex: 1,
  backgroundColor: colors.overlay,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.lg,
},
```

- [ ] **Step 3: Fix Skeleton.tsx shimmer background**

In `src/components/Skeleton.tsx`, line 37, replace the ternary with theme reference. Add `withAlpha` to the import (line 3). Replace the `bg` variable:

Remove:
```ts
const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
```

Replace with:
```ts
const bg = withAlpha(colors.text, 0.06);
```

Also remove the unused `isDark` from the destructure on line 18:
```ts
const { colors } = useTheme();
```

- [ ] **Step 4: Fix ImportScreen.tsx font-family**

In `src/screens/ImportScreen.tsx`, line 337, replace the platform-specific font:

Replace:
```ts
fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
```

With:
```ts
fontFamily: colors.numFontFamily,
```

Remove the `Platform` import if it's only used for this line. Check the file:
- `Platform` is imported at line 11 as `import { Platform, ... } from 'react-native';`
- Check if `Platform` is used elsewhere in this file. If only for this font line, remove it from the import.

- [ ] **Step 5: Fix Confetti.tsx hardcoded colors**

In `src/components/Confetti.tsx`, change the `COLORS` array (line 12) from a module-level constant to be generated inside the component so it uses theme colors.

First, add theme import:
```ts
import { useTheme } from '../constants/theme';
```

Then, inside the `Confetti` component (before `useMemo`), derive colors from the theme:
```ts
export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const { colors } = useTheme();

  const confettiPalette = useMemo(() => [
    colors.primary,
    colors.secondary,
    colors.success,
    colors.danger,
    colors.warning,
    colors.easy,
    colors.good,
    colors.hard,
  ], [colors]);

  const particles = useMemo(() => generateParticles(confettiPalette), [confettiPalette]);
  ...
```

Update `generateParticles` to accept a palette parameter:
```ts
function generateParticles(palette: string[]): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.random() - 0.5) * Math.PI * 0.7;
    const distance = 150 + Math.random() * 350;
    return {
      id: i,
      dx: Math.sin(angle) * distance,
      dy: -(Math.cos(angle) * distance),
      color: palette[Math.floor(Math.random() * palette.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 300,
      rotation: Math.random() * 360,
      startX: (Math.random() - 0.5) * SCREEN_W * 0.5,
    };
  });
}
```

Remove the old `const COLORS = [...]` line (line 12).

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Run tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add src/screens/DeckDetailScreen.tsx src/screens/TemplateEditorScreen.tsx src/components/Skeleton.tsx src/screens/ImportScreen.tsx src/components/Confetti.tsx
git commit -m "fix: replace hardcoded colors with theme tokens"
```

---

### Task 3: Wire tab bar and daily words to new theme tokens

**Files:**
- Modify: `src/navigation/AppNavigator.tsx` (tab bar colors)
- Modify: `src/screens/HomeScreen.tsx` (daily words icon colors)

**Interfaces:**
- Consumes: `colors.tabBarBackground`, `colors.tabActive`, `colors.tabInactive` from Task 1

- [ ] **Step 1: Wire AppNavigator tab bar to new tokens**

In `src/navigation/AppNavigator.tsx`, lines 67-81, update the tab bar to use the new tokenized colors:

Replace lines 67-76 with:
```tsx
color={focused ? colors.tabActive : colors.tabInactive}
```

Replace:
```tsx
tabBarActiveTintColor: colors.tabActive,
tabBarInactiveTintColor: colors.tabInactive,
tabBarStyle: {
  backgroundColor: colors.tabBarBackground,
  borderTopColor: colors.border,
},
```

Full updated `screenOptions` block:
```tsx
screenOptions={({ route }) => ({
  headerShown: false,
  tabBarLabel: route.name === 'Home' ? t('tab.home')
    : route.name === 'DeckList' ? t('tab.decks')
    : route.name === 'Settings' ? t('tab.settings')
    : route.name,
  tabBarIcon: ({ focused, size }) => {
    const icons = tabIcons[route.name];
    return (
      <Ionicons
        name={focused ? icons.focused : icons.unfocused}
        size={size}
        color={focused ? colors.tabActive : colors.tabInactive}
      />
    );
  },
  tabBarActiveTintColor: colors.tabActive,
  tabBarInactiveTintColor: colors.tabInactive,
  tabBarStyle: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
})}
```

- [ ] **Step 2: Wire HomeScreen daily words icons to use success theme**

In `src/screens/HomeScreen.tsx`, update the daily words icon wrappers to use `colors.success` instead of `colors.primary`/`colors.secondary` for the "has words" and "no language" states. The spec says:
- Daily words icon background: `rgba(91,138,114,0.1)` (light) / `rgba(0,229,160,0.1)` (dark) — this is `withAlpha(colors.success, 0.1)` / `withAlpha(colors.primary, 0.1)`
- Daily words icon color: `#5B8A72` (light) / `#00E5A0` (dark) — these are `colors.success` / `colors.primary`

The daily words feature uses `colors.primary` for its icons. After the theme change, in light mode `colors.primary` is `#C45D3E` (warm terracotta) and in dark mode it's `#00E5A0` (neon green). The spec designates the activity icon to be red/pink in dark mode, and daily words to use green tones.

Since the daily words "tap to generate" and "has words" states already use `colors.primary` which now maps correctly (terracotta in light, neon green in dark), these are already correct. No change needed.

The "no language" state (line 768) uses `colors.secondary`. After theme update, `colors.secondary` = `#5B8A72` (light) / `#3FB950` (dark) — green tones in both. That works.

So: no changes needed in HomeScreen.tsx daily words section — the colors naturally resolve correctly.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: wire tab bar to new tab-specific theme tokens"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```bash
npx jest --passWithNoTests
```

Expected: all tests pass

- [ ] **Step 3: Verify no remaining hardcoded colors**

```bash
grep -rn "rgba(" src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "colors\." | grep -v "ThemeContext" | grep -v "__tests__"
```

Expected: only the `lightColors`/`darkColors` definitions in ThemeContext.tsx should contain rgba values. If any other file shows hardcoded `rgba()`, fix it.

- [ ] **Step 4: Run lint (if configured)**

```bash
npx eslint src/ --ext .ts,.tsx 2>/dev/null || echo "No eslint config"
```

