import { BrandGradient } from '@/src/constants/colors';
import React, { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  active: boolean;
  radius: number;
  width?: number;
  // Card colour while active; the view keeps it as its own background so Android elevation still casts a shadow.
  fill: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// A card whose outline turns into a brand-gradient stroke while active.
// The stroke is an SVG drawn behind the children, so the card's own layout and content are never wrapped or clipped.
export function GradientBorder({ active, radius, width = 1.5, fill, style, children }: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Absolute children are placed inside the border, so pull the SVG out over it to cover the full card.
  const border = StyleSheet.flatten(style)?.borderWidth ?? 0;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w !== size?.w || h !== size?.h) setSize({ w, h });
  };

  return (
    <View style={[style, active && { borderColor: 'transparent', backgroundColor: fill }]} onLayout={onLayout}>
      {active && size && (
        <Svg width={size.w} height={size.h} style={[s.stroke, { top: -border, left: -border }]} pointerEvents="none">
          <Defs>
            <LinearGradient id={`gb${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={BrandGradient[0]} />
              <Stop offset="0.5" stopColor={BrandGradient[1]} />
              <Stop offset="1" stopColor={BrandGradient[2]} />
            </LinearGradient>
          </Defs>
          <Rect
            x={width / 2}
            y={width / 2}
            width={size.w - width}
            height={size.h - width}
            rx={Math.max(radius - width / 2, 0)}
            fill="none"
            stroke={`url(#gb${id})`}
            strokeWidth={width}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  stroke: { position: 'absolute' },
});
