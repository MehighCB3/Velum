import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useFitness } from '../../src/hooks/useFitness';
import { useInsights } from '../../src/hooks/useInsights';
import { DarkCard, Card, SectionHeader, EmptyState } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { InsightBanner, InsightItem } from '../../src/components/InsightBanner';
import { ProgressRing } from '../../src/components/ProgressRing';
import { WeekSelector } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { FitnessEntryType } from '../../src/types';

// Safe number formatter — avoids Hermes toLocaleString() crashes on Android
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return String(n);
}

const fitnessFields: FormField[] = [
  {
    key: 'type', label: 'Activity Type', placeholder: '', type: 'select', required: true,
    options: [
      { label: 'Steps', value: 'steps' },
      { label: 'Run', value: 'run' },
      { label: 'Swim', value: 'swim' },
      { label: 'Cycle', value: 'cycle' },
      { label: 'Jiu-Jitsu', value: 'jiujitsu' },
      { label: 'Gym', value: 'gym' },
      { label: 'Other', value: 'other' },
    ],
  },
  { key: 'name', label: 'Activity Name', placeholder: 'e.g. Morning run', type: 'text' },
  { key: 'steps', label: 'Steps', placeholder: '0', type: 'number' },
  { key: 'duration', label: 'Duration (min)', placeholder: '0', type: 'number' },
  { key: 'distance', label: 'Distance (km)', placeholder: '0', type: 'number' },
  { key: 'calories', label: 'Calories Burned', placeholder: '0', type: 'number' },
  { key: 'notes', label: 'Notes', placeholder: 'Optional notes...', type: 'text' },
];

export default function FitnessScreen() {
  const [weekDate, setWeekDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const { data, loading, refresh, addEntry, deleteEntry } = useFitness(weekDate);
  const { insights } = useInsights();
  const fitnessInsights = insights.filter((i) => i.section === 'fitness');

  const handleAddEntry = useCallback(
    async (values: Record<string, string>) => {
      const entry: Record<string, unknown> = { type: values.type };
      if (values.name) entry.name = values.name;
      if (values.steps) entry.steps = Number(values.steps);
      if (values.duration) entry.duration = Number(values.duration);
      if (values.distance) entry.distance = Number(values.distance);
      if (values.calories) entry.calories = Number(values.calories);
      if (values.notes) entry.notes = values.notes;
      await addEntry(entry as { type: FitnessEntryType });
      setShowAddModal(false);
    },
    [addEntry],
  );

  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      Alert.alert('Delete Entry', 'Remove this activity?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entryId) },
      ]);
    },
    [deleteEntry],
  );

  const entries = data?.entries ?? [];
  const totals = data?.totals ?? { steps: 0, runs: 0, swims: 0, cycles: 0, jiujitsu: 0, totalDistance: 0, totalCalories: 0 };
  const goals = data?.goals ?? { steps: 10000, runs: 3, swims: 2 };

  const stepsToday = entries
    .filter((e) => e.type === 'steps' && e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.steps || 0), 0);

  // Computed insights
  const computedInsights: InsightItem[] = [];
  const stepsPercent = goals.steps > 0 ? stepsToday / goals.steps : 0;
  if (stepsPercent >= 1) {
    computedInsights.push({ emoji: '🎉', text: `Step goal smashed! ${fmt(stepsToday)} steps today.`, tone: 'positive' });
  } else if (stepsToday > 0) {
    computedInsights.push({ emoji: '🚶', text: `${fmt(stepsToday)} steps today — ${Math.round(stepsPercent * 100)}% of your ${(goals.steps / 1000).toFixed(0)}k goal.`, tone: 'neutral' });
  }
  const totalSessions = totals.runs + totals.swims + totals.cycles + totals.jiujitsu;
  if (totalSessions >= 5) {
    computedInsights.push({ emoji: '💪', text: `${totalSessions} workouts this week — outstanding consistency!`, tone: 'positive' });
  } else if (totalSessions > 0) {
    computedInsights.push({ emoji: '📊', text: `${totalSessions} workout${totalSessions !== 1 ? 's' : ''} this week · ${totals.totalDistance.toFixed(1)} km total distance.`, tone: 'neutral' });
  }

  // Health data tiles
  const healthTiles = [
    ...(data.advanced?.avgVo2max ? [{ icon: '🫁', label: 'VO₂ Max', val: `${data.advanced.avgVo2max} ml/kg`, color: colors.info }] : []),
    ...(data.advanced?.latestHrv ? [{ icon: '💓', label: 'HRV', val: `${data.advanced.latestHrv}ms`, color: colors.warning }] : []),
    ...(data.advanced?.avgRecovery ? [{ icon: '⚡', label: 'Recovery', val: data.advanced.recoveryStatus || 'Good', color: colors.success }] : []),
    ...(data.advanced?.totalTrainingLoad ? [{ icon: '🏋️', label: 'Training Load', val: data.advanced.totalTrainingLoad > 6 ? 'High' : 'Moderate', color: colors.accent }] : []),
    ...(data.advanced?.latestWeight ? [{ icon: '⚖️', label: 'Weight', val: `${data.advanced.latestWeight}kg`, color: colors.textLight }] : []),
    ...(data.advanced?.latestBodyFat ? [{ icon: '📏', label: 'Body Fat', val: `${data.advanced.latestBodyFat}%`, color: colors.textLight }] : []),
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <WeekSelector currentDate={weekDate} onWeekChange={setWeekDate} />

        {/* Unified Fitness Widget — single DarkCard per v2 spec */}
        <DarkCard style={styles.unifiedCard}>
          {/* Section A — Activity Rings */}
          <View style={styles.ringRow}>
            {[
              { label: 'Steps', val: stepsToday >= 1000 ? `${(stepsToday / 1000).toFixed(1)}k` : `${stepsToday}`, pct: goals.steps > 0 ? stepsToday / goals.steps : 0 },
              { label: 'Runs', val: `${totals.runs}`, pct: goals.runs > 0 ? totals.runs / goals.runs : 0 },
              { label: 'Swims', val: `${totals.swims}`, pct: goals.swims > 0 ? totals.swims / goals.swims : 0 },
              { label: 'Cycles', val: `${totals.cycles}`, pct: totals.cycles > 0 ? 1 : 0 },
            ].map((a) => (
              <View key={a.label} style={styles.ringItem}>
                <ProgressRing progress={a.pct} size={42} strokeWidth={4} color={colors.accent} value={a.val} />
                <Text style={styles.ringLabel}>{a.label}</Text>
              </View>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section B — Key Stats */}
          <View style={styles.statsRow}>
            {[
              { val: totals.totalDistance.toFixed(1), unit: 'km', label: 'Distance' },
              { val: `${totals.totalCalories}`, unit: 'kcal', label: 'Burned' },
              { val: `${totals.jiujitsu}`, unit: '', label: 'BJJ' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>
                  {s.val}
                  {s.unit ? <Text style={styles.statUnit}> {s.unit}</Text> : null}
                </Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Section C — Health Data Tiles */}
          {healthTiles.length > 0 && (
            <>
              <View style={[styles.divider, { marginTop: 14 }]} />
              <Text style={styles.healthHeader}>HEALTH DATA</Text>
              <View style={styles.healthGrid}>
                {healthTiles.map((h) => (
                  <View key={h.label} style={styles.healthTile}>
                    <Text style={styles.healthIcon}>{h.icon}</Text>
                    <View>
                      <Text style={styles.healthTileLabel}>{h.label}</Text>
                      <Text style={[styles.healthTileValue, { color: h.color }]}>{h.val}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </DarkCard>

        {/* Insights */}
        {computedInsights.length > 0 && <InsightBanner insights={computedInsights} />}
        {fitnessInsights.map((insight) => (
          <AgentInsightCard key={insight.agentId} insight={insight} />
        ))}

        {/* Activity Log */}
        <SectionHeader
          title="Activities"
          action={{ label: '+ Add', onPress: () => setShowAddModal(true) }}
        />

        {entries.length === 0 ? (
          <EmptyState icon="🏃" title="No activities logged" subtitle="Tap + Add to log your workout" />
        ) : (
          entries.map((entry) => (
            <Pressable key={entry.id} onLongPress={() => handleDeleteEntry(entry.id)}>
              <Card style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>
                      {entry.name || entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                    </Text>
                    <Text style={styles.activityDetail}>
                      {entry.type === 'steps' ? `${fmt(entry.steps || 0)} steps`
                        : entry.duration ? `${entry.duration} min` : ''}
                      {entry.distance ? ` · ${entry.distance} km` : ''}
                      {entry.calories ? ` · ${entry.calories} cal` : ''}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{entry.date.slice(5)}</Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color={colors.darkText} />
      </Pressable>

      <AddEntryModal
        visible={showAddModal}
        title="Log Activity"
        fields={fitnessFields}
        onSubmit={handleAddEntry}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  unifiedCard: { padding: 16, marginBottom: 8 },
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 },
  ringItem: { alignItems: 'center' },
  ringLabel: { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.text, marginBottom: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.darkText },
  statUnit: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  statLabel: { fontSize: 10, color: colors.darkTextMuted, marginTop: 2 },
  healthHeader: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  healthTile: {
    width: '47%', backgroundColor: colors.darkInner, borderRadius: 10,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  healthIcon: { fontSize: 14 },
  healthTileLabel: { fontSize: 10, color: colors.darkTextMuted },
  healthTileValue: { fontSize: 13, fontWeight: '600' },
  activityCard: { marginBottom: 6, padding: 14 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: '600', color: colors.text },
  activityDetail: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  activityTime: { fontSize: 11, color: colors.textLight },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
});
