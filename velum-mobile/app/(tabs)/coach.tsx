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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../src/theme/colors';
import { useAvatar } from '../../src/hooks/useAvatar';
import { TekyIcon } from '../../src/components/TekyIcon';
import { chatApi, insightsApi, coachApi, nutritionApi } from '../../src/api/client';
import { AgentInsight, HealthSnapshot } from '../../src/types';
import { API_BASE } from '../../src/api/config';
import {
  cacheChatMessage,
  cacheChatMessages,
  getCachedChatMessages,
} from '../../src/db/database';

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
      value: `${cals}/${calGoal.toLocaleString()}`,
      color: colors.accentWarm,
    },
    {
      label: 'Sleep',
      value: sleep ? `${sleep}h` : '--',
      color: colors.purple,
    },
    {
      label: 'Steps',
      value: steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`,
      color: colors.accent,
    },
    {
      label: 'Budget',
      value: `\u20AC${Math.round(budgetTotal - budgetSpent)}`,
      color: colors.green,
    },
  ];
}

// ==================== QUICK ACTIONS ====================

const QUICK_ACTIONS = [
  'How am I doing?',
  'Log my lunch',
  'Suggest dinner',
  'Weekly review',
  'What should I train?',
];

// ==================== CHAT MESSAGE ====================

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  responseTimeMs?: number;
}

// ==================== COACH SCREEN ====================

export default function CoachScreen() {
  const { avatar, loading, error, refresh } = useAvatar();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [metricsExpanded, setMetricsExpanded] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Derived state
  const metrics = avatar ? buildCoachMetrics(avatar.health) : [];

  // Load insights
  useEffect(() => {
    insightsApi.getAll().then(setInsights).catch(() => {});
  }, []);

  // Load chat history: SQLite cache first (instant), then server (authoritative)
  useEffect(() => {
    if (historyLoaded) return;
    (async () => {
      try {
        const cached = await getCachedChatMessages('main', 50);
        if (cached.length > 0) {
          setChatMessages(
            cached
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role, content: m.content, responseTimeMs: m.responseTimeMs })),
          );
        }
      } catch { /* SQLite unavailable */ }

      try {
        const history = await chatApi.getHistory('main', 50);
        if (history.length > 0) {
          setChatMessages(
            history
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role, content: m.content })),
          );
          cacheChatMessages(
            history.map((m) => ({
              id: m.id || `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              sessionKey: 'main',
              role: m.role as 'user' | 'assistant',
              content: m.content,
              source: m.source || 'gateway',
              createdAt: m.timestamp || new Date().toISOString(),
            })),
          ).catch(() => {});
        }
      } catch {
        // Server unavailable — SQLite cache is already loaded
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

    const now = new Date().toISOString();
    if (!text) setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    setMetricsExpanded(false);

    cacheChatMessage({
      id: `${Date.now()}-user`,
      sessionKey: 'main',
      role: 'user',
      content: msg,
      source: 'local',
      createdAt: now,
    }).catch(() => {});

    try {
      const healthSummary = avatar?.health
        ? `Weight: ${avatar.health.weight || '?'}kg, Sleep: ${avatar.health.sleepHours || '?'}h, Steps: ${avatar.health.stepsToday || 0}/${avatar.health.stepsGoal}, Calories: ${avatar.health.caloriesToday || 0}/${avatar.health.caloriesGoal}, Budget: \u20AC${avatar.health.budgetSpent ?? '?'}/\u20AC${avatar.health.budgetTotal}`
        : '';

      const agent = detectAgent(msg);
      const context = `[Coach screen \u2014 bond level ${avatar?.bond.level || 1}] ${healthSummary}`;
      const response = await coachApi.sendMessage(msg, { context, agent });

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        responseTimeMs: response.responseTimeMs,
      }]);

      cacheChatMessage({
        id: `${Date.now()}-assistant`,
        sessionKey: 'main',
        role: 'assistant',
        content: response.content,
        source: response.source || 'gateway',
        agent,
        responseTimeMs: response.responseTimeMs,
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      setTimeout(() => {
        refresh();
        insightsApi.getAll().then(setInsights).catch(() => {});
      }, 1000);
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

  // Camera: take or pick a photo and analyze it for nutrition
  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to snap food photos.');
      return;
    }

    Alert.alert('Log food', 'How would you like to add a photo?', [
      {
        text: 'Take photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            base64: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0].base64) {
            analyzePhoto(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
          }
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            base64: true,
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0].base64) {
            analyzePhoto(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const analyzePhoto = useCallback(async (base64: string, mimeType: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content: '[Sent a food photo for analysis]' }]);
    setChatLoading(true);

    cacheChatMessage({
      id: `${Date.now()}-photo-user`,
      sessionKey: 'main',
      role: 'user',
      content: '[Sent a food photo for analysis]',
      source: 'local',
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    try {
      const response = await fetch(`${API_BASE}/api/nutrition/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!response.ok) throw new Error(`Photo analysis failed (${response.status})`);

      const data = await response.json();
      const food = data.result;

      if (food) {
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date();
        const timeStr = `${String(nowTime.getHours()).padStart(2, '0')}:${String(nowTime.getMinutes()).padStart(2, '0')}`;

        await nutritionApi.addEntry(today, {
          id: `${Date.now()}-photo`,
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          time: timeStr,
        });

        const summary = `${food.name} — ${food.calories} kcal, ${food.protein}g protein, ${food.carbs}g carbs, ${food.fat}g fat`;
        const confidence = food.confidence === 'high' ? '' : ` (${food.confidence} confidence)`;
        const assistantContent = `Logged: ${summary}${confidence}${food.note ? `\n${food.note}` : ''}`;

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantContent,
        }]);

        cacheChatMessage({
          id: `${Date.now()}-photo-assistant`,
          sessionKey: 'main',
          role: 'assistant',
          content: assistantContent,
          source: 'local',
          createdAt: new Date().toISOString(),
        }).catch(() => {});

        setTimeout(() => {
          refresh();
          insightsApi.getAll().then(setInsights).catch(() => {});
        }, 1000);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: "Couldn't identify the food in that photo. Try again with better lighting, or type what you ate.",
        }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to analyze the photo. Check your connection and try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [refresh]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [chatMessages.length]);

  // Scroll to bottom when keyboard opens
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
      {/* ═══════ DARK HEADER BAR ═══════ */}
      <View style={styles.darkHeader}>
        {/* Avatar */}
        <View style={styles.headerAvatarWrap}>
          <TekyIcon size={44} />
          <View style={styles.onlineDot} />
        </View>

        {/* Name + subtitle */}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Teky</Text>
          <Text style={styles.headerSub}>your life coach {'\u00B7'} online</Text>
        </View>

        {/* Status chips */}
        <View style={styles.headerChips}>
          {avatar?.health && (
            <>
              <View style={[styles.statusChip, { borderColor: `${colors.green}60`, backgroundColor: `${colors.green}18` }]}>
                <Text style={[styles.statusChipText, { color: colors.success }]}>
                  {avatar.health.sleepHours ? `${avatar.health.sleepHours}h sleep` : 'online'}
                </Text>
              </View>
              {(avatar.health.caloriesToday || 0) < (avatar.health.caloriesGoal || 2600) * 0.5 && (
                <View style={[styles.statusChip, { borderColor: `${colors.accentWarm}60`, backgroundColor: `${colors.accentWarm}18` }]}>
                  <Text style={[styles.statusChipText, { color: colors.accentWarm }]}>
                    calories low
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* ═══════ COLLAPSIBLE METRICS STRIP ═══════ */}
      {metrics.length > 0 && (
        <Pressable
          style={styles.metricsStrip}
          onPress={() => setMetricsExpanded(!metricsExpanded)}
        >
          {metricsExpanded ? (
            <View style={styles.metricsExpandedRow}>
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
          ) : (
            <View style={styles.metricsCollapsedRow}>
              {metrics.map((mt) => (
                <View key={mt.label} style={styles.metricPill}>
                  <Text style={styles.metricPillText}>{mt.value}</Text>
                </View>
              ))}
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </View>
          )}
        </Pressable>
      )}

      {/* ═══════ CHAT AREA ═══════ */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Agent Insights (compact) */}
        {insights.length > 0 && chatMessages.length === 0 && (
          <View style={styles.insightsCompact}>
            {insights.slice(0, 2).map((ins, i) => (
              <View key={`${ins.agent}-${i}`} style={styles.insightChip}>
                <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                <Text style={styles.insightText} numberOfLines={2}>{ins.insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Messages */}
        {chatMessages.length === 0 && !historyLoaded && (
          <ActivityIndicator size="small" color={colors.accent} style={{ paddingVertical: 20 }} />
        )}
        {chatMessages.length === 0 && historyLoaded && (
          <View style={styles.emptyChat}>
            <TekyIcon size={64} />
            <Text style={styles.emptyChatTitle}>Hey there!</Text>
            <Text style={styles.emptyChatSub}>
              Ask Teky about your data, goals, or anything on your mind.
            </Text>
          </View>
        )}
        {chatMessages.map((msg, i) => {
          const isFirst = i === 0 || chatMessages[i - 1].role !== msg.role;
          return (
            <View key={i}>
              <View
                style={[
                  styles.msgRow,
                  msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant,
                ]}
              >
                {msg.role === 'assistant' && isFirst && (
                  <View style={styles.msgAvatar}>
                    <TekyIcon size={26} />
                  </View>
                )}
                {msg.role === 'assistant' && !isFirst && (
                  <View style={{ width: 33 }} />
                )}
                <View
                  style={[
                    styles.msgBubble,
                    msg.role === 'user' ? styles.msgBubbleUser : styles.msgBubbleAssistant,
                    msg.role === 'assistant' && isFirst && styles.msgBubbleFirst,
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
              {msg.role === 'assistant' && msg.responseTimeMs != null && (
                <Text style={styles.responseTime}>
                  {msg.responseTimeMs < 1000
                    ? `${msg.responseTimeMs}ms`
                    : `${(msg.responseTimeMs / 1000).toFixed(1)}s`}
                </Text>
              )}
            </View>
          );
        })}
        {chatLoading && (
          <View style={[styles.msgRow, styles.msgRowAssistant]}>
            <View style={styles.msgAvatar}>
              <TekyIcon size={26} />
            </View>
            <View style={[styles.msgBubble, styles.msgBubbleAssistant, styles.msgBubbleFirst]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          </View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ═══════ QUICK REPLY CHIPS ═══════ */}
      {chatMessages.length <= 2 && (
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
      )}

      {/* ═══════ INPUT BAR ═══════ */}
      <View style={styles.inputBar}>
        <Pressable
          onPress={handleCamera}
          style={styles.cameraButton}
          disabled={chatLoading}
        >
          <Ionicons name="camera-outline" size={20} color={chatLoading ? colors.muted : colors.textSub} />
        </Pressable>
        <TextInput
          style={styles.textInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Message Teky\u2026"
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
          <Ionicons name="send" size={16} color="#fff" />
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

  // ═══════ Dark Header ═══════
  darkHeader: {
    backgroundColor: colors.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d8eef5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.dark,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  headerChips: {
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-end',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // ═══════ Metrics Strip ═══════
  metricsStrip: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  metricsExpandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricsCollapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricPill: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  metricPillText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSub,
  },

  // ═══════ Chat ═══════
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptyChatSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 24,
  },
  insightsCompact: {
    gap: 6,
    marginBottom: 12,
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightEmoji: {
    fontSize: 14,
  },
  insightText: {
    fontSize: 12,
    color: colors.faint,
    lineHeight: 17,
    flex: 1,
  },
  msgRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAssistant: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#d8eef5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    marginBottom: 2,
  },
  msgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
  },
  msgBubbleUser: {
    backgroundColor: colors.text,
    borderBottomRightRadius: 4,
  },
  msgBubbleAssistant: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgBubbleFirst: {
    borderTopLeftRadius: 4,
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
  responseTime: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1,
    marginLeft: 40,
    marginBottom: 4,
  },

  // ═══════ Quick Actions ═══════
  quickActionsScroll: {
    flexGrow: 0,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  quickActionsContent: {
    paddingHorizontal: 14,
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },

  // ═══════ Input Bar ═══════
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  cameraButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.6,
  },
});
