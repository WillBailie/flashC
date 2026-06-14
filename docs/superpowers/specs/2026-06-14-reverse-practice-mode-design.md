# Reverse Practice Mode — Design Spec

**Date:** 2026-06-14
**Status:** approved
**Source:** ROADMAP.md item #6

## Overview

Allow users to practice cards in reverse: show the back content as the prompt (front face of the flipcard) and the front content as the answer (back face). A toggle at practice-initiation points controls this per-session, with the last choice persisted across app restarts.

## Feature Behavior

- When reverse mode is ON: card's back fields/text appear on the flipcard front face, front fields/text on the back face
- When reverse mode is OFF: normal behavior (front on front, back on back)
- Applies to both daily review and freeflow modes
- Toggle state persists across app restarts via expo-file-system JSON file

## Architecture

### New route param

`RootStackParamList` in `src/navigation/AppNavigator.tsx`:
```ts
Practice: { 
  deckId?: number; deckName?: string; mode?: 'daily' | 'freeflow'; 
  cardCount?: number; reverse?: boolean;  // <-- added
};
```

### Persistence utility — `src/utils/settings.ts` (new file)

```ts
// Reads/writes ~/.flashcard-settings.json via expo-file-system/legacy
export async function getReverseMode(): Promise<boolean>;
export async function setReverseMode(value: boolean): Promise<void>;
```

Uses `expo-file-system/legacy` (already a project dependency). The JSON file stores `{ reverseMode: boolean }`.

### Toggle UI

`HomeScreen.tsx` and `DeckDetailScreen.tsx` each get a switch near their practice-launch controls:

```
┌────────────────────────────────────┐
│  [Daily Review]       [Freeflow]   │
│  [====] Reverse                    │
└────────────────────────────────────┘
```

- Uses RN `Switch` + label or an inline toggle
- Reads initial state from persisted file on mount
- Writes to persistence on toggle
- Value passed to Practice screen via `navigation.navigate('Practice', { ..., reverse: true/false })`

### Swap logic — `PracticeScreen.tsx`

When `route.params.reverse === true`, before passing data to FlipCard:

1. **Plain text cards** (no template fields): swap `frontText` ↔ `backText`
2. **Template-based cards**: remap `templateFields` — each field's `side` is flipped (`'front'` → `'back'`, `'back'` → `'front'`)

This swap happens in the PracticeScreen before rendering — FlipCard, database, card model, and SM-2 scheduling are unchanged.

### Default state

When no persisted value exists (first launch), reverse mode defaults to `false` (normal direction).

## Files Changed

| File | Change |
|------|--------|
| `src/navigation/AppNavigator.tsx` | Add `reverse?: boolean` to `Practice` route params |
| `src/utils/settings.ts` | **New** — `getReverseMode()`, `setReverseMode()` |
| `src/screens/HomeScreen.tsx` | Add reverse toggle near practice buttons, persist on change |
| `src/screens/DeckDetailScreen.tsx` | Add reverse toggle near practice buttons, persist on change |
| `src/screens/PracticeScreen.tsx` | Apply swap (frontText ↔ backText, template field side remapping) when `reverse` is true |

## Testing Strategy

- **Unit tests** for `src/utils/settings.ts`: read/write round-trip, default when file missing, error handling
- **No database changes** — existing database tests unaffected
- **PracticeScreen swap logic** can be tested at the unit level (pure function: given a card + reverse flag, returns swapped data)

## Out of Scope

- Per-deck reverse preference (global only for now)
- Toggle visible mid-session (only at initiation)
- UI indication on the card during practice that reverse is active (can be added later as enhancement)
