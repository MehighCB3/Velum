import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { colors } from '../../src/theme/colors';
import { useNutrition } from '../../src/hooks/useNutrition';
import { DarkCard, Card, SectionHeader, EmptyState } from '../../src/components/Card';
import { MacroBar } from '../../src/components/MacroBar';
import { ProgressRing } from '../../src/components/ProgressRing';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { nutritionApi } from '../../src/api/client';
import { NutritionDay } from '../../src/types';

const mealFields: FormField[] = [
  { key: 'name', label: 'Food Name', placeholder: 'e.g. Chicken breast', type: 'text', required: true },
  { key: 'calories', label: 'Calories', placeholder: '0', type: 'number', required: true },
  { key: 'protein', label: 'Protein (g)', placeholder: '0', type: 'number' },
  { key: 'carbs', label: 'Carbs (g)', placeholder: '0', type: 'number' },
  { key: 'fat', label: 'Fat (g)', placeholder: '0', type: 'number' },
  { key: 'time', label: 'Time', placeholder: 'HH:MM', type: 'text' },
];

function getMealEmoji(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 11) return '🌅';
  if (hour < 15) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
}

type Tab = 'today' | '30days';

// ==================== 30-DAY CALENDAR VIEW ====================

function ThirtyDayView() {
  const [days, setDays] = useState<NutritionDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      // Fetch 5 weeks to cover 30 days (each call returns 7 days)
      const promises = [0, 7, 14, 21, 28].map((offset) => {
        const d = subDays(today, offset);
        return nutritionApi.getWeek(format(d, 'yyyy-MM-dd')).catch(() => []);
      });
      const results = await Promise.all(promises);
      // Merge and deduplicate by date
      const byDate = new Map<string, NutritionDay>();
      for (const week of results) {
        for (const day of week) {
          byDate.set(day.date, day);
        }
      }
      // Sort descending (most recent first), take last 30
      const sorted = Array.from(byDate.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 30);
      setDays(sorted);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  if (loading) {
    return (
      <View style={calStyles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={calStyles.loadingText}>Loading 30-day data...</Text>
      </View>
    );
  }

  if (days.length === 0) {
    return <EmptyState icon="📊" title="No data yet" subtitle="Start logging meals to see your 30-day overview" />;
  }

  // Stats
  const daysWithEntries = days.filter((d) => d.entries.length > 0);
  const greenDays = daysWithEntries.filter(
    (d) => d.totals.calories <= d.goals.calories && d.totals.carbs <= d.goals.carbs,
  );
  const redDays = daysWithEntries.filter(
    (d) => d.totals.calories > d.goals.calories || d.totals.carbs > d.goals.carbs,
  );

  return (
    <View>
      {/* Summary */}
      <DarkCard style={calStyles.summaryCard}>
        <Text style={calStyles.summaryTitle}>Last 30 Days</Text>
        <View style={calStyles.summaryRow}>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.success }]}>{greenDays.length}</Text>
            <Text style={calStyles.summaryLabel}>Good days</Text>
          </View>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.error }]}>{redDays.length}</Text>
            <Text style={calStyles.summaryLabel}>Over limit</Text>
          </View>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.darkTextSecondary }]}>
              {days.length - daysWithEntries.length}
            </Text>
            <Text style={calStyles.summaryLabel}>No data</Text>
          </View>
        </View>
      </DarkCard>

      {/* Day List */}
      {days.map((day) => {
        const hasEntries = day.entries.length > 0;
        const overCalories = hasEntries && day.totals.calories > day.goals.calories;
        const overCarbs = hasEntries && day.totals.carbs > day.goals.carbs;
        const isRed = overCalories || overCarbs;
        const isGreen = hasEntries && !isRed;

        const dotColor = !hasEntries
          ? colors.border
          : isGreen
          ? colors.success
          : colors.error;

        const dateObj = new Date(day.date + 'T12:00:00');
        const dayName = format(dateObj, 'EEE');
        const dayNum = format(dateObj, 'd');
        const month = format(dateObj, 'MMM');

        return (
          <Card key={day.date} style={calStyles.dayRow}>
            <View style={calStyles.dayLeft}>
              <View style={[calStyles.dot, { backgroundColor: dotColor }]} />
              <View>
                <Text style={calStyles.dayDate}>
                  {dayName}, {month} {dayNum}
                </Text>
                {hasEntries ? (
                  <Text style={calStyles.dayDetail}>
                    {Math.round(day.totals.calories)} / {day.goals.calories} kcal
                    {overCarbs ? '  ·  carbs over' : ''}
                  </Text>
                ) : (
                  <Text style={calStyles.dayDetail}>No entries</Text>
                )}
              </View>
            </View>
            {hasEntries && (
              <Text style={[calStyles.dayStatus, { color: isGreen ? colors.success : colors.error }]}>
                {isGreen ? '✓' : '✗'}
              </Text>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const calStyles = StyleSheet.create({
  loading: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loadingText: { fontSize: 13, color: colors.textLight },
  summaryCard: { marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.darkText, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: colors.darkTextSecondary, marginTop: 2 },
  dayRow: { marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dayDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  dayDetail: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  dayStatus: { fontSize: 18, fontWeight: '700' },
});

// ==================== MAIN SCREEN ====================

export default function NutritionScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, loading, refresh, addEntry, deleteEntry } = useNutrition(today);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');

  const handleAddMeal = useCallback(
    async (values: Record<string, string>) => {
      await addEntry({
        id: `${Date.now()}`,
        name: values.name,
        calories: Number(values.calories) || 0,
        protein: Number(values.protein) || 0,
        carbs: Number(values.carbs) || 0,
        fat: Number(values.fat) || 0,
        time: values.time || format(new Date(), 'HH:mm'),
      });
      setShowAddModal(false);
    },
    [addEntry],
  );

  const handleDeleteEntry = useCallback(
    (entryId: string, name: string) => {
      Alert.alert('Delete Entry', `Remove "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entryId) },
      ]);
    },
    [deleteEntry],
  );

  const caloriesRemaining = data.goals.calories - data.totals.calories;
  const calorieProgress = data.goals.calories > 0 ? data.totals.calories / data.goals.calories : 0;

  return (
    <View style={styles.container}>
      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'today' && styles.tabBtnActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'today' && styles.tabBtnTextActive]}>Today</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === '30days' && styles.tabBtnActive]}
          onPress={() => setActiveTab('30days')}
        >
          <Text style={[styles.tabBtnText, activeTab === '30days' && styles.tabBtnTextActive]}>30 Days</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        {activeTab === 'today' ? (
          <>
            {/* Hero Card */}
            <DarkCard style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroLabel}>Calories</Text>
                  <Text style={styles.heroValue}>{Math.round(data.totals.calories)}</Text>
                  <Text style={styles.heroSub}>of {data.goals.calories} kcal goal</Text>
                  <Text style={[styles.heroRemaining, caloriesRemaining < 0 && { color: colors.error }]}>
                    {caloriesRemaining >= 0
                      ? `${Math.round(caloriesRemaining)} remaining`
                      : `${Math.round(Math.abs(caloriesRemaining))} over`}
                  </Text>
                </View>
                <ProgressRing
                  progress={calorieProgress}
                  size={90}
                  strokeWidth={8}
                  color={
                    calorieProgress > 1
                      ? colors.error
                      : calorieProgress > 0.8
                      ? colors.warning
                      : colors.success
                  }
                  value={`${Math.round(calorieProgress * 100)}%`}
                />
              </View>
            </DarkCard>

            {/* Macros */}
            <Card style={styles.macroCard}>
              <SectionHeader title="Macros" />
              <MacroBar label="Protein" current={data.totals.protein} goal={data.goals.protein} color={colors.protein} />
              <MacroBar label="Carbs" current={data.totals.carbs} goal={data.goals.carbs} color={colors.carbs} />
              <MacroBar label="Fat" current={data.totals.fat} goal={data.goals.fat} color={colors.fat} />
            </Card>

            {/* Meal Log */}
            <SectionHeader
              title="Meal Log"
              action={{ label: '+ Add', onPress: () => setShowAddModal(true) }}
            />

            {data.entries.length === 0 ? (
              <EmptyState icon="🍽️" title="No meals logged" subtitle="Tap + Add to log your first meal" />
            ) : (
              data.entries.map((entry) => (
                <Pressable key={entry.id} onLongPress={() => handleDeleteEntry(entry.id, entry.name)}>
                  <Card style={styles.mealCard}>
                    <View style={styles.mealRow}>
                      <Text style={styles.mealEmoji}>{getMealEmoji(entry.time)}</Text>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{entry.name}</Text>
                        <Text style={styles.mealMacros}>
                          P: {Math.round(entry.protein)}g · C: {Math.round(entry.carbs)}g · F:{' '}
                          {Math.round(entry.fat)}g
                        </Text>
                      </View>
                      <View style={styles.mealRight}>
                        <Text style={styles.mealCalories}>{entry.calories}</Text>
                        <Text style={styles.mealTime}>{entry.time}</Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </>
        ) : (
          <ThirtyDayView />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — only on Today tab */}
      {activeTab === 'today' && (
        <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={28} color={colors.darkText} />
        </Pressable>
      )}

      <AddEntryModal
        visible={showAddModal}
        title="Log Meal"
        fields={mealFields}
        onSubmit={handleAddMeal}
        onClose={() => setShowAddModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.sidebar,
  },
  tabBtnActive: { backgroundColor: colors.dark },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  tabBtnTextActive: { color: colors.darkText },
  heroCard: { marginBottom: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 13, color: colors.darkTextSecondary, fontWeight: '500' },
  heroValue: { fontSize: 36, fontWeight: '800', color: colors.darkText, marginTop: 2 },
  heroSub: { fontSize: 13, color: colors.darkTextSecondary, marginTop: 2 },
  heroRemaining: { fontSize: 14, fontWeight: '600', color: colors.success, marginTop: 4 },
  macroCard: { marginBottom: 12 },
  mealCard: { marginBottom: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealEmoji: { fontSize: 24 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontWeight: '600', color: colors.text },
  mealMacros: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCalories: { fontSize: 16, fontWeight: '700', color: colors.text },
  mealTime: { fontSize: 11, color: colors.textLight, marginTop: 2 },
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
