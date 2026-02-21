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
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { InsightBanner, InsightItem } from '../../src/components/InsightBanner';
import { ProgressRing } from '../../src/components/ProgressRing';
import { WeekSelector } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { FitnessEntryType } from '../../src/types';

// Safe number formatter — avoids Hermes toLocaleString() crashes on Android
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return String(n);
}

const activityIcons: Record<string, { icon: string; color: string }> = {
  steps: { icon: '🚶', color: colors.steps },
  run: { icon: '🏃', color: colors.run },
  swim: { icon: '🏊', color: colors.swim },
  cycle: { icon: '🚴', color: colors.cycle },
  jiujitsu: { icon: '🥋', color: colors.jiujitsu },
  gym: { icon: '🏋️', color: colors.gym },
  other: { icon: '⚡', color: colors.textLight },
  vo2max: { icon: '❤️', color: colors.error },
  training_load: { icon: '📊', color: colors.info },
  stress: { icon: '😰', color: colors.warning },
  recovery: { icon: '💤', color: colors.success },
  hrv: { icon: '💓', color: colors.error },
  weight: { icon: '⚖️', color: colors.textLight },
  body_fat: { icon: '📏', color: colors.textLight },
};

const fitnessFields: FormField[] = [
  {
    key: 'type',
    label: 'Activity Type',
    placeholder: '',
    type: 'select',
    required: true,
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
  const { data, loading, refresh, addEntry, deleteEntry } = useFitness(weekDate);
  const { insights: fitnessInsights } = useInsights('fitness');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddEntry = useCallback(
    async (values: Record<string, string>) => {
      const entry: Record<string, unknown> = {
        type: values.type as FitnessEntryType,
        name: values.name || undefined,
        date: new Date().toISOString().split('T')[0],
        notes: values.notes || undefined,
      };

      if (values.type === 'steps') {
        entry.steps = Number(values.steps) || 0;
      } else {
        entry.duration = Number(values.duration) || 0;
        entry.distance = Number(values.distance) || 0;
        entry.calories = Number(values.calories) || 0;
      }

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

  const recoveryColor = {
    good: colors.recoveryGood,
    fair: colors.recoveryFair,
    poor: colors.recoveryPoor,
  }[data.advanced?.recoveryStatus || 'good'];

  // Compute insights from current data
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
  if (data.advanced?.recoveryStatus === 'poor') {
    computedInsights.push({ emoji: '⚠️', text: 'Recovery is low — consider a rest day or light activity.', tone: 'warning' });
  }

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

        {/* Summary Hero */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.ringRow}>
            <ProgressRing
              progress={goals.steps > 0 ? stepsToday / goals.steps : 0}
              size={70}
              strokeWidth={6}
              color={colors.steps}
              value={stepsToday >= 1000 ? `${(stepsToday / 1000).toFixed(1)}k` : `${stepsToday}`}
              label="Steps"
              subLabel={`/ ${(goals.steps / 1000).toFixed(0)}k`}
            />
            <ProgressRing
              progress={goals.runs > 0 ? totals.runs / goals.runs : 0}
              size={70}
              strokeWidth={6}
              color={colors.run}
              value={`${totals.runs}`}
              label="Runs"
              subLabel={`/ ${goals.runs}`}
            />
            <ProgressRing
              progress={goals.swims > 0 ? totals.swims / goals.swims : 0}
              size={70}
              strokeWidth={6}
              color={colors.swim}
              value={`${totals.swims}`}
              label="Swims"
              subLabel={`/ ${goals.swims}`}
            />
            <ProgressRing
              progress={totals.cycles > 0 ? 1 : 0}
              size={70}
              strokeWidth={6}
              color={colors.cycle}
              value={`${totals.cycles}`}
              label="Cycles"
            />
          </View>
        </DarkCard>

        {/* Insights */}
        <InsightBanner insights={computedInsights} />
        {fitnessInsights.length > 0 && (
          <View style={styles.insightsContainer}>
            {fitnessInsights.map((fi) => (
              <AgentInsightCard key={fi.agentId} insight={fi} />
            ))}
          </View>
        )}

        {/* Week Stats */}
        <Card style={styles.statsCard}>
          <SectionHeader title="Week Summary" />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totals.totalDistance.toFixed(1)} km</Text>
              <Text style={styles.statLabel}>Total Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totals.totalCalories}</Text>
              <Text style={styles.statLabel}>Calories Burned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totals.jiujitsu}</Text>
              <Text style={styles.statLabel}>BJJ Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: recoveryColor }]}>
                {data.advanced?.recoveryStatus || '—'}
              </Text>
              <Text style={styles.statLabel}>Recovery</Text>
            </View>
          </View>
        </Card>

        {/* Advanced Metrics */}
        {data.advanced && (data.advanced.avgVo2max > 0 || data.advanced.latestWeight > 0) && (
          <Card style={styles.metricsCard}>
            <SectionHeader title="Body Metrics" />
            <View style={styles.metricsGrid}>
              {data.advanced.avgVo2max > 0 && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricIcon}>❤️</Text>
                  <Text style={styles.metricValue}>{data.advanced.avgVo2max}</Text>
                  <Text style={styles.metricLabel}>VO2 Max</Text>
                </View>
              )}
              {data.advanced.latestHrv > 0 && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricIcon}>💓</Text>
                  <Text style={styles.metricValue}>{data.advanced.latestHrv}ms</Text>
                  <Text style={styles.metricLabel}>HRV</Text>
                </View>
              )}
              {data.advanced.latestWeight > 0 && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricIcon}>⚖️</Text>
                  <Text style={styles.metricValue}>{data.advanced.latestWeight}kg</Text>
                  <Text style={styles.metricLabel}>Weight</Text>
                </View>
              )}
              {data.advanced.latestBodyFat > 0 && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricIcon}>📏</Text>
                  <Text style={styles.metricValue}>{data.advanced.latestBodyFat}%</Text>
                  <Text style={styles.metricLabel}>Body Fat</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Activity Log */}
        <SectionHeader
          title="Activities"
          action={{ label: '+ Add', onPress: () => setShowAddModal(true) }}
        />

        {entries.length === 0 ? (
          <EmptyState
            icon="🏃"
            title="No activities logged"
            subtitle="Tap + Add to log your workout"
          />
        ) : (
          entries.map((entry) => {
            const info = activityIcons[entry.type] || { icon: '🏋️', color: colors.textLight };
            return (
              <Pressable key={entry.id} onLongPress={() => handleDeleteEntry(entry.id)}>
                <Card style={styles.activityCard}>
                  <View style={styles.activityRow}>
                    <Text style={styles.activityIcon}>{info.icon}</Text>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>
                        {entry.name || entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {entry.type === 'steps'
                          ? `${fmt(entry.steps || 0)} steps`
                          : entry.duration
                          ? `${entry.duration} min`
                          : ''}
                        {entry.distance ? ` · ${entry.distance} km` : ''}
                        {entry.calories ? ` · ${entry.calories} cal` : ''}
                      </Text>
                    </View>
                    <Text style={styles.activityDate}>{entry.date.slice(5)}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })
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
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  heroCard: { marginBottom: 12 },
  ringRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statsCard: { marginBottom: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statItem: {
    width: '48%',
    paddingVertical: 8,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  metricsCard: { marginBottom: 12 },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: { alignItems: 'center' },
  metricIcon: { fontSize: 20, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  metricLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  activityCard: { marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { fontSize: 24 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: '600', color: colors.text },
  activityMeta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  activityDate: { fontSize: 12, color: colors.textLight },
  insightsContainer: { marginTop: 12 },
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
});
