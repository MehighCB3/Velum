import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ArcRingProps {
  pct: number;       // 0–100
  size?: number;
  stroke?: number;
  fg?: string;
  bg?: string;
  children?: React.ReactNode;
}

export function ArcRing({
  pct,
  size = 72,
  stroke = 7,
  fg = '#b86a3a',
  bg = 'rgba(255,255,255,0.08)',
  children,
}: ArcRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.min(Math.max(pct, 0), 100);
  const offset = circumference * (1 - safePct / 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bg}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Foreground arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fg}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children && (
        <View style={[styles.center, { width: size, height: size }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
