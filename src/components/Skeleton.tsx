import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, borderRadius, withAlpha } from '../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius: br = 4,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const bg = withAlpha(colors.text, 0.06);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: bg,
          borderRadius: br,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: 16,
          marginBottom: 8,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 1,
          shadowRadius: 4,
          elevation: 2,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.card}>
      <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}
