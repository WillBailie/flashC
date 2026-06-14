import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme, spacing, borderRadius, typography } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  multiline?: boolean;
}

export function Input({
  label,
  error,
  multiline = false,
  style,
  ...rest
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          marginBottom: spacing.sm,
        },
        label: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.semibold,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        input: {
          borderWidth: 2,
          borderColor: focused ? colors.primary : error ? colors.danger : colors.border,
          borderRadius: borderRadius.sm,
          padding: spacing.sm + 4,
          fontSize: typography.fontSize.md,
          color: colors.text,
          backgroundColor: colors.background,
          minHeight: multiline ? 100 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        error: {
          fontSize: typography.fontSize.xs,
          color: colors.danger,
          marginTop: spacing.xs,
        },
      }),
    [colors, focused, error, multiline]
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline={multiline}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
