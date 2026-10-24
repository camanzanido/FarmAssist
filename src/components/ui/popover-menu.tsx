import { cardShadow, Colors } from '@/src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

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
};

type Anchor = { top: number; right: number };

const MENU_WIDTH = 210;

// An icon button that opens a small menu anchored under it; tapping outside closes it.
export function PopoverMenu({ icon, accessibilityLabel, items, style }: Props) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

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
        onPress={open}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: !!anchor }}
      >
        <Ionicons name={icon} size={23} color={Colors.ink} />
      </TouchableOpacity>
      <Modal visible={!!anchor} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        {anchor && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(140)}
            exiting={reduceMotion ? undefined : FadeOut.duration(100)}
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
