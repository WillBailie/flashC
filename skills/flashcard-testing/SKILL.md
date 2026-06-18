---
name: flashcard-testing
description: Use when making changes to the flashcard app codebase — adding features, modifying database schema, changing Practice screen logic, adding new screens, or refactoring utilities. Use before marking any work complete.
---

# Flashcard App Testing

## Overview

Every change to this app must pass the test gate. Any change that skips testing can cause cascading breakage in unrelated features (e.g., a database migration change breaking Practice rating buttons).

## The Gate (Non-Negotiable)

```
npx tsc --noEmit && npx jest --passWithNoTests
```

This MUST pass before claiming work is complete. If it doesn't pass, work is not done.

## The Iron Rule

**Every new function, every new branch, every new parameter gets a test. Period.**

You write the test BEFORE the implementation. Run it, watch it fail, then implement. This is non-negotiable. If you skip testing, you ship broken features.

## What Gets Tested — Explicit Mapping

When you make a change, match it to this table and do what it says. No exceptions.

| You are... | You MUST... | Where |
|------------|-------------|-------|
| Adding a new `export async function` in `database.ts` | Write tests for: happy path, empty/null results, edge params, error cases | `src/storage/__tests__/database.test.ts` |
| Adding a new `export function` in any `src/utils/` file | Create `src/utils/__tests__/<name>.test.ts`, test every branch and edge case | New test file |
| Modifying an existing function's behavior or return value | Add or update tests for the new behavior BEFORE changing the implementation | Existing test file for that module |
| Adding a new parameter to an exported function | Add tests exercising the new parameter (both provided and default/omitted) | Existing test file for that module |
| Adding a column via ALTER TABLE | Use `execAsync` (NEVER `runAsync`), add a migration idempotency test | `src/storage/__tests__/database.test.ts` |
| Changing `handleRate`/`handleFlip`/`handleSwipeLeft`/`handleSwipeRight` flow | Update the matching function in `practiceSession.ts`, add/update tests in `practiceSession.test.ts`, THEN wire the screen | `src/utils/practiceSession.ts` + test |
| Adding logic inside any screen component | First: can this be extracted to a pure function in `src/utils/`? If yes, extract and test. If genuinely not extractable, add a comment explaining why | `src/utils/` or comment |
| Adding a new screen that calls database functions | The database functions themselves must already be tested. Screen-level UI tests are optional per AGENTS.md | — |
| Adding error handling (try/catch) to existing code | Test both the success path AND the failure path (make it fail, verify recovery) | Existing test file |

## Database Migration Rule

**NEVER use `database.runAsync()` for ALTER TABLE migrations.**

Always use `database.execAsync()`. The `runAsync` method uses `prepareAsync` → `executeAsync` → `finalizeAsync` internally, and expo-sqlite's web worker has a bug where `finalizeAsync` throws `"Error finalizing statement"` when the statement had a prior execution error (e.g., ALTER TABLE fails because column already exists). `execAsync` avoids this by using `sqlite3.exec()` which handles statement finalization internally.

Always add a test proving the migration is idempotent: calling `getDatabase()` twice must not throw.

## Practice Screen Rule

The card-advancement logic in PracticeScreen lives in `src/utils/practiceSession.ts` as pure functions:

- `advanceOnFlip(snapshot, mode)` — handles tap behavior
- `advanceOnSwipeLeft(snapshot, mode)` — handles left-swipe behavior
- `advanceOnSwipeRight(snapshot)` — handles right-swipe behavior
- `advanceOnRate(snapshot, quality)` — handles rating-button advancement

**Never add logic directly to `handleRate`/`handleFlip`/`handleSwipeLeft` in PracticeScreen.** Always update the corresponding function in `practiceSession.ts`, add tests in `practiceSession.test.ts`, then wire the screen to use the new return values.

The screen responsibilities are:
1. Call the pure function with current state
2. Apply the returned state via `setCards`, `setCurrentIndex`, etc.
3. Call `updateReview` (daily mode only) — separate from the pure function
4. Trigger confetti/haptics on session complete

## Test File Location

```
src/storage/database.ts → src/storage/__tests__/database.test.ts
src/utils/foo.ts        → src/utils/__tests__/foo.test.ts
```

Database tests use `jest.mock('expo-sqlite')` (in-memory mock at `__mocks__/expo-sqlite.ts`). Pure utility tests don't need mocks.

## Red Flags — Stop And Add Tests Now

If you did ANY of these without adding tests, your work is incomplete. Stop and add them before proceeding:

- Added `export function` or `export async function` anywhere → must have corresponding tests
- Modified function behavior (new branch, changed return, different side effects) → must update tests
- Added a new parameter to a function signature → must test both with and without the parameter
- Added `ALTER TABLE` or changed schema → must use `execAsync` and add idempotency test
- Touched `handleRate`/`handleFlip`/`handleSwipeLeft`/`handleSwipeRight` → must update `practiceSession.ts` + tests first
- Changed mode-dependent behavior (daily vs freeflow rules) → must test both modes
- The `npx jest` count didn't increase after your change → you forgot tests

## Quick Reference — Common Test Patterns

**Setting up a deck with cards for database tests:**
```ts
const deck = await database.createDeck('Test', '');
const card = await database.createCard(deck.id, 'front', 'back');
// afterAll: await database.deleteDeck(deck.id); // cascade deletes cards
```

**Creating cards with custom review dates (for getStreak tests):**
```ts
const card = await database.createCard(deck.id, 'F', 'B');
const db = await database.getDatabase();
await db.runAsync('UPDATE reviews SET last_review_date = ? WHERE card_id = ?', [isoDate, card.id]);
```

**Testing practiceSession functions:**
```ts
import { advanceOnRate, SessionSnapshot } from '../practiceSession';
const snapshot: SessionSnapshot = {
  cards: [/* CardWithReview[] */],
  currentIndex: 0,
  isFlipped: false,
  stats: { reviewed: 0 },
};
const result = advanceOnRate(snapshot, 3);
expect(result.currentIndex).toBe(1);
```

## Before Claiming Completion

Run this checklist. Every box must be checked:

- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest --passWithNoTests` passes
- [ ] Every new `export function` has a test (happy path + at least one edge case)
- [ ] Every new database query has a test (happy path + empty results + edge params)
- [ ] Every ALTER TABLE migration uses `execAsync` and has an idempotency test
- [ ] Every Practice screen logic change went through `practiceSession.ts` + tests first
- [ ] Every new function parameter has a test exercising it
- [ ] Modified functions have updated tests reflecting the new behavior
- [ ] The jest test count increased if you added logic (stayed same = you forgot tests)
