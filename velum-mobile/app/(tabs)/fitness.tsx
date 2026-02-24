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
import { DarkCard, Card, EmptyState } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { ProgressRing } from '../../src/components/ProgressRing';
import { WeekSelector } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { ScreenTitle } from '../../src/components/ScreenTitle';
import { FAB } from '../../src/components/FAB';
import { FitnessEntryType } from '../../src/types';
import { fmt } from '../../src/utils/formatters';

const ACTIVITY_ICONS: Record<string, string> = {
  steps: '🚶', run: '🏃', swim: '🏊', cycle: '🚴',
  jiujitsu: '🥋', gym: '💪', other: '⚡',
};

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
  const { insights: fitnessInsights } = useInsights('fitness');

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
  const rawTotals = data?.totals;
  const totals = {
    steps: Number(rawTotals?.steps) || 0,
    runs: Number(rawTotals?.runs) || 0,
    swims: Number(rawTotals?.swims) || 0,
    cycles: Number(rawTotals?.cycles) || 0,
    jiujitsu: Number(rawTotals?.jiujitsu) || 0,
    totalDistance: Number(rawTotals?.totalDistance) || 0,
    totalCalories: Number(rawTotals?.totalCalories) || 0,
  };
  const rawGoals = data?.goals;
  const goals = {
    steps: Number(rawGoals?.steps) || 10000,
    runs: Number(rawGoals?.runs) || 3,
    swims: Number(rawGoals?.swims) || 2,
  };

  const stepsToday = entries
    .filter((e) => e.type === 'steps' && e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.steps || 0), 0);

  // Health data tiles — from watch/advanced metrics
  const adv = data?.advanced;
  const healthTiles = [
    ...(adv?.avgVo2max ? [{ icon: '🫁', label: 'VO2 Max', val: `${adv.avgVo2max}`, unit: 'ml/kg', color: colors.info }] : []),
    ...(adv?.latestHrv ? [{ icon: '💓', label: 'HRV', val: `${adv.latestHrv}`, unit: 'ms', color: colors.warning }] : []),
    ...(adv?.avgRecovery ? [{ icon: '⚡', label: 'Recovery', val: adv.recoveryStatus || 'Good', unit: '', color: colors.success }] : []),
    ...(adv?.totalTrainingLoad ? [{ icon: '🏋️', label: 'Load', val: adv.totalTrainingLoad > 6 ? 'High' : 'Moderate', unit: '', color: colors.accent }] : []),
    ...(adv?.latestWeight ? [{ icon: '⚖️', label: 'Weight', val: `${adv.latestWeight}`, unit: 'kg', color: colors.textLight }] : []),
    ...(adv?.latestBodyFat ? [{ icon: '📏', label: 'Body Fat', val: `${adv.latestBodyFat}`, unit: '%', color: colors.textLight }] : []),
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
        <ScreenTitle title="Fitness" />

        <WeekSelector currentDate={weekDate} onWeekChange={setWeekDate} />

        {/* Unified Fitness Card */}
        <DarkCard style={styles.unifiedCard}>
          {/* Activity Rings */}
          <View style={styles.ringRow}>
            {[
              { label: 'Steps', val: stepsToday >= 1000 ? `${(stepsToday / 1000).toFixed(1)}k` : `${stepsToday}`, pct: goals.steps > 0 ? stepsToday / goals.steps : 0, color: colors.steps },
              { label: 'Runs', val: `${totals.runs}`, pct: goals.runs > 0 ? totals.runs / goals.runs : 0, color: colors.run },
              { label: 'Swims', val: `${totals.swims}`, pct: goals.swims > 0 ? totals.swims / goals.swims : 0, color: colors.swim },
              { label: 'Cycles', val: `${totals.cycles}`, pct: totals.cycles > 0 ? 1 : 0, color: colors.cycle },
            ].map((a) => (
              <View key={a.label} style={styles.ringItem}>
                <ProgressRing progress={a.pct} size={44} strokeWidth={4} color={a.color} value={a.val} />
                <Text style={styles.ringLabel}>{a.label}</Text>
              </View>
            ))}
          </View>

          {/* Key Stats — Burned | Distance | BJJ */}
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {fmt(totals.totalCalories)}
                <Text style={styles.statUnit}> kcal</Text>
              </Text>
              <Text style={styles.statLabel}>Burned</Text>
            </View>
            <View style={[styles.statItem, styles.statCenter]}>
              <Text style={[styles.statValue, styles.statValueLarge]}>
                {totals.totalDistance.toFixed(1)}
                <Text style={styles.statUnit}> km</Text>
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totals.jiujitsu}</Text>
              <Text style={styles.statLabel}>BJJ</Text>
            </View>
          </View>

          {/* Health / Watch Data */}
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
                      <Text style={[styles.healthTileValue, { color: h.color }]}>
                        {h.val}{h.unit ? <Text style={styles.healthTileUnit}> {h.unit}</Text> : null}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </DarkCard>

        {/* Agent Insights */}
        {fitnessInsights.map((insight) => (
          <AgentInsightCard key={insight.agentId} insight={insight} />
        ))}

        {/* Activity Log — flat card with dividers */}
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Activities</Text>
        </View>

        {entries.length === 0 ? (
          <EmptyState icon="🏃" title="No activities logged" subtitle="Tap + to log your workout" />
        ) : (
          <Card style={styles.activityList}>
            {entries.map((entry, idx) => (
              <Pressable
                key={entry.id}
                onLongPress={() => handleDeleteEntry(entry.id)}
                style={[
                  styles.activityRow,
                  idx < entries.length - 1 && styles.activityRowBorder,
                ]}
              >
                <Text style={styles.activityEmoji}>
                  {ACTIVITY_ICONS[entry.type] || '⚡'}
                </Text>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>
                    {entry.name || entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                  </Text>
                  <Text style={styles.activityDetail}>
                    {entry.type === 'steps'
                      ? `${fmt(entry.steps || 0)} steps`
                      : entry.duration ? `${entry.duration} min` : ''}
                    {entry.distance ? ` · ${entry.distance} km` : ''}
                    {entry.calories ? ` · ${entry.calories} kcal` : ''}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{entry.date.slice(5)}</Text>
              </Pressable>
            ))}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB icon="add" onPress={() => setShowAddModal(true)} color={colors.accent} />

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  // Hero card
  unifiedCard: { padding: 16, marginBottom: 8 },

  // Rings
  ringRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  ringItem: { alignItems: 'center' },
  ringLabel: { fontSize: 9, color: colors.darkTextMuted, marginTop: 4, letterSpacing: 0.3 },

  divider: { height: 1, backgroundColor: colors.darkInner, marginBottom: 14 },

  // Stats — Burned | Distance | BJJ
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statCenter: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderLeftColor: colors.darkInner, borderRightColor: colors.darkInner,
    paddingHorizontal: 8,
  },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.darkText },
  statValueLarge: { fontSize: 22, color: colors.accent },
  statUnit: { fontSize: 10, fontWeight: '400', color: colors.darkTextMuted },
  statLabel: { fontSize: 10, color: colors.darkTextMuted, marginTop: 2 },

  // Health tiles
  healthHeader: {
    fontSize: 10, color: colors.darkTextMuted, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 10,
  },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthTile: {
    width: '47%', backgroundColor: colors.darkInner, borderRadius: 10,
    padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  healthIcon: { fontSize: 14 },
  healthTileLabel: { fontSize: 10, color: colors.darkTextMuted },
  healthTileValue: { fontSize: 13, fontWeight: '600' },
  healthTileUnit: { fontSize: 10, fontWeight: '400', color: colors.darkTextMuted },

  // Activity log
  logHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8, marginTop: 4,
  },
  logTitle: { fontSize: 13, fontWeight: '600', color: colors.textLight, letterSpacing: 0.3 },
  activityList: { padding: 0, overflow: 'hidden' },
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  activityEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: '600', color: colors.text },
  activityDetail: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  activityTime: { fontSize: 11, color: colors.textLight },

});
