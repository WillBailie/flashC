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

## What Gets Tested By Change Type

| Change type | Minimum test requirement |
|-------------|--------------------------|
| New database query (SELECT/INSERT/UPDATE/DELETE) | Tests in `src/storage/__tests__/database.test.ts` covering happy path, empty results, edge params |
| New utility function (`src/utils/`) | Tests in `src/utils/__tests__/<name>.test.ts` for every branch |
| Modified database schema (ALTER TABLE) | Migration test proving the migration is idempotent (runs successfully on already-migrated database) |
| Practice screen behavior change | Extract logic into `src/utils/practiceSession.ts` first, test the function, then wire into screen |
| New logic embedded in a screen component | Ask: can this be extracted to a pure function in `src/utils/`? If yes, extract and test. If no, document why in a comment. |

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

## Red Flags — Changes That MUST Add Tests

Any of these changes requires new or updated tests:

- Adding `export async function` or `export function` in `database.ts`
- Adding `export function` in any `src/utils/` file
- Changing the behavior of `handleRate`, `handleFlip`, `handleSwipeLeft`, or `handleSwipeRight`
- Adding a column via ALTER TABLE
- Adding a new parameter to an existing exported function
- Changing the Practice screen mode logic (daily vs freeflow rules)
- Adding a new screen that calls database functions

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

- [ ] `npx tsc --noEmit` passes
- [ ] `npx jest --passWithNoTests` passes
- [ ] New database exports have tests
- [ ] New utility exports have tests
- [ ] Migrations use `execAsync` not `runAsync`
- [ ] Practice screen changes use `practiceSession` functions
