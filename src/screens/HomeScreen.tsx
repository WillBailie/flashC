import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats, getStreak, importCards, createDeck, getAllDecks, getTemplateFields, getAllTemplates } from '../storage/database';
import { getReverseMode, setReverseMode, getDailyLanguage, getDailyWordsData, setDailyWordsData as persistDailyWordsData, clearDailyWords, getApiKey, getDailyTemplateId, setDailyTemplateId } from '../utils/settings';
import { generateDailyWords } from '../utils/dailyWords';
import { DailyWord, Deck, Template, TemplateField } from '../models/types';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useTranslation } from '../i18n/TranslationContext';
import { RootStackParamList, TabParamList } from '../navigation/AppNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface HomeStats {
  totalCards: number;
  totalDecks: number;
  dueCards: number;
  reviewsToday: number;
  avgEaseFactor: number;
  masteredCards: number;
}

export default function HomeScreen({ navigation }: Props) {
  const [stats, setStats] = useState<HomeStats>({
    totalCards: 0, totalDecks: 0, dueCards: 0,
    reviewsToday: 0, avgEaseFactor: 2.5, masteredCards: 0,
  });
  const [freeflowModal, setFreeflowModal] = useState(false);
  const [freeflowCount, setFreeflowCount] = useState('10');
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [reverseMode, setReverseModeState] = useState(false);
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
  const [refreshing, setRefreshing] = useState(false);
  const [animateTrigger, setAnimateTrigger] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
  const [reviewTemplateFields, setReviewTemplateFields] = useState<TemplateField[]>([]);
  const { t } = useTranslation();
  const { colors } = useTheme();

  const RING_RADIUS = 72;
  const RING_STROKE = 6;
  const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const maxDue = stats.totalCards > 0 ? stats.totalCards : 800;
  const dashOffset = circumference * (1 - Math.min(stats.dueCards, maxDue) / maxDue);

  const reduceMotion = useReduceMotion();

  const [displayDue, setDisplayDue] = useState(0);

  useEffect(() => {
    if (stats.dueCards === 0) {
      setDisplayDue(0);
      return;
    }
    let start: number | null = null;
    const duration = 1000;
    const from = displayDue;
    const to = stats.dueCards;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayDue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [stats.dueCards, animateTrigger]);

  const dueScale = useSharedValue(1);
  const totalScale = useSharedValue(1);
  const streakScaleVal = useSharedValue(1);

  const ringOffset = useSharedValue(circumference);

  const dueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dueScale.value }],
  }));
  const totalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalScale.value }],
  }));
  const streakAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScaleVal.value }],
  }));

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringOffset.value,
  }));

  const animateCounter = (sharedValue: SharedValue<number>) => {
    if (reduceMotion) return;
    sharedValue.value = withSequence(
      withTiming(0.85, { duration: 0 }),
      withSpring(1.05, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG),
    );
  };

  const prevDue = useRef(stats.dueCards);
  const prevTotal = useRef(stats.totalCards);
  const prevStreak = useRef(streak);

  React.useEffect(() => {
    if (prevDue.current !== stats.dueCards && prevDue.current !== 0) {
      animateCounter(dueScale);
    }
    prevDue.current = stats.dueCards;
  }, [stats.dueCards]);

  React.useEffect(() => {
    if (prevTotal.current !== stats.totalCards && prevTotal.current !== 0) {
      animateCounter(totalScale);
    }
    prevTotal.current = stats.totalCards;
  }, [stats.totalCards]);

  React.useEffect(() => {
    if (prevStreak.current !== streak && prevStreak.current !== 0) {
      animateCounter(streakScaleVal);
    }
    prevStreak.current = streak;
  }, [streak]);

  React.useEffect(() => {
    if (reduceMotion) {
      ringOffset.value = dashOffset;
    } else {
      ringOffset.value = withTiming(dashOffset, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [dashOffset, reduceMotion, animateTrigger]);

  const triggerAnimation = useCallback(() => {
    setDisplayDue(0);
    setAnimateTrigger(t => t + 1);
  }, []);

  const loadStats = useCallback(async () => {
    triggerAnimation();
    if (!reduceMotion) {
      ringOffset.value = circumference;
    }
    const s = await getGlobalStats();
    setStats(s);
    const streakData = await getStreak();
    setStreak(streakData.streak);
    setStreakMultiplier(streakData.multiplier);
  }, [reduceMotion, triggerAnimation]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      getReverseMode().then(setReverseModeState);
      getApiKey().then(setApiKey);
      getDailyLanguage().then((lang) => {
        if (lang !== dailyLanguage) {
          setSelectedTemplateId(null);
        }
        setDailyLanguage(lang);
      });
      getDailyWordsData().then((data) => {
        const today = new Date().toISOString().slice(0, 10);
        if (data.date !== today) {
          clearDailyWords();
          setDailyWordsData({ date: '', words: [] });
        } else {
          setDailyWordsData(data);
        }
      });
    }, [loadStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    await getReverseMode().then(setReverseModeState);
    await getDailyLanguage().then(setDailyLanguage);
    await getApiKey().then(setApiKey);
    await getDailyWordsData().then((data) => {
      const today = new Date().toISOString().slice(0, 10);
      if (data.date !== today) {
        clearDailyWords();
        setDailyWordsData({ date: '', words: [] });
      } else {
        setDailyWordsData(data);
      }
    });
    setRefreshing(false);
  }, [loadStats]);

  const masteredPct = stats.totalCards > 0
    ? Math.round((stats.masteredCards / stats.totalCards) * 100)
    : 0;

  const handleReverseToggle = useCallback(async (value: boolean) => {
    setReverseModeState(value);
    await setReverseMode(value);
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xxl + spacing.lg,
    },
    hero: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl + spacing.xl,
      paddingBottom: spacing.xl,
    },
    heroGreeting: {
      fontFamily: colors.headingFontFamily,
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.text,
      textAlign: 'left',
      marginBottom: spacing.xl,
    },
    heroBody: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    ringContainer: {
      width: RING_SIZE,
      height: RING_SIZE,
      position: 'relative',
      alignSelf: 'center',
    },
    ringCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ringPct: {
      fontFamily: colors.numFontFamily,
      fontSize: 40,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      lineHeight: 44,
    },
    ringPctLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 4,
    },
    heroSubtitle: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
      textAlign: 'center',
    },

    sectionLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
      paddingLeft: spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingLeft: spacing.xs,
    },
    sectionLabelNoMargin: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    reverseToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surfaceVariant,
    },
    reverseLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    modeSection: {
      padding: spacing.md,
      paddingBottom: 0,
    },
    modeGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    modeCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
      position: 'relative',
      overflow: 'hidden',
    },
    modeCardAccent: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 4,
    },
    modeCardIconWrap: {
      width: 36, height: 36,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modeCardValue: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.text,
      lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
      marginBottom: 2,
      marginTop: spacing.sm,
    },
    modeCardLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },

    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceVariant,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexGrow: 1,
      flexBasis: '45%',
      justifyContent: 'center',
    },
    statPillValue: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },
    statPillLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },

    activitySection: {
      padding: spacing.md,
      paddingBottom: 0,
    },
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    activityIconWrap: {
      width: 44, height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: withAlpha(colors.success, 0.12),
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityInfo: {
      flex: 1,
    },
    activityValue: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
    },
    activityLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    streakCount: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.warning,
    },
    streakMult: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.warning,
      backgroundColor: withAlpha(colors.warning, 0.15),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      overflow: 'hidden',
    },
    streakBar: {
      flexDirection: 'row',
      gap: 2,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    streakDot: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: colors.warning,
    },

    countRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    countInput: {
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: borderRadius.sm,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      minWidth: 80,
      backgroundColor: colors.background,
    },
    countMax: {
      fontSize: typography.fontSize.lg,
      color: colors.textSecondary,
    },
    streakPill: {
      position: 'absolute',
      top: spacing.xxl + spacing.xl,
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: withAlpha(colors.warning, 0.15),
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
      zIndex: 2,
    },
    streakPillText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: colors.warning,
    },
    modalButtons: {
      gap: spacing.sm,
    },
  }), [colors]);

  const doGenerateDailyWords = useCallback(async (templateId: number | null) => {
    setDailyGenerating(true);
    setDailyError(false);
    const today = new Date().toISOString().slice(0, 10);

    try {
      const words = await generateDailyWords(dailyLanguage, apiKey, templateId ?? undefined);
      if (words && words.length > 0) {
        await persistDailyWordsData(today, words);
        setDailyWordsData({ date: today, words });
        setDailyModalVisible(true);
      } else {
        setDailyError(true);
      }
    } catch {
      setDailyError(true);
    } finally {
      setDailyGenerating(false);
    }
  }, [dailyLanguage, apiKey]);

  const handleGenerateDaily = useCallback(async () => {
    if (!dailyLanguage || !apiKey) return;

    const persistedId = await getDailyTemplateId();
    if (persistedId) {
      setSelectedTemplateId(persistedId);
      await doGenerateDailyWords(persistedId);
      return;
    }

    const templates = await getAllTemplates();
    if (templates.length <= 1) {
      const id = templates[0]?.id ?? null;
      setSelectedTemplateId(id);
      await doGenerateDailyWords(id);
    } else {
      setAvailableTemplates(templates);
      setTemplatePickerVisible(true);
    }
  }, [dailyLanguage, apiKey, doGenerateDailyWords]);

  const handleTemplateSelect = useCallback(async (template: Template) => {
    setTemplatePickerVisible(false);
    setSelectedTemplateId(template.id);
    await setDailyTemplateId(template.id);
    await doGenerateDailyWords(template.id);
  }, [doGenerateDailyWords]);

  const handleAddToDeck = useCallback(async (deckId: number) => {
    const cards = dailyWordsData.words.map((w) => ({
      front_text: w.front,
      back_text: w.back,
      field_values: w.fields,
    }));
    await importCards(deckId, cards, selectedTemplateId ?? undefined);
    await clearDailyWords();
    setDailyWordsData({ date: '', words: [] });
    setDeckPickerVisible(false);
    setDailyModalVisible(false);
    setReviewTemplateFields([]);
  }, [dailyWordsData.words, selectedTemplateId]);

  const handleCreateAndAdd = useCallback(async () => {
    if (!newDeckName.trim()) return;
    const deck = await createDeck(newDeckName.trim(), '', dailyLanguage);
    const cards = dailyWordsData.words.map((w) => ({
      front_text: w.front,
      back_text: w.back,
      field_values: w.fields,
    }));
    await importCards(deck.id, cards, selectedTemplateId ?? undefined);
    await clearDailyWords();
    setDailyWordsData({ date: '', words: [] });
    setNewDeckModalVisible(false);
    setNewDeckName('');
    setDailyModalVisible(false);
    setReviewTemplateFields([]);
  }, [dailyWordsData.words, dailyLanguage, newDeckName, selectedTemplateId]);

  const handleDiscardDailyWords = useCallback(async () => {
    await clearDailyWords();
    setDailyWordsData({ date: '', words: [] });
    setDailyModalVisible(false);
    setReviewTemplateFields([]);
  }, []);

  useEffect(() => {
    if (dailyModalVisible && selectedTemplateId) {
      getTemplateFields(selectedTemplateId).then(setReviewTemplateFields).catch(() => setReviewTemplateFields([]));
    } else if (!dailyModalVisible) {
      setReviewTemplateFields([]);
    }
  }, [dailyModalVisible, selectedTemplateId]);

  const openDeckPicker = useCallback(async () => {
    const decks = await getAllDecks();
    const filtered = decks.filter((d) => d.language.toLowerCase() === dailyLanguage.toLowerCase());
    setLanguageDecks(filtered);
    setDeckPickerVisible(true);
  }, [dailyLanguage]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }>
      {/* ——— Hero ——— */}
      <View style={styles.hero}>

        {streak > 0 && (
          <View style={styles.streakPill}>
            <Animated.Text style={[styles.streakPillText, streakAnimatedStyle]}>🔥 {streak}</Animated.Text>
          </View>
        )}

        <Text style={styles.heroGreeting}>Welcome back</Text>

        <View style={styles.heroBody}>
          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <G transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.ringTrack}
                strokeWidth={RING_STROKE}
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.ringFill}
                strokeWidth={RING_STROKE}
                strokeDasharray={circumference}
                strokeLinecap="round"
                animatedProps={ringAnimatedProps}
              />
              </G>
            </Svg>
            <View style={styles.ringCenter}>
              <Animated.Text style={[styles.ringPct, dueAnimatedStyle]}>{displayDue}</Animated.Text>
              <Text style={styles.ringPctLabel}>DUE</Text>
            </View>
          </View>
        </View>

        <Text style={styles.heroSubtitle}>{stats.reviewsToday} cards reviewed today</Text>
      </View>

      {/* ——— Mode Cards ——— */}
      <View style={styles.modeSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabelNoMargin}>{t('home.practiceMode')}</Text>
          <View style={styles.reverseToggle}>
            <Text style={styles.reverseLabel}>{t('practice.reverse')}</Text>
            <Switch
              value={reverseMode}
              onValueChange={handleReverseToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textInverse}
              accessibilityLabel={t('a11y.reverseMode')}
            />
          </View>
        </View>
        <View style={styles.modeGrid}>
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={1}
            onPress={() => navigation.navigate('Practice', { mode: 'daily', reverse: reverseMode })}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.dailyReview', { count: String(stats.dueCards) })}
          >
            <View style={[styles.modeCardAccent, { backgroundColor: colors.primary }]} />
            <View style={[styles.modeCardIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <Animated.Text style={[styles.modeCardValue, dueAnimatedStyle]}>{stats.dueCards}</Animated.Text>
             <Text style={styles.modeCardLabel}>{t('home.dueToday')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={1}
            onPress={() => setFreeflowModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.freeflowAvailable', { count: String(stats.totalCards) })}
          >
            <View style={[styles.modeCardAccent, { backgroundColor: colors.secondary }]} />
            <View style={[styles.modeCardIconWrap, { backgroundColor: withAlpha(colors.secondary, 0.12) }]}>
              <Ionicons name="shuffle" size={18} color={colors.secondary} />
            </View>
            <Animated.Text style={[styles.modeCardValue, totalAnimatedStyle]}>{stats.totalCards}</Animated.Text>
             <Text style={styles.modeCardLabel}>{t('home.available')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ——— Stat Pills ——— */}
      <View style={styles.statsGrid}>
        <View style={styles.statPill}>
          <Ionicons name="checkmark-done" size={14} color={colors.success} />
          <Text style={styles.statPillValue}>{stats.reviewsToday}</Text>
          <Text style={styles.statPillLabel}>{t('home.today')}</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="folder" size={14} color={colors.primary} />
          <Text style={styles.statPillValue}>{stats.totalDecks}</Text>
          <Text style={styles.statPillLabel}>{t('home.decks')}</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="trophy" size={14} color={colors.warning} />
          <Text style={styles.statPillValue}>{masteredPct}%</Text>
          <Text style={styles.statPillLabel}>{t('home.mastered')}</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="trending-up" size={14} color={colors.secondary} />
          <Text style={styles.statPillValue}>{stats.avgEaseFactor.toFixed(1)}×</Text>
          <Text style={styles.statPillLabel}>{t('home.avgEase')}</Text>
        </View>
      </View>

      {/* ——— Activity ——— */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionLabel}>{t('home.activity')}</Text>
        <View style={styles.activityCard}>
          <View style={[styles.activityIconWrap, streak > 0 && { backgroundColor: withAlpha(colors.warning, 0.15) }]}>
            <Ionicons
              name={streak > 0 ? 'flame' : 'checkmark-circle'}
              size={20}
              color={streak > 0 ? colors.warning : colors.success}
            />
          </View>
          <View style={styles.activityInfo}>
            {streak > 0 ? (
              <>
                <View style={styles.streakRow}>
                  <Text style={styles.streakCount}>{streak}</Text>
                  <Text style={styles.activityValue}> {t('home.dayStreak')}</Text>
                  <Text style={styles.streakMult}> {streakMultiplier}x</Text>
                </View>
                <View style={styles.streakBar}>
                  {Array.from({ length: Math.min(streak, 14) }, (_, i) => (
                    <View key={i} style={[styles.streakDot, { opacity: 0.3 + (i / Math.min(streak, 14)) * 0.7 }]} />
                  ))}
                </View>
                <Text style={styles.activityLabel}>
                  {stats.reviewsToday > 0
                    ? t('home.streakCardReviewed', { count: String(stats.reviewsToday), s: stats.reviewsToday !== 1 ? 's' : '' })
                    : t('home.keepStreak')}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.activityValue}>{t('home.noStreak')}</Text>
                <Text style={styles.activityLabel}>{t('home.startStreak')}</Text>
              </>
            )}
          </View>
        </View>
        {!apiKey ? (
          <TouchableOpacity
            style={[styles.activityCard, { marginTop: spacing.sm, opacity: 0.5 }]}
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
            style={[styles.activityCard, { marginTop: spacing.sm }]}
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
            style={[styles.activityCard, { marginTop: spacing.sm }]}
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
            style={[styles.activityCard, { marginTop: spacing.sm }]}
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
          <View style={[styles.activityCard, { marginTop: spacing.sm }]}>
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
            style={[styles.activityCard, { marginTop: spacing.sm }]}
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

      {/* ——— Freeflow Modal ——— */}
      <Modal
        visible={freeflowModal}
        onClose={() => setFreeflowModal(false)}
        title={t('home.freeflow')}
      >
        <Text style={[styles.modeCardLabel, { fontSize: typography.fontSize.sm, marginBottom: spacing.md }]}>
          {t('home.freeflowPrompt')}
        </Text>
        <View style={styles.countRow}>
          <TextInput
            style={styles.countInput}
            keyboardType="numeric"
            value={freeflowCount}
            onChangeText={setFreeflowCount}
            maxLength={3}
            selectTextOnFocus
            autoFocus
            accessibilityLabel={t('a11y.cardCount')}
          />
          <Text style={styles.countMax}>
            / {Math.min(stats.totalCards, 99)}
          </Text>
        </View>
        <View style={styles.modalButtons}>
          <Button
            title={t('home.startFreeflow')}
            onPress={() => {
              const count = Math.max(1, Math.min(parseInt(freeflowCount) || 10, stats.totalCards, 99));
              setFreeflowModal(false);
              setFreeflowCount('10');
              navigation.navigate('Practice', { mode: 'freeflow', cardCount: count, reverse: reverseMode });
            }}
            fullWidth
            accessibilityHint={t('a11y.startFreeflow')}
          />
          <Button
            title={t('common.cancel')}
            variant="ghost"
            onPress={() => setFreeflowModal(false)}
            fullWidth
          />
        </View>
      </Modal>

      {/* ——— Template Picker Modal ——— */}
      <Modal
        visible={templatePickerVisible}
        onClose={() => {
          setTemplatePickerVisible(false);
          setDailyGenerating(false);
        }}
        title={t('dailyWords.selectTemplate')}
      >
        <ScrollView style={{ maxHeight: 300 }}>
          {availableTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={{
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
              onPress={() => handleTemplateSelect(template)}
            >
              <Text style={{ fontSize: typography.fontSize.md, color: colors.text }}>{template.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>

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
              {reviewTemplateFields.length > 0 ? (
                <View>
                  {reviewTemplateFields.map((f) => (
                    <View key={f.id} style={{ marginBottom: 4 }}>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginBottom: 1 }}>
                        {f.name}
                      </Text>
                      <Text style={{
                        fontSize: typography.fontSize.md,
                        color: colors.text,
                        fontWeight: f.side === 'front' ? typography.fontWeight.bold : typography.fontWeight.regular,
                      }}>
                        {word.fields[f.name] || '—'}
                      </Text>
                    </View>
                  ))}
                  <View style={{
                    backgroundColor: withAlpha(colors.primary, 0.1),
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 2,
                    borderRadius: borderRadius.full,
                    alignSelf: 'flex-start',
                    marginTop: 4,
                  }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>
                      {t('dailyWords.complexity', { level: String(word.complexity) })}
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
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
              )}
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
    </ScrollView>
  );
}
