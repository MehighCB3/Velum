import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useGoals } from '../../src/hooks/useGoals';
import { useInsights } from '../../src/hooks/useInsights';
import { DarkCard, Card, EmptyState } from '../../src/components/Card';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { GoalHorizon, Goal } from '../../src/types';

const HORIZONS: { key: GoalHorizon; label: string; icon: string }[] = [
  { key: 'year', label: 'Year', icon: '🎯' },
  { key: '3years', label: '3 Yrs', icon: '🗓️' },
  { key: '5years', label: '5 Yrs', icon: '🌟' },
  { key: '10years', label: '10 Yrs', icon: '🏔️' },
  { key: 'bucket', label: 'Bucket', icon: '✨' },
];

const goalFields: FormField[] = [
  { key: 'title', label: 'Goal Title', placeholder: 'e.g. Run a marathon', type: 'text', required: true },
  { key: 'area', label: 'Area', placeholder: 'e.g. Health, Career, Skills', type: 'text', required: true },
  { key: 'objective', label: 'Objective', placeholder: 'What does success look like?', type: 'text' },
  { key: 'keyMetric', label: 'Key Metric', placeholder: 'e.g. Distance, Revenue', type: 'text' },
  { key: 'targetValue', label: 'Target Value', placeholder: '0', type: 'number' },
  { key: 'unit', label: 'Unit', placeholder: 'e.g. km, €, hours', type: 'text' },
  {
    key: 'horizon',
    label: 'Horizon',
    placeholder: '',
    type: 'select',
    required: true,
    options: HORIZONS.map((h) => ({ label: `${h.icon} ${h.label}`, value: h.key })),
  },
];

export default function GoalsScreen() {
  const { goals, loading, refresh, createGoal, updateProgress, markComplete, removeGoal } =
    useGoals();
  const { insights: aiInsights } = useInsights('tasks');
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon>('year');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState('');

  // Cross-platform progress input modal
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('');

  const filteredGoals = goals.filter((g) => g.horizon === activeHorizon);
  const completedCount = filteredGoals.filter(
    (g) => g.completedAt || (g.targetValue > 0 && g.currentValue >= g.targetValue),
  ).length;
  const totalWithMetric = filteredGoals.filter((g) => g.targetValue > 0);
  const overallProgress =
    totalWithMetric.length > 0
      ? totalWithMetric.reduce(
          (sum, g) => sum + Math.min(g.currentValue / g.targetValue, 1),
          0,
        ) / totalWithMetric.length
      : 0;

  const handleAddGoal = useCallback(
    async (values: Record<string, string>) => {
      await createGoal({
        title: values.title,
        area: values.area,
        objective: values.objective || '',
        keyMetric: values.keyMetric || '',
        targetValue: Number(values.targetValue) || 0,
        unit: values.unit || '',
        horizon: (values.horizon as GoalHorizon) || activeHorizon,
      });
      setShowAddModal(false);
    },
    [createGoal, activeHorizon],
  );

  const handleDeleteGoal = useCallback(
    (goal: Goal) => {
      Alert.alert('Delete Goal', `Remove "${goal.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeGoal(goal.id) },
      ]);
    },
    [removeGoal],
  );

  const handleProgressSubmit = useCallback(() => {
    if (!progressGoal) return;
    const num = Number(progressValue);
    if (!isNaN(num)) {
      updateProgress(progressGoal.id, num);
    }
    setProgressGoal(null);
    setProgressValue('');
  }, [progressGoal, progressValue, updateProgress]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        {/* Horizon Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <View style={styles.tabsRow}>
            {HORIZONS.map((h) => (
              <Pressable
                key={h.key}
                style={[styles.tab, activeHorizon === h.key && styles.tabActive]}
                onPress={() => setActiveHorizon(h.key)}
              >
                <Text style={styles.tabIcon}>{h.icon}</Text>
                <Text
                  style={[styles.tabLabel, activeHorizon === h.key && styles.tabLabelActive]}
                >
                  {h.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Hero Summary */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroNumber}>{filteredGoals.length}</Text>
              <Text style={styles.heroLabel}>Goals</Text>
            </View>
            <View style={[styles.heroStat, styles.heroStatCenter]}>
              <Text style={[styles.heroNumber, { color: colors.accent }]}>
                {Math.round(overallProgress * 100)}%
              </Text>
              <Text style={styles.heroLabel}>Progress</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroNumber, { color: colors.success }]}>
                {completedCount}
              </Text>
              <Text style={styles.heroLabel}>Done</Text>
            </View>
          </View>
          {/* Overall progress bar */}
          <View style={styles.heroBarTrack}>
            <View
              style={[
                styles.heroBarFill,
                { width: `${Math.min(overallProgress * 100, 100)}%` },
              ]}
            />
          </View>
        </DarkCard>

        {aiInsights.length > 0 && (
          <View style={styles.insightsSection}>
            {aiInsights.map((ai) => (
              <AgentInsightCard key={ai.agentId} insight={ai} />
            ))}
          </View>
        )}

        {/* Goals List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {HORIZONS.find((h) => h.key === activeHorizon)?.icon}{' '}
            {HORIZONS.find((h) => h.key === activeHorizon)?.label} Goals
          </Text>
          <Pressable onPress={() => setShowAddModal(true)}>
            <Text style={styles.addLink}>+ Add</Text>
          </Pressable>
        </View>

        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={HORIZONS.find((h) => h.key === activeHorizon)?.icon || '🎯'}
            title="No goals yet"
            subtitle="Tap + to set your first goal"
          />
        ) : (
          <Card style={styles.goalList}>
            {filteredGoals.map((goal, idx) => {
              const progress =
                goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
              const isComplete =
                !!goal.completedAt ||
                (goal.targetValue > 0 && goal.currentValue >= goal.targetValue);
              const isExpanded = expandedId === goal.id;
              const isEditing = editingGoalId === goal.id;

              return (
                <View key={goal.id}>
                  <Pressable
                    style={[
                      styles.goalRow,
                      idx < filteredGoals.length - 1 && !isExpanded && styles.goalRowBorder,
                    ]}
                    onPress={() => setExpandedId(isExpanded ? null : goal.id)}
                    onLongPress={() => handleDeleteGoal(goal)}
                  >
                    {/* Left: check or ring */}
                    <View style={styles.goalIcon}>
                      {isComplete ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                      ) : goal.targetValue > 0 ? (
                        <View style={styles.miniRing}>
                          <Text style={styles.miniRingText}>
                            {Math.round(Math.min(progress, 1) * 100)}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.bulletDot} />
                      )}
                    </View>

                    {/* Middle: title + area */}
                    <View style={styles.goalInfo}>
                      <Text
                        style={[styles.goalTitle, isComplete && styles.goalTitleComplete]}
                        numberOfLines={1}
                      >
                        {goal.title}
                      </Text>
                      {goal.targetValue > 0 && (
                        <View style={styles.goalBarTrack}>
                          <View
                            style={[
                              styles.goalBarFill,
                              {
                                width: `${Math.min(progress * 100, 100)}%`,
                                backgroundColor: isComplete ? colors.success : colors.accent,
                              },
                            ]}
                          />
                        </View>
                      )}
                    </View>

                    {/* Right: area badge */}
                    <View style={styles.areaBadge}>
                      <Text style={styles.areaText}>{goal.area}</Text>
                    </View>
                  </Pressable>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.expandedSection,
                        idx < filteredGoals.length - 1 && styles.goalRowBorder,
                      ]}
                    >
                      {goal.objective ? (
                        <Text style={styles.goalObjective}>{goal.objective}</Text>
                      ) : null}

                      {goal.targetValue > 0 && (
                        <View style={styles.metricRow}>
                          <Text style={styles.metricText}>
                            {goal.unit === '€'
                              ? `€${goal.currentValue}`
                              : `${goal.currentValue} ${goal.unit}`}
                          </Text>
                          <Text style={styles.metricSlash}>/</Text>
                          <Text style={styles.metricTarget}>
                            {goal.unit === '€'
                              ? `€${goal.targetValue}`
                              : `${goal.targetValue} ${goal.unit}`}
                          </Text>
                          <Text style={styles.metricPercent}>
                            {Math.round(Math.min(progress, 1) * 100)}%
                          </Text>
                        </View>
                      )}

                      {/* Action buttons */}
                      {!isComplete && !isEditing && (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={styles.actionBtn}
                            onPress={() => {
                              setProgressGoal(goal);
                              setProgressValue(String(goal.currentValue));
                            }}
                          >
                            <Ionicons name="trending-up" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Update Progress</Text>
                          </Pressable>
                          <Pressable
                            style={styles.actionBtnOutline}
                            onPress={() => {
                              setEditingGoalId(goal.id);
                              setInlineValue(String(goal.currentValue));
                            }}
                          >
                            <Ionicons name="pencil" size={14} color={colors.textLight} />
                            <Text style={styles.actionBtnOutlineText}>Quick Edit</Text>
                          </Pressable>
                          <Pressable
                            style={styles.actionBtnOutline}
                            onPress={() => markComplete(goal.id)}
                          >
                            <Ionicons name="checkmark" size={14} color={colors.success} />
                            <Text style={[styles.actionBtnOutlineText, { color: colors.success }]}>
                              Complete
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      {/* Inline quick edit */}
                      {!isComplete && isEditing && (
                        <View style={styles.inlineEditRow}>
                          <TextInput
                            style={styles.inlineInput}
                            value={inlineValue}
                            onChangeText={setInlineValue}
                            keyboardType="decimal-pad"
                            placeholder={`Current ${goal.unit}`}
                            placeholderTextColor={colors.textLight}
                            autoFocus
                            onSubmitEditing={() => {
                              const num = Number(inlineValue);
                              if (!isNaN(num)) updateProgress(goal.id, num);
                              setEditingGoalId(null);
                              setInlineValue('');
                            }}
                          />
                          <Pressable
                            style={styles.inlineSaveBtn}
                            onPress={() => {
                              const num = Number(inlineValue);
                              if (!isNaN(num)) updateProgress(goal.id, num);
                              setEditingGoalId(null);
                              setInlineValue('');
                            }}
                          >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </Pressable>
                          <Pressable
                            style={styles.inlineCancelBtn}
                            onPress={() => {
                              setEditingGoalId(null);
                              setInlineValue('');
                            }}
                          >
                            <Ionicons name="close" size={16} color={colors.textLight} />
                          </Pressable>
                        </View>
                      )}

                      {isComplete && (
                        <View style={styles.completeBanner}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                          <Text style={styles.completeBannerText}>Goal completed</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color={colors.darkText} />
      </Pressable>

      <AddEntryModal
        visible={showAddModal}
        title="New Goal"
        fields={goalFields}
        onSubmit={handleAddGoal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Progress update modal */}
      <Modal visible={!!progressGoal} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setProgressGoal(null);
              setProgressValue('');
            }}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Update Progress</Text>
              <Text style={styles.modalSub}>
                {progressGoal?.title}
              </Text>

              {/* Current → Target visual */}
              {progressGoal && progressGoal.targetValue > 0 && (
                <View style={styles.modalMetric}>
                  <Text style={styles.modalMetricCurrent}>
                    {progressGoal.currentValue}
                  </Text>
                  <Text style={styles.modalMetricArrow}> → </Text>
                  <Text style={styles.modalMetricTarget}>
                    {progressGoal.targetValue} {progressGoal.unit}
                  </Text>
                </View>
              )}

              <TextInput
                style={styles.modalInput}
                value={progressValue}
                onChangeText={setProgressValue}
                keyboardType="decimal-pad"
                placeholder="New value"
                placeholderTextColor={colors.textLight}
                autoFocus
                onSubmitEditing={handleProgressSubmit}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalCancel}
                  onPress={() => {
                    setProgressGoal(null);
                    setProgressValue('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSubmit} onPress={handleProgressSubmit}>
                  <Text style={styles.modalSubmitText}>Update</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Tabs
  tabsScroll: { marginBottom: 10 },
  tabsRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  tabIcon: { fontSize: 13 },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  tabLabelActive: { color: colors.darkText },

  // Hero card
  heroCard: { padding: 16, marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatCenter: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderLeftColor: colors.darkInner, borderRightColor: colors.darkInner,
  },
  heroNumber: { fontSize: 24, fontWeight: '700', color: colors.darkText },
  heroLabel: { fontSize: 10, color: colors.darkTextMuted, marginTop: 2, letterSpacing: 0.3 },
  heroBarTrack: {
    height: 4, backgroundColor: colors.darkInner, borderRadius: 2, overflow: 'hidden',
  },
  heroBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  insightsSection: { marginBottom: 8 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textLight, letterSpacing: 0.3 },
  addLink: { fontSize: 13, fontWeight: '600', color: colors.accent },

  // Goals list
  goalList: { padding: 0, overflow: 'hidden' },
  goalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  goalRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  goalIcon: { width: 28, alignItems: 'center' },
  miniRing: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  miniRingText: { fontSize: 8, fontWeight: '700', color: colors.accent },
  bulletDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textLight,
  },
  goalInfo: { flex: 1 },
  goalTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  goalTitleComplete: { textDecorationLine: 'line-through', color: colors.textLight },
  goalBarTrack: {
    height: 3, backgroundColor: colors.hover, borderRadius: 2,
    marginTop: 4, overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 2 },
  areaBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, backgroundColor: colors.hover,
  },
  areaText: { fontSize: 10, color: colors.textLight, fontWeight: '500' },

  // Expanded section
  expandedSection: {
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 0,
    backgroundColor: colors.hover,
  },
  goalObjective: { fontSize: 12, color: colors.textLight, marginBottom: 8 },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  metricText: { fontSize: 16, fontWeight: '700', color: colors.text },
  metricSlash: { fontSize: 13, color: colors.textLight },
  metricTarget: { fontSize: 13, color: colors.textLight },
  metricPercent: {
    fontSize: 12, fontWeight: '600', color: colors.accent,
    marginLeft: 'auto',
  },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: colors.accent,
  },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionBtnOutlineText: { fontSize: 11, fontWeight: '600', color: colors.textLight },

  // Inline edit
  inlineEditRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineInput: {
    flex: 1, paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1.5, borderColor: colors.accent,
    fontSize: 14, color: colors.text, backgroundColor: colors.bg,
  },
  inlineSaveBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Complete banner
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 8, backgroundColor: 'rgba(110,200,122,0.1)',
  },
  completeBannerText: { fontSize: 12, fontWeight: '600', color: colors.success },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },

  // Progress modal
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 24,
  },
  modalSheet: {
    backgroundColor: colors.bg, borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textLight, marginBottom: 12 },
  modalMetric: {
    flexDirection: 'row', alignItems: 'baseline',
    marginBottom: 14, gap: 4,
  },
  modalMetricCurrent: { fontSize: 20, fontWeight: '700', color: colors.accent },
  modalMetricArrow: { fontSize: 14, color: colors.textLight },
  modalMetricTarget: { fontSize: 14, color: colors.textLight },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 18,
    color: colors.text, backgroundColor: colors.card,
    textAlign: 'center', marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  modalSubmit: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
