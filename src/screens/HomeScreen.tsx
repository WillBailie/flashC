import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats, getStreak } from '../storage/database';
import { getReverseMode, setReverseMode } from '../utils/settings';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
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
  const [greeting, setGreeting] = useState('');
  const [streak, setStreak] = useState(0);
  const [streakMultiplier, setStreakMultiplier] = useState(1);
  const [reverseMode, setReverseModeState] = useState(false);
  const { colors } = useTheme();

  const RING_RADIUS = 48;
  const RING_STROKE = 8;
  const RING_SIZE = (RING_RADIUS + RING_STROKE) * 2;
  const circumference = 2 * Math.PI * RING_RADIUS;
  const dashOffset = stats.totalCards > 0
    ? circumference * (1 - Math.min(stats.dueCards, stats.totalCards) / stats.totalCards)
    : circumference;

  const reduceMotion = useReduceMotion();

  const dueScale = useSharedValue(1);
  const totalScale = useSharedValue(1);
  const streakScaleVal = useSharedValue(1);

  const ringOffset = useSharedValue(dashOffset);

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

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

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
  }, [dashOffset, reduceMotion]);

  const loadStats = useCallback(async () => {
    const s = await getGlobalStats();
    setStats(s);
    const streakData = await getStreak();
    setStreak(streakData.streak);
    setStreakMultiplier(streakData.multiplier);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      getReverseMode().then(setReverseModeState);
    }, [loadStats])
  );

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
      position: 'relative',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl + spacing.xl,
      paddingBottom: spacing.xl,
      overflow: 'hidden',
    },
    heroBlob: {
      position: 'absolute',
      borderRadius: borderRadius.full,
    },
    heroBlob1: {
      width: 160, height: 160,
      backgroundColor: withAlpha(colors.surface, 0.06),
      top: -40, right: -30,
    },
    heroBlob2: {
      width: 100, height: 100,
      backgroundColor: withAlpha(colors.surface, 0.08),
      bottom: 10, left: -20,
    },
    heroBlob3: {
      width: 70, height: 70,
      backgroundColor: withAlpha(colors.surface, 0.05),
      top: '50%', left: '60%',
      transform: [{ translateX: -35 }, { translateY: -35 }],
    },
    heroGreeting: {
      fontSize: typography.fontSize.md,
      color: withAlpha(colors.surface, 0.7),
      fontWeight: typography.fontWeight.medium,
      marginBottom: spacing.lg,
      letterSpacing: 0.3,
      position: 'relative',
      zIndex: 1,
    },
    heroBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      position: 'relative',
      zIndex: 1,
    },
    ringContainer: {
      width: RING_SIZE,
      height: RING_SIZE,
      position: 'relative',
      flexShrink: 0,
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
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.surface,
      lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
    },
    ringPctLabel: {
      fontSize: typography.fontSize.xs,
      color: withAlpha(colors.surface, 0.65),
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    heroTextBlock: {
      flex: 1,
    },
    heroStatValue: {
      fontSize: typography.fontSize.xxxl,
      fontWeight: typography.fontWeight.heavy,
      color: colors.surface,
      lineHeight: typography.fontSize.xxxl * typography.lineHeight.tight,
    },
    heroStatLabel: {
      fontSize: typography.fontSize.sm,
      color: withAlpha(colors.surface, 0.7),
      fontWeight: typography.fontWeight.medium,
      marginTop: spacing.xs,
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
      backgroundColor: withAlpha(colors.surface, 0.2),
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
      zIndex: 2,
    },
    streakPillText: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      color: colors.surface,
    },
    modalButtons: {
      gap: spacing.sm,
    },
  }), [colors]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scrollContent}>
      {/* ——— Hero ——— */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.heroBlob, styles.heroBlob1]} />
        <View style={[styles.heroBlob, styles.heroBlob2]} />
        <View style={[styles.heroBlob, styles.heroBlob3]} />

        {streak > 0 && (
          <View style={styles.streakPill}>
            <Animated.Text style={[styles.streakPillText, streakAnimatedStyle]}>🔥 {streak}</Animated.Text>
          </View>
        )}

        <Text style={styles.heroGreeting}>{greeting} 👋</Text>

        <View style={styles.heroBody}>
          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <G transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={withAlpha(colors.surface, 0.15)}
                strokeWidth={RING_STROKE}
              />
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
              </G>
            </Svg>
            <View style={styles.ringCenter}>
              <Animated.Text style={[styles.ringPct, dueAnimatedStyle]} adjustsFontSizeToFit numberOfLines={1}>{stats.dueCards}</Animated.Text>
              <Text style={styles.ringPctLabel}>due</Text>
            </View>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.heroStatValue}>{stats.reviewsToday}</Text>
            <Text style={styles.heroStatLabel}>cards reviewed today</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ——— Mode Cards ——— */}
      <View style={styles.modeSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabelNoMargin}>Practice Mode</Text>
          <View style={styles.reverseToggle}>
            <Text style={styles.reverseLabel}>Reverse</Text>
            <Switch
              value={reverseMode}
              onValueChange={handleReverseToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel="Reverse practice mode"
            />
          </View>
        </View>
        <View style={styles.modeGrid}>
          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={1}
            onPress={() => navigation.navigate('Practice', { mode: 'daily', reverse: reverseMode })}
            accessibilityRole="button"
            accessibilityLabel={`Daily Review. ${stats.dueCards} cards due today`}
          >
            <View style={[styles.modeCardAccent, { backgroundColor: colors.primary }]} />
            <View style={[styles.modeCardIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
            </View>
            <Animated.Text style={[styles.modeCardValue, dueAnimatedStyle]}>{stats.dueCards}</Animated.Text>
            <Text style={styles.modeCardLabel}>due today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            activeOpacity={1}
            onPress={() => setFreeflowModal(true)}
            accessibilityRole="button"
            accessibilityLabel={`Freeflow. ${stats.totalCards} cards available`}
          >
            <View style={[styles.modeCardAccent, { backgroundColor: colors.secondary }]} />
            <View style={[styles.modeCardIconWrap, { backgroundColor: withAlpha(colors.secondary, 0.12) }]}>
              <Ionicons name="shuffle" size={18} color={colors.secondary} />
            </View>
            <Animated.Text style={[styles.modeCardValue, totalAnimatedStyle]}>{stats.totalCards}</Animated.Text>
            <Text style={styles.modeCardLabel}>available</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ——— Stat Pills ——— */}
      <View style={styles.statsGrid}>
        <View style={styles.statPill}>
          <Ionicons name="checkmark-done" size={14} color={colors.success} />
          <Text style={styles.statPillValue}>{stats.reviewsToday}</Text>
          <Text style={styles.statPillLabel}>today</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="folder" size={14} color={colors.primary} />
          <Text style={styles.statPillValue}>{stats.totalDecks}</Text>
          <Text style={styles.statPillLabel}>decks</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="trophy" size={14} color={colors.warning} />
          <Text style={styles.statPillValue}>{masteredPct}%</Text>
          <Text style={styles.statPillLabel}>mastered</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="trending-up" size={14} color={colors.secondary} />
          <Text style={styles.statPillValue}>{stats.avgEaseFactor.toFixed(1)}×</Text>
          <Text style={styles.statPillLabel}>avg ease</Text>
        </View>
      </View>

      {/* ——— Activity ——— */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionLabel}>Activity</Text>
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
                  <Text style={styles.activityValue}> day streak</Text>
                  <Text style={styles.streakMult}> {streakMultiplier}x</Text>
                </View>
                <View style={styles.streakBar}>
                  {Array.from({ length: Math.min(streak, 14) }, (_, i) => (
                    <View key={i} style={[styles.streakDot, { opacity: 0.3 + (i / Math.min(streak, 14)) * 0.7 }]} />
                  ))}
                </View>
                <Text style={styles.activityLabel}>
                  {stats.reviewsToday > 0
                    ? `${stats.reviewsToday} card${stats.reviewsToday !== 1 ? 's' : ''} reviewed today`
                    : 'Review a card to keep your streak!'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.activityValue}>No streak yet</Text>
                <Text style={styles.activityLabel}>Review at least 1 card today to start!</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ——— Freeflow Modal ——— */}
      <Modal
        visible={freeflowModal}
        onClose={() => setFreeflowModal(false)}
        title="Freeflow"
      >
        <Text style={[styles.modeCardLabel, { fontSize: typography.fontSize.sm, marginBottom: spacing.md }]}>
          How many random cards would you like to review from all decks?
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
            accessibilityLabel="Number of cards to review"
          />
          <Text style={styles.countMax}>
            / {Math.min(stats.totalCards, 99)}
          </Text>
        </View>
        <View style={styles.modalButtons}>
          <Button
            title="Start Freeflow"
            onPress={() => {
              const count = Math.max(1, Math.min(parseInt(freeflowCount) || 10, stats.totalCards, 99));
              setFreeflowModal(false);
              setFreeflowCount('10');
              navigation.navigate('Practice', { mode: 'freeflow', cardCount: count, reverse: reverseMode });
            }}
            fullWidth
            accessibilityHint="Start a freeflow practice session"
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setFreeflowModal(false)}
            fullWidth
          />
        </View>
      </Modal>
    </ScrollView>
  );
}
