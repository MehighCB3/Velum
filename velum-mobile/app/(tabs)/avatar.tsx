import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { spacing, SCREEN_WIDTH } from '../../src/theme/spacing';
import { useAvatar } from '../../src/hooks/useAvatar';
import { AvatarSVG } from '../../src/components/AvatarSVG';
import { Card, DarkCard, SectionHeader } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { chatApi } from '../../src/api/client';
import { HealthSnapshot } from '../../src/types';

// ==================== METRIC HELPERS ====================

interface MetricItem {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function buildMetrics(health: HealthSnapshot): MetricItem[] {
  const items: MetricItem[] = [];

  if (health.weight) {
    items.push({
      label: 'Weight',
      value: `${health.weight}`,
      sub: 'kg',
      color: colors.accent,
    });
  }
  if (health.bodyFat) {
    items.push({
      label: 'Body Fat',
      value: `${health.bodyFat}`,
      sub: '%',
      color: colors.warning,
    });
  }
  if (health.vo2max) {
    items.push({
      label: 'VO2 Max',
      value: `${health.vo2max}`,
      sub: 'ml/kg/min',
      color: colors.info,
    });
  }
  if (health.hrv) {
    items.push({
      label: 'HRV',
      value: `${health.hrv}`,
      sub: 'ms',
      color: colors.purple,
    });
  }
  if (health.sleepHours) {
    items.push({
      label: 'Sleep',
      value: `${health.sleepHours}`,
      sub: 'hrs avg',
      color: colors.purple,
    });
  }
  if (health.stressAvg) {
    items.push({
      label: 'Stress',
      value: `${health.stressAvg}`,
      sub: 'avg',
      color: colors.error,
    });
  }
  if (health.recoveryAvg) {
    items.push({
      label: 'Recovery',
      value: `${health.recoveryAvg}`,
      sub: 'avg',
      color: colors.success,
    });
  }
  if (health.trainingLoad) {
    items.push({
      label: 'Training Load',
      value: `${health.trainingLoad}`,
      sub: 'total',
      color: colors.run,
    });
  }

  // Always show these with progress
  items.push({
    label: 'Steps',
    value: `${(health.stepsToday || 0).toLocaleString()}`,
    sub: `/ ${health.stepsGoal.toLocaleString()}`,
    color: colors.steps,
  });
  items.push({
    label: 'Runs',
    value: `${health.runsThisWeek}`,
    sub: `/ ${health.runsGoal} this week`,
    color: colors.run,
  });
  items.push({
    label: 'Calories',
    value: `${health.caloriesToday || 0}`,
    sub: `/ ${health.caloriesGoal}`,
    color: colors.calories,
  });
  items.push({
    label: 'Protein',
    value: `${health.proteinToday || 0}g`,
    sub: `/ ${health.proteinGoal}g`,
    color: colors.protein,
  });
  if (health.budgetSpent !== null) {
    items.push({
      label: 'Budget',
      value: `€${Math.round(health.budgetSpent)}`,
      sub: `/ €${health.budgetTotal}`,
      color: colors.food,
    });
  }

  return items;
}

// ==================== CHAT MESSAGE ====================

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// ==================== SCREEN ====================

export default function AvatarScreen() {
  const { avatar, loading, refresh } = useAvatar();
  const [refreshing, setRefreshing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const sendMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    try {
      // Build health context for the coach
      const healthSummary = avatar?.health
        ? `Weight: ${avatar.health.weight || '?'}kg, VO2: ${avatar.health.vo2max || '?'}, HRV: ${avatar.health.hrv || '?'}, Sleep: ${avatar.health.sleepHours || '?'}h, Steps: ${avatar.health.stepsToday || 0}/${avatar.health.stepsGoal}, Calories: ${avatar.health.caloriesToday || 0}/${avatar.health.caloriesGoal}`
        : '';

      const context = `[Avatar screen — bond level ${avatar?.bond.level || 1}] ${healthSummary}`;
      const response = await chatApi.send(msg, { context, agent: 'main' });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't connect right now. Try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, avatar]);

  if (loading && !avatar) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const metrics = avatar ? buildMetrics(avatar.health) : [];
  const avatarParams = avatar?.avatarParams || {
    warmth: 0,
    energy: 0,
    expression: 'neutral' as const,
    glow: 0,
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== Avatar Hero ===== */}
        <DarkCard style={styles.heroCard}>
          <AvatarSVG params={avatarParams} size={180} />
          <Text style={styles.bondLabel}>
            {avatar?.bond.label || 'Stranger'}
          </Text>
          <Text style={styles.bondScore}>
            Bond: {avatar?.bond.score || 0} · {avatar?.bond.streak || 0} day streak
          </Text>
          <Text style={styles.greeting}>
            {avatar?.greeting || 'Hello.'}
          </Text>
        </DarkCard>

        {/* ===== Health Metrics Grid ===== */}
        <SectionHeader title="Health Snapshot" />
        <View style={styles.metricsGrid}>
          {metrics.map((m, i) => (
            <Card key={i} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={[styles.metricValue, { color: m.color }]}>
                {m.value}
              </Text>
              {m.sub && <Text style={styles.metricSub}>{m.sub}</Text>}
            </Card>
          ))}
        </View>

        {/* ===== Insights ===== */}
        {avatar?.insights && avatar.insights.length > 0 && (
          <>
            <SectionHeader title="Insights" />
            {avatar.insights.map((insight, i) => (
              <AgentInsightCard key={i} insight={insight} />
            ))}
          </>
        )}

        {/* ===== Chat ===== */}
        <SectionHeader title="Ask Your Coach" />
        <Card style={styles.chatCard}>
          {chatMessages.length === 0 && (
            <Text style={styles.chatPlaceholder}>
              Ask about your data, goals, or anything on your mind.
            </Text>
          )}
          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.chatBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.chatText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {chatLoading && (
            <View style={styles.chatBubble}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
        </Card>

        <View style={{ height: spacing.bottomSpacer }} />
      </ScrollView>

      {/* ===== Chat Input ===== */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Message your coach..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          editable={!chatLoading}
        />
        <Pressable
          onPress={sendMessage}
          style={[styles.sendButton, (!chatInput.trim() || chatLoading) && styles.sendDisabled]}
          disabled={!chatInput.trim() || chatLoading}
        >
          <Ionicons name="send" size={20} color={colors.card} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPaddingLarge,
    paddingTop: spacing.screenPaddingTop,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginTop: 8,
  },
  bondLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkText,
    marginTop: 12,
  },
  bondScore: {
    fontSize: 13,
    color: colors.darkTextSecondary,
    marginTop: 4,
  },
  greeting: {
    fontSize: 14,
    color: colors.darkTextSecondary,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: (SCREEN_WIDTH - spacing.screenPaddingLarge * 2 - 10) / 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 1,
  },

  // Chat
  chatCard: {
    minHeight: 80,
  },
  chatPlaceholder: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  chatBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: '85%',
    backgroundColor: colors.subtle,
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.subtle,
    alignSelf: 'flex-start',
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: colors.card,
  },
  assistantText: {
    color: colors.text,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingLarge,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.card,
    borderRadius: 21,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
