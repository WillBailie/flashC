import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme, borderRadius, spacing } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  interactive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'elevated',
  interactive = false,
  onPress,
  onLongPress,
  delayLongPress,
  style,
}: CardProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: variant === 'elevated' ? { width: 0, height: 2 } : undefined,
          shadowOpacity: variant === 'elevated' ? 1 : 0,
          shadowRadius: variant === 'elevated' ? 8 : 0,
          elevation: variant === 'elevated' ? 3 : 0,
        },
      }),
    [colors, variant]
  );

  if (interactive && (onPress || onLongPress)) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
          style,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}
