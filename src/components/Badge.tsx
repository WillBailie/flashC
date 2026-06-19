import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, borderRadius, typography, withAlpha } from '../constants/theme';

interface BadgeProps {
  text: string;
  color?: string;
  variant?: 'filled' | 'subtle';
  style?: ViewStyle;
}

export function Badge({ text, color, variant = 'subtle', style }: BadgeProps) {
  const { colors } = useTheme();
  const bg = color ?? colors.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.full,
          backgroundColor: variant === 'filled' ? bg : withAlpha(bg, 0.15),
        },
        text: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.bold,
          color: variant === 'filled' ? colors.textInverse : bg,
        },
      }),
    [colors, bg, variant]
  );

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}
