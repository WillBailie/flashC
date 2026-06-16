import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ScrollView, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme, spacing, borderRadius, typography } from '../constants/theme';
import { useReduceMotion } from '../utils/animation';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  maxWidth = 400,
  style,
}: ModalProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const [shouldRender, setShouldRender] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  const animatedOverlay = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const animateIn = useCallback(() => {
    setShouldRender(true);
    if (reduceMotion) {
      overlayOpacity.value = 1;
      sheetTranslateY.value = 0;
      return;
    }
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    sheetTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion]);

  const animateOut = useCallback(() => {
    if (reduceMotion) {
      setShouldRender(false);
      return;
    }
    overlayOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    sheetTranslateY.value = withTiming(300, { duration: 250, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(setShouldRender)(false);
      }
    });
  }, [reduceMotion]);

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      animateOut();
    }
  }, [visible, animateIn, animateOut]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        content: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          width: '100%',
          maxWidth,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 12,
        },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
      }),
    [colors, maxWidth]
  );

  if (!shouldRender && !visible) return null;

  return (
    <Animated.View style={[styles.overlay, animatedOverlay]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <Animated.View style={[styles.content, style, animatedSheet]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
