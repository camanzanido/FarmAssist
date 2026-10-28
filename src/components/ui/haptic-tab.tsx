import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { POP_UP, SETTLE_SPRING } from '@/src/constants/motion';

// The pop starts on press-in, before the next screen renders, so it shows even while JS is busy.
export function HapticTab(props: BottomTabBarButtonProps) {
  const reduceMotion = useReducedMotion();
  const pop = useSharedValue(0);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.12 * pop.value }],
  }));

  return (
    <Animated.View style={[s.wrap, popStyle]}>
      <PlatformPressable
        {...props}
        style={[props.style, s.fill]}
        onPressIn={(ev) => {
          if (!reduceMotion) pop.value = withSequence(withTiming(1, POP_UP), withSpring(0, SETTLE_SPRING));
          if (process.env.EXPO_OS === 'ios') {
            // Add a soft haptic feedback when pressing down on the tabs.
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          props.onPressIn?.(ev);
        }}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  fill: { flex: 1 },
});
