import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
  FadeInUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/TranslationContext';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { useReduceMotion, SPRING_CONFIG } from '../utils/animation';
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
  getDeckById,
  CardWithReview,
} from '../storage/database';
import { calculateSM2 } from '../utils/spacedRepetition';
import { applyReverseSwap, applyReverseTextSwap } from '../utils/reverseSwap';
import { generateExample } from '../utils/ai';
import { getAiEnabled, getApiKey } from '../utils/settings';
import { Quality, TemplateField } from '../models/types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { advanceOnFlip, advanceOnSwipeLeft, advanceOnSwipeRight, advanceOnRate } from '../utils/practiceSession';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const completeScale = useSharedValue(0);
  const completeOpacity = useSharedValue(0);
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [deckLanguage, setDeckLanguage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exampleSentence, setExampleSentence] = useState('');
  const [exampleTranslation, setExampleTranslation] = useState('');
  const [examplePinyin, setExamplePinyin] = useState('');

  const againScale = useSharedValue(1);
  const hardScale = useSharedValue(1);
  const goodScale = useSharedValue(1);
  const easyScale = useSharedValue(1);

  const againAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: againScale.value }] }));
  const hardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: hardScale.value }] }));
  const goodAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: goodScale.value }] }));
  const easyAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: easyScale.value }] }));

  const reduceMotion = useReduceMotion();
  const progressWidth = useSharedValue(0);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  React.useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const title = useMemo(() => {
    const label = mode === 'freeflow' ? t('practice.freeflow') : t('practice.dailyReview');
    const deckLabel = deckName ? `: ${deckName}` : `: ${t('practice.allDecks')}`;
    const reverseLabel = reverse ? ` (${t('practice.reverse')})` : '';
    return `${label}${deckLabel}${reverseLabel}`;
  }, [deckName, mode, reverse, t]);

  const displayFields = useMemo(
    () => applyReverseSwap(currentFields, !!reverse),
    [reverse, currentFields]
  );

  const loadCards = useCallback(async () => {
    const [enabled, key] = await Promise.all([getAiEnabled(), getApiKey()]);
    setAiEnabled(enabled);
    setApiKey(key);
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

  useEffect(() => { loadCards(); }, [loadCards]);

  useEffect(() => {
    getAiEnabled().then(setAiEnabled).catch(() => {});
    getApiKey().then(setApiKey).catch(() => {});
  }, []);

  useEffect(() => {
    const card = cards[currentIndex];
    if (card) {
      getDeckById(card.deck_id).then((deck) => {
        if (deck) setDeckLanguage(deck.language);
      }).catch(() => {});
    } else {
      setDeckLanguage('');
    }
  }, [cards, currentIndex]);
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      loadCurrentCardTemplate(cards[currentIndex]);
    }
  }, [cards, currentIndex, loadCurrentCardTemplate]);

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
  }, [currentIndex, cards.length, reduceMotion]);

  const handleFlip = () => {
    const result = advanceOnFlip({ cards, currentIndex, isFlipped, stats }, mode);
    setCards(result.cards);
    setCurrentIndex(result.currentIndex);
    setIsFlipped(result.isFlipped);
    setStats(result.stats);
    setExampleSentence('');
    setExampleTranslation('');
    setExamplePinyin('');
    if (result.isComplete) {
      setSessionComplete(true);
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSwipeLeft = () => {
    if (!isFlipped) return;
    const card = cards[currentIndex];
    const result = advanceOnSwipeLeft({ cards, currentIndex, isFlipped, stats }, mode);
    setCards(result.cards);
    setCurrentIndex(result.currentIndex);
    setIsFlipped(result.isFlipped);
    setStats(result.stats);
    setExampleSentence('');
    setExampleTranslation('');
    setExamplePinyin('');
    if (result.isComplete) {
      setSessionComplete(true);
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (mode === 'daily' && card) {
      const sm2Result = calculateSM2(card.ease_factor, card.interval, card.repetitions, 0);
      try { updateReview(card.id, sm2Result.easeFactor, sm2Result.interval, sm2Result.repetitions, sm2Result.nextReviewDate); } catch {}
    }
  };

  const handleSwipeRight = () => {
    if (!isFlipped) return;
    const result = advanceOnSwipeRight({ cards, currentIndex, isFlipped, stats });
    setCards(result.cards);
    setCurrentIndex(result.currentIndex);
    setIsFlipped(result.isFlipped);
  };

  const handleGenerateExample = async () => {
    const card = cards[currentIndex];
    if (!card) return;
    const word = card.front_text.trim();
    if (!word || !deckLanguage || !apiKey) return;
    setGenerating(true);
    const result = await generateExample(word, deckLanguage, apiKey);
    setGenerating(false);
    if (result) {
      setExampleSentence(result.sentence);
      setExampleTranslation(result.translation);
      setExamplePinyin(result.pinyin);
    }
  };

  const handleRate = async (quality: Quality) => {
    const card = cards[currentIndex];
    if (!card) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sm2Result = calculateSM2(card.ease_factor, card.interval, card.repetitions, quality);
    try {
      await updateReview(card.id, sm2Result.easeFactor, sm2Result.interval, sm2Result.repetitions, sm2Result.nextReviewDate);
    } catch {
      // Card advancement should not be blocked by database errors
    }

    const result = advanceOnRate({ cards, currentIndex, isFlipped, stats }, quality);
    setCards(result.cards);
    setCurrentIndex(result.currentIndex);
    setIsFlipped(result.isFlipped);
    setStats(result.stats);
    setExampleSentence('');
    setExampleTranslation('');
    setExamplePinyin('');
    if (result.isComplete) {
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
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.lg,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    ratingLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    ratingButtons: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    rateButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
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
      paddingTop: insets.top + spacing.sm,
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
    generateButton: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: withAlpha(colors.primary, 0.1),
      marginBottom: spacing.sm,
    },
    generateButtonText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary,
    },
    exampleSentence: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    exampleTranslation: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    exampleDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
  }), [colors, insets]);

  if (sessionComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.floatingHeader}>
          <TouchableOpacity
            style={styles.floatingBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.goBack')}
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
          <View style={styles.completeIconWrap}>
            <Ionicons name="trophy" size={56} color={colors.warning} />
          </View>
          <Text style={styles.completeTitle}>
            {t('practice.sessionComplete')}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.completeStat}>
              {stats.reviewed} {stats.reviewed === 1 ? t('practice.cardReviewed') : t('practice.cardsReviewed')}
            </Text>
            {mode === 'daily' && (
              <Text style={styles.completeSubtitle}>
                {t('practice.repetitionsSaved')}
              </Text>
            )}
          </View>
          <View style={styles.completeButtons}>
            <Button
              title={t('common.done')}
              onPress={() => {
                navigation.goBack();
              }}
            />
            <Button
              title={t('practice.reviewAgain')}
              variant="secondary"
              onPress={() => {
                setShowConfetti(false);
                loadCards();
              }}
              style={{ marginTop: spacing.sm }}
            />
          </View>
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
            accessibilityLabel={t('a11y.goBack')}
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
          title={t('practice.noCardsTitle')}
          subtitle={t('practice.noCardsSubtitle')}
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
      <Animated.View style={styles.cardWrapper}>
        <Animated.View
          key={currentIndex}
          entering={reduceMotion ? undefined : FadeInUp.duration(250)}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
        >
          <FlipCard
            frontText={applyReverseTextSwap(currentCard.front_text, currentCard.back_text, !!reverse).frontText}
            backText={applyReverseTextSwap(currentCard.front_text, currentCard.back_text, !!reverse).backText}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            templateFields={displayFields.length > 0 ? displayFields : undefined}
            fieldValues={Object.keys(currentValues).length > 0 ? currentValues : undefined}
            exampleSentence={exampleSentence || undefined}
            exampleTranslation={exampleTranslation || undefined}
            examplePinyin={examplePinyin || undefined}
          />
        </Animated.View>
      </Animated.View>

      {aiEnabled && deckLanguage !== '' && apiKey !== '' && (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateExample}
          disabled={generating}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.generateExample')}
        >
          <Ionicons
            name={generating ? 'hourglass-outline' : 'sparkles-outline'}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.generateButtonText}>
            {generating ? t('practice.generating') : t('practice.example')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1}/{cards.length}
        </Text>
      </View>

      {isFlipped && mode === 'daily' && (
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>{t('practice.ratingLabel')}</Text>
          <View style={styles.ratingButtons}>
            <Animated.View style={[againAnimatedStyle, { flex: 1 }]}>
              <Pressable
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
                accessibilityLabel={t('a11y.rateAgain')}
              >
                <Text style={styles.rateButtonText}>{t('practice.again')}</Text>
                <Text style={styles.rateInterval}>{t('practice.intervalAgain')}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[hardAnimatedStyle, { flex: 1 }]}>
              <Pressable
                style={[styles.rateButton, { backgroundColor: colors.hard }]}
                onPress={() => handleRate(2)}
                onPressIn={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (!reduceMotion) hardScale.value = withSpring(0.95, SPRING_CONFIG);
                }}
                onPressOut={() => {
                  if (!reduceMotion) hardScale.value = withSpring(1, SPRING_CONFIG);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.rateHard')}
              >
                <Text style={styles.rateButtonText}>{t('practice.hard')}</Text>
                <Text style={styles.rateInterval}>{t('practice.intervalHard')}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[goodAnimatedStyle, { flex: 1 }]}>
              <Pressable
                style={[styles.rateButton, { backgroundColor: colors.good }]}
                onPress={() => handleRate(3)}
                onPressIn={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!reduceMotion) goodScale.value = withSpring(0.95, SPRING_CONFIG);
                }}
                onPressOut={() => {
                  if (!reduceMotion) goodScale.value = withSpring(1, SPRING_CONFIG);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.rateGood')}
              >
                <Text style={styles.rateButtonText}>{t('practice.good')}</Text>
                <Text style={styles.rateInterval}>{t('practice.intervalGood')}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View style={[easyAnimatedStyle, { flex: 1 }]}>
              <Pressable
                style={[styles.rateButton, { backgroundColor: colors.easy }]}
                onPress={() => handleRate(5)}
                onPressIn={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  if (!reduceMotion) easyScale.value = withSpring(0.95, SPRING_CONFIG);
                }}
                onPressOut={() => {
                  if (!reduceMotion) easyScale.value = withSpring(1, SPRING_CONFIG);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.rateEasy')}
              >
                <Text style={styles.rateButtonText}>{t('practice.easy')}</Text>
                <Text style={styles.rateInterval}>{t('practice.intervalEasy')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
}
