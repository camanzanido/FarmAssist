import React from 'react';
import { Text, type TextStyle } from 'react-native';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${c(ar, br)}, ${c(ag, bg)}, ${c(ab, bb)})`;
}


export function colorAt(stops: readonly string[], t: number): string {
  if (stops.length === 1) return stops[0];
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  return mix(stops[i], stops[i + 1], scaled - i);
}

type Props = {
  text: string;
  colors: readonly string[];
  style?: TextStyle;
  numberOfLines?: number;
};

export function GradientText({ text, colors, style, numberOfLines }: Props) {
  const chars = Array.from(text);
  const last = Math.max(chars.length - 1, 1);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {chars.map((ch, i) => (
        <Text key={i} style={{ color: colorAt(colors, i / last) }}>{ch}</Text>
      ))}
    </Text>
  );
}
