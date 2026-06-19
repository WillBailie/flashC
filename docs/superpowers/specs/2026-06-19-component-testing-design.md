# Component Testing Design

## Scope

Add comprehensive tests for all 9 shared components and 10 screens. Currently only FlipCard has component-level tests.

## Test Structure

```
src/
  components/__tests__/
    Button.test.tsx      (new)
    Modal.test.tsx       (new)
    Input.test.tsx       (new)
    Card.test.tsx        (new)
    Badge.test.tsx       (new)
    Skeleton.test.tsx    (new)
    EmptyState.test.tsx  (new)
    Confetti.test.tsx    (new)
    FlipCard.test.tsx    (existing, expand if gaps found)
  screens/__tests__/
    HomeScreen.test.tsx            (new)
    DeckListScreen.test.tsx        (new)
    DeckDetailScreen.test.tsx      (new)
    PracticeScreen.test.tsx        (new)
    CardFormScreen.test.tsx        (new)
    SettingsScreen.test.tsx        (new)
    ImportScreen.test.tsx          (new)
    ExportScreen.test.tsx          (new)
    StatsScreen.test.tsx           (new)
    TemplateListScreen.test.tsx    (new)
    TemplateEditorScreen.test.tsx  (new)
```

## Testing Approach

**Hybrid:** Behavior-driven for interactive logic, lightweight render+theme tests for presentational-only components.

**Framework:** Jest + `@testing-library/react-native` (`render`, `fireEvent`, `getByText`, `queryByText`).

**Wrapper:** Every test wraps components in `<ThemeProvider>` + mocks `TranslationContext` (returns identity function). Screens additionally mock database functions and navigation.

## Shared Mocks

- `react-native-reanimated` — global mock, animations become no-ops
- `react-native-gesture-handler` — global mock, gestures become no-ops
- `expo-haptics` — global mock, haptics are no-ops
- `expo-sqlite` — global in-memory mock
- `TranslationContext` — inline mock, returns identity function `(t: (k: string) => k)`
- Navigation — `jest.mock('@react-navigation/native')` providing `useNavigation`, `useFocusEffect`, `useIsFocused`

One shared test helper (`src/testHelpers/render.tsx`) wraps render calls with ThemeProvider, TranslationContext, and optional navigation — to avoid boilerplate in every test file.

## Component Tests

| Component | Tests |
|-----------|-------|
| **Button** | renders each variant (primary/secondary/ghost/danger); renders disabled (no onPress); renders loading (spinner shows, no onPress); renders each size (sm/md/lg); fires onPress when not disabled/loading; renders children text |
| **Modal** | renders when visible; does not render when not visible; renders title; renders children content; backdrop press fires onClose; renders scrollable body |
| **Input** | renders label if provided; renders placeholder; shows error message when provided; supports multiline prop; calls onFocus/onBlur callbacks |
| **Card** | renders elevated/outlined/flat variants; wraps in Pressable when interactive (onPress fires); passes style through |
| **Badge** | renders filled variant with label text; renders subtle variant with label text; applies custom color |
| **Skeleton** | renders without error; SkeletonCard renders without error |
| **EmptyState** | renders icon via Ionicons; renders title text; renders subtitle text |
| **Confetti** | renders particles when trigger increments; calls onFinish after animation completes |
| **FlipCard** | Audit existing coverage, add any missing cases |

## Screen Tests

| Screen | Tests |
|--------|-------|
| **HomeScreen** | renders progress ring; renders stats (due, total, streak); renders daily/freeflow buttons; deck picker modal opens on press; calls loadStats on focus |
| **DeckListScreen** | renders deck cards from mock data; renders empty state when no decks; navigates to deck detail on press |
| **DeckDetailScreen** | renders deck name and card count; search filters cards by front/back text; shows empty search message; delete deck confirmation modal |
| **PracticeScreen** | renders FlipCard; renders rating buttons (Again/Hard/Good/Easy) in daily mode; shows session-complete after last card; confetti on completion |
| **CardFormScreen** | renders front/back text inputs; renders template field inputs when template selected; submit button calls createCard/updateCard |
| **SettingsScreen** | renders theme mode selector; renders language selector; renders AI settings toggle + API key input |
| **ImportScreen** | renders text paste area; renders file picker button; renders deck selector |
| **ExportScreen** | renders deck list; renders export format buttons (CSV/JSON) |
| **StatsScreen** | renders stat cards with values |
| **TemplateListScreen** | renders template cards from mock data; renders empty state when none |
| **TemplateEditorScreen** | renders field list; add/remove field buttons; reorder controls |

Screen tests mock database functions at module level (e.g., `jest.mock('../../storage/database', () => ({...}))`). Navigation is mocked via `@react-navigation/native`.

## Non-Goals

- E2E or integration tests (Detox, Maestro) — out of scope
- Snapshot tests — not using approach A
- Animation frame-by-frame verification — animations mocked as no-ops
