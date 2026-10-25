import { Easing } from 'react-native-reanimated';

// Shared motion presets so small animations glide the same way across screens.
export const EASE_OUT = Easing.out(Easing.cubic);
export const BASE = { duration: 240, easing: EASE_OUT };
export const SLOW = { duration: 320, easing: EASE_OUT };
export const POP_UP = { duration: 110, easing: EASE_OUT };
export const SETTLE_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
