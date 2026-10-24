import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
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

const EASE = Easing.out(Easing.cubic);

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
    if (motion === 'spin') turn.value = withTiming(turn.value + 90, { duration: 220, easing: EASE });
    else if (motion === 'flip') turn.value = withTiming(turn.value + 180, { duration: 220, easing: EASE });
    else if (motion === 'pop') scale.value = withSequence(withTiming(1.2, { duration: 90, easing: EASE }), withTiming(1, { duration: 120 }));
    else turn.value = withSequence(
      withTiming(-14, { duration: 60 }),
      withTiming(12, { duration: 80 }),
      withTiming(0, { duration: 70, easing: EASE }),
    );
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
