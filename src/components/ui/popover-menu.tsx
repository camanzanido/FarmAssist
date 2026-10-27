import { cardShadow, Colors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { EASE_OUT } from '@/src/constants/motion';
import Animated, { FadeOut, Keyframe, useReducedMotion } from 'react-native-reanimated';
import { MotionIcon, useIconMotion, type IconMotion } from './animated-icon';

// Grows from its top-right corner, where the trigger sits.
const MENU_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -6 }, { scale: 0.95 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: EASE_OUT },
}).duration(180);

export type PopoverItem = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  onPress: () => void;
};

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  items: PopoverItem[];
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  motion?: IconMotion;
};

type Anchor = { top: number; right: number };

const MENU_WIDTH = 210;

// An icon button that opens a small menu anchored under it; tapping outside closes it.
export function PopoverMenu({ icon, accessibilityLabel, items, style, iconSize = 23, motion = 'pop' }: Props) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const iconMotion = useIconMotion(motion);

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 6, right: Math.max(12, width - (x + w)) });
    });
  };
  const close = () => setAnchor(null);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[s.trigger, style]}
        onPressIn={iconMotion.play}
        onPress={open}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: !!anchor }}
      >
        <MotionIcon name={icon} size={iconSize} color={Colors.ink} style={iconMotion.style} />
      </TouchableOpacity>
      <Modal visible={!!anchor} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        {anchor && (
          <Animated.View
            entering={reduceMotion ? undefined : MENU_IN}
            exiting={reduceMotion ? undefined : FadeOut.duration(140)}
            style={[s.menu, { top: anchor.top, right: anchor.right }]}
            accessibilityRole="menu"
          >
            {items.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[s.item, i < items.length - 1 && s.itemBorder]}
                onPress={() => { close(); item.onPress(); }}
                activeOpacity={0.7}
                accessibilityRole="menuitem"
                accessibilityState={item.selected === undefined ? undefined : { selected: item.selected }}
              >
                {item.icon && <Ionicons name={item.icon} size={19} color={Colors.ink} />}
                <Text style={[s.itemLabel, item.selected && s.itemLabelSelected]}>{item.label}</Text>
                {item.selected && <Ionicons name="checkmark" size={18} color={Colors.ink} />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute', width: MENU_WIDTH,
    backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 4, ...cardShadow, elevation: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
  itemLabelSelected: { fontWeight: '800' },
});
