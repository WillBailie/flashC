import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, withAlpha } from '../constants/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export function EmptyState({ icon = 'albums', title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 32,
        },
        iconWrapper: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: withAlpha(colors.primary, 0.1),
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        subtitle: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
        },
      }),
    [colors, icon]
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
