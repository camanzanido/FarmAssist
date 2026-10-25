import { POP_UP, SETTLE_SPRING, SLOW } from '@/src/constants/motion';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

export type IconMotion = 'spin' | 'flip' | 'pop' | 'wiggle';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  motion: IconMotion;
  // Bump this number to play the motion once.
  trigger: number;
};

// Transform-only and on the UI thread, so it costs nothing on the JS side.
export function AnimatedIcon({ name, size, color, motion, trigger }: Props) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  const scale = useSharedValue(1);
  const last = useRef(trigger);

  useEffect(() => {
    if (trigger === last.current) return;
    last.current = trigger;
    if (reduceMotion) return;
    if (motion === 'spin') turn.value = withTiming(turn.value + 90, SLOW);
    else if (motion === 'flip') turn.value = withTiming(turn.value + 180, SLOW);
    else if (motion === 'pop') scale.value = withSequence(withTiming(1.18, POP_UP), withSpring(1, SETTLE_SPRING));
    else turn.value = withSequence(withTiming(-12, POP_UP), withSpring(0, { ...SETTLE_SPRING, damping: 9 }));
  }, [trigger, motion, reduceMotion, turn, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
