import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

interface MacroWheelProps {
  kcal: number;
  kcalGoal: number;
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

export function MacroWheel({
  kcal,
  kcalGoal,
  protein,
  carbs,
  fat,
  size = 160,
}: MacroWheelProps) {
  const r = size * 0.4;
  const stroke = 10;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = protein + carbs + fat || 1;

  const arcs = [
    { val: protein, color: colors.accentWarm },
    { val: carbs, color: colors.carbsGreen },
    { val: fat, color: colors.fatBlue },
  ];

  let arcOffset = 0;
  const arcSegments = arcs.map((a) => {
    const seg = (a.val / total) * circ * 0.88;
    const o = arcOffset;
    arcOffset += seg + circ * 0.04;
    return { ...a, seg, offset: o };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={colors.borderLight}
          strokeWidth={stroke}
        />
        {/* Colored arcs */}
        {arcSegments.map((a, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={stroke}
            strokeDasharray={`${a.seg} ${circ}`}
            strokeDashoffset={-a.offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.kcalValue}>{kcal}</Text>
        <Text style={styles.kcalLabel}>of {kcalGoal} kcal</Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.5,
    lineHeight: 36,
  },
  kcalLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
});
