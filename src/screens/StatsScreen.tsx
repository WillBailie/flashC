import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats } from '../storage/database';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { useTranslation } from '../i18n/TranslationContext';
import { RootStackParamList } from '../navigation/AppNavigator';

function StatCard({ label, value, icon, color }: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const { colors } = useTheme();
  const finalColor = color ?? colors.primary;

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      flex: 1,
      minWidth: '45%',
      marginHorizontal: spacing.xs,
      marginBottom: spacing.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: withAlpha(finalColor, 0.125),
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    value: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.heavy,
      color: finalColor,
    },
    label: {
      fontSize: typography.fontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },
  }), [colors, finalColor]);

  return (
    <View style={styles.wrapper}>
      <Card variant="outlined">
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <Ionicons name={icon} size={20} color={finalColor} />
          </View>
          <View style={styles.content}>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Stats'>>();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [stats, setStats] = useState<{
    totalCards: number;
    totalDecks: number;
    totalTemplates: number;
    newCards: number;
    dueCards: number;
    reviewsToday: number;
    avgEaseFactor: number;
    masteredCards: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    const s = await getGlobalStats();
    setStats(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const containerStyles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingTop: insets.top + 44 + spacing.sm + spacing.md + spacing.sm, paddingBottom: spacing.xl },
    row: { flexDirection: 'row', marginHorizontal: -spacing.xs },
    loading: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: spacing.xl, gap: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: typography.fontSize.md },
    floatingHeader: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: insets.top + spacing.sm,
      paddingBottom: spacing.sm,
    },
    floatingBackButton: {
      width: 44, height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingSpacer: { width: 44 },
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
  }), [colors, insets.top]);

  if (!stats) {
    return (
      <View style={containerStyles.container}>
        <View style={containerStyles.floatingHeader}>
          <TouchableOpacity
            style={containerStyles.floatingBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={containerStyles.floatingPill}>
            <View style={containerStyles.floatingPillInner}>
              <Text style={containerStyles.floatingPillText} numberOfLines={2}>{t('settings.stats')}</Text>
            </View>
          </View>
          <View style={containerStyles.floatingSpacer} />
        </View>
        <View style={containerStyles.loading}>
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
          <Skeleton width="100%" height={80} borderRadius={borderRadius.md} />
        </View>
      </View>
    );
  }

  const statRows = [
    [
      { label: t('settings.statsTotalCards'), value: stats.totalCards, icon: 'albums' as const, color: colors.primary },
      { label: t('settings.statsTotalDecks'), value: stats.totalDecks, icon: 'book' as const, color: colors.textSecondary },
    ],
    [
      { label: t('home.cardsDue'), value: stats.dueCards, icon: 'alarm' as const, color: stats.dueCards > 0 ? colors.danger : colors.primary },
      { label: t('settings.statsReviewsToday'), value: stats.reviewsToday, icon: 'checkmark-done' as const, color: colors.success },
    ],
    [
      { label: t('settings.statsNewCards'), value: stats.newCards, icon: 'sparkles' as const, color: colors.secondary },
      { label: t('settings.statsMastered'), value: stats.masteredCards, icon: 'star' as const, color: colors.warning },
    ],
    [
      { label: t('settings.statsTemplates'), value: stats.totalTemplates, icon: 'layers' as const, color: colors.primary },
      { label: t('settings.statsAvgEase'), value: stats.avgEaseFactor.toFixed(2), icon: 'trending-up' as const, color: colors.easy },
    ],
  ] as const;

  return (
    <View style={containerStyles.container}>
      <View style={containerStyles.floatingHeader}>
        <TouchableOpacity
          style={containerStyles.floatingBackButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={containerStyles.floatingPill}>
          <View style={containerStyles.floatingPillInner}>
            <Text style={containerStyles.floatingPillText} numberOfLines={2}>{t('settings.stats')}</Text>
          </View>
        </View>
        <View style={containerStyles.floatingSpacer} />
      </View>
      <ScrollView
        style={containerStyles.scroll}
        contentContainerStyle={containerStyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {statRows.map((row, i) => (
          <View key={i} style={containerStyles.row}>
            {row.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
