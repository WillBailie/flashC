# Reverse Practice Mode — Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to practice cards in reverse (back→front) with a toggle at practice-initiation points, persisted across app restarts.

**Architecture:** Swap `frontText`/`backText` and remap template field sides in PracticeScreen when a `reverse` route param is true. Persist the toggle state via expo-file-system/legacy JSON file. Add Switch toggles to HomeScreen and DeckDetailScreen near practice-launch controls.

**Tech Stack:** React Native, expo-file-system/legacy, React Navigation route params

---

### Task 1: Add `reverse` param to Practice route

**Files:**
- Modify: `src/navigation/AppNavigator.tsx:19`

- [ ] **Step 1: Add `reverse?: boolean` to Practice params**

```ts
Practice: { deckId?: number; deckName?: string; mode?: 'daily' | 'freeflow'; cardCount?: number; reverse?: boolean };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/AppNavigator.tsx
git commit -m "feat: add reverse param to Practice route"
```

---

### Task 2: Create settings persistence utility

**Files:**
- Create: `src/utils/settings.ts`

- [ ] **Step 1: Write the implementation**

```ts
import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_FILE = `${FileSystem.documentDirectory}settings.json`;

interface Settings {
  reverseMode: boolean;
}

const DEFAULTS: Settings = {
  reverseMode: false,
};

async function readSettings(): Promise<Settings> {
  try {
    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    const parsed = JSON.parse(content);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
  } catch {
    // Fail silently — settings are non-critical
  }
}

export async function getReverseMode(): Promise<boolean> {
  const settings = await readSettings();
  return settings.reverseMode;
}

export async function setReverseMode(value: boolean): Promise<void> {
  const settings = await readSettings();
  settings.reverseMode = value;
  await writeSettings(settings);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/settings.ts
git commit -m "feat: add settings persistence utility"
```

---

### Task 3: Write settings unit tests

**Files:**
- Create: `src/utils/__tests__/settings.test.ts`

- [ ] **Step 1: Write tests**

```ts
import * as FileSystem from 'expo-file-system/legacy';
import { getReverseMode, setReverseMode } from '../settings';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

const mockedFs = jest.mocked(FileSystem);

describe('settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReverseMode', () => {
    it('returns false when settings file does not exist', async () => {
      mockedFs.readAsStringAsync.mockRejectedValue(new Error('ENOENT'));
      const result = await getReverseMode();
      expect(result).toBe(false);
    });

    it('returns persisted value when set', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
      const result = await getReverseMode();
      expect(result).toBe(true);
    });

    it('returns default for malformed JSON', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue('not json');
      const result = await getReverseMode();
      expect(result).toBe(false);
    });
  });

  describe('setReverseMode', () => {
    it('writes true to settings file', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: false }));
      await setReverseMode(true);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: true })
      );
    });

    it('writes false to settings file', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false })
      );
    });

    it('preserves future unknown keys', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(
        JSON.stringify({ reverseMode: true, futureSetting: 'keep' })
      );
      await setReverseMode(false);
      expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
        '/mock/documents/settings.json',
        JSON.stringify({ reverseMode: false, futureSetting: 'keep' })
      );
    });

    it('handles write failure silently', async () => {
      mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: false }));
      mockedFs.writeAsStringAsync.mockRejectedValue(new Error('disk full'));
      await expect(setReverseMode(true)).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx jest src/utils/__tests__/settings.test.ts`
Expected: All 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/utils/__tests__/settings.test.ts
git commit -m "test: add settings persistence tests"
```

---

### Task 4: Add reverse toggle to HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Add import for getReverseMode/setReverseMode**

At line 18 (after the existing imports), add:
```ts
import { getReverseMode, setReverseMode } from '../utils/settings';
```

Add `Switch` to the React Native import at line 3:
```ts
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,  // <-- added
} from 'react-native';
```

- [ ] **Step 2: Add reverseMode state and load on focus**

Add state after `const [streakMultiplier, setStreakMultiplier] = useState(1);` (line 45):
```ts
const [reverseMode, setReverseModeState] = useState(false);
```

Update the `useFocusEffect` callback (line 71-75) to also load reverse mode:
```ts
useFocusEffect(
  useCallback(() => {
    loadStats();
    getReverseMode().then(setReverseModeState);
  }, [loadStats])
);
```

- [ ] **Step 3: Build toggle handler**

Add after the `useFocusEffect` block:
```ts
const handleReverseToggle = useCallback(async (value: boolean) => {
  setReverseModeState(value);
  await setReverseMode(value);
}, []);
```

- [ ] **Step 4: Add toggle styles**

Add to the `useMemo` StyleSheet (inside the `styles` block, before the closing `}), [colors]);`):
```ts
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: spacing.sm,
  paddingLeft: spacing.xs,
},
reverseToggle: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  paddingVertical: 2,
  paddingHorizontal: spacing.xs,
  borderRadius: borderRadius.sm,
  backgroundColor: colors.surfaceVariant,
},
reverseLabel: {
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.semibold,
  color: colors.textSecondary,
},
```

- [ ] **Step 5: Render the toggle in the mode section**

Replace the standalone `<Text style={styles.sectionLabel}>Practice Mode</Text>` line (line 412) with:
```tsx
<View style={styles.sectionHeader}>
  <Text style={styles.sectionLabel}>Practice Mode</Text>
  <View style={styles.reverseToggle}>
    <Text style={styles.reverseLabel}>Reverse</Text>
    <Switch
      value={reverseMode}
      onValueChange={handleReverseToggle}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.surface}
      accessibilityLabel="Reverse practice mode"
    />
  </View>
</View>
```

- [ ] **Step 6: Pass reverse to Practice navigation calls**

Update the Daily Review `onPress` (line 417):
```tsx
onPress={() => navigation.navigate('Practice', { mode: 'daily', reverse: reverseMode })}
```

Update the Freeflow `navigation.navigate` in the modal (line 541):
```tsx
navigation.navigate('Practice', { mode: 'freeflow', cardCount: count, reverse: reverseMode });
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add reverse toggle to HomeScreen"
```

---

### Task 5: Add reverse toggle to DeckDetailScreen

**Files:**
- Modify: `src/screens/DeckDetailScreen.tsx`

- [ ] **Step 1: Add imports**

Add `Switch` to the React Native import at line 3:
```ts
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, Platform, KeyboardAvoidingView,
  Share, Switch,
} from 'react-native';
```

Add after line 29 (after the exportCards import):
```ts
import { getReverseMode, setReverseMode } from '../utils/settings';
```

- [ ] **Step 2: Add reverseMode state**

Add after `const [exportModalVisible, setExportModalVisible] = useState(false);` (line 50):
```ts
const [reverseMode, setReverseModeState] = useState(false);
```

- [ ] **Step 3: Load reverse mode on focus**

Update the `useFocusEffect` callback (line 67-71):
```ts
useFocusEffect(
  useCallback(() => {
    loadCards();
    getReverseMode().then(setReverseModeState);
  }, [loadCards])
);
```

- [ ] **Step 4: Build toggle handler**

Add after the `handleExport` function (before `renderCard`):
```ts
const handleReverseToggle = useCallback(async (value: boolean) => {
  setReverseModeState(value);
  await setReverseMode(value);
}, []);
```

- [ ] **Step 5: Add toggle styles**

Add to the `useMemo` StyleSheet (before the closing `}), [colors]);`):
```ts
reverseRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
  paddingVertical: spacing.sm,
  marginBottom: spacing.xs,
},
reverseModalLabel: {
  fontSize: fontSize.sm,
  color: colors.textSecondary,
  fontWeight: '600',
},
```

- [ ] **Step 6: Render toggle in the practice modal**

After the modal title line (`<Text style={styles.modalTitle}>Choose Practice Mode</Text>`, line 455), add:
```tsx
<View style={styles.reverseRow}>
  <Text style={styles.reverseModalLabel}>Reverse</Text>
  <Switch
    value={reverseMode}
    onValueChange={handleReverseToggle}
    trackColor={{ false: colors.border, true: colors.primary }}
    thumbColor={colors.surface}
    accessibilityLabel="Reverse practice mode"
  />
</View>
```

- [ ] **Step 7: Pass reverse to navigation calls**

Update the Daily Review option `onPress` (line 460-461):
```tsx
navigation.navigate('Practice', { deckId, deckName, mode: 'daily', reverse: reverseMode });
```

Update the Freeflow Start `onPress` (line 509):
```tsx
navigation.navigate('Practice', { deckId, deckName, mode: 'freeflow', cardCount: count, reverse: reverseMode });
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/screens/DeckDetailScreen.tsx
git commit -m "feat: add reverse toggle to DeckDetailScreen"
```

---

### Task 6: Implement reverse swap logic in PracticeScreen

**Files:**
- Modify: `src/screens/PracticeScreen.tsx`

- [ ] **Step 1: Extract reverse from route params**

In the destructured `route.params` (line 35), add `reverse`:
```ts
const { deckId, deckName, mode = 'daily', cardCount, reverse } = route.params;
```

- [ ] **Step 2: Add title suffix when reversed**

Update the `title` useMemo (line 55-58):
```ts
const title = useMemo(() => {
  const label = mode === 'freeflow' ? 'Freeflow' : 'Daily Review';
  const deckLabel = deckName ? `: ${deckName}` : ': All Decks';
  const reverseLabel = reverse ? ' (Reverse)' : '';
  return `${label}${deckLabel}${reverseLabel}`;
}, [deckName, mode, reverse]);
```

- [ ] **Step 3: Add display fields memo for template field side remapping**

Add after the `title` useMemo (line 58):
```ts
const displayFields = useMemo(() => {
  if (!reverse) return currentFields;
  return currentFields.map((f) => ({
    ...f,
    side: (f.side === 'front' ? 'back' : 'front') as TemplateField['side'],
  }));
}, [reverse, currentFields]);
```

- [ ] **Step 4: Swap frontText/backText for the FlipCard**

Replace the FlipCard rendering (line 432-441) with:
```tsx
<FlipCard
  frontText={reverse ? currentCard.back_text : currentCard.front_text}
  backText={reverse ? currentCard.front_text : currentCard.back_text}
  isFlipped={isFlipped}
  onFlip={handleFlip}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
  templateFields={displayFields.length > 0 ? displayFields : undefined}
  fieldValues={Object.keys(currentValues).length > 0 ? currentValues : undefined}
/>
```

Note: `templateFields` now uses `displayFields` instead of `currentFields`.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/screens/PracticeScreen.tsx
git commit -m "feat: implement reverse swap logic in PracticeScreen"
```

---

### Final Verification

- [ ] Run TypeScript check: `npx tsc --noEmit`
- [ ] Run all tests: `npx jest --passWithNoTests`
