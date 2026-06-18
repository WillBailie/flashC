# Settings Screen Redesign

**Date:** 2026-06-18
**Status:** Approved

## Goal

Modernize the Settings screen into a clean, sleek card-based layout. Remove the segment control that loads Import/Stats/Templates as sub-pages, group related preferences into cards, and keep the API key behind an extra tap (bottom sheet).

## Current State (Problems)

- `SettingsScreen.tsx` is 479 lines, with ~475 lines of JSX
- Segment control at top loads ImportScreen, StatsView, TemplateListScreen as inline sub-pages — these are full features, not settings
- Theme, Language, and AI are stacked loosely with no visual grouping
- AI API key Input, Save button, and Test Key button are always visible inline when toggled ON — cluttered
- No version info

## Design

### Layout — 4 cards in a single ScrollView

```
┌─────────────────────────────┐
│ 🎨 Appearance               │
│   THEME: [System] [Light] [Dark]
│   LANGUAGE: [English] [中文]   │
├─────────────────────────────┤
│ ⚙️ Data & Tools             │
│   📊 Stats         6 due  → │
│   📥 Import               → │
│   🗂 Templates   3 templates→ │
│   📤 Export               → │
├─────────────────────────────┤
│ 🤖 AI Assistant      [────] │
│   AI card generation & import│
│   (if ON: API Key row  →)   │
├─────────────────────────────┤
│ Flashcard App v1.0.0        │
│ Expo SDK 56                  │
└─────────────────────────────┘
```

### Interaction Flows

**Appearance Card:**
- Theme: 3 icon chips (System/Light/Dark). Uses existing `setMode()` from ThemeContext.
- Language: 2 pill chips (English/简体中文). Uses existing `setLanguage()` from TranslationContext.

**Data & Tools Card:**
- 4 tappable rows. Each navigates via `navigation.navigate()`:
  - Stats → pushes a new `StatsScreen` (extract `StatsView` from current SettingsScreen)
  - Import → pushes existing `ImportScreen` (already a stack screen)
  - Templates → pushes existing `TemplateListScreen` (already a stack screen)
  - Export → pushes a new `ExportScreen` (to be created, simple wrapper)

**AI Assistant Card:**
- Toggle Switch (uses existing `setAiEnabled()`)
- When OFF: just the toggle + description
- When ON: adds an "API Key" row showing masked key + chevron
  - Tapping the row opens a bottom sheet modal (`<Modal>` component)
  - Bottom sheet contains: Input (with eye toggle), Save button, Test Key button + status icon
  - Uses existing State logic: `draftApiKey`, `apiKeyVisible`, `testing`, `testStatus`

**Version Footer:**
- Static text. No interaction.

### New Navigable Screens

Two screens need to be extracted from or added to the stack navigator:

1. **StatsScreen** — extract `StatsView` component from SettingsScreen into its own screen file at `src/screens/StatsScreen.tsx`
2. **ExportScreen** — new screen at `src/screens/ExportScreen.tsx`. Shows a list of decks; tapping a deck opens a format picker (CSV/JSON) using existing `exportDeckToCSV`/`exportDeckToJSON` utilities and `expo-sharing`. Reuses the export modal pattern from `DeckDetailScreen`.

Both added to `RootStackParamList` in `AppNavigator.tsx`.

### Translation Keys Needed

| Key | English |
|-----|---------|
| `settings.appearance` | Appearance |
| `settings.themeLabel` | Theme |
| `settings.languageLabel` | Language |
| `settings.dataTools` | Data & Tools |
| `settings.stats` | Stats |
| `settings.import` | Import |
| `settings.templates` | Templates |
| `settings.export` | Export |
| `settings.exportTitle` | Export |
| `settings.apiKeyRow` | API Key |
| `settings.configureApiKey` | Configure API Key |
| `settings.version` | Flashcard App |
| `settings.testConnection` | Test Key |
| `settings.connectionOk` | Connection OK |

Remove obsolete keys: `settings.segmentImport`, `settings.segmentStats`, `settings.segmentTemplates`.

### What Gets Removed

- `Section` type union (`'import' | 'stats' | 'templates'`)
- `section` state variable
- `segmentRow`/`segmentButton`/`segmentActive`/`segmentText`/`segmentTextActive` styles
- Conditional rendering of `ImportScreen`, `StatsView`, `TemplateListScreen` inline

### Existing Code Preserved

- All AI state logic (`aiEnabled`, `draftApiKey`, `apiKeyVisible`, `testing`, `testStatus`, handlers)
- Theme mode state + `setMode()`
- Language state + `setLanguage()` + `availableLanguages`
- `useTranslation()` hook usage
- `useTheme()` hook usage
- All theme tokens (`spacing`, `borderRadius`, `typography`, `withAlpha`)
- `Card` component for card containers
- `Input` component for API key field
- `Modal` component for bottom sheet
- `Button` component for Cancel/Save/Test actions

### File Changes

| File | Change |
|------|--------|
| `src/screens/SettingsScreen.tsx` | Full rewrite (~200 lines) |
| `src/screens/StatsScreen.tsx` | New — extracted StatsView |
| `src/screens/ExportScreen.tsx` | New — simple wrapper |
| `src/navigation/AppNavigator.tsx` | Add StatsScreen + ExportScreen to stack |
| `src/i18n/translations/en.json` | Add ~12 keys, remove 3 segment keys |
| `src/i18n/translations/zh.json` | Add ~12 Chinese translations |

### Testing

- No behavior changes to AI toggle, key save, or test — existing settings tests pass as-is
- Stats screen extracted as pure component — existing StatsView behavior unchanged
- Run `npx tsc --noEmit && npx jest --passWithNoTests` before completion
