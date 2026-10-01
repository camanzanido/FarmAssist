import { brandGradientCss, Colors } from '@/src/constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export type FilterOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

type ChipLayout = { x: number; y: number; width: number; height: number };

const DURATION = 260;

export function AnimatedFilterBar<T extends string>({ options, selected, onSelect, style }: Props<T>) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [layouts, setLayouts] = useState<Partial<Record<T, ChipLayout>>>({});
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const placed = useRef(false);

  const target = layouts[selected];

  useEffect(() => {
    if (!target) return;
    const duration = placed.current && !reduceMotion ? DURATION : 0;
    const config = { duration, easing: Easing.out(Easing.cubic) };
    pillX.value = withTiming(target.x, config);
    pillWidth.value = withTiming(target.width, config);
    placed.current = true;
    scrollRef.current?.scrollTo({ x: Math.max(target.x - 24, 0), animated: !reduceMotion });
  }, [target, reduceMotion, pillX, pillWidth]);

  const onChipLayout = (value: T) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setLayouts(prev => {
      const old = prev[value];
      if (old && old.x === x && old.y === y && old.width === width && old.height === height) return prev;
      return { ...prev, [value]: { x, y, width, height } };
    });
  };

  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    transform: [{ translateX: pillX.value }],
    opacity: pillWidth.value > 0 ? 1 : 0,
  }));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[s.row, style]}
      accessibilityRole="tablist"
    >
      <Animated.View pointerEvents="none" style={[s.pill, target && { top: target.y, height: target.height }, pillStyle]} />
      {options.map(o => (
        <FilterChip
          key={o.value}
          label={o.label}
          isSelected={o.value === selected}
          onPress={() => onSelect(o.value)}
          onLayout={onChipLayout(o.value)}
        />
      ))}
    </ScrollView>
  );
}

type ChipProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
};

// Chip colours stay plain React styles: an animated colour can be overwritten by a slow re-render committing after the slide ends.
function FilterChip({ label, isSelected, onPress, onLayout }: ChipProps) {
  return (
    <Pressable onPress={onPress} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: isSelected }}>
      <View style={[s.chip, isSelected && s.chipSelected]}>
        <Text style={[s.chipText, isSelected && s.chipTextSelected]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: { position: 'absolute', top: 0, left: 0, borderRadius: 999, experimental_backgroundImage: brandGradientCss(90) },
  chip: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { borderColor: 'transparent' },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.inkMuted },
  chipTextSelected: { fontWeight: '700', color: Colors.onDark },
});
