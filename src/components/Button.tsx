import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme, typography, spacing, borderRadius } from '../constants/theme';
import { SPRING_CONFIG, useReduceMotion } from '../utils/animation';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      scale.value = withSpring(0.97, SPRING_CONFIG);
    }
  };

  const handlePressOut = () => {
    if (!reduceMotion) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  };

  const styles = useMemo(
    () => {
      const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
        sm: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, fontSize: typography.fontSize.xs },
        md: { paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.lg, fontSize: typography.fontSize.sm },
        lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, fontSize: typography.fontSize.md },
      };
      const s = sizeStyles[size];

      const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
        primary: { bg: colors.primary, text: colors.surface },
        secondary: { bg: 'transparent', text: colors.primary, border: colors.primary },
        ghost: { bg: 'transparent', text: colors.textSecondary },
        danger: { bg: colors.danger, text: colors.surface },
      };
      const v = variantStyles[variant];

      return StyleSheet.create({
        button: {
          backgroundColor: v.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border ?? 'transparent',
          opacity: disabled ? 0.5 : 1,
          alignSelf: 'stretch',
        },
        text: {
          color: v.text,
          fontSize: s.fontSize,
          fontWeight: typography.fontWeight.bold,
        },
      });
    },
    [colors, variant, size, disabled]
  );

  return (
    <Animated.View style={[animatedStyle, style, fullWidth && { alignSelf: 'stretch' }]}>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && reduceMotion && { opacity: 0.7 },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        {loading && <ActivityIndicator size="small" color={styles.text.color} />}
        <Text style={styles.text}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}
