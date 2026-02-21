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
import { Card, SectionHeader, EmptyState } from '../../src/components/Card';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { GoalHorizon, Goal } from '../../src/types';

const HORIZONS: { key: GoalHorizon; label: string; icon: string }[] = [
  { key: 'year', label: 'This Year', icon: '🎯' },
  { key: '3years', label: '3 Years', icon: '🗓️' },
  { key: '5years', label: '5 Years', icon: '🌟' },
  { key: '10years', label: '10 Years', icon: '🏔️' },
  { key: 'bucket', label: 'Bucket List', icon: '✨' },
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
    options: HORIZONS.map((h) => ({ label: h.label, value: h.key })),
  },
];

export default function GoalsScreen() {
  const { goals, loading, refresh, createGoal, updateProgress, markComplete, removeGoal } =
    useGoals();
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon>('year');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState('');

  // Cross-platform progress input modal (replaces iOS-only Alert.prompt)
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('');

  const filteredGoals = goals.filter((g) => g.horizon === activeHorizon);

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

  const handleGoalAction = useCallback(
    (goal: Goal) => {
      const isComplete = goal.completedAt || (goal.targetValue > 0 && goal.currentValue >= goal.targetValue);
      Alert.alert(goal.title, goal.objective || 'Choose an action', [
        { text: 'Cancel', style: 'cancel' },
        ...(isComplete
          ? []
          : [
              {
                text: 'Update Progress',
                onPress: () => {
                  setProgressGoal(goal);
                  setProgressValue(String(goal.currentValue));
                },
              },
              {
                text: 'Mark Complete',
                onPress: () => markComplete(goal.id),
              },
            ]),
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeGoal(goal.id),
        },
      ]);
    },
    [markComplete, removeGoal],
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            {HORIZONS.map((h) => (
              <Pressable
                key={h.key}
                style={[styles.tab, activeHorizon === h.key && styles.tabActive]}
                onPress={() => setActiveHorizon(h.key)}
              >
                <Text style={styles.tabIcon}>{h.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    activeHorizon === h.key && styles.tabLabelActive,
                  ]}
                >
                  {h.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.statsText}>
            {filteredGoals.filter((g) => g.completedAt).length} completed
          </Text>
        </View>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon={HORIZONS.find((h) => h.key === activeHorizon)?.icon || '🎯'}
            title="No goals yet"
            subtitle="Tap + to add your first goal"
          />
        ) : (
          filteredGoals.map((goal) => {
            const progress =
              goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
            const isComplete =
              !!goal.completedAt || (goal.targetValue > 0 && goal.currentValue >= goal.targetValue);

            return (
              <Card
                key={goal.id}
                style={[styles.goalCard, isComplete && styles.goalCardComplete]}
                onPress={() => handleGoalAction(goal)}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleRow}>
                    {isComplete && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    <Text
                      style={[styles.goalTitle, isComplete && styles.goalTitleComplete]}
                      numberOfLines={1}
                    >
                      {goal.title}
                    </Text>
                  </View>
                  <View style={styles.areaBadge}>
                    <Text style={styles.areaText}>{goal.area}</Text>
                  </View>
                </View>

                {goal.objective ? (
                  <Text style={styles.goalObjective} numberOfLines={2}>
                    {goal.objective}
                  </Text>
                ) : null}

                {goal.targetValue > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressText}>
                        {goal.unit === '€' ? `€${goal.currentValue} / €${goal.targetValue}` : `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`}
                      </Text>
                      <Text style={styles.progressPercent}>
                        {Math.round(Math.min(progress, 1) * 100)}%
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(progress * 100, 100)}%`,
                            backgroundColor: isComplete ? colors.success : colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Inline action buttons per v2 spec */}
                {!isComplete && (
                  editingGoalId === goal.id ? (
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
                        <Text style={styles.inlineSaveText}>Save</Text>
                      </Pressable>
                      <Pressable
                        style={styles.inlineCancelBtn}
                        onPress={() => { setEditingGoalId(null); setInlineValue(''); }}
                      >
                        <Text style={styles.inlineCancelText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.goalActions}>
                      <Pressable
                        style={styles.updateBtn}
                        onPress={() => {
                          setEditingGoalId(goal.id);
                          setInlineValue(String(goal.currentValue));
                        }}
                      >
                        <Text style={styles.updateBtnText}>Update Progress</Text>
                      </Pressable>
                      <Pressable
                        style={styles.editBtn}
                        onPress={() => handleGoalAction(goal)}
                      >
                        <Text style={styles.editBtnText}>Edit Goal</Text>
                      </Pressable>
                    </View>
                  )
                )}
              </Card>
            );
          })
        )}

        {/* Dashed Add Goal button per v2 spec */}
        <Pressable style={styles.addGoalDashed} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addGoalDashedText}>+ Add Goal</Text>
        </Pressable>

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

      {/* Cross-platform progress update modal */}
      <Modal visible={!!progressGoal} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.progressOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.progressSheet}>
            <Text style={styles.progressTitle}>Update Progress</Text>
            <Text style={styles.progressSub}>
              {progressGoal?.title} — {progressGoal?.currentValue} / {progressGoal?.targetValue} {progressGoal?.unit}
            </Text>
            <TextInput
              style={styles.progressInput}
              value={progressValue}
              onChangeText={setProgressValue}
              keyboardType="decimal-pad"
              placeholder="New value"
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            <View style={styles.progressButtons}>
              <Pressable
                style={styles.progressCancel}
                onPress={() => { setProgressGoal(null); setProgressValue(''); }}
              >
                <Text style={styles.progressCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.progressSubmit} onPress={handleProgressSubmit}>
                <Text style={styles.progressSubmitText}>Update</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  tabsContainer: { marginBottom: 12 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tabActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  tabLabelActive: { color: colors.darkText },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  statsText: { fontSize: 13, color: colors.textLight },
  goalCard: { marginBottom: 10 },
  goalCardComplete: { opacity: 0.75 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  goalTitleComplete: { textDecorationLine: 'line-through', color: colors.textLight },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.hover,
  },
  areaText: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  goalObjective: { fontSize: 13, color: colors.textLight, marginBottom: 8 },
  progressContainer: { marginTop: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontSize: 12, color: colors.textLight },
  progressPercent: { fontSize: 12, fontWeight: '600', color: colors.text },
  progressBar: {
    height: 6,
    backgroundColor: colors.hover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Progress update modal
  progressOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  progressSheet: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  progressTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  progressSub: { fontSize: 13, color: colors.textLight, marginBottom: 16 },
  progressInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.sidebar,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressButtons: { flexDirection: 'row', gap: 10 },
  progressCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  progressCancelText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  progressSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
  },
  progressSubmitText: { fontSize: 15, fontWeight: '700', color: colors.darkText },
  // Inline v2 goal action buttons
  goalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  updateBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  updateBtnText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  editBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  editBtnText: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  inlineEditRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  inlineInput: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inlineSaveBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  inlineSaveText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  inlineCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inlineCancelText: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  addGoalDashed: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: 8,
  },
  addGoalDashedText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
});
