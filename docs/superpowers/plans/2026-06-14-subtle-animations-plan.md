# Subtle Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle iOS/Material-inspired animations to 10 touchpoints across the flashcard app using react-native-reanimated 4.

**Architecture:** Three Reanimated patterns — entering animations (FadeIn/FadeInUp) for lists, modals, and empty states; shared values with animated styles for buttons, counters, and progress bars; animated props for the SVG due ring. All share one spring config. Reduce Motion accessibility respected throughout.

**Tech Stack:** react-native-reanimated 4.3.1, react-native-gesture-handler, expo-haptics

---

### Task 1: Animation Utility — Spring Config + Reduce Motion Hook

**Files:**
- Create: `src/utils/animation.ts`
- Test: `src/utils/__tests__/animation.test.ts`

- [ ] **Step 1: Create animation utility**

```ts
// src/utils/animation.ts
import { useCallback, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';

export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
} as const;

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => sub.remove();
  }, []);

  return reduced;
}

import React from 'react';
```

Note: `AccessibilityInfo.addEventListener` returns `{ remove }` in React Native. Need to import `React` for hooks.

Actually, let me correct this — `AccessibilityInfo.addEventListener` has type `EmitterSubscription` which has `.remove()`:

```ts
// src/utils/animation.ts
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
} as const;

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  return reduced;
}
```

- [ ] **Step 2: Write tests for the animation utility**

```ts
// src/utils/__tests__/animation.test.ts
import { SPRING_CONFIG } from '../animation';

describe('animation utility', () => {
  it('exports a valid spring config', () => {
    expect(SPRING_CONFIG.damping).toBeGreaterThan(0);
    expect(SPRING_CONFIG.stiffness).toBeGreaterThan(0);
    expect(SPRING_CONFIG.mass).toBeGreaterThan(0);
  });

  it('spring config values match the spec', () => {
    expect(SPRING_CONFIG).toEqual({ damping: 15, stiffness: 300, mass: 0.5 });
  });
});
```

> Skip testing the `useReduceMotion` hook — requires native module mocking which is unreliable in Jest.

- [ ] **Step 3: Run tests to verify**

Run: `npx jest src/utils/__tests__/animation.test.ts`
Expected: 2 tests PASS

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/utils/animation.ts src/utils/__tests__/animation.test.ts
git commit -m "feat: add animation utility with spring config and Reduce Motion hook"
```

---

### Task 2: Button Press Feedback Animation

**Files:**
- Modify: `src/components/Button.tsx` (full file)

- [ ] **Step 1: Rewrite Button with press animation**

Replace the entire Button component to add spring scale on press-in/out and haptic feedback. The key changes:
- Import `Animated, useSharedValue, useAnimatedStyle, withSpring` from `react-native-reanimated`
- Import `* as Haptics` from `expo-haptics`
- Import `SPRING_CONFIG, useReduceMotion` from `../utils/animation`
- Change `TouchableOpacity` to `Pressable` to get `onPressIn`/`onPressOut` without opacity clash
- Wrap the Pressable in `Animated.View` driven by a `scale` shared value
- Add haptic light on press-in

```tsx
// src/components/Button.tsx
import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, spacing, borderRadius } from '../constants/theme';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      scale.value = withSpring(0.97, SPRING_CONFIG);
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  };

  const styles = useMemo(
    () => {
      const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
        sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, fontSize: typography.fontSize.xs },
        md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg, fontSize: typography.fontSize.sm },
        lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.fontSize.md },
      };
      const s = sizeStyles[size];

      const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
        primary: { bg: colors.primary, text: colors.surface },
        secondary: { bg: 'transparent', text: colors.primary, border: colors.primary },
        ghost: { bg: 'transparent', text: colors.textSecondary },
        danger: { bg: colors.danger, text: colors.surface },
      };
      const v = variantStyles[variant];

      return StyleSheet.create({
        button: {
          backgroundColor: v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : undefined,
        },
        text: {
          color: v.text,
          fontSize: s.fontSize,
          fontWeight: typography.fontWeight.bold,
        },
      });
    },
    [colors, variant, size, disabled, fullWidth]
  );

  return (
    <Animated.View style={[animatedStyle, fullWidth && { alignSelf: 'stretch' }]}>
      <Pressable
        style={[styles.button, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        {loading && <ActivityIndicator size="small" color={styles.text.color} />}
        <Text style={styles.text}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/Button.tsx
git commit -m "feat: add spring scale animation and haptic feedback to Button"
```

---

### Task 3: Modal Slide-Up Animation

**Files:**
- Modify: `src/components/Modal.tsx` (full file)

- [ ] **Step 1: Rewrite Modal with slide-up animation**

The modal needs to animate in/out rather than instant render/null. Use shared values for overlay opacity and sheet translateY. When `visible` changes to `false`, animate out first, then unmount.

```tsx
// src/components/Modal.tsx
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme, spacing, borderRadius, typography } from '../constants/theme';
import { useReduceMotion } from '../utils/animation';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 400,
  style,
}: ModalProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  const animatedOverlay = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const animateIn = useCallback(() => {
    setShouldRender(true);
    if (reduceMotion) return;
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    sheetTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion]);

  const animateOut = useCallback(() => {
    if (reduceMotion) {
      setShouldRender(false);
      return;
    }
    overlayOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    sheetTranslateY.value = withTiming(300, { duration: 250, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(setShouldRender)(false);
      }
    });
  }, [reduceMotion]);

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      animateOut();
    }
  }, [visible, animateIn, animateOut]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        content: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          width: '100%',
          maxWidth,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 12,
        },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
      }),
    [colors, maxWidth]
  );

  if (!shouldRender && !visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedOverlay]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <Animated.View style={[styles.content, style, animatedSheet]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/Modal.tsx
git commit -m "feat: add slide-up/fade animation to Modal"
```

---

### Task 4: EmptyState Fade-In

**Files:**
- Modify: `src/components/EmptyState.tsx`

- [ ] **Step 1: Add FadeIn entering animation to EmptyState**

```tsx
// Change the import at top to include Animated from reanimated
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, withAlpha } from '../constants/theme';

// Keep the existing interface and component, just change:
//   <View style={styles.container}>
// to:
//   <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
```

The exact edit: replace the return statement's outer `<View style={styles.container}>` with an `Animated.View` that has the `entering` prop.

```tsx
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/EmptyState.tsx
git commit -m "feat: add FadeIn animation to EmptyState"
```

---

### Task 5: HomeScreen — Counter Scale + Due Ring Animation

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Changes needed:**
1. Import Reanimated shared values/animations and `useReduceMotion`
2. Add shared values for each stat counter (dueCards, reviewsToday, masteredCards, streak)
3. Use `useAnimatedReaction` or `useEffect` to trigger scale pop-in when stats change
4. Convert the SVG Circle dashoffset to use `useAnimatedProps` for smooth tweening
5. Wrap counter values and ring circle in Animated components

- [ ] **Step 1: Add imports to HomeScreen**

```tsx
// Add these to the existing imports in src/screens/HomeScreen.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';
import { Circle as AnimatedCircle } from 'react-native-svg'; // need import for animated SVG

// Actually, for animated SVG, use Animated.createAnimatedComponent(Circle)
```

Wait, `react-native-svg` doesn't have `AnimatedCircle` built in for Reanimated. The correct pattern is:

```tsx
import { Circle } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
```

And for `G`:
```tsx
const AnimatedG = Animated.createAnimatedComponent(G);
```

For animated props on SVG with Reanimated, we use `useAnimatedProps()` which works with `createAnimatedComponent`.

- [ ] **Step 2: Add counter animation logic**

Add these shared values inside the component (after the existing state declarations):

```tsx
const reduceMotion = useReduceMotion();

// Counter animation shared values
const dueScale = useSharedValue(1);
const streakScale = useSharedValue(1);
const masteredScale = useSharedValue(1);

const ringOffset = useSharedValue(dashOffset);

// Animated styles for counters
const dueAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: dueScale.value }],
}));
const streakAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: streakScale.value }],
}));
const masteredAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: masteredScale.value }],
}));

// Animated props for SVG circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ringAnimatedProps = useAnimatedProps(() => ({
  strokeDashoffset: ringOffset.value,
}));

// Counter pop animation helper
const animateCounter = (sharedValue: Animated.SharedValue<number>) => {
  if (reduceMotion) return;
  sharedValue.value = withSequence(
    withTiming(0.85, { duration: 0 }),
    withSpring(1.05, SPRING_CONFIG),
    withSpring(1, SPRING_CONFIG),
  );
};
```

- [ ] **Step 3: Trigger animations when stats change**

Add `useEffect` hooks that watch stats values:

```tsx
// Trigger counter animations when stats change
const prevDue = React.useRef(stats.dueCards);
const prevStreak = React.useRef(streak);
const prevMastered = React.useRef(stats.masteredCards);

React.useEffect(() => {
  if (prevDue.current !== stats.dueCards && prevDue.current !== 0) {
    animateCounter(dueScale);
  }
  prevDue.current = stats.dueCards;
}, [stats.dueCards]);

React.useEffect(() => {
  if (prevStreak.current !== streak && prevStreak.current !== 0) {
    animateCounter(streakScale);
  }
  prevStreak.current = streak;
}, [streak]);

React.useEffect(() => {
  if (prevMastered.current !== stats.masteredCards && prevMastered.current !== 0) {
    animateCounter(masteredScale);
  }
  prevMastered.current = stats.masteredCards;
}, [stats.masteredCards]);

// Animate ring on dashOffset change
React.useEffect(() => {
  if (reduceMotion) {
    ringOffset.value = dashOffset;
  } else {
    ringOffset.value = withTiming(dashOffset, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }
}, [dashOffset]);
```

- [ ] **Step 4: Replace stat counter values with Animated.Text**

In the hero body section, replace the static counter displays:

For the ring center:
```tsx
// Replace:
//   <Text style={styles.ringPct} adjustsFontSizeToFit numberOfLines={1}>{stats.dueCards}</Text>
// With:
<Animated.Text style={[styles.ringPct, dueAnimatedStyle]} adjustsFontSizeToFit numberOfLines={1}>{stats.dueCards}</Animated.Text>
```

For the stat pills (find the `reviewsToday` and other stat pill values):

```tsx
// Replace the static counter values with Animated.Text + animatedStyle
<Animated.Text style={[styles.statValue, dueAnimatedStyle]}>{stats.dueCards}</Animated.Text>
<Animated.Text style={[styles.statValue, streakAnimatedStyle]}>{streak}</Animated.Text>
<Animated.Text style={[styles.statValue, masteredAnimatedStyle]}>{stats.masteredCards}</Animated.Text>
```

- [ ] **Step 5: Replace the SVG circle with Animated Circle**

Replace:
```tsx
<Circle
  cx={RING_SIZE / 2}
  cy={RING_SIZE / 2}
  r={RING_RADIUS}
  fill="none"
  stroke={colors.surface}
  strokeWidth={RING_STROKE}
  strokeDasharray={circumference}
  strokeDashoffset={dashOffset}
  strokeLinecap="round"
/>
```

With:
```tsx
<AnimatedCircle
  cx={RING_SIZE / 2}
  cy={RING_SIZE / 2}
  r={RING_RADIUS}
  fill="none"
  stroke={colors.surface}
  strokeWidth={RING_STROKE}
  strokeDasharray={circumference}
  strokeLinecap="round"
  animatedProps={ringAnimatedProps}
/>
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: add counter scale pop-in and due ring animation to HomeScreen"
```

---

### Task 6: PracticeScreen — Progress Bar Tweening + Card Entrance

**Files:**
- Modify: `src/screens/PracticeScreen.tsx`

**Changes:**
1. Convert progress bar width from computed string to shared value with timing
2. Add FadeInUp entering animation on card wrapper keyed to `currentIndex`

- [ ] **Step 1: Add progress bar animation**

Add imports (Reanimated already imported in PracticeScreen, just add what's missing):

```tsx
// Add these to existing Reanimated imports:
import { FadeInUp, Easing } from 'react-native-reanimated';
// Also import:
import { useReduceMotion } from '../utils/animation';
```

Add shared values (after the existing complete animation shared values, around line 50):

```tsx
const reduceMotion = useReduceMotion();
const progressWidth = useSharedValue(0);

const progressAnimatedStyle = useAnimatedStyle(() => ({
  width: `${progressWidth.value * 100}%`,
}));
```

Add effect to animate progress when `currentIndex` changes:

```tsx
React.useEffect(() => {
  const ratio = cards.length > 0 ? (currentIndex + 1) / cards.length : 0;
  if (reduceMotion) {
    progressWidth.value = ratio;
  } else {
    progressWidth.value = withTiming(ratio, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }
}, [currentIndex, cards.length]);
```

Replace the progress fill View:

```tsx
// Replace:
//  <View style={[styles.progressFill, { width: `${((currentIndex + 1) / Math.max(cards.length, 1)) * 100}%` }]} />
// With:
<Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
```

- [ ] **Step 2: Add card entrance animation**

Wrap the FlipCard in an Animated.View keyed on `currentIndex`:

```tsx
// Replace:
//   <View style={styles.cardWrapper}>
//     <FlipCard ... />
//   </View>
// With:
<Animated.View
  key={currentIndex}
  entering={FadeInUp.duration(250).easing(Easing.out(Easing.cubic))}
  style={styles.cardWrapper}
>
  <FlipCard
    ...
  />
</Animated.View>
```

Note: Remove the existing `View` wrapper to avoid double wrapping, or keep it and just wrap with Animated.View inside.

Actually, to avoid layout issues, wrap only the FlipCard:

```tsx
<View style={styles.cardWrapper}>
  <Animated.View
    key={currentIndex}
    entering={FadeInUp.duration(250).easing(Easing.out(Easing.cubic))}
    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
  >
    <FlipCard
      frontText={...}
      backText={...}
      ...
    />
  </Animated.View>
</View>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/PracticeScreen.tsx
git commit -m "feat: add progress bar tweening and card entrance animation"
```

---

### Task 7: PracticeScreen — Rating Button Feedback

**Files:**
- Modify: `src/screens/PracticeScreen.tsx`

**Changes:** Replace rating TouchableOpacity buttons with Pressable wrapped in Animated.View for scale feedback + haptic.

- [ ] **Step 1: Add rating button animation hook**

Add a custom hook or inline animation for each rating button. Since there are 4 buttons, create a reusable animated button pattern.

At the top of the component (near other shared values, ~line 50):

```tsx
const againScale = useSharedValue(1);
const hardScale = useSharedValue(1);
const goodScale = useSharedValue(1);
const easyScale = useSharedValue(1);

const againAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: againScale.value }] }));
const hardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: hardScale.value }] }));
const goodAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: goodScale.value }] }));
const easyAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: easyScale.value }] }));
```

- [ ] **Step 2: Replace rating button TouchableOpacity**

Replace each `<TouchableOpacity style={[styles.rateButton, ...]}>` block with:

```tsx
<Animated.View style={[againAnimatedStyle]}>
  <TouchableOpacity
    style={[styles.rateButton, { backgroundColor: colors.again }]}
    onPress={() => handleRate(0)}
    onPressIn={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (!reduceMotion) againScale.value = withSpring(0.95, SPRING_CONFIG);
    }}
    onPressOut={() => {
      if (!reduceMotion) againScale.value = withSpring(1, SPRING_CONFIG);
    }}
    accessibilityRole="button"
    accessibilityLabel="Rate: Again"
  >
    <Text style={styles.rateButtonText}>Again</Text>
    <Text style={styles.rateInterval}>&lt;1m</Text>
  </TouchableOpacity>
</Animated.View>
```

Repeat for Hard, Good, Easy with appropriate haptic styles:
- Again: `Heavy` (0)
- Hard: `Medium` (2)
- Good: `Light` (3)
- Easy: `Success` notification (5) — use `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/PracticeScreen.tsx
git commit -m "feat: add scale animation and haptic feedback to rating buttons"
```

---

### Task 8: List Entrance Animations (DeckList, DeckDetail, TemplateList)

**Files:**
- Modify: `src/screens/DeckListScreen.tsx`
- Modify: `src/screens/DeckDetailScreen.tsx`
- Modify: `src/screens/TemplateListScreen.tsx`

**Pattern:** Wrap each FlatList's `renderItem` return value in `<Animated.View entering={FadeInUp.duration(250).delay(index * 50)}>`.

- [ ] **Step 1: DeckListScreen — staggered list entrance**

Add import:
```tsx
import Animated, { FadeInUp, Easing } from 'react-native-reanimated';
```

In `renderDeck`, wrap the `Card` in Animated.View. The `FlatList` renderItem receives `{ item, index }` — need to destructure `index`.

```tsx
// Change:
// const renderDeck = ({ item }: { item: DeckWithStats }) => (
// To include index:
const renderDeck = ({ item, index }: { item: DeckWithStats; index: number }) => (
  <Animated.View
    entering={FadeInUp.duration(250).easing(Easing.out(Easing.cubic)).delay(index * 50)}
  >
    <Card
      variant="elevated"
      interactive
      onPress={() => navigation.navigate('DeckDetail', { deckId: item.id, deckName: item.name })}
      onLongPress={() => handleDeleteDeck(item)}
      delayLongPress={500}
    >
      {/* ... existing card content ... */}
    </Card>
  </Animated.View>
);
```

- [ ] **Step 2: DeckDetailScreen — staggered list entrance**

Add import:
```tsx
import Animated, { FadeInUp, Easing } from 'react-native-reanimated';
```

Find `renderCard` and add `index` param:

```tsx
const renderCard = ({ item, index }: { item: Card; index: number }) => (
  <Animated.View
    entering={FadeInUp.duration(250).easing(Easing.out(Easing.cubic)).delay(index * 50)}
  >
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => navigation.navigate('CardForm', { cardId: item.id, deckId })}
      onLongPress={() => handleDeleteCard(item)}
      delayLongPress={500}
    >
      {/* ... existing card content ... */}
    </TouchableOpacity>
  </Animated.View>
);
```

- [ ] **Step 3: TemplateListScreen — staggered list entrance**

Add import:
```tsx
import Animated, { FadeInUp, Easing } from 'react-native-reanimated';
```

In `renderTemplate`, add `index` and wrap:

```tsx
const renderTemplate = ({ item, index }: { item: Template; index: number }) => (
  <Animated.View
    entering={FadeInUp.duration(250).easing(Easing.out(Easing.cubic)).delay(index * 50)}
  >
    <TouchableOpacity
      style={styles.templateItem}
      onPress={() => navigation.navigate('TemplateEditor', { templateId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      {/* ... existing template content ... */}
    </TouchableOpacity>
  </Animated.View>
);
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/DeckListScreen.tsx src/screens/DeckDetailScreen.tsx src/screens/TemplateListScreen.tsx
git commit -m "feat: add staggered list entrance animations to DeckList, DeckDetail, TemplateList"
```

---

### Task 9: FAB Button Animations (DeckList, TemplateList)

**Files:**
- Modify: `src/screens/DeckListScreen.tsx`
- Modify: `src/screens/TemplateListScreen.tsx`

**Pattern:** Wrap the FAB Pressable/TouchableOpacity in `Animated.View` with scale-in on mount + press feedback.

- [ ] **Step 1: DeckListScreen FAB animation**

Add a shared value for scale-in:

```tsx
// After other hooks in the component, add:
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';

const reduceMotion = useReduceMotion();
const fabScale = useSharedValue(reduceMotion ? 1 : 0);
const fabPressScale = useSharedValue(1);

const fabAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: fabScale.value * fabPressScale.value }],
}));

React.useEffect(() => {
  if (!reduceMotion) {
    fabScale.value = withSpring(1, SPRING_CONFIG);
  }
}, []);
```

Replace the FAB:

```tsx
// Replace:
//   <Pressable style={styles.fab} onPress={...}>
//     <Ionicons name="add" size={28} color={colors.surface} />
//   </Pressable>
// With:
<Animated.View style={[styles.fab, fabAnimatedStyle]}>
  <Pressable
    onPress={() => setModalVisible(true)}
    onPressIn={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!reduceMotion) fabPressScale.value = withSpring(0.95, SPRING_CONFIG);
    }}
    onPressOut={() => {
      if (!reduceMotion) fabPressScale.value = withSpring(1, SPRING_CONFIG);
    }}
    style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
    accessibilityRole="button"
    accessibilityLabel="Create new deck"
  >
    <Ionicons name="add" size={28} color={colors.surface} />
  </Pressable>
</Animated.View>
```

Note: Remove the old `fab` style's positioning from the Pressable and put it on the Animated.View. The `styles.fab` already has `position: 'absolute'`, `bottom`, `right`, `width`, `height`, `backgroundColor`, `borderRadius`, etc. — all of those should go on the outer Animated.View.

- [ ] **Step 2: TemplateListScreen FAB animation**

Same pattern as DeckListScreen but the FAB navigates:

```tsx
// Add imports:
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInUp, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';

const reduceMotion = useReduceMotion();
const fabScale = useSharedValue(reduceMotion ? 1 : 0);
const fabPressScale = useSharedValue(1);

const fabAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: fabScale.value * fabPressScale.value }],
}));

React.useEffect(() => {
  if (!reduceMotion) {
    fabScale.value = withSpring(1, SPRING_CONFIG);
  }
}, []);
```

Replace the FAB:

```tsx
<Animated.View style={[styles.fab, fabAnimatedStyle]}>
  <TouchableOpacity
    onPress={() => navigation.navigate('TemplateEditor', {})}
    onPressIn={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!reduceMotion) fabPressScale.value = withSpring(0.95, SPRING_CONFIG);
    }}
    onPressOut={() => {
      if (!reduceMotion) fabPressScale.value = withSpring(1, SPRING_CONFIG);
    }}
    style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
  >
    <Text style={styles.fabText}>+</Text>
  </TouchableOpacity>
</Animated.View>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/DeckListScreen.tsx src/screens/TemplateListScreen.tsx
git commit -m "feat: add scale-in mount and press feedback to FAB buttons"
```

---

### Task 10: Final Integration Verification

**Files:** none (verification only)

- [ ] **Step 1: Verify TypeScript across entire project**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx jest --passWithNoTests`
Expected: All tests PASS

- [ ] **Step 3: Quick manual checklist**

Verify each touchpoint works:
1. [ ] Button press scale + haptic (any screen with Button)
2. [ ] Modal slides up from bottom (DeckList create deck modal)
3. [ ] EmptyState fades in (empty deck list)
4. [ ] HomeScreen counters pop on value change, ring animates
5. [ ] PracticeScreen progress bar tweens smoothly
6. [ ] PracticeScreen card fades + slides up on advance
7. [ ] PracticeScreen rating buttons scale + haptic
8. [ ] Lists stagger-entrance (DeckList, DeckDetail, TemplateList)
9. [ ] FABs scale in on mount + press feedback
10. [ ] Reduce Motion: toggle in iOS Settings > Accessibility > Motion, verify animations skip

- [ ] **Step 4: Commit (if fixes needed)**

```bash
git add -A
git commit -m "chore: final integration verification for animations"
```
