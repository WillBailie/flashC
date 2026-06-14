# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Project Conventions

## Architecture

```
src/
  components/        Shared reusable components (Button, Modal, FlipCard, etc.)
  constants/         Re-exports from theme (useTheme, spacing, etc.)
  models/            TypeScript interfaces/types (Card, Deck, Template, etc.)
  navigation/        React Navigation setup (AppNavigator)
  screens/           Screen-level components (one file per screen)
  storage/           SQLite database layer (database.ts + __tests__/)
  theme/             Theme context, color palettes, typography, spacing tokens
  utils/             Pure utility functions (spacedRepetition, importCards, exportCards)
```

## Theming

- **Always use `useTheme()`** — never hardcode colors. Import `colors` from the hook.
- **Import tokens from `../constants/theme`**: `useTheme`, `spacing`, `borderRadius`, `typography`, `withAlpha`, `fontSize`, `fontWeight`.
- **Transparency**: Use `withAlpha(hexColor, opacity)` — never string concatenation like `color + '80'`.
- **Semantic colors exist**: `again`, `hard`, `good`, `easy`, `success`, `danger`, `warning`, `primary`, `secondary`.
- **Surface colors**: `surface` (cards/modals), `surfaceVariant` (pills/chips), `background` (page bg).
- **Text**: `text` (primary), `textSecondary` (muted).
- **`StyleSheet.create`** goes inside `useMemo(() => StyleSheet.create({...}), [colors])` within components — this ensures styles react to theme changes.

## Component Patterns

### Shared primitives (`src/components/`)
Prefer existing shared components over raw RN primitives:

| Component | Use for |
|-----------|---------|
| `Button` | Any action button. Variants: `primary`, `secondary`, `ghost`, `danger`. |
| `Modal` | Confirmation dialogs, pickers, any overlay. |
| `Input` | Text fields with labels. |
| `Card` | Elevated/outlined/flat containers. Supports `interactive` + `onPress` + `onLongPress`. |
| `Badge` | Small stat pills. Variants: `filled`, `subtle`. |
| `Skeleton` | Loading placeholders. |
| `EmptyState` | Empty list messaging with icon circle. |
| `FlipCard` | 3D card with swipe gestures (Reanimated + Gesture Handler). |
| `Confetti` | Celebration particle burst. |

### Icons
- Use `Ionicons` from `@expo/vector-icons` — never emoji in UI (emoji OK in text strings only).
- Tab bar: filled icon for active, outline for inactive.

### Styles
- Always import `spacing`, `borderRadius`, `typography` tokens — avoid magic numbers.
- Font sizes: `xs(11)`, `sm(13)`, `md(15)`, `lg(18)`, `xl(22)`, `xxl(28)`, `xxxl(36)`.
- Line heights: `tight(1.2)`, `normal(1.4)`, `relaxed(1.6)`.
- Border radii: `sm(8)`, `md(12)`, `lg(16)`, `xl(24)`, `full(9999)`.
- For top-level screen containers: `flex: 1, backgroundColor: colors.background`.

## TypeScript

- Strict mode is on. No `any` unless absolutely necessary (catch blocks ok).
- Screen props use the navigation type helpers:
  ```ts
  type Props = NativeStackScreenProps<RootStackParamList, 'ScreenName'>;
  // or for tab screens:
  type Props = CompositeScreenProps<
    BottomTabScreenProps<TabParamList, 'TabName'>,
    NativeStackScreenProps<RootStackParamList>
  >;
  ```
- Route params are typed in `src/navigation/AppNavigator.tsx` under `RootStackParamList` and `TabParamList`.

## Navigation

- **Tab screens**: Home, DeckList, Settings — defined in `TabParamList`.
- **Stack screens**: DeckDetail, CardForm, Practice, TemplateEditor — defined in `RootStackParamList`.
- **Adding a new screen**:
  1. Add its params to `RootStackParamList` or `TabParamList` in `AppNavigator.tsx`.
  2. Add a `<Stack.Screen>` or `<Tab.Screen>` entry.
  3. Navigate via typed `navigation.navigate('ScreenName', { ... })`.
- Tab screens navigate to stack screens via composite props. Stack screens use plain `NativeStackScreenProps`.

## Database (`src/storage/database.ts`)

- Uses `expo-sqlite` — see Expo SDK 56 docs.
- **Schema**: `decks`, `cards`, `reviews`, `templates`, `template_fields`.
- **Card field values** stored as JSON in `field_values` column — parse with `JSON.parse(card.field_values)`.
- **Reviews** reference cards via `FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE`.
- **Adding a query**: export an async function from `database.ts`. Call `await getDatabase()` first. Use `database.getAllAsync<T>()`, `database.getFirstAsync<T>()`, or `database.runAsync()`.
- **Mock**: `__mocks__/expo-sqlite.ts` provides an in-memory SQLite mock for Jest tests.

## Testing

- Framework: Jest with `jest-expo` preset.
- Run: `npm test` or `npx jest`.
- **Test location**: `src/**/__tests__/` mirroring the source structure.
- **Database tests** use the in-memory mock (`jest.mock('expo-sqlite')`).
- **Pure utility tests** (spacedRepetition, import/export, theme) don't need mocks.
- Before considering work done: `npx jest --passWithNoTests` must pass all existing tests.
- **New features**: add tests for database functions and utilities. Screen-level UI tests optional.

## Dependencies

- **Always use `npx expo install <package>`** — never `npm install` directly. This ensures SDK-compatible versions.
- Current key dependencies:
  - `react-native-reanimated` (animations, swipe gestures)
  - `react-native-gesture-handler` (gesture system)
  - `expo-haptics` (haptic feedback)
  - `expo-linear-gradient` (gradients)
  - `expo-sqlite` (database)
  - `expo-file-system` (file read/write) — use `expo-file-system/legacy` import path for SDK 56
  - `expo-sharing` (share sheet)
  - `react-native-svg` (vector graphics)
  - `@expo/vector-icons` (Ionicons)

## Code Review Checklist

Before marking work complete:
- [ ] `npx tsc --noEmit` passes (TypeScript)
- [ ] `npx jest --passWithNoTests` passes (all existing tests)
- [ ] No hardcoded colors — all via `useTheme()` or `withAlpha()`
- [ ] No emoji in UI — use Ionicons
- [ ] Magic numbers replaced with `spacing` / `borderRadius` / `typography` tokens
- [ ] New shared components go in `src/components/`
- [ ] New database functions exported from `src/storage/database.ts`
- [ ] New routes added to `RootStackParamList` / `TabParamList` in `AppNavigator.tsx`
- [ ] No `console.log` left in production code
- [ ] `useMemo` deps only include values actually used in the style objects
- [ ] Absolute positioning uses expanded form (`top/left/right/bottom`) not CSS shorthand (`inset`)
- [ ] `StyleSheet.create` types: don't put `numberOfLines`/`adjustsFontSizeToFit` in styles (they're Text props, not style props)
- [ ] Freeflow mode doesn't call `updateReview` (no SM-2 scheduling)
- [ ] Daily review mode always calls `calculateSM2` + `updateReview` on rating
- [ ] Swipe/tap behaviors match these rules:
  - **Daily**: tap → flip, swipe-left on back → Again, swipe-right on back → flip to front
  - **Freeflow**: tap on back → next, swipe-left on back → next, swipe-right on back → flip to front
