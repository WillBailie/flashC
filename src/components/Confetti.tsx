import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';


const PARTICLE_COUNT = 120;
const BURST_DURATION = 1000;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  id: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  delay: number;
  rotation: number;
  startX: number;
}

function generateParticles(palette: string[]): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.random() - 0.5) * Math.PI * 0.7;
    const distance = 150 + Math.random() * 350;
    return {
      id: i,
      dx: Math.sin(angle) * distance,
      dy: -(Math.cos(angle) * distance),
      color: palette[Math.floor(Math.random() * palette.length)],
      size: 4 + Math.random() * 8,
      delay: Math.random() * 300,
      rotation: Math.random() * 360,
      startX: (Math.random() - 0.5) * SCREEN_W * 0.5,
    };
  });
}

function ParticleItem({ particle, animate }: { particle: Particle; animate: boolean }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(particle.startX);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    opacity.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: BURST_DURATION - 300, easing: Easing.in(Easing.ease) })
      )
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.startX + particle.dx, { duration: BURST_DURATION, easing: Easing.out(Easing.quad) })
    );
    translateY.value = withDelay(
      particle.delay,
      withTiming(particle.dy, { duration: BURST_DURATION, easing: Easing.out(Easing.quad) })
    );
    scale.value = withDelay(particle.delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) }));
  }, [animate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${particle.rotation}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: '50%',
          width: particle.size,
          height: particle.size * (Math.random() > 0.5 ? 1.5 : 1),
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const { colors } = useTheme();

  const confettiPalette = useMemo(() => [
    colors.primary,
    colors.secondary,
    colors.success,
    colors.danger,
    colors.warning,
    colors.easy,
    colors.good,
    colors.hard,
  ], [colors]);

  const particles = useMemo(() => generateParticles(confettiPalette), [confettiPalette]);

  useEffect(() => {
    if (trigger && onComplete) {
      const timer = setTimeout(onComplete, BURST_DURATION + 200);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 999 }]}>
      {particles.map((p) => (
        <ParticleItem key={p.id} particle={p} animate={trigger} />
      ))}
    </Animated.View>
  );
}
