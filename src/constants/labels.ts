import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import type { UserType } from '@/src/auth/types';

// --- Types ---
export type DecisionType = 'crop_choice' | 'crop_variety' | 'protect';
export type FieldGroup = 'yield' | 'cost' | 'addCost';

// --- Data ---
// Farmers and extension workers share the 'farmer' role; researchers are the admins. Only the wording differs from the stored value.
export const ROLE_LABEL: Record<UserType, string> = {
  farmer: 'Field user (farmer or extension worker)',
  researcher: 'Admin (researcher)',
};
export const ROLE_SHORT: Record<UserType, string> = { farmer: 'Field user', researcher: 'Admin' };
export const ROLE_TAG: Record<UserType, string> = { farmer: 'FIELD', researcher: 'ADMIN' };

export const PLACEHOLDERS: Record<DecisionType, [string, string]> = {
  crop_choice: ['e.g. Rice IR64', 'e.g. Corn OPV'],
  crop_variety: ['e.g. NSIC Rc222', 'e.g. NSIC Rc160'],
  protect: ['e.g. Cover from Rain', 'e.g. Leave Uncovered'],
};

export const DECISION_IMAGES: Record<DecisionType, ImageSourcePropType> = {
  crop_choice: require('@/assets/images/crop_choice.jpg'),
  crop_variety: require('@/assets/images/crop_choice.jpg'),
  protect: require('@/assets/images/apply_or_not_apply.jpg'),
};

export const DECISION_LABELS: Record<DecisionType, string> = {
  crop_choice: 'Crop Choice',
  crop_variety: 'Crop Variety',
  protect: 'Protect from Rain',
};

export interface DecisionInfo {
  id: DecisionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

// The decisions a user can start today.
export const DECISIONS: DecisionInfo[] = [
  {
    id: 'crop_choice',
    icon: 'leaf-outline',
    label: DECISION_LABELS.crop_choice,
    description: 'Compare two crops to find the better option given climate risk.',
  },
  {
    id: 'crop_variety',
    icon: 'git-compare-outline',
    label: DECISION_LABELS.crop_variety,
    description: 'Compare two varieties of the same crop to see which pays off better.',
  },
  {
    id: 'protect',
    icon: 'rainy-outline',
    label: DECISION_LABELS.protect,
    description: 'Decide if protecting your crop from rain is worth the extra cost.',
  },
];

export const DECISION_ICONS = Object.fromEntries(DECISIONS.map(d => [d.id, d.icon])) as Record<DecisionType, keyof typeof Ionicons.glyphMap>;

export const CLIMATES = ['Driest', 'Below Average', 'Average', 'Above Average', 'Wettest'] as const;

export interface FieldConfigItem {
  key: FieldGroup;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const FIELD_CONFIG: FieldConfigItem[] = [
  { key: 'yield', label: 'Yield', unit: 'kg/ha', icon: 'trending-up-outline' },
  { key: 'cost', label: 'Cost', unit: '₱/ha', icon: 'cash-outline' },
  { key: 'addCost', label: 'Additional Cost', unit: '₱/ha', icon: 'add-circle-outline' },
];
