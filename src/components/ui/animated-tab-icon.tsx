import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
};

const UP = { duration: 110, easing: Easing.out(Easing.quad) };
const DOWN = { duration: 140, easing: Easing.inOut(Easing.quad) };

// A short pop when the tab becomes active; runs on the UI thread so tab switches stay instant.
export function AnimatedTabIcon({ name, color, size, focused }: Props) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(0);

  useEffect(() => {
    if (!focused || reduceMotion) return;
    pop.value = withSequence(withTiming(1, UP), withTiming(0, DOWN));
  }, [focused, reduceMotion, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * pop.value }, { scale: 1 + 0.18 * pop.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
