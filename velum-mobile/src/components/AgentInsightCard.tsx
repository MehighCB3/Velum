import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AgentInsight } from '../types';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

const borderColors: Record<string, string> = {
  nudge: colors.border,
  alert: colors.warning,
  celebration: colors.success,
};

export function AgentInsightCard({ insight }: { insight: AgentInsight }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const borderColor = borderColors[insight.type] || colors.border;

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <Text style={styles.emoji}>{insight.emoji}</Text>
      <View style={styles.content}>
        <Text style={styles.text}>
          <Text style={styles.agent}>{insight.agent}</Text>{' '}
          {insight.insight}
        </Text>
        {insight.updatedAt && (
          <Text style={styles.timestamp}>{timeAgo(insight.updatedAt)}</Text>
        )}
      </View>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <Ionicons name="close" size={14} color={colors.textLight} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.sidebar,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 16,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  agent: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
});
