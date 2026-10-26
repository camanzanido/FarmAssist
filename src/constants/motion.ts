import { Easing } from 'react-native-reanimated';

// Shared motion presets so small animations glide the same way across screens.
export const EASE_OUT = Easing.out(Easing.cubic);
export const BASE = { duration: 240, easing: EASE_OUT };
export const SLOW = { duration: 320, easing: EASE_OUT };
export const POP_UP = { duration: 110, easing: EASE_OUT };
export const SETTLE_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

// iOS-style springs, set by duration and damping ratio like UIKit: 1 settles without bounce, lower adds a little.
export const GLIDE_SPRING = { duration: 420, dampingRatio: 1 };
export const SNAP_SPRING = { duration: 360, dampingRatio: 0.85 };
export const PRESS_IN_SPRING = { duration: 140, dampingRatio: 1 };
export const PRESS_OUT_SPRING = { duration: 320, dampingRatio: 0.7 };
export const PRESSED_SCALE = 0.97;
