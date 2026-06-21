# Template-Aware Daily Words

## Summary

Allow users to select a template before generating daily suggested words. The AI prompt includes the template's field structure so generated words match the selected template. Cards are created with proper `field_values` so practice displays all fields correctly.

## Motivation

Currently daily words are created as plain `{front_text, back_text}` cards with the Basic template's `template_id` but no `field_values`. This means:
- FlipCard fell back to showing field **names** ("Front", "Back") as content (fixed in prior commit)
- Even after the fix, cards render as simple front/back text — no pinyin, no extra fields
- Users with custom templates (e.g., `汉字`, `翻译`, `拼音`) cannot generate words that fit their template

## Flow

```
User taps "Generate Daily Words"
  → If template previously selected → skip picker, use it
  → If only 1 template exists → skip picker, use it
  → Otherwise → Template picker shows
  → AI generates words matching template fields
  → Review modal shows words with field labels
  → User adds to existing deck or creates new one
  → Cards stored with field_values matching template
```

## Data Model Changes

### `DailyWord` type (`src/models/types.ts`)

```ts
export interface DailyWord {
  fields: Record<string, string>;  // "Front": "你好", "Back": "hello", "Pinyin": "nǐ hǎo"
  front: string;                   // Derived: first front field value (backward compat + FlipCard fallback)
  back: string;                    // Derived: first back field value (backward compat + FlipCard fallback)
  complexity: number;
}
```

### Settings storage (`src/utils/settings.ts`)

New key: `dailyTemplateId` — persists the user's last selected template per language. Returns `null` when no explicit choice made (falls back to Basic/default).

```ts
export function getDailyTemplateId(): Promise<number | null>;
export function setDailyTemplateId(templateId: number | null): Promise<void>;
```

## Prompt Changes (`src/utils/dailyWords.ts`)

### `buildDailyWordsPrompt` signature change

```ts
export function buildDailyWordsPrompt(
  language: string,
  anchors: AnchorCard[],
  templateFields: TemplateField[]  // NEW
): { system: string; user: string }
```

### Prompt format

When `templateFields` has fields beyond front/back, the user prompt tells the AI the expected JSON structure:

```
Template fields (front): Front, Hanzi, Chinese
Template fields (back): Back, Translation, English, Pinyin

Generate 15 new words. For each word, provide values for ALL fields listed above.
Return ONLY valid JSON:
{"words": [{"fields": {"Front":"...","Hanzi":"...","Chinese":"...","Back":"...","Translation":"...","English":"...","Pinyin":"..."},"complexity":3}, ...]}
```

When `templateFields` is the Basic template (only "Front" and "Back"), the prompt uses the current format for backward compatibility.

### `generateDailyWords` signature change

```ts
export async function generateDailyWords(
  language: string,
  apiKey: string,
  templateId?: number  // NEW — fetches template fields internally
): Promise<DailyWord[] | null>
```

### `parseWordsResponse` change

Parses the new `fields` object. Derives `front` and `back` from the first front-side field value and first back-side field value.

### `dedupAndRank` change

Uses `word.front` (first front field value) for dedup to maintain compatibility with known-words lookup.

## UI Changes (`src/screens/HomeScreen.tsx`)

### State additions

```ts
const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
```

### Modified: Daily Words Activity card tap

```ts
const handleGenerateDailyWords = useCallback(async () => {
  const persistedId = await getDailyTemplateId();
  if (persistedId) {
    setSelectedTemplateId(persistedId);
    // ... proceed directly to generation
    return;
  }
  const templates = await getAllTemplates();
  if (templates.length <= 1) {
    setSelectedTemplateId(templates[0]?.id ?? null);
    // ... proceed directly to generation
  } else {
    setAvailableTemplates(templates);
    setTemplatePickerVisible(true);
  }
}, [...]);
```

### New: Template Picker Modal

Shown after tapping "Generate Daily Words" but before AI call. Displays available templates as a scrollable list. User picks one, or cancels. On selection, triggers the AI generation.

Re-uses existing `Modal` and pattern from Deck Picker (touchable list items with name + subtitle).

### Modified: Daily Words Review Modal

When `selectedTemplateId` is set, the review modal:
- Fetches `templateFields` for the selected template
- Displays field **names** as labels (not "front"/"back" generic text)
- Shows each field value below its label
- Uses `word.fields[field.name]` as the display value

### Modified: `handleAddToDeck` and `handleCreateAndAdd`

```ts
const handleAddToDeck = useCallback(async (deckId: number) => {
  const cards = dailyWordsData.words.map((w) => ({
    front_text: w.front,
    back_text: w.back,
    field_values: w.fields,  // NEW — pass field_values
  }));
  await importCards(deckId, cards, selectedTemplateId ?? undefined);
  // ...
}, [dailyWordsData.words, selectedTemplateId]);
```

### Settings persistence

On template selection, persist `dailyTemplateId` to settings. On next app open / language change, read it back.

## Backward Compatibility

- Old daily words stored with `{front, back, complexity}` format: treated as Basic template fields internally
- Cards created without template: still work via FlipCard's simple front/back rendering
- `importCards` already accepts `field_values` — no database schema changes

## Edge Cases

| Case | Behavior |
|------|----------|
| Only Basic template exists | Skip template picker, default to Basic |
| Template has only front+back fields | Same as current behavior, no prompt change |
| Template has 3+ fields | AI fills all fields |
| User changes daily language | Reset template preference; show picker on next generate |
| AI returns fewer fields than template | Missing field values default to empty string; user sees `—` |
| AI returns extra fields not in template | Ignored during parse (safe) |
| User cancels template picker | Abort generation; do not store any template preference |
| Old persisted words (no `fields` key) | Parsed as Basic: `fields = {Front: word.front, Back: word.back}` |

## Error Handling

- If template fetch fails: fall back to Basic template
- If AI response doesn't include `fields` key but has `front`/`back`: auto-convert to Basic fields
- If `generateDailyWords` returns `null`: show error state same as current flow

## Files Touched

| File | Change |
|------|--------|
| `src/models/types.ts` | Update `DailyWord` interface |
| `src/utils/dailyWords.ts` | Prompt builder, parser, dedup — all accept template fields |
| `src/utils/__tests__/dailyWords.test.ts` | Add template-aware test cases |
| `src/utils/settings.ts` | Add `getDailyTemplateId`/`setDailyTemplateId` |
| `src/utils/__tests__/settings.test.ts` | Tests for new settings keys |
| `src/screens/HomeScreen.tsx` | Template picker modal, modified add-to-deck, review modal fields |
| `src/i18n/translations/en.json` | New strings for template picker |
| `src/i18n/translations/zh.json` | New strings for template picker |
