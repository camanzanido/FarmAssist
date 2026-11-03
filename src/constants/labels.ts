import { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';
import type { UserType } from '@/src/auth/types';
import { labelCopy } from './copy';

// --- Types ---
export type DecisionType = 'crop_choice' | 'crop_variety' | 'protect';
export type FieldGroup = 'yield' | 'cost' | 'addCost';

// --- Data ---
// English constants for admin screens and exports; field-user screens read the same text in the chosen language via useCopy().
export const ROLE_LABEL: Record<UserType, string> = labelCopy.roleLabel;
export const ROLE_SHORT: Record<UserType, string> = labelCopy.roleShort;
export const ROLE_TAG: Record<UserType, string> = labelCopy.roleTag;

export const PLACEHOLDERS = labelCopy.placeholders as Record<DecisionType, string[]>;

export const DECISION_IMAGES: Record<DecisionType, ImageSourcePropType> = {
  crop_choice: require('@/assets/images/crop_choice.jpg'),
  crop_variety: require('@/assets/images/crop_choice.jpg'),
  protect: require('@/assets/images/apply_or_not_apply.jpg'),
};

export const DECISION_LABELS: Record<DecisionType, string> = labelCopy.decisionLabels;

export interface DecisionInfo {
  id: DecisionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

export const DECISION_ICONS: Record<DecisionType, keyof typeof Ionicons.glyphMap> = {
  crop_choice: 'leaf-outline',
  crop_variety: 'git-compare-outline',
  protect: 'rainy-outline',
};

const DECISION_ORDER: DecisionType[] = ['crop_choice', 'crop_variety', 'protect'];

// The decisions a user can start today, worded in the given language's labels.
export function decisionsIn(labels: Pick<typeof labelCopy, 'decisionLabels' | 'decisionDescriptions'>): DecisionInfo[] {
  return DECISION_ORDER.map(id => ({
    id,
    icon: DECISION_ICONS[id],
    label: labels.decisionLabels[id],
    description: labels.decisionDescriptions[id],
  }));
}

export const DECISIONS: DecisionInfo[] = decisionsIn(labelCopy);

export const CLIMATES: readonly string[] = labelCopy.climates;

export interface FieldConfigItem {
  key: FieldGroup;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const FIELD_CONFIG: FieldConfigItem[] = [
  { key: 'yield', label: labelCopy.fieldLabels.yield, unit: 'kg/ha', icon: 'trending-up-outline' },
  { key: 'cost', label: labelCopy.fieldLabels.cost, unit: '₱/ha', icon: 'cash-outline' },
  { key: 'addCost', label: labelCopy.fieldLabels.addCost, unit: '₱/ha', icon: 'add-circle-outline' },
];
