# Template-Aware Daily Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select a template before generating daily suggested words, with AI returning words matching the template's field structure.

**Architecture:** Add `fields: Record<string, string>` to `DailyWord` type, normalize old data on read. Pass `templateFields` to the AI prompt builder so the LLM returns field-keyed values. Add a template picker modal in HomeScreen before generation, persist choice via settings, and pass `field_values` when creating cards.

**Tech Stack:** TypeScript, React Native, expo-file-system/legacy, existing deepseek API integration

## Global Constraints

- No database schema changes — `importCards` already accepts `field_values`
- Follow existing settings pattern (readSettings/writeSettings with cache)
- AI prompt must support both old `{front, back}` format (Basic template) and new `{fields: {...}}` format
- Old persisted DailyWord data without `fields` must be normalized on read
- Language change resets template preference to prompt new selection

---

### Task 1: Update DailyWord type and normalize old data

**Files:**
- Modify: `src/models/types.ts`
- Modify: `src/utils/settings.ts`
- Modify: `src/utils/dailyWords.ts` (parseWordsResponse)
- Modify: `src/utils/__tests__/dailyWords.test.ts`
- Modify: `src/utils/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `DailyWord` with `fields: Record<string, string>` (required), `front: string`, `back: string`, `complexity: number`
- Produces: `getDailyWordsData()` returns normalized words (with `fields` always populated)
- Produces: `parseWordsResponse()` handles both `{front, back}` and `{fields: {...}}` formats

- [ ] **Step 1: Update DailyWord type in models/types.ts**

```ts
// src/models/types.ts — change the DailyWord interface
export interface DailyWord {
  fields: Record<string, string>;
  front: string;
  back: string;
  complexity: number;
}
```

- [ ] **Step 2: Normalize old data in settings getDailyWordsData**

```ts
// src/utils/settings.ts — modify getDailyWordsData to add fields when missing
export async function getDailyWordsData(): Promise<{ date: string; words: DailyWord[] }> {
  const settings = await readSettings();
  const words: DailyWord[] = settings.dailyWords.map((w: any) => {
    if (w.fields && typeof w.fields === 'object') {
      return { fields: w.fields, front: w.front || '', back: w.back || '', complexity: w.complexity ?? 1 };
    }
    return { fields: { Front: w.front || '', Back: w.back || '' }, front: w.front || '', back: w.back || '', complexity: w.complexity ?? 1 };
  });
  return { date: settings.dailyWordsDate, words };
}
```

- [ ] **Step 3: Update parseWordsResponse for both old and new format**

```ts
// src/utils/dailyWords.ts — modify parseWordsResponse
function parseWordsResponse(rawText: string, templateFields?: TemplateField[]): DailyWord[] {
  const cleaned = rawText.replace(/```(?:json)?\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.words || !Array.isArray(parsed.words)) {
    throw new Error('Invalid response format: missing words array');
  }
  return parsed.words.map((w: any) => {
    let front: string;
    let back: string;
    let fields: Record<string, string>;
    if (w.fields && typeof w.fields === 'object') {
      fields = w.fields;
      const frontFields = templateFields?.filter(f => f.side === 'front').sort((a, b) => a.position - b.position) ?? [];
      const backFields = templateFields?.filter(f => f.side === 'back').sort((a, b) => a.position - b.position) ?? [];
      front = frontFields.length > 0 ? fields[frontFields[0].name] || '' : '';
      back = backFields.length > 0 ? fields[backFields[0].name] || '' : '';
    } else {
      front = String(w.front || '');
      back = String(w.back || '');
      fields = { Front: front, Back: back };
    }
    return {
      fields,
      front,
      back,
      complexity: Number(w.complexity) || 1,
    };
  });
}
```

- [ ] **Step 4: Update dailyWords test fixtures to include fields**

```ts
// src/utils/__tests__/dailyWords.test.ts — update all DailyWord fixtures

// In dedupAndRank test:
const candidates: DailyWord[] = [
  { front: 'bonjour', back: 'hello', complexity: 1, fields: { Front: 'bonjour', Back: 'hello' } },
  { front: 'salut', back: 'hi', complexity: 2, fields: { Front: 'salut', Back: 'hi' } },
  // ... etc
];

// In generateDailyWords test, update the successful response test:
mockedCallDeepSeek.mockResolvedValue(JSON.stringify({
  words: [
    { front: 'bonjour', back: 'hello', complexity: 1 },
    { front: 'salut', back: 'hi', complexity: 1 },
    // ... etc
  ],
}));
```

- [ ] **Step 5: Update settings tests to include fields in DailyWord fixtures**

```ts
// src/utils/__tests__/settings.test.ts — update daily words test fixtures
const words: DailyWord[] = [{ front: 'bonjour', back: 'hello', complexity: 2, fields: { Front: 'bonjour', Back: 'hello' } }];
await setDailyWordsData('2026-06-21', words);
const data = await getDailyWordsData();
expect(data.date).toBe('2026-06-21');
expect(data.words[0].front).toBe('bonjour');
expect(data.words[0].fields).toEqual({ Front: 'bonjour', Back: 'hello' });

// Also add test: old persisted data without fields gets normalized
test('normalizes old daily words without fields', async () => {
  mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({
    dailyWordsDate: '2026-06-21',
    dailyWords: [{ front: 'hola', back: 'hello', complexity: 2 }],
  }));
  const data = await getDailyWordsData();
  expect(data.words[0].fields).toEqual({ Front: 'hola', Back: 'hello' });
  expect(data.words[0].front).toBe('hola');
});
```

- [ ] **Step 6: Run tests, verify pass**

```bash
npx jest --passWithNoTests 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add src/models/types.ts src/utils/settings.ts src/utils/dailyWords.ts src/utils/__tests__/dailyWords.test.ts src/utils/__tests__/settings.test.ts
git commit -m "feat: add fields to DailyWord type with backward-compat normalization"
```

---

### Task 2: Add dailyTemplateId to settings

**Files:**
- Modify: `src/utils/settings.ts`
- Modify: `src/utils/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `getDailyTemplateId(): Promise<number | null>`
- Produces: `setDailyTemplateId(templateId: number | null): Promise<void>`

- [ ] **Step 1: Add field to Settings interface and DEFAULTS**

```ts
// src/utils/settings.ts — add to Settings interface
interface Settings {
  // ... existing fields
  dailyTemplateId: number | null;
}

const DEFAULTS: Settings = {
  // ... existing defaults
  dailyTemplateId: null,
};
```

- [ ] **Step 2: Add getter and setter**

```ts
// src/utils/settings.ts — add after existing exports
export async function getDailyTemplateId(): Promise<number | null> {
  const settings = await readSettings();
  return settings.dailyTemplateId;
}

export async function setDailyTemplateId(templateId: number | null): Promise<void> {
  const settings = await readSettings();
  settings.dailyTemplateId = templateId;
  await writeSettings(settings);
}
```

- [ ] **Step 3: Update existing settings test inline JSON expectations**

```ts
// src/utils/__tests__/settings.test.ts — add dailyTemplateId: null to every inline JSON.stringify expectation

// In setReverseMode(true) test, change:
JSON.stringify({ reverseMode: true, ..., dailyTemplateId: null })

// In setReverseMode(false) test, change:
JSON.stringify({ reverseMode: false, ..., dailyTemplateId: null })

// ... update all other inline JSON expectations (about 4 of them)
```

- [ ] **Step 4: Add new tests for dailyTemplateId**

```ts
// src/utils/__tests__/settings.test.ts — add new describe block
describe('dailyTemplateId', () => {
  test('getDailyTemplateId returns null by default', async () => {
    const id = await getDailyTemplateId();
    expect(id).toBeNull();
  });

  test('setDailyTemplateId and getDailyTemplateId round-trip', async () => {
    await setDailyTemplateId(3);
    expect(await getDailyTemplateId()).toBe(3);
    await setDailyTemplateId(null);
    expect(await getDailyTemplateId()).toBeNull();
  });

  test('persists across cache reset', async () => {
    await setDailyTemplateId(5);
    clearSettingsCache();
    expect(await getDailyTemplateId()).toBe(5);
  });
});
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npx jest src/utils/__tests__/settings.test.ts --passWithNoTests -v 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/settings.ts src/utils/__tests__/settings.test.ts
git commit -m "feat: add dailyTemplateId to settings with getter/setter"
```

---

### Task 3: Update dailyWords prompt builder and generator

**Files:**
- Modify: `src/utils/dailyWords.ts`
- Modify: `src/utils/__tests__/dailyWords.test.ts`

**Interfaces:**
- Consumes: `TemplateField[]` from database (Task 1 implicit — no task dependency)
- Produces: `buildDailyWordsPrompt(language, anchors, templateFields)` returns `{ system, user }`
- Produces: `generateDailyWords(language, apiKey, templateId?)` returns `DailyWord[] | null`

- [ ] **Step 1: Write failing test for new prompt format**

```ts
// src/utils/__tests__/dailyWords.test.ts — add to buildDailyWordsPrompt describe
test('includes template fields in user prompt for custom templates', () => {
  const anchors: AnchorCard[] = [
    { front_text: '你好', back_text: 'hello' },
  ];
  const templateFields: TemplateField[] = [
    { id: 1, template_id: 2, name: '汉字', side: 'front', position: 0 },
    { id: 2, template_id: 2, name: '翻译', side: 'back', position: 0 },
    { id: 3, template_id: 2, name: '拼音', side: 'back', position: 1 },
  ];

  const { user } = buildDailyWordsPrompt('Chinese', anchors, templateFields);

  expect(user).toContain('汉字');
  expect(user).toContain('翻译');
  expect(user).toContain('拼音');
  expect(user).toContain('"fields"');
});

test('uses simple front/back format for Basic template', () => {
  const anchors: AnchorCard[] = [];
  const templateFields: TemplateField[] = [
    { id: 1, template_id: 1, name: 'Front', side: 'front', position: 0 },
    { id: 2, template_id: 1, name: 'Back', side: 'back', position: 0 },
  ];

  const { user } = buildDailyWordsPrompt('French', anchors, templateFields);

  expect(user).toContain('"front"');
  expect(user).toContain('"back"');
  expect(user).not.toContain('"fields"');
});

test('uses simple front/back format when no template fields provided', () => {
  const { user } = buildDailyWordsPrompt('German', []);

  expect(user).toContain('"front"');
  expect(user).toContain('"back"');
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
npx jest src/utils/__tests__/dailyWords.test.ts -t "template fields" --passWithNoTests 2>&1 | tail -10
```

- [ ] **Step 3: Implement updated buildDailyWordsPrompt**

```ts
// src/utils/dailyWords.ts — replace buildDailyWordsPrompt
export function buildDailyWordsPrompt(
  language: string,
  anchors: AnchorCard[],
  templateFields?: TemplateField[]
): { system: string; user: string } {
  const sortedFields = templateFields
    ? [...templateFields].sort((a, b) => {
        if (a.side !== b.side) return a.side === 'front' ? -1 : 1;
        return a.position - b.position;
      })
    : [];
  const frontFields = sortedFields.filter(f => f.side === 'front');
  const backFields = sortedFields.filter(f => f.side === 'back');
  const isBasicTemplate = frontFields.length === 1 && backFields.length === 1
    && frontFields[0].name === 'Front' && backFields[0].name === 'Back';

  if (anchors.length === 0) {
    if (isBasicTemplate || sortedFields.length === 0) {
      return {
        system: SYSTEM_PROMPT,
        user: `Language: ${language}. The learner is a complete beginner.
Generate 15 new ${language} words appropriate for elementary level.
Rate each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`,
      };
    }
    return {
      system: SYSTEM_PROMPT,
      user: `Language: ${language}. The learner is a complete beginner.
Template fields (front): ${frontFields.map(f => f.name).join(', ')}
Template fields (back): ${backFields.map(f => f.name).join(', ')}

Generate 15 new ${language} words appropriate for elementary level.
For each word, provide values for ALL fields listed above.
Rate each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"fields": {${sortedFields.map(f => `"${f.name}":"..."`).join(',')}},"complexity":3}, ...]}`,
    };
  }

  const anchorLines = anchors
    .map((a, i) => `${i + 1}. "${a.front_text}" = "${a.back_text}"`)
    .join('\n');

  if (isBasicTemplate || sortedFields.length === 0) {
    return {
      system: SYSTEM_PROMPT,
      user: `Language: ${language}.
Anchors:
${anchorLines}

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`,
    };
  }

  return {
    system: SYSTEM_PROMPT,
    user: `Language: ${language}.
Anchors:
${anchorLines}
Template fields (front): ${frontFields.map(f => f.name).join(', ')}
Template fields (back): ${backFields.map(f => f.name).join(', ')}

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
For each word, provide values for ALL fields listed above.
Return ONLY valid JSON: {"words": [{"fields": {${sortedFields.map(f => `"${f.name}":"..."`).join(',')}},"complexity":3}, ...]}`,
  };
}
```

- [ ] **Step 4: Update generateDailyWords to accept templateId**

```ts
// src/utils/dailyWords.ts — modify generateDailyWords signature and body
export async function generateDailyWords(
  language: string,
  apiKey: string,
  templateId?: number
): Promise<DailyWord[] | null> {
  if (!language || !apiKey) return null;

  const anchors = await getAnchorCards(language);
  let templateFields: TemplateField[] = [];
  if (templateId) {
    templateFields = await getTemplateFields(templateId);
  }
  const { system, user } = buildDailyWordsPrompt(language, anchors, templateFields.length > 0 ? templateFields : undefined);

  const MAX_RETRIES = 2;
  let survivingWords: DailyWord[] = [];
  const knownWords = await getAllFrontTextsByLanguage(language);
  const avgInterval = await getAvgIntervalByLanguage(language);
  const targetLevel = computeTargetLevel(avgInterval);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const wordsToRequest = attempt === 0 ? 15 : 5 + survivingWords.length;

    const requestUser = attempt === 0
      ? user
      : `${user}\n\nPlease generate ${wordsToRequest} new words. Avoid previously suggested words.`;

    const rawText = await callDeepSeek(apiKey, system, requestUser, {
      maxTokens: 1024,
      temperature: 0.9,
    });

    if (!rawText) return null;

    try {
      const candidates = parseWordsResponse(rawText, templateFields.length > 0 ? templateFields : undefined);
      const ranked = dedupAndRank(candidates, knownWords, targetLevel);

      if (attempt === 0) {
        survivingWords = ranked;
      } else {
        const existingFronts = new Set(survivingWords.map((w) => w.front.toLowerCase()));
        const newWords = ranked.filter((w) => !existingFronts.has(w.front.toLowerCase()));
        survivingWords = [...survivingWords, ...newWords];
      }

      if (survivingWords.length >= 5) break;
    } catch {
      if (attempt === MAX_RETRIES) return survivingWords.length > 0 ? survivingWords : null;
    }
  }

  return survivingWords.slice(0, 5);
}
```

- [ ] **Step 5: Add import for getTemplateFields in dailyWords.ts**

```ts
// At top of src/utils/dailyWords.ts — add getTemplateFields to the import
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage, getTemplateFields } from '../storage/database';
import { TemplateField } from '../models/types';  // also add this if not already imported
```

- [ ] **Step 6: Add getTemplateFields to test mock and write fields-format test**

First add `getTemplateFields` to the top-level jest.mock:

```ts
// src/utils/__tests__/dailyWords.test.ts — update the jest.mock at top of file
jest.mock('../../storage/database', () => ({
  getAnchorCards: jest.fn(),
  getAllFrontTextsByLanguage: jest.fn(),
  getAvgIntervalByLanguage: jest.fn(),
  getTemplateFields: jest.fn(),
}));

// Update imports to include getTemplateFields
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage, getTemplateFields } from '../../storage/database';

// Add mock reference
const mockedGetTemplateFields = jest.mocked(getTemplateFields);
```

Then add the test:

```ts
// src/utils/__tests__/dailyWords.test.ts — add to generateDailyWords describe
test('parses fields format response for custom template', async () => {
  mockedGetAnchorCards.mockResolvedValue([]);
  mockedGetAllFrontTexts.mockResolvedValue([]);
  mockedGetAvgInterval.mockResolvedValue(0);
  mockedGetTemplateFields.mockResolvedValue([
    { id: 1, template_id: 2, name: '汉字', side: 'front', position: 0 },
    { id: 2, template_id: 2, name: '翻译', side: 'back', position: 0 },
    { id: 3, template_id: 2, name: '拼音', side: 'back', position: 1 },
  ] as TemplateField[]);
  mockedCallDeepSeek.mockResolvedValue(JSON.stringify({
    words: [
      { fields: { '汉字': '你好', '翻译': 'hello', '拼音': 'nǐ hǎo' }, complexity: 1 },
      { fields: { '汉字': '谢谢', '翻译': 'thanks', '拼音': 'xiè xiè' }, complexity: 1 },
      { fields: { '汉字': '再见', '翻译': 'goodbye', '拼音': 'zài jiàn' }, complexity: 2 },
      { fields: { '汉字': '对不起', '翻译': 'sorry', '拼音': 'duì bù qǐ' }, complexity: 2 },
      { fields: { '汉字': '高兴', '翻译': 'happy', '拼音': 'gāo xìng' }, complexity: 1 },
      { fields: { '汉字': '美丽', '翻译': 'beautiful', '拼音': 'měi lì' }, complexity: 3 },
    ],
  }));

  const result = await generateDailyWords('Chinese', 'sk-test', 2);
  expect(result).toHaveLength(5);
  expect(result![0].fields['汉字']).toBe('你好');
  expect(result![0].front).toBe('你好');
  expect(result![0].back).toBe('hello');
});
```

- [ ] **Step 7: Run tests, verify pass**

```bash
npx jest --passWithNoTests 2>&1 | tail -5
```

- [ ] **Step 8: Commit**

```bash
git add src/utils/dailyWords.ts src/utils/__tests__/dailyWords.test.ts
git commit -m "feat: add template-aware prompt builder and generator to dailyWords"
```

---

### Task 4: Add template picker UI to HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `generateDailyWords(language, apiKey, templateId)` from Task 3
- Consumes: `getDailyTemplateId()` / `setDailyTemplateId()` from Task 2
- Consumes: `getAllTemplates()`, `getTemplateFields()` from database
- Consumes: `DailyWord` with `fields` from Task 1

- [ ] **Step 1: Add imports for template functions at top of HomeScreen**

```ts
// src/screens/HomeScreen.tsx — add to existing imports
import { getDailyTemplateId, setDailyTemplateId } from '../utils/settings';
import { getTemplateFields, getAllTemplates } from '../storage/database';
import { Template } from '../models/types';
```

- [ ] **Step 2: Add state variables (after line 76, before useTheme)**

```ts
// src/screens/HomeScreen.tsx — add after existing useState declarations
const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
const [reviewTemplateFields, setReviewTemplateFields] = useState<TemplateField[]>([]);
```

- [ ] **Step 3: Modify handleGenerateDailyWords to check for template**

```ts
// src/screens/HomeScreen.tsx — replace handleGenerateDailyWords (around line 520-546)
const handleGenerateDailyWords = useCallback(async () => {
  if (!dailyLanguage || !apiKey) return;

  const persistedId = await getDailyTemplateId();
  if (persistedId) {
    setSelectedTemplateId(persistedId);
    await doGenerateDailyWords(persistedId);
    return;
  }

  const templates = await getAllTemplates();
  if (templates.length <= 1) {
    const id = templates[0]?.id ?? null;
    setSelectedTemplateId(id);
    await doGenerateDailyWords(id);
  } else {
    setAvailableTemplates(templates);
    setTemplatePickerVisible(true);
  }
}, [dailyLanguage, apiKey]);

const doGenerateDailyWords = useCallback(async (templateId: number | null) => {
  setDailyGenerating(true);
  setDailyError(false);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const words = await generateDailyWords(dailyLanguage, apiKey, templateId ?? undefined);
    if (words && words.length > 0) {
      await persistDailyWordsData(today, words);
      setDailyWordsData({ date: today, words });
      setDailyModalVisible(true);
    } else {
      setDailyError(true);
    }
  } catch {
    setDailyError(true);
  } finally {
    setDailyGenerating(false);
  }
}, [dailyLanguage, apiKey]);
```

- [ ] **Step 4: Add handleTemplateSelect**

```ts
// src/screens/HomeScreen.tsx — add after doGenerateDailyWords
const handleTemplateSelect = useCallback(async (template: Template) => {
  setTemplatePickerVisible(false);
  setSelectedTemplateId(template.id);
  await setDailyTemplateId(template.id);
  await doGenerateDailyWords(template.id);
}, [doGenerateDailyWords]);
```

- [ ] **Step 5: Reset template on language change**

```ts
// src/screens/HomeScreen.tsx — modify the useEffect/useFocusEffect that reads dailyLanguage
// After setDailyLanguage(lang), add:
if (lang !== dailyLanguage) {
  setSelectedTemplateId(null);
}
```

- [ ] **Step 6: Modify review modal to show template fields**

```ts
// src/screens/HomeScreen.tsx — modify the daily words review modal (around line 893-943)
// Before showing the modal, fetch template fields:
useEffect(() => {
  if (dailyModalVisible && selectedTemplateId) {
    getTemplateFields(selectedTemplateId).then(setReviewTemplateFields).catch(() => setReviewTemplateFields([]));
  } else {
    setReviewTemplateFields([]);
  }
}, [dailyModalVisible, selectedTemplateId]);

// In the modal body, replace the word rendering:
{dailyWordsData.words.map((word, i) => (
  <View key={i} style={{ paddingVertical: spacing.sm, borderBottomWidth: i < dailyWordsData.words.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
    {reviewTemplateFields.length > 0 ? (
      <>
        {reviewTemplateFields.map((f) => (
          <View key={f.id} style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, textTransform: 'uppercase' }}>
              {f.name}
            </Text>
            <Text style={{ fontSize: typography.fontSize.md, color: colors.text, fontWeight: f.side === 'front' ? typography.fontWeight.bold : typography.fontWeight.normal }}>
              {word.fields[f.name] || '—'}
            </Text>
          </View>
        ))}
        <View style={{
          backgroundColor: withAlpha(colors.primary, 0.1),
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.full,
          alignSelf: 'flex-start',
          marginTop: 4,
        }}>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>
            {t('dailyWords.complexity', { level: String(word.complexity) })}
          </Text>
        </View>
      </>
    ) : (
      <>
        <Text style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.text }}>
          {word.front}
        </Text>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
          {word.back}
        </Text>
        <View style={{
          backgroundColor: withAlpha(colors.primary, 0.1),
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
          borderRadius: borderRadius.full,
          alignSelf: 'flex-start',
          marginTop: 4,
        }}>
          <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>
            {t('dailyWords.complexity', { level: String(word.complexity) })}
          </Text>
        </View>
      </>
    )}
  </View>
))}
```

- [ ] **Step 7: Modify handleAddToDeck and handleCreateAndAdd to pass field_values and templateId**

```ts
// src/screens/HomeScreen.tsx — modify handleAddToDeck
const handleAddToDeck = useCallback(async (deckId: number) => {
  const cards = dailyWordsData.words.map((w) => ({
    front_text: w.front,
    back_text: w.back,
    field_values: w.fields,
  }));
  await importCards(deckId, cards, selectedTemplateId ?? undefined);
  await clearDailyWords();
  setDailyWordsData({ date: '', words: [] });
  setDeckPickerVisible(false);
  setDailyModalVisible(false);
  setReviewTemplateFields([]);
}, [dailyWordsData.words, selectedTemplateId]);

// modify handleCreateAndAdd
const handleCreateAndAdd = useCallback(async () => {
  if (!newDeckName.trim()) return;
  const deck = await createDeck(newDeckName.trim(), '', dailyLanguage);
  const cards = dailyWordsData.words.map((w) => ({
    front_text: w.front,
    back_text: w.back,
    field_values: w.fields,
  }));
  await importCards(deck.id, cards, selectedTemplateId ?? undefined);
  await clearDailyWords();
  setDailyWordsData({ date: '', words: [] });
  setNewDeckModalVisible(false);
  setNewDeckName('');
  setDailyModalVisible(false);
  setReviewTemplateFields([]);
}, [dailyWordsData.words, dailyLanguage, newDeckName, selectedTemplateId]);
```

- [ ] **Step 8: Add Template Picker Modal (after daily words review modal, before deck picker)**

```tsx
{/* ——— Template Picker Modal ——— */}
<Modal
  visible={templatePickerVisible}
  onClose={() => {
    setTemplatePickerVisible(false);
    setDailyGenerating(false);
  }}
  title={t('dailyWords.selectTemplate')}
>
  <ScrollView style={{ maxHeight: 300 }}>
    {availableTemplates.map((template) => (
      <TouchableOpacity
        key={template.id}
        style={{
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        onPress={() => handleTemplateSelect(template)}
      >
        <Text style={{ fontSize: typography.fontSize.md, color: colors.text }}>{template.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</Modal>
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 10: Run tests**

```bash
npx jest --passWithNoTests 2>&1 | tail -5
```

- [ ] **Step 11: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add template picker for daily words generation"
```

---

### Task 5: Add i18n strings for template picker

**Files:**
- Modify: `src/i18n/translations/en.json`
- Modify: `src/i18n/translations/zh.json`

- [ ] **Step 1: Add strings to en.json**

```json
// src/i18n/translations/en.json — add after existing dailyWords entries
"dailyWords.selectTemplate": "Select Template",
```

- [ ] **Step 2: Add strings to zh.json**

```json
// src/i18n/translations/zh.json — add after existing dailyWords entries
"dailyWords.selectTemplate": "选择模板",
```

- [ ] **Step 3: Run tests, verify pass**

```bash
npx jest --passWithNoTests 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations/en.json src/i18n/translations/zh.json
git commit -m "feat: add selectTemplate i18n strings"
```
