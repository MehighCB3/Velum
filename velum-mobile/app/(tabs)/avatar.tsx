import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { colors } from '../../src/theme/colors';
import { spacing, SCREEN_WIDTH } from '../../src/theme/spacing';
import { useAvatar } from '../../src/hooks/useAvatar';
import { AvatarSVG } from '../../src/components/AvatarSVG';
import { Card, DarkCard, SectionHeader } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { chatApi, nutritionApi } from '../../src/api/client';
import { API_BASE } from '../../src/api/config';
import { HealthSnapshot } from '../../src/types';

// ==================== AGENT ROUTING ====================

const NUTRITION_RE = /eat|ate|food|meal|calorie|protein|carb|fat|breakfast|lunch|dinner|snack|cook|recipe|hungry|diet|macro|pizza|chicken|rice|egg|salad|fruit/i;
const BUDGET_RE = /spent|expense|cost|paid|pay|buy|bought|€|euro|budget|money|cash|bill|invoice|price/i;

function detectAgent(message: string): 'main' | 'nutry' | 'budgy' {
  if (NUTRITION_RE.test(message)) return 'nutry';
  if (BUDGET_RE.test(message)) return 'budgy';
  return 'main';
}

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
  if (health.sleepScore) {
    items.push({
      label: 'Sleep Score',
      value: `${health.sleepScore}`,
      sub: '/ 100',
      color: colors.info,
    });
  }
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

// ==================== BOND RING ====================

const RING_SIZE = 210;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function BondRing({ score, children }: { score: number; children: React.ReactNode }) {
  const progress = Math.min(score / 100, 1);
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={ringStyles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={ringStyles.svg}>
        {/* Background track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.darkInner}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.accent}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={ringStyles.inner}>
        {children}
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ==================== FOOD SCAN RESULT ====================

interface ScanResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

// ==================== CHAT MESSAGE ====================

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  photoUri?: string;
}

// ==================== SCREEN ====================

export default function AvatarScreen() {
  const { avatar, loading, error, refresh } = useAvatar();
  const [refreshing, setRefreshing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load chat history on mount
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
        // Silently fail — just show empty chat
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [historyLoaded]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // ===== Camera scan =====
  const handleScanFood = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission required', 'Please allow camera access in Settings to scan food.');
      return;
    }

    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets?.[0]?.base64) return;

    const asset = picked.assets[0];

    // Show photo in chat as user message
    setChatMessages(prev => [...prev, { role: 'user', content: 'Scanning food...', photoUri: asset.uri }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/nutrition/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg = `Server error (${res.status})`;
        try { const j = JSON.parse(errBody); if (j.error) errMsg = j.error; } catch { /* not JSON */ }
        throw new Error(errMsg);
      }

      const json = await res.json();
      const result = json.result as ScanResult | undefined;

      if (!result) throw new Error(json.error || 'No result from AI');

      // Log the meal automatically
      const today = format(new Date(), 'yyyy-MM-dd');
      const time = format(new Date(), 'HH:mm');
      await nutritionApi.addEntry(today, {
        id: `${Date.now()}`,
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        time,
        photoUrl: asset.uri,
      });

      // Show result in chat
      const summary = `Logged: ${result.name}\n${result.calories} kcal | ${result.protein}g P | ${result.carbs}g C | ${result.fat}g F`;
      setChatMessages(prev => [...prev, { role: 'assistant', content: summary }]);

      // Refresh avatar to update health snapshot
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze photo';
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Scan failed: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [refresh]);

  // ===== Send message with smart routing =====
  const sendMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);

    try {
      // Build health context for the coach
      const healthSummary = avatar?.health
        ? `Weight: ${avatar.health.weight || '?'}kg, VO2: ${avatar.health.vo2max || '?'}, HRV: ${avatar.health.hrv || '?'}, Sleep: ${avatar.health.sleepHours || '?'}h, Steps: ${avatar.health.stepsToday || 0}/${avatar.health.stepsGoal}, Calories: ${avatar.health.caloriesToday || 0}/${avatar.health.caloriesGoal}, Budget: €${avatar.health.budgetSpent ?? '?'}/€${avatar.health.budgetTotal}`
        : '';

      const agent = detectAgent(msg);
      const context = `[Avatar screen — bond level ${avatar?.bond.level || 1}] ${healthSummary}`;
      const response = await chatApi.send(msg, { context, agent });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response.content }]);

      // Refresh avatar data after a data-writing message
      if (agent !== 'main') {
        setTimeout(() => refresh(), 2000);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I couldn't connect right now. Try again in a moment." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, avatar, refresh]);

  // Auto-scroll to bottom when new chat messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages.length]);

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
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== Avatar Hero ===== */}
        <DarkCard style={styles.heroCard}>
          <BondRing score={avatar?.bond.score || 0}>
            <AvatarSVG params={avatarParams} size={170} />
          </BondRing>
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
          {chatMessages.length === 0 && !historyLoaded && (
            <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 16 }} />
          )}
          {chatMessages.length === 0 && historyLoaded && (
            <Text style={styles.chatPlaceholder}>
              Ask about your data, goals, or snap a food photo to log a meal.
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
              {msg.photoUri && (
                <Image
                  source={{ uri: msg.photoUri }}
                  style={styles.chatPhoto}
                  resizeMode="cover"
                />
              )}
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
        <Pressable
          onPress={handleScanFood}
          style={[styles.cameraButton, chatLoading && styles.sendDisabled]}
          disabled={chatLoading}
        >
          <Ionicons name="camera" size={22} color={colors.accent} />
        </Pressable>
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
  chatPhoto: {
    width: 180,
    height: 120,
    borderRadius: 10,
    marginBottom: 6,
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
    gap: 8,
  },
  cameraButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
