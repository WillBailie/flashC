import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, borderRadius, withAlpha } from '../constants/theme';
import { TemplateField } from '../models/types';

interface FlipCardProps {
  frontText: string;
  backText: string;
  isFlipped: boolean;
  onFlip: () => void;
  templateFields?: TemplateField[];
  fieldValues?: Record<string, string>;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  exampleSentence?: string;
  exampleTranslation?: string;
  examplePinyin?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const SWIPE_THRESHOLD = 80;

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

export function FlipCard({
  frontText,
  backText,
  isFlipped,
  onFlip,
  templateFields,
  fieldValues,
  onSwipeLeft,
  onSwipeRight,
  exampleSentence,
  exampleTranslation,
  examplePinyin,
}: FlipCardProps) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const isFlippedSV = useSharedValue(isFlipped);

  useEffect(() => {
    rotation.value = withSpring(isFlipped ? 180 : 0, springConfig);
    isFlippedSV.value = isFlipped;
    if (!isFlipped) {
      translateX.value = withSpring(0, springConfig);
      cardOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isFlipped]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(rotation.value, [0, 180], [0, 180])}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(rotation.value, [0, 180], [180, 360])}deg` }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
  }));

  const goNext = (direction: 'left' | 'right') => {
    'worklet';
    translateX.value = withTiming(direction === 'left' ? -CARD_WIDTH : CARD_WIDTH, { duration: 250 });
    cardOpacity.value = withTiming(0, { duration: 200 });
    if (direction === 'left' && onSwipeLeft) {
      runOnJS(onSwipeLeft)();
    } else if (direction === 'right' && onSwipeRight) {
      runOnJS(onSwipeRight)();
    }
  };

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(onFlip)();
    });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      translateX.value = 0;
      cardOpacity.value = 1;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX * 0.6;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right
        if (isFlippedSV.value) {
          // Back → front: flip back
          translateX.value = withSpring(0, springConfig);
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(onFlip)();
        } else {
          // Front → back: flip to reveal
          translateX.value = withSpring(0, springConfig);
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(onFlip)();
        }
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left
        if (onSwipeLeft && isFlippedSV.value) {
          goNext('left');
        } else if (!isFlippedSV.value) {
          translateX.value = withSpring(0, springConfig);
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(onFlip)();
        } else {
          translateX.value = withSpring(0, springConfig);
        }
      } else {
        translateX.value = withSpring(0, springConfig);
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          width: CARD_WIDTH,
          height: 340,
          marginHorizontal: 24,
        },
        cardContainer: {
          width: '100%',
          height: '100%',
        },
        face: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          borderRadius: borderRadius.xl,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          overflow: 'hidden',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 8,
        },
        frontFace: {
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        backFace: {
          backgroundColor: colors.secondary,
        },
        faceText: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          lineHeight: typography.fontSize.xl * 1.25,
          flexShrink: 1,
        },
        backText: {
          color: colors.surface,
        },
        fieldValue: {
          fontSize: typography.fontSize.xl,
          color: colors.text,
          fontWeight: typography.fontWeight.medium,
          textAlign: 'center',
        },
        fieldRow: {
          width: '100%',
          marginBottom: 10,
        },
        fieldLabel: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 2,
          textAlign: 'center',
        },
        backFieldLabel: {
          color: colors.surface,
          opacity: 0.7,
        },
        backFieldValue: {
          color: colors.surface,
        },
        exampleLabel: {
          fontSize: 10,
          fontWeight: typography.fontWeight.bold,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 16,
          marginBottom: 4,
        },
        exampleText: {
          fontSize: typography.fontSize.xl,
          color: colors.text,
          fontStyle: 'italic',
          textAlign: 'center',
          lineHeight: typography.fontSize.xl * 1.25,
          flexShrink: 1,
        },
        backExampleLabel: {
          color: withAlpha(colors.surface, 0.7),
        },
        backExampleText: {
          color: colors.surface,
        },
      }),
    [colors]
  );

  const frontFields = templateFields?.filter((f) => f.side === 'front') ?? [];
  const backFields = templateFields?.filter((f) => f.side === 'back') ?? [];

  const renderFieldValue = (
    field: TemplateField,
    values?: Record<string, string>,
    fallback?: string,
    isBack?: boolean
  ) => {
    const value = values?.[field.name] ?? fallback ?? '';
    return (
      <View key={field.name} style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, isBack && styles.backFieldLabel]}>
          {field.name}:
        </Text>
        <Text
          style={[styles.fieldValue, isBack && styles.backFieldValue]}
          numberOfLines={3}
        >
          {value || '—'}
        </Text>
      </View>
    );
  };

  const renderFront = () => {
    if (frontFields.length > 0) {
      return (
        <>
          {frontFields.map((f) => renderFieldValue(f, fieldValues, f.name, false))}
          {exampleSentence ? <ExampleSection sentence={exampleSentence} isBack={false} /> : null}
        </>
      );
    }
    return (
      <>
        <Text style={styles.faceText} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.6}>
          {frontText}
        </Text>
        {exampleSentence ? <ExampleSection sentence={exampleSentence} isBack={false} /> : null}
      </>
    );
  };

  const renderBack = () => {
    if (backFields.length > 0) {
      return (
        <>
          {backFields.map((f) => renderFieldValue(f, fieldValues, f.name, true))}
        {exampleTranslation ? <ExampleSection sentence={exampleTranslation} isBack={true} /> : null}
        {examplePinyin ? (
          <Text
            style={[styles.exampleText, styles.backExampleText, { fontSize: typography.fontSize.md, marginTop: 4 }]}
            numberOfLines={3}
          >
            {examplePinyin}
          </Text>
        ) : null}
        </>
      );
    }
    return (
      <>
        <Text
          style={[styles.faceText, styles.backText]}
          numberOfLines={5}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {backText}
        </Text>
        {exampleTranslation ? <ExampleSection sentence={exampleTranslation} isBack={true} /> : null}
        {examplePinyin ? (
          <Text
            style={[styles.exampleText, styles.backExampleText, { fontSize: typography.fontSize.md, marginTop: 4 }]}
            numberOfLines={3}
          >
            {examplePinyin}
          </Text>
        ) : null}
      </>
    );
  };

  function ExampleSection({ sentence, isBack }: { sentence: string; isBack: boolean }) {
    return (
      <>
        <Text style={[styles.exampleLabel, isBack && styles.backExampleLabel]}>
          Example
        </Text>
        <Text
          style={[styles.exampleText, isBack && styles.backExampleText]}
          numberOfLines={5}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {sentence}
        </Text>
      </>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.wrapper, containerStyle]}>
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.face, styles.frontFace, frontStyle]}>
            {renderFront()}
          </Animated.View>
          <Animated.View style={[styles.face, styles.backFace, backStyle]}>
            {renderBack()}
          </Animated.View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
