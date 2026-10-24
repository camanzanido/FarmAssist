import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';

const UP = { duration: 90, easing: Easing.out(Easing.quad) };
const DOWN = { duration: 120, easing: Easing.inOut(Easing.quad) };

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
          if (!reduceMotion) pop.value = withSequence(withTiming(1, UP), withTiming(0, DOWN));
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
