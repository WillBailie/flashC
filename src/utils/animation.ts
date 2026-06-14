import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
} as const;

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  return reduced;
}
