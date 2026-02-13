import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export interface InsightItem {
  emoji: string;
  text: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'negative';
}

const toneColors: Record<string, string> = {
  neutral: colors.accent,
  positive: colors.success,
  warning: colors.warning,
  negative: colors.error,
};

export function InsightBanner({ insights }: { insights: InsightItem[] }) {
  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      {insights.map((item, i) => (
        <View
          key={i}
          style={[
            styles.row,
            { borderLeftColor: toneColors[item.tone || 'neutral'] },
          ]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.text}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emoji: {
    fontSize: 15,
  },
  text: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    flex: 1,
  },
});
