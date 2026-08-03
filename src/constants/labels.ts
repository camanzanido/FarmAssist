import { Ionicons } from '@expo/vector-icons';

// --- Types ---
export type DecisionType = 'crop_choice' | 'harvest' | 'apply';
export type FieldGroup = 'yield' | 'cost' | 'addCost';

// --- Data ---
export const PLACEHOLDERS: Record<DecisionType, [string, string]> = {
  crop_choice: ['e.g. Rice IR64', 'e.g. Corn OPV'],
  harvest: ['e.g. Harvest Now', 'e.g. Delay 2 Weeks'],
  apply: ['e.g. Apply', 'e.g. Do Not Apply'],
};

export const DECISION_LABELS: Record<DecisionType, string> = {
  crop_choice: 'Crop Choice',
  harvest: 'Harvest Decision',
  apply: 'Apply or Not Apply',
};



export const DECISIONS = [
  {
    id: 'crop_choice' as DecisionType,
    icon: 'leaf-outline' as const,
    label: 'Crop Choice',
    description: 'Compare two crops to find the better option given climate risk.',
  },
  {
    id: 'harvest' as DecisionType,
    icon: 'cut-outline' as const,
    label: 'Harvest Decision',
    description: 'Decide whether to harvest now or delay based on expected returns.',
  },
  {
    id: 'apply' as DecisionType,
    icon: 'flask-outline' as const,
    label: 'Apply or Not Apply',
    description: 'Evaluate if applying an input (pesticide, fertilizer) is worth the cost.',
  },
];

export const CLIMATES = ['V. Dry', 'Dry', 'Average', 'Wet', 'V. Wet'] as const;

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
