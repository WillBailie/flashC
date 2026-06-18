import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';
import { getGlobalStats } from '../storage/database';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { useTranslation } from '../i18n/TranslationContext';

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getGlobalStats().then((s) => {
        if (active) setStats(s);
      });
      return () => { active = false; };
    }, [])
  );

  const containerStyles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    row: { flexDirection: 'row', marginHorizontal: -spacing.xs },
    loading: { flex: 1, alignItems: 'center' as const, padding: spacing.xl, gap: spacing.md },
    loadingText: { color: colors.textSecondary, fontSize: typography.fontSize.md },
  }), [colors]);

  if (!stats) {
    return (
      <View style={containerStyles.container}>
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
      <ScrollView style={containerStyles.scroll} contentContainerStyle={containerStyles.content}>
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
