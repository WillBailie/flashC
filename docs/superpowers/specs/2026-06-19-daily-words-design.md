# Daily Words Feature — Design Spec

**Date**: 2026-06-19
**Status**: draft

## Overview

Suggest 5 new vocabulary words daily based on the user's current language learning level using the DeepSeek API. Promotes daily app usage and continuous vocabulary expansion.

---

## 1. Architecture

### New files

| File | Purpose |
|------|---------|
| `src/utils/dailyWords.ts` | Anchor selection, prompt building, DeepSeek call, dedup + ranking logic |
| `src/utils/__tests__/dailyWords.test.ts` | Tests for level calc, prompt construction, dedup, ranking |

### Modified files

| File | Change |
|------|--------|
| `src/utils/settings.ts` | Add `dailyLanguage`, `dailyWordsDate`, `dailyWords` fields + getters/setters |
| `src/utils/ai.ts` | Extract shared `callDeepSeek()` helper from `generateExample` |
| `src/storage/database.ts` | Add `getAnchorCards(language)` and `getAllFrontTextsByLanguage(language)` |
| `src/models/types.ts` | Add `DailyWord` and `AnchorCard` interfaces |
| `src/screens/HomeScreen.tsx` | Add "Daily Words" card below practice mode grid |
| `src/screens/PracticeScreen.tsx` | Post daily-review prompt linking to pending daily words |
| `src/screens/SettingsScreen.tsx` | Language selector for daily words target |
| `src/i18n/translations/` | New translation keys for all daily-words UI strings |
| `src/storage/__tests__/database.test.ts` | Tests for new DB queries |

### No DB schema changes

Words, date, and language stored in the existing settings JSON file (`expo-file-system/legacy`). Once-per-day enforced via comparing stored date with today.

---

## 2. Algorithm & API

### 2.1 Anchor Selection

Query the 3 most recently reviewed cards in the user's chosen language (ordered by `last_review_date DESC`) from cards joined with reviews, filtered by deck language.

- If < 3 cards reviewed: use whatever's available (0 is valid — prompt adapts to "complete beginner")
- Each anchor: `{ front_text, back_text }`

### 2.2 DeepSeek Prompt

**System (static)**:
```
You are a language tutor creating a daily vocabulary drop. Given words the 
student recently reviewed, generate 15 new words at a similar difficulty 
level. Each word should be naturally adjacent to the anchors — same topic 
domain, complexity tier, and word type (noun/verb/adj). Return ONLY valid JSON.
```

**User (dynamic)**:
```
Language: {language}.
Anchors:
1. "{front}" = "{back}"
2. "{front}" = "{back}"
3. "{front}" = "{back}"

Generate 15 new words, rating each complexity (1=easiest, 5=most advanced).
Return: {"words": [{"front":"...","back":"...","complexity":3}, ...]}
```

**No anchors case**:
```
Language: {language}. The learner is a complete beginner.
Generate 15 new {language} words appropriate for elementary level.
```

### 2.3 Local Dedup + Ranking

1. Fetch all `front_text` for all cards in all decks of the daily language
2. Remove any candidate whose `front` matches an existing word (case-insensitive)
3. Compute `avgInterval` from reviews of cards in the daily language. Calculate **fit score**: `|complexity - targetLevel|` where `targetLevel = ceil(avgInterval / 7)` clamped to 1-5. If no review data for the language, targetLevel defaults to 1.
4. Sort by fit score ascending, then complexity ascending (tiebreak)
5. Take top 5
6. If < 5 survive dedup: retry DeepSeek requesting `N more` words (max 2 retries, keep surviving words across retries)
7. If still < 5 after retries: display what survived with note

### 2.4 Shared API Helper

Extract raw fetch call from `ai.ts` into `src/utils/ai.ts`:
```ts
export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null>
```
Used by both `generateExample` and `generateDailyWords`.

---

## 3. Data Model

### 3.1 Types (`src/models/types.ts`)

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

### 3.2 Settings extension (`src/utils/settings.ts`)

```ts
interface Settings {
  // ... existing ...
  dailyLanguage: string;       // '' = not configured
  dailyWordsDate: string;      // ISO date, '' if never generated
  dailyWords: DailyWord[];     // [] if none or discarded
}
```

New helpers:
```ts
export async function getDailyLanguage(): Promise<string>
export async function setDailyLanguage(value: string): Promise<void>
export async function getDailyWordsData(): Promise<{ date: string; words: DailyWord[] }>
export async function setDailyWordsData(date: string, words: DailyWord[]): Promise<void>
export async function clearDailyWords(): Promise<void>
```

### 3.3 Database queries (`src/storage/database.ts`)

```ts
// 3 most recently reviewed cards in a language (for anchors)
export async function getAnchorCards(language: string): Promise<AnchorCard[]>

// All front_text values for cards in decks of a given language (for dedup)
export async function getAllFrontTextsByLanguage(language: string): Promise<string[]>
```

---

## 4. UI Flow

### 4.1 Home Screen Card

New card below the practice mode grid, matching existing card style. Three states:

| State | Display |
|-------|---------|
| **No API key** | Greyed out card. Tap shows hint: "Configure your DeepSeek API key in Settings to unlock daily word suggestions" |
| **No language chosen** | "Set your language to get daily word suggestions" — tap navigates to Settings |
| **Not generated today** | "Tap to get today's 5 words" with sparkle icon |
| **Generated, pending** | "5 words ready" with "Review words" button and subtle dismiss option |

### 4.2 Generation Flow

Tap card → loading spinner "Generating your daily words..." → DeepSeek call (with dedup retries) → on success: show 5 words in scrollable list. On failure: error message with retry button.

### 4.3 Action Flow

After words displayed, each shows: `front_text` (bold), `back_text` (muted), complexity pill (number 1-5).

Bottom action bar:
- **"Add to Deck"** — opens deck picker modal (existing decks in that language, or "+ Create New Deck")
- **"Discard"** — clears daily words, card returns to "not generated" state (still counts as today's batch used)

**Deck Picker modal**: list of decks filtered by daily language. User picks one → words imported via `importCards()`. "Create New Deck" prompts for name → creates deck (language set to daily language) → imports words.

### 4.4 Post-Practice Prompt

After daily review session completes, if today's daily words exist and are un-actioned, the session-complete screen adds a card/button: "You have 5 new words waiting" → navigates to the review/add/discard flow.

### 4.5 Midnight Reset

On load, if `dailyWordsDate !== today`, clear `dailyWords` and reset card to "Not generated today" state. Does NOT auto-generate — user must tap.

---

## 5. Error Handling

| Scenario | Handling |
|----------|----------|
| No API key configured | Card greyed out, tap shows hint to configure in Settings |
| No language chosen | Card prompts to set language in Settings |
| No cards ever reviewed | Anchors empty, prompt adapts to beginner context |
| DeepSeek call fails (network, 4xx, 5xx) | Show error message with retry button, words not saved |
| DeepSeek returns < 5 after dedup | Retry up to 2× requesting `N more` words |
| All 15 candidates are duplicates after 2 retries | Display what survived (even if < 5) with note |
| User generated but didn't act | Words persist until midnight, then cleared |
| importCards fails | Show error, words remain in pending state for retry |

---

## 6. Testing

| Test file | Coverage |
|-----------|----------|
| `src/utils/__tests__/dailyWords.test.ts` | `calculateLevel()`, `buildPrompt()` with anchor cardinality (0, 1, 2, 3), `dedupAndRank()` filtering and scoring, edge cases (empty DB, all duplicates) |
| `src/storage/__tests__/database.test.ts` | `getAnchorCards()` (happy path, no reviews, language mismatch), `getAllFrontTextsByLanguage()` (happy path, empty, case sensitivity) |
| `src/utils/__tests__/ai.test.ts` | `callDeepSeek()` shared helper (mock fetch, success, API error, malformed response) |

No screen-level UI tests required.

---

## 7. Dependencies

- `expo-sqlite` (existing) — anchor and dedup queries
- `expo-file-system/legacy` (existing) — settings persistence
- `react-native` `fetch` (built-in) — DeepSeek API calls
- `@expo/vector-icons` (existing) — Ionicons for UI
- `react-native-reanimated` (existing) — card animations (optional, can start without)
- No new npm packages required
