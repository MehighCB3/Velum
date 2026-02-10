import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, current, goal, color, unit = 'g' }: MacroBarProps) {
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const remaining = Math.max(goal - current, 0);
  const isOver = current > goal;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, isOver && styles.overValue]}>
          {Math.round(current)}{unit} / {goal}{unit}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: isOver ? colors.error : color,
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.remaining}>
        {isOver
          ? `${Math.round(current - goal)}${unit} over`
          : `${Math.round(remaining)}${unit} remaining`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  value: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  overValue: {
    color: colors.error,
  },
  barBackground: {
    height: 6,
    backgroundColor: colors.hover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  remaining: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
});
