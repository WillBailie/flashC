import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
} as const;

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mountedRef.current) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
