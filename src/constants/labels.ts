import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';

// --- Types ---
export type DecisionType = 'crop_choice' | 'crop_variety' | 'protect' | 'harvest';
export type FieldGroup = 'yield' | 'cost' | 'addCost';

// --- Data ---
export const PLACEHOLDERS: Record<DecisionType, [string, string]> = {
  crop_choice: ['e.g. Rice IR64', 'e.g. Corn OPV'],
  crop_variety: ['e.g. NSIC Rc222', 'e.g. NSIC Rc160'],
  protect: ['e.g. Cover from Rain', 'e.g. Leave Uncovered'],
  harvest: ['e.g. Harvest Now', 'e.g. Delay 2 Weeks'],
};

export const DECISION_IMAGES: Record<DecisionType, ImageSourcePropType> = {
  crop_choice: require('@/assets/images/crop_choice.jpg'),
  crop_variety: require('@/assets/images/crop_choice.jpg'),
  protect: require('@/assets/images/apply_or_not_apply.jpg'),
  harvest: require('@/assets/images/harvest_decision.webp'),
};

export const DECISION_LABELS: Record<DecisionType, string> = {
  crop_choice: 'Crop Choice',
  crop_variety: 'Crop Variety',
  protect: 'Protect from Rain',
  harvest: 'Harvest Decision',
};

export interface DecisionInfo {
  id: DecisionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  legacy?: boolean;
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

// Retired types that saved decisions may still carry; shown and filtered, never offered in the wizard.
export const LEGACY_DECISIONS: DecisionInfo[] = [
  {
    id: 'harvest',
    icon: 'cut-outline',
    label: DECISION_LABELS.harvest,
    description: 'Decide whether to harvest now or delay based on expected returns.',
    legacy: true,
  },
];

export const ALL_DECISIONS: DecisionInfo[] = [...DECISIONS, ...LEGACY_DECISIONS];

export const DECISION_ICONS = Object.fromEntries(ALL_DECISIONS.map(d => [d.id, d.icon])) as Record<DecisionType, keyof typeof Ionicons.glyphMap>;

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
