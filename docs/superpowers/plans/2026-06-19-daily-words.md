# Daily Words Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a "Daily Words" feature that suggests 5 new vocabulary words per day using the DeepSeek API, with anchor-based context and local deduplication.

**Architecture:** New `dailyWords.ts` utility holds the algorithm (prompt building, API call, dedup+ranking). Shared `callDeepSeek()` extracted from `ai.ts`. Settings JSON extended with `dailyLanguage`, `dailyWordsDate`, `dailyWords`. Two new DB queries for anchors and dedup. UI: Home card, Settings language picker, post-practice prompt. No DB schema changes.

**Tech Stack:** TypeScript, React Native (Expo SDK 56), expo-sqlite, expo-file-system/legacy, fetch API, Jest

## Global Constraints

- Always use `useTheme()` — never hardcode colors
- Import tokens from `../constants/theme`: `useTheme`, `spacing`, `borderRadius`, `typography`, `withAlpha`, `fontSize`, `fontWeight`
- `StyleSheet.create` goes inside `useMemo(() => StyleSheet.create({...}), [colors])`
- Icons: `Ionicons` from `@expo/vector-icons` — never emoji in UI
- Font sizes: `xs(11)`, `sm(13)`, `md(15)`, `lg(18)`, `xl(22)`, `xxl(28)`, `xxxl(36)`
- Border radii: `sm(8)`, `md(12)`, `lg(16)`, `xl(24)`, `full(9999)`
- `expo-file-system/legacy` import path for SDK 56
- `npx tsc --noEmit` and `npx jest --passWithNoTests` must pass before claiming completion
- No `console.log` in production code
- No hardcoded colors

---

### Task 1: Add DailyWord and AnchorCard types

**Files:**
- Modify: `src/models/types.ts:43-49`

**Interfaces:**
- Produces: `DailyWord`, `AnchorCard` interfaces used by all subsequent tasks

- [ ] **Step 1: Add types to models/types.ts**

```ts
export interface DailyWord {
  front: string;
  back: string;
  complexity: number;
}

export interface AnchorCard {
  front_text: string;
  back_text: string;
}
```

Append these before the last line of the file (after the `ReviewResult` interface).

- [ ] **Step 2: Run typecheck to verify**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/models/types.ts
git commit -m "feat: add DailyWord and AnchorCard types"
```

---

### Task 2: Extend settings with daily words fields

**Files:**
- Modify: `src/utils/settings.ts:1-91`
- Modify: `src/utils/__tests__/settings.test.ts:1-119`

**Interfaces:**
- Consumes: `DailyWord` from Task 1
- Produces: `getDailyLanguage()`, `setDailyLanguage()`, `getDailyWordsData()`, `setDailyWordsData()`, `clearDailyWords()`

- [ ] **Step 1: Add fields to Settings interface and DEFAULTS**

In `src/utils/settings.ts`, add `import { DailyWord } from '../models/types';` at the top. Update the `Settings` interface:

```ts
interface Settings {
  reverseMode: boolean;
  aiEnabled: boolean;
  apiKey: string;
  appLanguage: 'en' | 'zh';
  dailyLanguage: string;
  dailyWordsDate: string;
  dailyWords: DailyWord[];
}
```

Update the `DEFAULTS` constant:

```ts
const DEFAULTS: Settings = {
  reverseMode: false,
  aiEnabled: false,
  apiKey: '',
  appLanguage: 'en',
  dailyLanguage: '',
  dailyWordsDate: '',
  dailyWords: [],
};
```

- [ ] **Step 2: Add getter/setter functions to settings.ts**

Append these after the existing `setAppLanguage` function (before the closing of the file):

```ts
export async function getDailyLanguage(): Promise<string> {
  const settings = await readSettings();
  return settings.dailyLanguage;
}

export async function setDailyLanguage(value: string): Promise<void> {
  const settings = await readSettings();
  settings.dailyLanguage = value;
  await writeSettings(settings);
}

export async function getDailyWordsData(): Promise<{ date: string; words: DailyWord[] }> {
  const settings = await readSettings();
  return { date: settings.dailyWordsDate, words: settings.dailyWords };
}

export async function setDailyWordsData(date: string, words: DailyWord[]): Promise<void> {
  const settings = await readSettings();
  settings.dailyWordsDate = date;
  settings.dailyWords = words;
  await writeSettings(settings);
}

export async function clearDailyWords(): Promise<void> {
  const settings = await readSettings();
  settings.dailyWordsDate = '';
  settings.dailyWords = [];
  await writeSettings(settings);
}
```

- [ ] **Step 3: Update existing settings tests for new default keys**

In `src/utils/__tests__/settings.test.ts`, update the import line:

```ts
import { getReverseMode, setReverseMode, clearSettingsCache, getAiEnabled, setAiEnabled, getApiKey, setApiKey, getAppLanguage, setAppLanguage, getDailyLanguage, setDailyLanguage, getDailyWordsData, setDailyWordsData, clearDailyWords } from '../settings';
```

Update `setReverseMode` test expectations. The `writes true` test at ~line 42:

```ts
it('writes true to settings file', async () => {
  mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: false }));
  await setReverseMode(true);
  expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
    '/mock/documents/settings.json',
    JSON.stringify({ reverseMode: true, aiEnabled: false, apiKey: '', appLanguage: 'en', dailyLanguage: '', dailyWordsDate: '', dailyWords: [] })
  );
});
```

The `writes false` test at ~line 49:

```ts
it('writes false to settings file', async () => {
  mockedFs.readAsStringAsync.mockResolvedValue(JSON.stringify({ reverseMode: true }));
  await setReverseMode(false);
  expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
    '/mock/documents/settings.json',
    JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', dailyLanguage: '', dailyWordsDate: '', dailyWords: [] })
  );
});
```

The `preserves future unknown keys` test at ~line 58:

```ts
it('preserves future unknown keys', async () => {
  mockedFs.readAsStringAsync.mockResolvedValue(
    JSON.stringify({ reverseMode: true, futureSetting: 'keep' })
  );
  await setReverseMode(false);
  expect(mockedFs.writeAsStringAsync).toHaveBeenCalledWith(
    '/mock/documents/settings.json',
    JSON.stringify({ reverseMode: false, aiEnabled: false, apiKey: '', appLanguage: 'en', dailyLanguage: '', dailyWordsDate: '', dailyWords: [], futureSetting: 'keep' })
  );
});
```

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `npx jest src/utils/__tests__/settings.test.ts --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 5: Add tests for new daily words settings**

Append this describe block inside the existing `describe('settings', ...)` block in `settings.test.ts`, after the `App language` describe block:

```ts
describe('Daily language', () => {
  test('getDailyLanguage returns empty string by default', async () => {
    const lang = await getDailyLanguage();
    expect(lang).toBe('');
  });

  test('setDailyLanguage and getDailyLanguage round-trip', async () => {
    await setDailyLanguage('French');
    expect(await getDailyLanguage()).toBe('French');
    await setDailyLanguage('');
    expect(await getDailyLanguage()).toBe('');
  });
});

describe('Daily words', () => {
  test('getDailyWordsData returns empty by default', async () => {
    const data = await getDailyWordsData();
    expect(data.date).toBe('');
    expect(data.words).toEqual([]);
  });

  test('setDailyWordsData and getDailyWordsData round-trip', async () => {
    const words = [{ front: 'bonjour', back: 'hello', complexity: 2 }];
    await setDailyWordsData('2026-06-19', words);
    const data = await getDailyWordsData();
    expect(data.date).toBe('2026-06-19');
    expect(data.words).toEqual(words);
  });

  test('clearDailyWords resets to empty', async () => {
    const words = [{ front: 'bonjour', back: 'hello', complexity: 2 }];
    await setDailyWordsData('2026-06-19', words);
    await clearDailyWords();
    const data = await getDailyWordsData();
    expect(data.date).toBe('');
    expect(data.words).toEqual([]);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npx jest src/utils/__tests__/settings.test.ts --passWithNoTests`
Expected: All 19 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/settings.ts src/utils/__tests__/settings.test.ts
git commit -m "feat: add daily language and daily words to settings"
```

---

### Task 3: Extract shared callDeepSeek helper and refactor generateExample

**Files:**
- Modify: `src/utils/ai.ts:1-60`
- Create: `src/utils/__tests__/ai.test.ts`

**Interfaces:**
- Produces: `callDeepSeek(apiKey, systemPrompt, userPrompt, options?)` → `Promise<string | null>`
- Modifies: `generateExample` now delegates to `callDeepSeek`

- [ ] **Step 1: Refactor ai.ts — extract callDeepSeek**

Replace `src/utils/ai.ts` with:

```ts
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export interface DeepSeekOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: DeepSeekOptions
): Promise<string | null> {
  try {
    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? 'deepseek-v4-flash',
        messages,
        max_tokens: options?.maxTokens ?? 256,
        temperature: options?.temperature ?? 0.7,
        thinking: { type: 'disabled' },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('No response from AI');
    }

    return rawText;
  } catch (error: any) {
    const { Alert } = require('react-native');
    Alert.alert(
      'Generation Failed',
      error?.message || 'Could not generate content. Please try again.'
    );
    return null;
  }
}

interface ExampleResult {
  sentence: string;
  translation: string;
  pinyin: string;
}

export async function generateExample(
  word: string,
  language: string,
  apiKey: string
): Promise<ExampleResult | null> {
  const systemPrompt = '';
  const userPrompt = `Generate a natural ${language} sentence (max 15 words) using the word "${word}". Return ONLY valid JSON with no markdown formatting: {"sentence":"...","translation":"...","pinyin":"..."}`;

  const rawText = await callDeepSeek(apiKey, systemPrompt, userPrompt, {
    maxTokens: 256,
    temperature: 0.7,
  });

  if (!rawText) return null;

  try {
    const cleaned = rawText.replace(/```(?:json)?\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as ExampleResult;
    if (!parsed.sentence || !parsed.translation) {
      throw new Error('Invalid response format');
    }
    return parsed;
  } catch (error: any) {
    const { Alert } = require('react-native');
    Alert.alert(
      'Generation Failed',
      error?.message || 'Could not generate an example. Please try again.'
    );
    return null;
  }
}
```

- [ ] **Step 2: Write tests for callDeepSeek**

Create `src/utils/__tests__/ai.test.ts`:

```ts
import { callDeepSeek } from '../ai';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('callDeepSeek', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns parsed content on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"result":"ok"}' } }],
      }),
    });

    const result = await callDeepSeek('sk-test', 'You are helpful', 'Say hello');
    expect(result).toBe('{"result":"ok"}');
  });

  test('returns null on API error status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await callDeepSeek('sk-bad', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await callDeepSeek('sk-test', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('returns null when response has no choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const result = await callDeepSeek('sk-test', 'sys', 'msg');
    expect(result).toBeNull();
  });

  test('uses custom model when specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
    });

    await callDeepSeek('sk-test', 'sys', 'msg', { model: 'deepseek-chat', maxTokens: 512, temperature: 0.3 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.max_tokens).toBe(512);
    expect(body.temperature).toBe(0.3);
  });

  test('defaults model to deepseek-v4-flash', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }],
      }),
    });

    await callDeepSeek('sk-test', 'sys', 'msg');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-v4-flash');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx jest src/utils/__tests__/ai.test.ts --passWithNoTests`
Expected: 6 tests PASS.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/ai.ts src/utils/__tests__/ai.test.ts
git commit -m "refactor: extract shared callDeepSeek helper, add tests"
```

---

### Task 4: Add database queries for anchors and dedup

**Files:**
- Modify: `src/storage/database.ts:565` (append after `getStreak`)
- Modify: `src/storage/__tests__/database.test.ts` (append tests)

**Interfaces:**
- Consumes: `AnchorCard` from Task 1
- Produces: `getAnchorCards(language: string): Promise<AnchorCard[]>` — 3 most recently reviewed cards in the given language
- Produces: `getAllFrontTextsByLanguage(language: string): Promise<string[]>` — all front_text values for cards in decks of that language
- Produces: `getAvgIntervalByLanguage(language: string): Promise<number>` — average review interval for cards in that language

- [ ] **Step 1: Add database queries**

Append to `src/storage/database.ts` before the final closing brace (import `AnchorCard` at the top from `'../models/types'`):

```ts
// ========== Daily words queries ==========

export async function getAnchorCards(language: string): Promise<AnchorCard[]> {
  const database = await getDatabase();
  return database.getAllAsync<AnchorCard>(
    `SELECT c.front_text, c.back_text
     FROM cards c
     INNER JOIN decks d ON c.deck_id = d.id
     INNER JOIN reviews r ON c.id = r.card_id
     WHERE d.language = ? AND r.last_review_date IS NOT NULL
     ORDER BY r.last_review_date DESC
     LIMIT 3`,
    [language]
  );
}

export async function getAllFrontTextsByLanguage(language: string): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ front_text: string }>(
    `SELECT c.front_text
     FROM cards c
     INNER JOIN decks d ON c.deck_id = d.id
     WHERE d.language = ?`,
    [language]
  );
  return rows.map((r) => r.front_text);
}

export async function getAvgIntervalByLanguage(language: string): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ avg: number }>(
    `SELECT COALESCE(AVG(r.interval), 0) as avg
     FROM reviews r
     INNER JOIN cards c ON c.id = r.card_id
     INNER JOIN decks d ON c.deck_id = d.id
     WHERE d.language = ?`,
    [language]
  );
  return row?.avg ?? 0;
}
```

- [ ] **Step 2: Add tests for new queries**

Append to `src/storage/__tests__/database.test.ts` before the final closing brace:

```ts
describe('Daily words queries', () => {
  beforeAll(async () => {
    const deck = await database.createDeck('French Deck', '', 'French');
    await database.createCard(deck.id, 'bonjour', 'hello');
    await database.createCard(deck.id, 'merci', 'thank you');
    await database.createCard(deck.id, 'au revoir', 'goodbye');
    await database.createCard(deck.id, 'oui', 'yes');

    const cards = await database.getCardsByDeckId(deck.id);
    for (const card of cards) {
      await database.updateReview(card.id, 2.5, 1, 1, '2026-06-20', );
    }
  });

  describe('getAnchorCards', () => {
    test('returns cards reviewed in the given language', async () => {
      const anchors = await database.getAnchorCards('French');
      expect(anchors.length).toBeGreaterThanOrEqual(1);
      expect(anchors[0]).toHaveProperty('front_text');
      expect(anchors[0]).toHaveProperty('back_text');
    });

    test('returns empty array for language with no cards', async () => {
      const anchors = await database.getAnchorCards('Klingon');
      expect(anchors).toEqual([]);
    });

    test('returns at most 3 anchors', async () => {
      const anchors = await database.getAnchorCards('French');
      expect(anchors.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getAllFrontTextsByLanguage', () => {
    test('returns all front_text for the language', async () => {
      const texts = await database.getAllFrontTextsByLanguage('French');
      expect(texts.length).toBeGreaterThanOrEqual(1);
      expect(texts).toContain('bonjour');
      expect(texts).toContain('merci');
    });

    test('returns empty array for language with no decks', async () => {
      const texts = await database.getAllFrontTextsByLanguage('Esperanto');
      expect(texts).toEqual([]);
    });
  });

  describe('getAvgIntervalByLanguage', () => {
    test('returns average interval for the language', async () => {
      const avg = await database.getAvgIntervalByLanguage('French');
      expect(typeof avg).toBe('number');
    });

    test('returns 0 for language with no cards', async () => {
      const avg = await database.getAvgIntervalByLanguage('Esperanto');
      expect(avg).toBe(0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx jest src/storage/__tests__/database.test.ts --passWithNoTests`
Expected: All tests PASS (existing + new).

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/storage/database.ts src/storage/__tests__/database.test.ts
git commit -m "feat: add getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage queries"
```

---

### Task 5: Build core daily words algorithm

**Files:**
- Create: `src/utils/dailyWords.ts`
- Create: `src/utils/__tests__/dailyWords.test.ts`

**Interfaces:**
- Consumes: `DailyWord`, `AnchorCard` from Task 1, `callDeepSeek` from Task 3, `getAnchorCards`, `getAllFrontTextsByLanguage` from Task 4, `getDailyLanguage`, `getDailyWordsData`, `setDailyWordsData` from Task 2
- Produces: `buildDailyWordsPrompt()`, `dedupAndRank()`, `generateDailyWords()`

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/dailyWords.test.ts`:

```ts
import { buildDailyWordsPrompt, dedupAndRank, generateDailyWords } from '../dailyWords';
import { DailyWord, AnchorCard } from '../../models/types';

describe('buildDailyWordsPrompt', () => {
  test('produces system and user prompts with anchors', () => {
    const anchors: AnchorCard[] = [
      { front_text: 'bonjour', back_text: 'hello' },
      { front_text: 'merci', back_text: 'thank you' },
      { front_text: 'au revoir', back_text: 'goodbye' },
    ];

    const { system, user } = buildDailyWordsPrompt('French', anchors);

    expect(system).toContain('language tutor');
    expect(system).toContain('15 new words');
    expect(user).toContain('French');
    expect(user).toContain('bonjour');
    expect(user).toContain('hello');
    expect(user).toContain('merci');
    expect(user).toContain('thank you');
    expect(user).toContain('au revoir');
    expect(user).toContain('goodbye');
  });

  test('adapts prompt when anchors are empty', () => {
    const { system, user } = buildDailyWordsPrompt('Spanish', []);

    expect(system).toContain('language tutor');
    expect(user).toContain('Spanish');
    expect(user).toContain('complete beginner');
  });

  test('handles fewer than 3 anchors', () => {
    const anchors: AnchorCard[] = [
      { front_text: 'hola', back_text: 'hello' },
    ];

    const { user } = buildDailyWordsPrompt('Spanish', anchors);
    expect(user).toContain('hola');
    expect(user).toContain('hello');
  });
});

describe('dedupAndRank', () => {
  test('removes duplicates matching existing front_text (case-insensitive)', () => {
    const candidates: DailyWord[] = [
      { front: 'bonjour', back: 'hello', complexity: 1 },
      { front: 'salut', back: 'hi', complexity: 2 },
      { front: 'BONJOUR', back: 'hello again', complexity: 3 },
      { front: 'merci', back: 'thanks', complexity: 1 },
    ];

    const known = ['bonjour', 'au revoir'];
    const result = dedupAndRank(candidates, known, 2);

    expect(result).toHaveLength(2);
    expect(result[0].front).toBe('salut');
    expect(result[1].front).toBe('merci');
  });

  test('ranks by closeness to target complexity', () => {
    const candidates: DailyWord[] = [
      { front: 'word1', back: 't1', complexity: 1 },
      { front: 'word2', back: 't2', complexity: 3 },
      { front: 'word3', back: 't3', complexity: 5 },
      { front: 'word4', back: 't4', complexity: 2 },
    ];

    const result = dedupAndRank(candidates, [], 3);

    // Target is 3: word2 (0 diff) > word4 (1 diff) > word1 (2 diff) > word3 (2 diff, tiebroken by lower complexity)
    expect(result).toHaveLength(4);
    expect(result[0].front).toBe('word2');
    expect(result[1].front).toBe('word4');
    expect(result[2].front).toBe('word1');
    expect(result[3].front).toBe('word3');
  });

  test('returns empty array if all are duplicates', () => {
    const candidates: DailyWord[] = [
      { front: 'bonjour', back: 'hello', complexity: 1 },
    ];

    const result = dedupAndRank(candidates, ['bonjour', 'merci'], 1);
    expect(result).toEqual([]);
  });

  test('returns at most count items', () => {
    const candidates: DailyWord[] = [
      { front: 'a', back: 'a', complexity: 1 },
      { front: 'b', back: 'b', complexity: 2 },
      { front: 'c', back: 'c', complexity: 3 },
      { front: 'd', back: 'd', complexity: 4 },
      { front: 'e', back: 'e', complexity: 5 },
    ];

    const result = dedupAndRank(candidates, [], 3);
    expect(result).toHaveLength(3);
  });

  test('sorts by fit score then complexity ascending on tie', () => {
    const candidates: DailyWord[] = [
      { front: 'a', back: 'a', complexity: 5 },
      { front: 'b', back: 'b', complexity: 1 },
    ];

    // Both complexity 5 and 1 have same |diff| from target 3: |5-3|=2, |1-3|=2
    // Tiebreak: lower complexity first, so 'b' (complexity 1) before 'a' (complexity 5)
    const result = dedupAndRank(candidates, [], 3);
    expect(result[0].front).toBe('b');
    expect(result[1].front).toBe('a');
  });
});

describe('generateDailyWords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when apiKey is empty', async () => {
    const result = await generateDailyWords('French', '');
    expect(result).toBeNull();
  });

  test('returns null when language is empty', async () => {
    const result = await generateDailyWords('', 'sk-test');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/utils/__tests__/dailyWords.test.ts --passWithNoTests`
Expected: Tests FAIL with "module not found" or "function not defined".

- [ ] **Step 3: Implement dailyWords.ts**

Create `src/utils/dailyWords.ts`:

```ts
import { DailyWord, AnchorCard } from '../models/types';
import { callDeepSeek } from './ai';
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage } from '../storage/database';

const SYSTEM_PROMPT = `You are a language tutor creating a daily vocabulary drop. Given words the student recently reviewed, generate 15 new words at a similar difficulty level. Each word should be naturally adjacent to the anchors — same topic domain, complexity tier, and word type (noun/verb/adj). Return ONLY valid JSON.`;

export function buildDailyWordsPrompt(
  language: string,
  anchors: AnchorCard[]
): { system: string; user: string } {
  let userPrompt: string;

  if (anchors.length === 0) {
    userPrompt = `Language: ${language}. The learner is a complete beginner.
Generate 15 new ${language} words appropriate for elementary level.
Rate each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`;
  } else {
    const anchorLines = anchors
      .map((a, i) => `${i + 1}. "${a.front_text}" = "${a.back_text}"`)
      .join('\n');

    userPrompt = `Language: ${language}.
Anchors:
${anchorLines}

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
Return ONLY valid JSON: {"words": [{"front":"...","back":"...","complexity":3}, ...]}`;
  }

  return { system: SYSTEM_PROMPT, user: userPrompt };
}

export function dedupAndRank(
  candidates: DailyWord[],
  knownWords: string[],
  targetLevel: number
): DailyWord[] {
  const knownLower = new Set(knownWords.map((w) => w.toLowerCase().trim()));

  const deduped = candidates.filter((c) => {
    const frontLower = c.front.toLowerCase().trim();
    return !knownLower.has(frontLower);
  });

  deduped.sort((a, b) => {
    const fitA = Math.abs(a.complexity - targetLevel);
    const fitB = Math.abs(b.complexity - targetLevel);
    if (fitA !== fitB) return fitA - fitB;
    return a.complexity - b.complexity;
  });

  return deduped;
}

function parseWordsResponse(rawText: string): DailyWord[] {
  const cleaned = rawText.replace(/```(?:json)?\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.words || !Array.isArray(parsed.words)) {
    throw new Error('Invalid response format: missing words array');
  }
  return parsed.words.map((w: any) => ({
    front: String(w.front || ''),
    back: String(w.back || ''),
    complexity: Number(w.complexity) || 1,
  }));
}

function computeTargetLevel(avgInterval: number): number {
  if (avgInterval <= 0) return 1;
  const level = Math.ceil(avgInterval / 7);
  return Math.max(1, Math.min(5, level));
}

export async function generateDailyWords(
  language: string,
  apiKey: string
): Promise<DailyWord[] | null> {
  if (!language || !apiKey) return null;

  const anchors = await getAnchorCards(language);
  const { system, user } = buildDailyWordsPrompt(language, anchors);

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
      const candidates = parseWordsResponse(rawText);
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

- [ ] **Step 4: Run tests**

Run: `npx jest src/utils/__tests__/dailyWords.test.ts --passWithNoTests`
Expected: All tests PASS (need to mock `callDeepSeek`, `getAnchorCards`, `getAllFrontTextsByLanguage` for `generateDailyWords` tests).

Wait, the `generateDailyWords` tests need mocks for database and API. Update the test file to include proper mocks. In Step 1, replace the `generateDailyWords` describe block with:

```ts
jest.mock('../ai', () => ({
  callDeepSeek: jest.fn(),
}));

jest.mock('../storage/database', () => ({
  getAnchorCards: jest.fn(),
  getAllFrontTextsByLanguage: jest.fn(),
  getAvgIntervalByLanguage: jest.fn(),
}));

import { callDeepSeek } from '../ai';
import { getAnchorCards, getAllFrontTextsByLanguage, getAvgIntervalByLanguage } from '../storage/database';

const mockedCallDeepSeek = jest.mocked(callDeepSeek);
const mockedGetAnchorCards = jest.mocked(getAnchorCards);
const mockedGetAllFrontTexts = jest.mocked(getAllFrontTextsByLanguage);
const mockedGetAvgInterval = jest.mocked(getAvgIntervalByLanguage);

describe('generateDailyWords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null when apiKey is empty', async () => {
    const result = await generateDailyWords('French', '');
    expect(result).toBeNull();
  });

  test('returns null when language is empty', async () => {
    const result = await generateDailyWords('', 'sk-test');
    expect(result).toBeNull();
  });

  test('returns null when DeepSeek fails', async () => {
    mockedGetAnchorCards.mockResolvedValue([
      { front_text: 'bonjour', back_text: 'hello' },
    ]);
    mockedGetAvgInterval.mockResolvedValue(7);
    mockedCallDeepSeek.mockResolvedValue(null);

    const result = await generateDailyWords('French', 'sk-test');
    expect(result).toBeNull();
  });

  test('parses successful response and returns top 5', async () => {
    mockedGetAnchorCards.mockResolvedValue([
      { front_text: 'bonjour', back_text: 'hello' },
    ]);
    mockedGetAllFrontTexts.mockResolvedValue(['bonjour']);
    mockedGetAvgInterval.mockResolvedValue(7);
    mockedCallDeepSeek.mockResolvedValue(JSON.stringify({
      words: [
        { front: 'bonjour', back: 'hello', complexity: 1 },
        { front: 'salut', back: 'hi', complexity: 1 },
        { front: 'merci', back: 'thanks', complexity: 2 },
        { front: 'pardon', back: 'sorry', complexity: 2 },
        { front: 'oui', back: 'yes', complexity: 1 },
        { front: 'non', back: 'no', complexity: 1 },
        { front: 'chat', back: 'cat', complexity: 3 },
      ],
    }));

    const result = await generateDailyWords('French', 'sk-test');
    expect(result).toHaveLength(5);
    expect(result![0].front).toBe('salut'); // 'bonjour' was deduped
  });
});
```

Move the mock declarations to the very top of the file, before `describe('buildDailyWordsPrompt', ...)`.

- [ ] **Step 5: Run all new tests**

Run: `npx jest src/utils/__tests__/dailyWords.test.ts --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 6: Run full test suite**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS. No regressions.

- [ ] **Step 7: Commit**

```bash
git add src/utils/dailyWords.ts src/utils/__tests__/dailyWords.test.ts
git commit -m "feat: add daily words generation algorithm with dedup and ranking"
```

---

### Task 6: Add i18n keys for daily words

**Files:**
- Modify: `src/i18n/translations/en.json:229` (append before closing brace)
- Modify: `src/i18n/translations/zh.json:229` (append before closing brace)

**Interfaces:**
- Produces: Translation keys used by Task 7, 8, 9

- [ ] **Step 1: Add English translation keys**

In `src/i18n/translations/en.json`, append these keys before the final `}`:

```json
"dailyWords.title": "Daily Words",
"dailyWords.setLanguage": "Set your language to get daily word suggestions",
"dailyWords.noApiKey": "Configure your DeepSeek API key in Settings to unlock daily word suggestions",
"dailyWords.tapToGenerate": "Tap to get today's 5 words",
"dailyWords.ready": "{{count}} words ready",
"dailyWords.reviewWords": "Review words",
"dailyWords.generating": "Generating your daily words...",
"dailyWords.failed": "Could not generate words. Check your connection and try again.",
"dailyWords.complexity": "Complexity {{level}}",
"dailyWords.addToDeck": "Add to Deck",
"dailyWords.discard": "Discard",
"dailyWords.selectDeck": "Select Deck",
"dailyWords.createNewDeck": "Create New Deck",
"dailyWords.newDeckName": "New deck name",
"dailyWords.imported": "{{count}} words added to {{deck}}",
"dailyWords.someDuplicates": "Some words were already in your collection",
"dailyWords.waiting": "You have 5 new words waiting",
"dailyWords.reviewNow": "Review Now",
"settings.dailyLanguage": "Daily Words Language",
"settings.dailyLanguageDescription": "Receive daily vocabulary suggestions in this language"
```

- [ ] **Step 2: Add Chinese translation keys**

In `src/i18n/translations/zh.json`, append these keys before the final `}`:

```json
"dailyWords.title": "每日单词",
"dailyWords.setLanguage": "设置语言以获取每日单词建议",
"dailyWords.noApiKey": "请在设置中配置 DeepSeek API 密钥以解锁每日单词建议",
"dailyWords.tapToGenerate": "点击获取今日5个单词",
"dailyWords.ready": "{{count}} 个单词已就绪",
"dailyWords.reviewWords": "查看单词",
"dailyWords.generating": "正在生成您的每日单词...",
"dailyWords.failed": "无法生成单词。请检查连接后重试。",
"dailyWords.complexity": "难度 {{level}}",
"dailyWords.addToDeck": "添加到牌组",
"dailyWords.discard": "丢弃",
"dailyWords.selectDeck": "选择牌组",
"dailyWords.createNewDeck": "创建新牌组",
"dailyWords.newDeckName": "新牌组名称",
"dailyWords.imported": "已将 {{count}} 个单词添加到 {{deck}}",
"dailyWords.someDuplicates": "部分单词已存在于您的收藏中",
"dailyWords.waiting": "您有 5 个新单词等待处理",
"dailyWords.reviewNow": "立即查看",
"settings.dailyLanguage": "每日单词语言",
"settings.dailyLanguageDescription": "接收此语言的每日词汇建议"
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors (these are JSON, not TS).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations/en.json src/i18n/translations/zh.json
git commit -m "feat: add daily words i18n translations"
```

---

### Task 7: Add daily language picker to Settings screen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx:18-19, 40-46, 278-312`

**Interfaces:**
- Consumes: `getDailyLanguage`, `setDailyLanguage` from Task 2, `getAiEnabled`, `getApiKey` from Task 2, i18n keys from Task 6
- Produces: A language chip selector in Settings for choosing daily words language

- [ ] **Step 1: Update imports**

In `src/screens/SettingsScreen.tsx`, update the settings import line (~line 19):

```ts
import { getAiEnabled, setAiEnabled, getApiKey, setApiKey, getDailyLanguage, setDailyLanguage } from '../utils/settings';
```

- [ ] **Step 2: Add state and load logic**

Add state after the existing `apiKeySheetVisible` state (~line 38):

```ts
const [dailyLanguage, setDailyLanguageState] = useState('');
```

In the `useEffect` (~line 40-46), add loading of daily language:

```ts
useEffect(() => {
  getAiEnabled().then(setAiEnabledLocal);
  getApiKey().then((key) => {
    setApiKeyLocal(key);
    setDraftApiKey(key);
  });
  getDailyLanguage().then(setDailyLanguageState);
}, []);
```

- [ ] **Step 3: Add daily language chips to the AI card**

Find the AI Assistant card section (~line 279-312). Add a daily language picker between the toggle/description section and the API key row. Insert this after the `aiDescription` Text (after line ~295) and before the `{aiEnabled && (` block:

```tsx
{aiEnabled && (
  <View style={{ paddingTop: spacing.sm + 2, marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
    <Text style={styles.sectionLabel}>{t('settings.dailyLanguage')}</Text>
    <Text style={[styles.aiDescription, { marginBottom: spacing.sm }]}>
      {t('settings.dailyLanguageDescription')}
    </Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {(['', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian'] as const).map((lang) => (
        <TouchableOpacity
          key={lang}
          style={[
            styles.langChip,
            dailyLanguage === lang && styles.langChipSelected,
          ]}
          onPress={() => {
            setDailyLanguageState(lang);
            setDailyLanguage(lang);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: dailyLanguage === lang }}
        >
          <Text style={[
            styles.langChipText,
            dailyLanguage === lang && styles.langChipTextSelected,
          ]}>
            {lang === '' ? t('common.none') || 'None' : lang}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    {dailyLanguage === '' && (
      <Text style={[styles.aiDescription, { marginTop: spacing.sm }]}>
        {t('dailyWords.setLanguage')}
      </Text>
    )}
  </View>
)}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Run tests**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: add daily words language picker to settings"
```

---

### Task 8: Add Daily Words card to Home screen

**Files:**
- Modify: `src/screens/HomeScreen.tsx:1-704`

**Interfaces:**
- Consumes: `getDailyWordsData`, `clearDailyWords`, `getDailyLanguage` from Task 2, `generateDailyWords` from Task 5, `getApiKey` from Task 2, i18n keys from Task 6, `importCards`, `createDeck`, `getAllDecks` from database
- Produces: Daily Words card on Home screen

- [ ] **Step 1: Update imports on HomeScreen**

Add to `src/screens/HomeScreen.tsx`:

```ts
import { getDailyLanguage, getDailyWordsData, clearDailyWords, getApiKey } from '../utils/settings';
import { generateDailyWords } from '../utils/dailyWords';
import { importCards, createDeck, getAllDecks } from '../storage/database';
import { DailyWord, Deck } from '../models/types';
```

- [ ] **Step 2: Add state variables**

After the existing `const [reverseMode, setReverseModeState] = useState(false);` line (~line 61), add:

```ts
const [dailyLanguage, setDailyLanguage] = useState('');
const [dailyWordsData, setDailyWordsData] = useState<{ date: string; words: DailyWord[] }>({ date: '', words: [] });
const [dailyGenerating, setDailyGenerating] = useState(false);
const [dailyError, setDailyError] = useState(false);
const [dailyModalVisible, setDailyModalVisible] = useState(false);
const [deckPickerVisible, setDeckPickerVisible] = useState(false);
const [languageDecks, setLanguageDecks] = useState<Deck[]>([]);
const [newDeckName, setNewDeckName] = useState('');
const [newDeckModalVisible, setNewDeckModalVisible] = useState(false);
const [apiKey, setApiKey] = useState('');
```

- [ ] **Step 3: Add load logic in useFocusEffect**

Inside the `useFocusEffect` callback (~line 150), after `getReverseMode().then(setReverseModeState);`, add:

```ts
getDailyLanguage().then(setDailyLanguage);
getApiKey().then(setApiKey);
getDailyWordsData().then((data) => {
  const today = new Date().toISOString().slice(0, 10);
  if (data.date !== today) {
    clearDailyWords();
    setDailyWordsData({ date: '', words: [] });
  } else {
    setDailyWordsData(data);
  }
});
```

- [ ] **Step 4: Add generate handler**

Add a function before the `return` statement:

```ts
const handleGenerateDaily = useCallback(async () => {
  if (!dailyLanguage || !apiKey) return;
  setDailyGenerating(true);
  setDailyError(false);
  const words = await generateDailyWords(dailyLanguage, apiKey);
  setDailyGenerating(false);
  if (words && words.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    setDailyWordsData({ date: today, words });
    setDailyModalVisible(true);
  } else {
    setDailyError(true);
  }
}, [dailyLanguage, apiKey]);
```

- [ ] **Step 5: Add import/action handlers**

```ts
const handleAddToDeck = useCallback(async (deckId: number) => {
  const cards = dailyWordsData.words.map((w) => ({
    front_text: w.front,
    back_text: w.back,
  }));
  await importCards(deckId, cards);
  setDeckPickerVisible(false);
  setDailyModalVisible(false);
}, [dailyWordsData.words]);

const handleCreateAndAdd = useCallback(async () => {
  if (!newDeckName.trim()) return;
  const deck = await createDeck(newDeckName.trim(), '', dailyLanguage);
  const cards = dailyWordsData.words.map((w) => ({
    front_text: w.front,
    back_text: w.back,
  }));
  await importCards(deck.id, cards);
  setNewDeckModalVisible(false);
  setNewDeckName('');
  setDailyModalVisible(false);
}, [dailyWordsData.words, dailyLanguage, newDeckName]);

const handleDiscardDailyWords = useCallback(async () => {
  await clearDailyWords();
  setDailyWordsData({ date: '', words: [] });
  setDailyModalVisible(false);
}, []);

const openDeckPicker = useCallback(async () => {
  const decks = await getAllDecks();
  const filtered = decks.filter((d) => d.language.toLowerCase() === dailyLanguage.toLowerCase());
  setLanguageDecks(filtered);
  setDeckPickerVisible(true);
}, [dailyLanguage]);
```

- [ ] **Step 6: Add Daily Words card JSX**

After the Activity section card (~line 619-656) and before the Freeflow Modal, insert:

```tsx
{/* ——— Daily Words ——— */}
<View style={styles.activitySection}>
  <Text style={styles.sectionLabel}>{t('dailyWords.title')}</Text>
  {!apiKey ? (
    <TouchableOpacity
      style={[styles.activityCard, { opacity: 0.5 }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Settings')}
      accessibilityRole="button"
    >
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.textSecondary, 0.1) }]}>
        <Ionicons name="sparkles-outline" size={20} color={colors.textSecondary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityValue, { color: colors.textSecondary }]}>
          {t('dailyWords.title')}
        </Text>
        <Text style={styles.activityLabel}>
          {t('dailyWords.noApiKey')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  ) : !dailyLanguage ? (
    <TouchableOpacity
      style={styles.activityCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Settings')}
      accessibilityRole="button"
    >
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.secondary, 0.12) }]}>
        <Ionicons name="language-outline" size={20} color={colors.secondary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityValue}>{t('dailyWords.title')}</Text>
        <Text style={styles.activityLabel}>{t('dailyWords.setLanguage')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  ) : dailyWordsData.words.length > 0 ? (
    <TouchableOpacity
      style={styles.activityCard}
      activeOpacity={0.7}
      onPress={() => setDailyModalVisible(true)}
      accessibilityRole="button"
    >
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityValue}>
          {t('dailyWords.ready', { count: String(dailyWordsData.words.length) })}
        </Text>
        <Text style={styles.activityLabel}>{t('dailyWords.reviewWords')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  ) : dailyError ? (
    <TouchableOpacity
      style={styles.activityCard}
      activeOpacity={0.7}
      onPress={handleGenerateDaily}
      accessibilityRole="button"
    >
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.danger, 0.12) }]}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityValue}>{t('dailyWords.title')}</Text>
        <Text style={styles.activityLabel}>{t('dailyWords.failed')}</Text>
      </View>
      <Ionicons name="refresh-outline" size={16} color={colors.border} />
    </TouchableOpacity>
  ) : dailyGenerating ? (
    <View style={styles.activityCard}>
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Ionicons name="hourglass-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityValue}>{t('dailyWords.title')}</Text>
        <Text style={styles.activityLabel}>{t('dailyWords.generating')}</Text>
      </View>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.activityCard}
      activeOpacity={0.7}
      onPress={handleGenerateDaily}
      accessibilityRole="button"
    >
      <View style={[styles.activityIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityValue}>{t('dailyWords.title')}</Text>
        <Text style={styles.activityLabel}>{t('dailyWords.tapToGenerate')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  )}
</View>
```

- [ ] **Step 7: Add Daily Words Review Modal**

After the Freeflow Modal closing tag (`</Modal>`) and before the closing `</ScrollView>`:

```tsx
{/* ——— Daily Words Review Modal ——— */}
<Modal
  visible={dailyModalVisible}
  onClose={() => setDailyModalVisible(false)}
  title={t('dailyWords.title')}
>
  <ScrollView style={{ maxHeight: 400 }}>
    {dailyWordsData.words.map((word, i) => (
      <View
        key={i}
        style={{
          paddingVertical: spacing.sm,
          borderBottomWidth: i < dailyWordsData.words.length - 1 ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.text }}>
            {word.front}
          </Text>
          <View style={{
            backgroundColor: withAlpha(colors.primary, 0.1),
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: borderRadius.full,
          }}>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>
              {t('dailyWords.complexity', { level: String(word.complexity) })}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
          {word.back}
        </Text>
      </View>
    ))}
  </ScrollView>
  <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
    <Button
      title={t('dailyWords.addToDeck')}
      onPress={openDeckPicker}
      fullWidth
    />
    <Button
      title={t('dailyWords.discard')}
      variant="ghost"
      onPress={handleDiscardDailyWords}
      fullWidth
    />
  </View>
</Modal>

{/* ——— Deck Picker Modal ——— */}
<Modal
  visible={deckPickerVisible}
  onClose={() => setDeckPickerVisible(false)}
  title={t('dailyWords.selectDeck')}
>
  <ScrollView style={{ maxHeight: 300 }}>
    {languageDecks.map((deck) => (
      <TouchableOpacity
        key={deck.id}
        style={{
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        onPress={() => handleAddToDeck(deck.id)}
      >
        <Text style={{ fontSize: typography.fontSize.md, color: colors.text }}>{deck.name}</Text>
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
          {deck.language}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
  <View style={{ marginTop: spacing.md }}>
    <Button
      title={t('dailyWords.createNewDeck')}
      variant="secondary"
      onPress={() => {
        setDeckPickerVisible(false);
        setNewDeckModalVisible(true);
      }}
      fullWidth
    />
  </View>
</Modal>

{/* ——— New Deck Modal ——— */}
<Modal
  visible={newDeckModalVisible}
  onClose={() => setNewDeckModalVisible(false)}
  title={t('dailyWords.createNewDeck')}
>
  <Input
    label={t('dailyWords.newDeckName')}
    placeholder=""
    value={newDeckName}
    onChangeText={setNewDeckName}
  />
  <View style={{ marginTop: spacing.md }}>
    <Button
      title={t('common.create')}
      onPress={handleCreateAndAdd}
      disabled={!newDeckName.trim()}
      fullWidth
    />
  </View>
</Modal>
```

- [ ] **Step 8: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors. If errors, fix import paths and type mismatches.

- [ ] **Step 9: Run tests**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add Daily Words card to Home screen with review modal"
```

---

### Task 9: Add post-practice daily words prompt

**Files:**
- Modify: `src/screens/PracticeScreen.tsx:443-498` (session complete section)

**Interfaces:**
- Consumes: `getDailyWordsData` from Task 2, i18n keys from Task 6
- Produces: Prompts user about pending daily words after a daily review session

- [ ] **Step 1: Update imports on PracticeScreen**

Add to `src/screens/PracticeScreen.tsx`:

```ts
import { getDailyWordsData } from '../utils/settings';
import type { DailyWord } from '../models/types';
```

- [ ] **Step 2: Add state**

After the existing state declarations (~line 64), add:

```ts
const [pendingDailyWords, setPendingDailyWords] = useState(false);
```

- [ ] **Step 3: Check for pending daily words on session complete**

In the `loadCards` callback (~line 103), add after the existing logic:

```ts
if (mode === 'daily') {
  getDailyWordsData().then((data) => {
    const today = new Date().toISOString().slice(0, 10);
    if (data.date === today && data.words.length > 0) {
      setPendingDailyWords(true);
    }
  });
}
```

- [ ] **Step 4: Add post-practice prompt to session complete screen**

In the session complete section (~line 460-497), inside the `completeContainer` View, add before the `completeButtons` View:

```tsx
{pendingDailyWords && (
  <TouchableOpacity
    style={{
      backgroundColor: withAlpha(colors.primary, 0.08),
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
      width: '100%',
      alignItems: 'center',
      gap: spacing.xs,
    }}
    onPress={() => {
      navigation.navigate('MainTabs');
      navigation.getParent()?.setParams({});
    }}
    accessibilityRole="button"
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons name="sparkles" size={18} color={colors.primary} />
      <Text style={{
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.primary,
      }}>{t('dailyWords.waiting')}</Text>
    </View>
    <Text style={{
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
    }}>{t('dailyWords.reviewNow')}</Text>
  </TouchableOpacity>
)}
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Run tests**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/PracticeScreen.tsx
git commit -m "feat: add post-practice daily words prompt"
```

---

## Final Verification

After all 9 tasks:

- [ ] Run: `npx tsc --noEmit`
- [ ] Run: `npx jest --passWithNoTests`
- [ ] Both must pass with no errors
