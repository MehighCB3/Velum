import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { format, startOfISOWeek, endOfISOWeek, addWeeks, subWeeks } from 'date-fns';

interface WeekSelectorProps {
  currentDate: Date;
  onWeekChange: (date: Date) => void;
}

export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    (((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export function WeekSelector({ currentDate, onWeekChange }: WeekSelectorProps) {
  const weekStart = startOfISOWeek(currentDate);
  const weekEnd = endOfISOWeek(currentDate);
  const weekKey = getISOWeekKey(currentDate);

  const isCurrentWeek = getISOWeekKey(new Date()) === weekKey;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.arrow}
        onPress={() => onWeekChange(subWeeks(currentDate, 1))}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <View style={styles.labelContainer}>
        <Text style={styles.weekLabel}>{weekKey}</Text>
        <Text style={styles.dateRange}>
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
        </Text>
      </View>

      <Pressable
        style={[styles.arrow, isCurrentWeek && styles.arrowDisabled]}
        onPress={() => {
          if (!isCurrentWeek) onWeekChange(addWeeks(currentDate, 1));
        }}
        hitSlop={12}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isCurrentWeek ? colors.border : colors.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  arrow: {
    padding: 4,
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  labelContainer: {
    alignItems: 'center',
    minWidth: 140,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  dateRange: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },
});
