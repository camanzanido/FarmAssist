import { Colors } from '@/src/constants/colors';
import React, { createContext, useContext, useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PulseContext = createContext<SharedValue<number> | null>(null);

function usePulse(enabled: boolean): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!enabled || reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(opacity);
  }, [enabled, reduceMotion, opacity]);
  return opacity;
}

export function SkeletonGroup({ children }: { children: React.ReactNode }) {
  const opacity = usePulse(true);
  return <PulseContext.Provider value={opacity}>{children}</PulseContext.Provider>;
}

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 14, radius = 7, style }: Props) {
  const shared = useContext(PulseContext);
  const own = usePulse(shared === null);
  const opacity = shared ?? own;
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: Colors.divider }, style, pulse]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
