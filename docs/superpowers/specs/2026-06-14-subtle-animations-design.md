# Subtle & Polished Animations — Design Spec

**Date:** 2026-06-14
**Status:** Approved
**Approach:** A — Subtle & Polished (iOS/Material-inspired micro-interactions)

## Overview

Add subtle, polished animations across 10 touchpoints in the flashcard app. All animations use the already-installed `react-native-reanimated` 4.3.1 (no new dependencies). Philosophy: gentle springs, micro-interactions, no attention-grabbing bounces.

## Touchpoints

### 1. List Entrance (staggered fade+slide)

**Files:** `DeckListScreen`, `DeckDetailScreen`, `TemplateListScreen`
**Current:** Items appear instantly
**Proposed:** Each list item enters with an 8px slide-up + fade, staggered 50ms per item. Uses Reanimated `FadeInUp` entering animation with `entering.delay(50 * index)`.

```
Item 0: delay 0ms
Item 1: delay 50ms
Item 2: delay 100ms
...
```

- Animation: `FadeInUp.duration(250).easing(Easing.out(Easing.cubic))`
- Do NOT animate when items update (due counts changing) — only on initial mount and when list contents change (add/remove)
- Skeleton loading already handles the loading state; animation fires when data replaces skeleton

### 2. Button Press Feedback

**Files:** `src/components/Button.tsx`
**Current:** `activeOpacity: 0.7`
**Proposed:** Scale to 0.97 on press-in, spring back to 1 on press-out. Haptic light on press.

- Wrap pressable area in `Animated.View` with `useAnimatedStyle`
- Shared value `scale`: 1 → withSpring(0.97, { damping: 15, stiffness: 300 }) on pressIn
- Return: withSpring(1, { damping: 15, stiffness: 300 }) on pressOut
- Haptics: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on pressIn
- Applies to all variants (primary, secondary, ghost, danger)

### 3. Progress Bar Tweening

**File:** `src/screens/PracticeScreen.tsx`
**Current:** Progress bar width jumps to new percentage instantly
**Proposed:** `withTiming` over 400ms with ease-out curve on width change

- Shared value `progressWidth` tracks current width ratio
- Use `useAnimatedReaction` or a manual `useEffect` → `progressWidth.value = withTiming(newRatio, { duration: 400, easing: Easing.out(Easing.cubic) })`
- Drives `width` via `useAnimatedStyle`

### 4. Modal Slide-Up

**File:** `src/components/Modal.tsx`
**Current:** Renders `null` vs full content instantly (no transition)
**Proposed:** 
- Overlay fades in (opacity 0→1, 200ms)
- Sheet slides up from bottom (translateY 100%→0, 300ms with ease-out)
- Exit reverses (sheet slides down 250ms, overlay fades out)
- Use shared values: `overlayOpacity`, `sheetTranslateY`
- Keep the modal' `visible` state synchronized with animation via `runOnJS`

### 5. Stat Counter Scale Pop-in

**Files:** `src/screens/HomeScreen.tsx` (and SettingsScreen if applicable)
**Current:** Numbers snap to new values
**Proposed:** Scale pop-in when value changes (0.85→1.05→1, 300ms total)

- Shared value per counter, updated via `useAnimatedReaction` or `useEffect` watching the stat value
- On change: `counterScale.value = withSequence(withTiming(0.85, { duration: 0 }), withSpring(1.05, { damping: 8, stiffness: 200 }), withSpring(1, { damping: 12, stiffness: 200 }))`
- Attached to `transform.scale` via `useAnimatedStyle`

### 6. Due Ring Stroke Animation

**File:** `src/screens/HomeScreen.tsx`
**Current:** SVG Circle `strokeDashoffset` updates instantly
**Proposed:** `withTiming` over 600ms ease-out on the dash offset value

- Shared value `animatedOffset` drives the offset
- Use `useAnimatedProps` on the SVG Circle component (Reanimated supports animating SVG props)
- Spring config not needed; simple timing curve

### 7. FAB Button Feedback

**Files:** `src/screens/DeckListScreen.tsx`, `src/screens/TemplateListScreen.tsx`
**Current:** Static, no animation
**Proposed:**
- Scale-in from 0 to 1 on mount (200ms spring)
- Scale 1→0.95 on press (match Button pattern)
- Haptic light on press

Uses same pattern as general buttons, with additional mount animation via `FadeInScale`.

### 8. Card Entrance (PracticeScreen)

**File:** `src/screens/PracticeScreen.tsx`
**Current:** New card appears instantly when advancing
**Proposed:** Fade + 10px slide-up, 250ms duration

- Wrap the card content in an `Animated.View` keyed on `currentIndex`
- When key changes (new card), trigger `FadeInUp.duration(250)`
- The FlipCard itself handles the flip animation internally; this entrance only fires when a new card is rendered

### 9. Rating Button Feedback

**File:** `src/screens/PracticeScreen.tsx`
**Current:** Static color-only buttons
**Proposed:** Scale 0.95x on press-in, spring back on press-out, haptic medium

- Same pattern as Button, but slightly deeper scale (0.95 vs 0.97) to emphasize the action
- Haptic: medium impact or notification feedback depending on rating
  - Again: heavy haptic
  - Hard: medium haptic
  - Good: light haptic
  - Easy: notification success

### 10. EmptyState Fade-in

**File:** `src/components/EmptyState.tsx`
**Current:** Appears instantly
**Proposed:** Simple fade-in over 300ms

- Wrapped in `Animated.View` with `FadeIn.duration(300)`
- No layout animation needed; just opacity

## Technical Pattern

All touchpoints follow one of three Reanimated patterns:

### Pattern A: Entering animation (lists, card entrance, empty state, FAB mount)
```tsx
<Animated.View entering={FadeInUp.duration(250).delay(index * 50)}>
```
Uses Reanimated's layout animation system. Framework handles cleanup automatically.

### Pattern B: Shared value + animated style (buttons, counters, ring, progress, modals, rating buttons)
```tsx
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// on pressIn:  scale.value = withSpring(0.97, springConfig);
// on pressOut: scale.value = withSpring(1, springConfig);
```

### Pattern C: useAnimatedProps (SVG circle only)
```tsx
const dashOffset = useSharedValue(initialValue);
const animatedProps = useAnimatedProps(() => ({
  strokeDashoffset: dashOffset.value,
}));
```

## Spring Configuration

Single shared spring config for consistency across all micro-interactions:
```ts
const springConfig = { damping: 15, stiffness: 300, mass: 0.5 };
```
(Matches the existing FlipCard `damping: 15, stiffness: 150, mass: 0.8` family — slightly stiffer for buttons)

## Files Affected

| File | Touchpoint(s) | Change size |
|------|--------------|-------------|
| `src/components/Button.tsx` | #2 Button press | Medium (wrap in Animated.View, add shared values) |
| `src/components/Modal.tsx` | #4 Modal slide-up | Medium (add animation state logic) |
| `src/components/EmptyState.tsx` | #10 Fade-in | Small (wrap in Animated.View) |
| `src/screens/HomeScreen.tsx` | #5 Counters, #6 Due ring | Medium (add shared values for counters + SVG) |
| `src/screens/PracticeScreen.tsx` | #3 Progress bar, #8 Card entrance, #9 Rating buttons | Medium (3 separate animated elements) |
| `src/screens/DeckListScreen.tsx` | #1 List entrance, #7 FAB | Small (wrap items + FAB) |
| `src/screens/DeckDetailScreen.tsx` | #1 List entrance | Small (wrap FlatList items) |
| `src/screens/TemplateListScreen.tsx` | #1 List entrance, #7 FAB | Small (wrap items + FAB) |

## Non-Goals

- No screen transition animations (native-stack defaults are fine)
- No navigation gesture changes
- No animation on `DeckDetailScreen` "Choose Practice Mode" modal (uses native RN Modal with `animationType="fade"` — acceptable)
- No animation on import/export sheet (DocumentPicker is system-native)
- No LayoutAnimation usage (stick to Reanimated only)
- No new npm dependencies

## Verification

After each touchpoint is implemented:
1. `npx tsc --noEmit` passes
2. `npx jest --passWithNoTests` passes
3. Manual test on iOS simulator and web: animation plays smoothly, no jank
4. Verify animations respect `Reduce Motion` accessibility setting via `AccessibilityInfo.isReduceMotionEnabled()` — if set, skip animations and snap to final state
