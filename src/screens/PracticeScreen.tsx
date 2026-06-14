import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { FlipCard } from '../components/FlipCard';
import { Confetti } from '../components/Confetti';
import {
  getCardsDueForReview,
  getRandomCardsForReview,
  updateReview,
  getTemplateFields,
  CardWithReview,
} from '../storage/database';
import { calculateSM2 } from '../utils/spacedRepetition';
import { Quality, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Practice'>;

export default function PracticeScreen({ navigation, route }: Props) {
  const { deckId, deckName, mode = 'daily', cardCount, reverse } = route.params;
  const [cards, setCards] = useState<CardWithReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0 });
  const [currentFields, setCurrentFields] = useState<TemplateField[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, string>>({});
  const { colors } = useTheme();

  const completeScale = useSharedValue(0);
  const completeOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const [showConfetti, setShowConfetti] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const title = useMemo(() => {
    const label = mode === 'freeflow' ? 'Freeflow' : 'Daily Review';
    const deckLabel = deckName ? `: ${deckName}` : ': All Decks';
    const reverseLabel = reverse ? ' (Reverse)' : '';
    return `${label}${deckLabel}${reverseLabel}`;
  }, [deckName, mode, reverse]);

  const displayFields = useMemo(() => {
    if (!reverse) return currentFields;
    return currentFields
      .map((f) => {
        const isPinyin = f.name.toLowerCase() === 'pinyin';
        const swappedSide = f.side === 'front' ? 'back' : 'front';
        return {
          ...f,
          _originalSide: f.side,
          side: isPinyin ? ('back' as TemplateField['side']) : (swappedSide as TemplateField['side']),
        };
      })
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        if (a._originalSide === 'front' && (b as typeof a)._originalSide !== 'front') return -1;
        if ((a as typeof a)._originalSide !== 'front' && (b as typeof a)._originalSide === 'front') return 1;
        return 0;
      }) as TemplateField[];
  }, [reverse, currentFields]);

  const loadCards = useCallback(async () => {
    let practiceCards: CardWithReview[];
    if (mode === 'freeflow') {
      practiceCards = await getRandomCardsForReview(deckId, cardCount ?? 10);
    } else {
      practiceCards = await getCardsDueForReview(deckId);
    }
    setCards(practiceCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setStats({ reviewed: 0 });
    setCurrentFields([]);
    setCurrentValues({});
  }, [deckId, mode, cardCount]);

  const loadCurrentCardTemplate = useCallback(async (card: CardWithReview) => {
    if (card.template_id) {
      const fields = await getTemplateFields(card.template_id);
      setCurrentFields(fields);
      if (card.field_values) {
        try { setCurrentValues(JSON.parse(card.field_values)); } catch { setCurrentValues({}); }
      } else {
        setCurrentValues({});
      }
    } else {
      setCurrentFields([]);
      setCurrentValues({});
    }
  }, []);

  useEffect(() => {
    if (sessionComplete) {
      setShowConfetti(true);
      completeScale.value = withSpring(1, { damping: 8, stiffness: 150 });
      completeOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
      statsOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      buttonsOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [sessionComplete]);

  useEffect(() => { loadCards(); }, [loadCards]);
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      loadCurrentCardTemplate(cards[currentIndex]);
    }
  }, [cards, currentIndex, loadCurrentCardTemplate]);

  const handleFlip = () => {
    if (mode === 'freeflow' && isFlipped) {
      setStats((prev) => ({ reviewed: prev.reviewed + 1 }));
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
      return;
    }
    setIsFlipped((prev) => !prev);
  };

  const handleSwipeLeft = () => {
    if (!isFlipped) return;
    if (mode === 'freeflow') {
      setStats((prev) => ({ reviewed: prev.reviewed + 1 }));
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
    } else {
      handleRate(0);
    }
  };

  const handleSwipeRight = () => {
    if (!isFlipped) return;
    setIsFlipped(false);
  };

  const handleRate = async (quality: Quality) => {
    const card = cards[currentIndex];
    if (!card) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = calculateSM2(card.ease_factor, card.interval, card.repetitions, quality);
    await updateReview(card.id, result.easeFactor, result.interval, result.repetitions, result.nextReviewDate);

    const newStats = { reviewed: stats.reviewed + 1 };
    setStats(newStats);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setSessionComplete(true);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    progressBar: {
      flex: 1,
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    progressText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.textSecondary,
      minWidth: 32,
      textAlign: 'right',
    },
    cardWrapper: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ratingContainer: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      paddingTop: spacing.md,
    },
    ratingLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    ratingButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    rateButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    rateButtonText: {
      color: colors.surface,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    rateInterval: {
      color: withAlpha(colors.surface, 0.7),
      fontSize: typography.fontSize.xs,
      marginTop: 2,
    },
    completeContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    completeIconWrap: {
      width: 100,
      height: 100,
      borderRadius: borderRadius.full,
      backgroundColor: withAlpha(colors.warning, 0.12),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    completeTitle: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    completeStat: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },
    completeSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    completeButtons: {
      marginTop: spacing.xl,
      width: '100%',
      maxWidth: 280,
    },
    floatingHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.sm,
    },
    floatingBackButton: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingSpacer: {
      width: 44,
    },
    floatingPill: {
      flex: 1,
      alignItems: 'center',
    },
    floatingPillInner: {
      backgroundColor: withAlpha(colors.primary, 0.12),
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: borderRadius.full,
    },
    floatingPillText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary,
    },
  }), [colors]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeScale.value }],
    opacity: completeOpacity.value,
  }));

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: withTiming(statsOpacity.value > 0 ? 0 : 20) }],
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: withTiming(buttonsOpacity.value > 0 ? 0 : 20) }],
  }));

  const progress = cards.length > 0
    ? `${((currentIndex + 1) / cards.length) * 100}%`
    : '0%';

  if (sessionComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.floatingHeader}>
          <TouchableOpacity
            style={styles.floatingBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.floatingPill}>
            <View style={styles.floatingPillInner}>
              <Text style={styles.floatingPillText} numberOfLines={1}>{title}</Text>
            </View>
          </View>
          <View style={styles.floatingSpacer} />
        </View>
        <Confetti trigger={showConfetti} />
        <View style={styles.completeContainer}>
          <Animated.View style={[styles.completeIconWrap, iconAnimatedStyle]}>
            <Ionicons name="trophy" size={56} color={colors.warning} />
          </Animated.View>
          <Animated.Text style={[styles.completeTitle, iconAnimatedStyle]}>
            Session Complete
          </Animated.Text>
          <Animated.View style={[statsAnimatedStyle, { alignItems: 'center' }]}>
            <Text style={styles.completeStat}>
              {stats.reviewed} {stats.reviewed === 1 ? 'card' : 'cards'} reviewed
            </Text>
            {mode === 'daily' && (
              <Text style={styles.completeSubtitle}>
                Repetitions saved for next review
              </Text>
            )}
          </Animated.View>
          <Animated.View style={[styles.completeButtons, buttonsAnimatedStyle]}>
            <Button
              title="Done"
              onPress={() => {
                navigation.goBack();
              }}
            />
            <Button
              title="Review Again"
              variant="secondary"
              onPress={() => {
                setShowConfetti(false);
                loadCards();
              }}
              style={{ marginTop: spacing.sm }}
            />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.floatingHeader}>
          <TouchableOpacity
            style={styles.floatingBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.floatingPill}>
            <View style={styles.floatingPillInner}>
              <Text style={styles.floatingPillText} numberOfLines={1}>{title}</Text>
            </View>
          </View>
          <View style={styles.floatingSpacer} />
        </View>
        <EmptyState
          title="No Cards"
          subtitle="Add some cards to this deck first, then come back to practice."
        />
      </View>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.floatingPill}>
          <View style={styles.floatingPillInner}>
            <Text style={styles.floatingPillText} numberOfLines={1}>{title}</Text>
          </View>
        </View>
        <View style={styles.floatingSpacer} />
      </View>
      <View style={styles.cardWrapper}>
        <FlipCard
          frontText={reverse ? currentCard.back_text : currentCard.front_text}
          backText={reverse ? currentCard.front_text : currentCard.back_text}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          templateFields={displayFields.length > 0 ? displayFields : undefined}
          fieldValues={Object.keys(currentValues).length > 0 ? currentValues : undefined}
        />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / Math.max(cards.length, 1)) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1}/{cards.length}
        </Text>
      </View>

      {isFlipped && mode === 'daily' && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>How well did you know this?</Text>
          <View style={styles.ratingButtons}>
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: colors.again }]}
              onPress={() => handleRate(0)}
              accessibilityRole="button"
              accessibilityLabel="Rate: Again"
            >
              <Text style={styles.rateButtonText}>Again</Text>
              <Text style={styles.rateInterval}>&lt;1m</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: colors.hard }]}
              onPress={() => handleRate(2)}
              accessibilityRole="button"
              accessibilityLabel="Rate: Hard"
            >
              <Text style={styles.rateButtonText}>Hard</Text>
              <Text style={styles.rateInterval}>~1d</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: colors.good }]}
              onPress={() => handleRate(3)}
              accessibilityRole="button"
              accessibilityLabel="Rate: Good"
            >
              <Text style={styles.rateButtonText}>Good</Text>
              <Text style={styles.rateInterval}>~3d</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: colors.easy }]}
              onPress={() => handleRate(5)}
              accessibilityRole="button"
              accessibilityLabel="Rate: Easy"
            >
              <Text style={styles.rateButtonText}>Easy</Text>
              <Text style={styles.rateInterval}>~7d</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
