import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useAvatar } from '../../src/hooks/useAvatar';
import { AvatarSVG } from '../../src/components/AvatarSVG';
import { chatApi, insightsApi, coachApi } from '../../src/api/client';
import { AgentInsight, HealthSnapshot } from '../../src/types';
import { timeAgo } from '../../src/utils/timeAgo';

// ==================== RELATIONSHIP STATES ====================

const REL_STATES = [
  { key: 'distant', label: 'Getting to know you', emoji: '\u{1F311}', avatarBg: '#d8d3cc', avatarAccent: '#b5b0a8' },
  { key: 'neutral', label: 'Building rapport', emoji: '\u{1F313}', avatarBg: '#e4d9cd', avatarAccent: '#e8a85c' },
  { key: 'warm', label: 'In sync', emoji: '\u{1F315}', avatarBg: '#f0e4d4', avatarAccent: '#c4956a' },
  { key: 'bonded', label: 'Deep connection', emoji: '\u{2726}', avatarBg: '#f5e8d0', avatarAccent: '#c4956a' },
] as const;

// Map bond level (1-5) to relationship state index (0-3)
function bondToRelState(bondLevel: number): number {
  if (bondLevel <= 1) return 0;
  if (bondLevel <= 2) return 1;
  if (bondLevel <= 3) return 2;
  return 3;
}

// ==================== AGENT ROUTING ====================

const NUTRITION_RE = /eat|ate|food|meal|calorie|protein|carb|fat|breakfast|lunch|dinner|snack|cook|recipe|hungry|diet|macro|pizza|chicken|rice|egg|salad|fruit/i;
const BUDGET_RE = /spent|expense|cost|paid|pay|buy|bought|€|euro|budget|money|cash|bill|invoice|price/i;

function detectAgent(message: string): 'main' | 'nutry' | 'budgy' {
  if (NUTRITION_RE.test(message)) return 'nutry';
  if (BUDGET_RE.test(message)) return 'budgy';
  return 'main';
}

// ==================== METRICS BUILDER ====================

interface CoachMetric {
  label: string;
  value: string;
  target: string;
  pct: number;
  color: string;
}

function buildCoachMetrics(health: HealthSnapshot): CoachMetric[] {
  const cals = health.caloriesToday || 0;
  const calGoal = health.caloriesGoal || 2600;
  const steps = health.stepsToday || 0;
  const stepGoal = health.stepsGoal || 10000;
  const budgetSpent = health.budgetSpent ?? 0;
  const budgetTotal = health.budgetTotal || 70;
  const sleep = health.sleepHours || 0;

  return [
    {
      label: 'Calories',
      value: cals.toLocaleString(),
      target: calGoal.toLocaleString(),
      pct: Math.round((cals / calGoal) * 100),
      color: colors.fat,
    },
    {
      label: 'Sleep',
      value: sleep ? `${sleep}` : '--',
      target: '8',
      pct: Math.round((sleep / 8) * 100),
      color: colors.purple,
    },
    {
      label: 'Steps',
      value: steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`,
      target: stepGoal >= 1000 ? `${(stepGoal / 1000).toFixed(0)}k` : `${stepGoal}`,
      pct: Math.round((steps / stepGoal) * 100),
      color: colors.accent,
    },
    {
      label: 'Budget',
      value: `\u20AC${Math.round(budgetSpent)}`,
      target: `\u20AC${budgetTotal}`,
      pct: Math.round(Math.max(0, ((budgetTotal - budgetSpent) / budgetTotal) * 100)),
      color: colors.success,
    },
  ];
}

// ==================== QUICK ACTIONS ====================

const QUICK_ACTIONS = [
  'How am I doing?',
  'Log my lunch',
  'Suggest dinner',
  'Weekly review',
];

// ==================== CHAT MESSAGE ====================

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// ==================== COACH SCREEN ====================

export default function CoachScreen() {
  const { avatar, loading, error, refresh } = useAvatar();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Derived state
  const relStateIdx = avatar ? bondToRelState(avatar.bond.level) : 0;
  const rel = REL_STATES[relStateIdx];
  const metrics = avatar ? buildCoachMetrics(avatar.health) : [];
  const avatarParams = avatar?.avatarParams || {
    warmth: 0,
    energy: 0,
    expression: 'neutral' as const,
    glow: 0,
  };

  // Load insights
  useEffect(() => {
    insightsApi.getAll().then(setInsights).catch(() => {});
  }, []);

  // Load chat history
  useEffect(() => {
    if (historyLoaded) return;
    (async () => {
      try {
        const history = await chatApi.getHistory('main', 30);
        if (history.length > 0) {
          setChatMessages(
            history
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role, content: m.content })),
          );
        }
      } catch {
        // Silently fail — show empty chat
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [historyLoaded]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refresh(),
      insightsApi.getAll().then(setInsights).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [refresh]);

  // Send message with smart agent routing
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;

    if (!text) setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    try {
      const healthSummary = avatar?.health
        ? `Weight: ${avatar.health.weight || '?'}kg, Sleep: ${avatar.health.sleepHours || '?'}h, Steps: ${avatar.health.stepsToday || 0}/${avatar.health.stepsGoal}, Calories: ${avatar.health.caloriesToday || 0}/${avatar.health.caloriesGoal}, Budget: \u20AC${avatar.health.budgetSpent ?? '?'}/\u20AC${avatar.health.budgetTotal}`
        : '';

      const agent = detectAgent(msg);
      const context = `[Coach screen \u2014 bond level ${avatar?.bond.level || 1}] ${healthSummary}`;
      const response = await coachApi.sendMessage(msg, { context, agent });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.content }]);

      // Refresh data after any logged entry or domain-specific messages
      if (response.logged || agent !== 'main') {
        setTimeout(() => refresh(), 1500);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn\u2019t connect right now. Try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, avatar, refresh]);

  const handleSend = useCallback(() => sendMessage(), [sendMessage]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [chatMessages.length]);

  // Scroll to bottom when keyboard opens so chat stays visible
  useEffect(() => {
    const sub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      },
    );
    return () => sub.remove();
  }, []);

  // ==================== LOADING / ERROR ====================

  if (loading && !avatar) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && !avatar) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
        <Text style={styles.errorTitle}>Couldn't load coach data</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ==================== RENDER ====================

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══════ SECTION 1: Avatar ═══════ */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { shadowColor: rel.avatarAccent }]}>
            <AvatarSVG params={avatarParams} size={110} />
            {/* Status dot */}
            <View style={[
              styles.statusDot,
              { backgroundColor: relStateIdx >= 2 ? colors.success : colors.muted },
            ]} />
          </View>
          <Text style={styles.coachName}>Archie</Text>
          <View style={styles.relRow}>
            <Text style={styles.relText}>
              {rel.emoji} {rel.label}
            </Text>
            <Text style={styles.relDot}>{'\u00B7'}</Text>
            <Text style={styles.relText}>
              {avatar?.bond.streak || 0} day streak
            </Text>
          </View>
        </View>

        {/* ═══════ SECTION 2: Metrics Strip ═══════ */}
        <View style={styles.metricsStrip}>
          {metrics.map((mt, i) => (
            <View
              key={mt.label}
              style={[
                styles.metricItem,
                i < metrics.length - 1 && styles.metricDivider,
              ]}
            >
              <Text style={styles.metricValue}>{mt.value}</Text>
              <Text style={[styles.metricLabel, { color: mt.color }]}>{mt.label}</Text>
            </View>
          ))}
        </View>

        {/* ═══════ SECTION 3: Agent Insights ═══════ */}
        {insights.length > 0 && (
          <View style={styles.insightsCard}>
            {/* Header */}
            <Pressable
              style={styles.insightsHeader}
              onPress={() => setInsightsExpanded(!insightsExpanded)}
            >
              <View style={styles.insightsHeaderLeft}>
                <Text style={styles.insightsIcon}>{'\u{1F4A1}'}</Text>
                <Text style={styles.insightsTitle}>Agent Insights</Text>
                <View style={styles.insightsBadge}>
                  <Text style={styles.insightsBadgeText}>{insights.length}</Text>
                </View>
              </View>
              <Text style={[
                styles.expandIcon,
                insightsExpanded && styles.expandIconRotated,
              ]}>
                {'\u25BE'}
              </Text>
            </Pressable>

            {/* Expanded Content */}
            {insightsExpanded && (
              <View style={styles.insightsContent}>
                {insights.map((ins, i) => (
                  <View
                    key={`${ins.agent}-${i}`}
                    style={[styles.insightItem, i > 0 && styles.insightItemBorder]}
                  >
                    <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                    <View style={styles.insightBody}>
                      <View style={styles.insightRow}>
                        <Text style={styles.insightAgent}>{ins.agent}</Text>
                        {ins.updatedAt && (
                          <Text style={styles.insightTime}>{timeAgo(ins.updatedAt)}</Text>
                        )}
                      </View>
                      <Text style={styles.insightText}>{ins.insight}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══════ SECTION 4: Chat ═══════ */}
        <View style={styles.chatContainer}>
          {/* Messages */}
          {chatMessages.length === 0 && !historyLoaded && (
            <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 20 }} />
          )}
          {chatMessages.length === 0 && historyLoaded && (
            <Text style={styles.chatPlaceholder}>
              Ask Archie about your data, goals, or anything on your mind.
            </Text>
          )}
          {chatMessages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.msgRow,
                msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant,
              ]}
            >
              <View
                style={[
                  styles.msgBubble,
                  msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.msgText,
                    msg.role === 'user' ? styles.msgTextUser : styles.msgTextAssistant,
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}
          {chatLoading && (
            <View style={[styles.msgRow, styles.msgRowAssistant]}>
              <View style={[styles.msgBubble, styles.msgBubbleAssistant]}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActionsContent}
        >
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action}
              style={styles.quickChip}
              onPress={() => sendMessage(action)}
              disabled={chatLoading}
            >
              <Text style={styles.quickChipText}>{action}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: spacing.bottomSpacer }} />
      </ScrollView>

      {/* ═══════ Input Bar (fixed at bottom) ═══════ */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Ask your coach\u2026"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!chatLoading}
        />
        <Pressable
          onPress={handleSend}
          style={[
            styles.sendButton,
            (!chatInput.trim() || chatLoading) && styles.sendDisabled,
          ]}
          disabled={!chatInput.trim() || chatLoading}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
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

  // Loading / Error
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ═══════ Avatar Section ═══════
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.subtle,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.bg,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  relText: {
    fontSize: 11,
    color: colors.dimmed,
  },
  relDot: {
    marginHorizontal: 6,
    color: colors.border,
    fontSize: 11,
  },

  // ═══════ Metrics Strip ═══════
  metricsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 8,
    marginTop: 3,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ═══════ Insights ═══════
  insightsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  insightsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsIcon: {
    fontSize: 14,
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  insightsBadge: {
    backgroundColor: colors.subtle,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
  },
  insightsBadgeText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 14,
    color: colors.muted,
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  insightsContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  insightItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  insightEmoji: {
    fontSize: 16,
    marginTop: 1,
  },
  insightBody: {
    flex: 1,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  insightAgent: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  insightTime: {
    fontSize: 9,
    color: colors.muted,
  },
  insightText: {
    fontSize: 12,
    color: colors.faint,
    lineHeight: 17,
  },

  // ═══════ Chat ═══════
  chatContainer: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 160,
    padding: 14,
    paddingBottom: 8,
  },
  chatPlaceholder: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  msgRow: {
    marginBottom: 10,
  },
  msgRowUser: {
    alignItems: 'flex-end',
  },
  msgRowAssistant: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleUser: {
    backgroundColor: colors.text,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
  },
  msgBubbleAssistant: {
    backgroundColor: colors.subtle,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 14,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  msgTextUser: {
    color: '#fff',
  },
  msgTextAssistant: {
    color: colors.text,
  },

  // ═══════ Quick Actions ═══════
  quickActionsScroll: {
    marginTop: 10,
    marginBottom: 4,
  },
  quickActionsContent: {
    gap: 8,
  },
  quickChip: {
    backgroundColor: colors.subtle,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: 11,
    color: colors.faint,
    fontWeight: '500',
  },

  // ═══════ Input Bar ═══════
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPaddingLarge,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
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
