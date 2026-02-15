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
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { colors } from '../../src/theme/colors';
import { useNutrition } from '../../src/hooks/useNutrition';
import { DarkCard, Card, SectionHeader, EmptyState } from '../../src/components/Card';
import { InsightBanner, InsightItem } from '../../src/components/InsightBanner';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { useInsights } from '../../src/hooks/useInsights';
import { MacroBar } from '../../src/components/MacroBar';
import { ProgressRing } from '../../src/components/ProgressRing';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { nutritionApi } from '../../src/api/client';
import { NutritionDay, NutritionEntry } from '../../src/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

// ==================== MEAL DETAIL MODAL ====================

function MealDetailModal({
  entry,
  visible,
  onClose,
  onDelete,
}: {
  entry: NutritionEntry | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (!entry) return null;

  const totalMacroGrams = entry.protein + entry.carbs + entry.fat;
  const proteinPct = totalMacroGrams > 0 ? Math.round((entry.protein / totalMacroGrams) * 100) : 0;
  const carbsPct = totalMacroGrams > 0 ? Math.round((entry.carbs / totalMacroGrams) * 100) : 0;
  const fatPct = totalMacroGrams > 0 ? Math.round((entry.fat / totalMacroGrams) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={detailStyles.overlay} onPress={onClose}>
        <Pressable style={detailStyles.sheet} onPress={() => {}}>
          {/* Header */}
          <View style={detailStyles.header}>
            <View style={detailStyles.headerLeft}>
              <Text style={detailStyles.emoji}>{getMealEmoji(entry.time)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={detailStyles.name}>{entry.name}</Text>
                <Text style={detailStyles.time}>{entry.time}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </Pressable>
          </View>

          <ScrollView style={detailStyles.body} bounces={false}>
            {/* Photo */}
            {entry.photoUrl ? (
              <Image
                source={{ uri: entry.photoUrl }}
                style={detailStyles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={detailStyles.noPhoto}>
                <Ionicons name="camera-outline" size={32} color={colors.border} />
                <Text style={detailStyles.noPhotoText}>No photo</Text>
              </View>
            )}

            {/* Calories hero */}
            <View style={detailStyles.calorieRow}>
              <Text style={detailStyles.calorieValue}>{Math.round(entry.calories)}</Text>
              <Text style={detailStyles.calorieUnit}>kcal</Text>
            </View>

            {/* Macro breakdown */}
            <View style={detailStyles.macroGrid}>
              <View style={detailStyles.macroItem}>
                <View style={[detailStyles.macroIndicator, { backgroundColor: colors.protein }]} />
                <Text style={detailStyles.macroValue}>{Math.round(entry.protein)}g</Text>
                <Text style={detailStyles.macroLabel}>Protein</Text>
                <Text style={detailStyles.macroPct}>{proteinPct}%</Text>
              </View>
              <View style={detailStyles.macroItem}>
                <View style={[detailStyles.macroIndicator, { backgroundColor: colors.carbs }]} />
                <Text style={detailStyles.macroValue}>{Math.round(entry.carbs)}g</Text>
                <Text style={detailStyles.macroLabel}>Carbs</Text>
                <Text style={detailStyles.macroPct}>{carbsPct}%</Text>
              </View>
              <View style={detailStyles.macroItem}>
                <View style={[detailStyles.macroIndicator, { backgroundColor: colors.fat }]} />
                <Text style={detailStyles.macroValue}>{Math.round(entry.fat)}g</Text>
                <Text style={detailStyles.macroLabel}>Fat</Text>
                <Text style={detailStyles.macroPct}>{fatPct}%</Text>
              </View>
            </View>

            {/* Macro bar visualization */}
            {totalMacroGrams > 0 && (
              <View style={detailStyles.stackedBar}>
                <View style={[detailStyles.stackedSegment, { flex: entry.protein, backgroundColor: colors.protein }]} />
                <View style={[detailStyles.stackedSegment, { flex: entry.carbs, backgroundColor: colors.carbs }]} />
                <View style={[detailStyles.stackedSegment, { flex: entry.fat, backgroundColor: colors.fat }]} />
              </View>
            )}
          </ScrollView>

          {/* Delete button */}
          <Pressable
            style={detailStyles.deleteBtn}
            onPress={() => {
              onClose();
              onDelete(entry.id, entry.name);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={detailStyles.deleteBtnText}>Delete Entry</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emoji: { fontSize: 28 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  time: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.sidebar,
  },
  noPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.sidebar,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  noPhotoText: { fontSize: 12, color: colors.textLight },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 20,
  },
  calorieValue: { fontSize: 36, fontWeight: '800', color: colors.text },
  calorieUnit: { fontSize: 16, fontWeight: '500', color: colors.textLight },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  macroItem: { alignItems: 'center', gap: 4 },
  macroIndicator: { width: 8, height: 8, borderRadius: 4 },
  macroValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  macroLabel: { fontSize: 12, color: colors.textLight },
  macroPct: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  stackedSegment: { height: '100%' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error + '30',
    backgroundColor: colors.error + '08',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: colors.error },
});

// ==================== 30-DAY CALENDAR VIEW (COMPACT CIRCLES) ====================

function ThirtyDayView() {
  const [days, setDays] = useState<NutritionDay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const promises = [0, 7, 14, 21, 28].map((offset) => {
        const d = subDays(today, offset);
        return nutritionApi.getWeek(format(d, 'yyyy-MM-dd')).catch(() => []);
      });
      const results = await Promise.all(promises);
      const byDate = new Map<string, NutritionDay>();
      for (const week of results) {
        for (const day of week) {
          byDate.set(day.date, day);
        }
      }
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

  const daysWithEntries = days.filter((d) => d.entries.length > 0);
  const greenDays = daysWithEntries.filter(
    (d) => d.totals.calories <= d.goals.calories && d.totals.carbs <= d.goals.carbs,
  );
  const redDays = daysWithEntries.filter(
    (d) => d.totals.calories > d.goals.calories || d.totals.carbs > d.goals.carbs,
  );

  // Calculate averages
  const avgCalories = daysWithEntries.length > 0
    ? Math.round(daysWithEntries.reduce((sum, d) => sum + d.totals.calories, 0) / daysWithEntries.length)
    : 0;

  // Circle size based on screen width — 6 per row with gaps
  const circleSize = Math.floor((SCREEN_WIDTH - 32 - 50) / 6);

  return (
    <View>
      {/* Summary */}
      <DarkCard style={calStyles.summaryCard}>
        <Text style={calStyles.summaryTitle}>Last 30 Days</Text>
        <View style={calStyles.summaryRow}>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.success }]}>{greenDays.length}</Text>
            <Text style={calStyles.summaryLabel}>On track</Text>
          </View>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.error }]}>{redDays.length}</Text>
            <Text style={calStyles.summaryLabel}>Over</Text>
          </View>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.darkTextSecondary }]}>
              {days.length - daysWithEntries.length}
            </Text>
            <Text style={calStyles.summaryLabel}>No data</Text>
          </View>
          <View style={calStyles.summaryItem}>
            <Text style={[calStyles.summaryValue, { color: colors.accent }]}>{avgCalories}</Text>
            <Text style={calStyles.summaryLabel}>Avg kcal</Text>
          </View>
        </View>
      </DarkCard>

      {/* Compact circle grid */}
      <Card style={calStyles.gridCard}>
        <View style={calStyles.circleGrid}>
          {days.map((day) => {
            const hasEntries = day.entries.length > 0;
            const overCalories = hasEntries && day.totals.calories > day.goals.calories;
            const overCarbs = hasEntries && day.totals.carbs > day.goals.carbs;
            const isOver = overCalories || overCarbs;
            const isGood = hasEntries && !isOver;

            const bgColor = !hasEntries
              ? colors.sidebar
              : isGood
              ? colors.success + '20'
              : colors.error + '20';

            const borderColor = !hasEntries
              ? colors.border
              : isGood
              ? colors.success
              : colors.error;

            const dateObj = new Date(day.date + 'T12:00:00');
            const dayNum = format(dateObj, 'd');

            // Calorie fill percentage (capped at 100%)
            const fill = hasEntries
              ? Math.min(day.totals.calories / day.goals.calories, 1)
              : 0;

            return (
              <View key={day.date} style={[calStyles.circleWrapper, { width: circleSize }]}>
                <View
                  style={[
                    calStyles.circle,
                    {
                      width: circleSize - 8,
                      height: circleSize - 8,
                      borderRadius: (circleSize - 8) / 2,
                      backgroundColor: bgColor,
                      borderColor,
                      borderWidth: hasEntries ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      calStyles.circleDay,
                      {
                        color: hasEntries
                          ? isGood
                            ? colors.success
                            : colors.error
                          : colors.textLight,
                        fontWeight: hasEntries ? '700' : '400',
                      },
                    ]}
                  >
                    {dayNum}
                  </Text>
                </View>
                {hasEntries && (
                  <View style={calStyles.miniBar}>
                    <View
                      style={[
                        calStyles.miniBarFill,
                        {
                          width: `${Math.round(fill * 100)}%`,
                          backgroundColor: isGood ? colors.success : colors.error,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={calStyles.legendText}>On track</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={calStyles.legendText}>Over limit</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={calStyles.legendText}>No data</Text>
        </View>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  loading: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loadingText: { fontSize: 13, color: colors.textLight },
  summaryCard: { marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.darkText, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, color: colors.darkTextSecondary, marginTop: 2 },
  gridCard: { marginBottom: 12, paddingVertical: 12, paddingHorizontal: 8 },
  circleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  circleWrapper: {
    alignItems: 'center',
    marginBottom: 10,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDay: { fontSize: 13 },
  miniBar: {
    width: '70%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
    marginTop: 3,
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 1.5 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textLight },
});

// ==================== MAIN SCREEN ====================

export default function NutritionScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, loading, refresh, addEntry, deleteEntry } = useNutrition(today);
  const { insights: nutritionAgentInsights } = useInsights('nutrition');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedEntry, setSelectedEntry] = useState<NutritionEntry | null>(null);

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

  // Compute nutrition insights
  const nutritionInsights: InsightItem[] = [];
  if (data.totals.calories > 0) {
    if (caloriesRemaining < 0) {
      nutritionInsights.push({ emoji: '🔴', text: `${Math.round(Math.abs(caloriesRemaining))} cal over your daily goal.`, tone: 'negative' });
    } else if (calorieProgress > 0.8) {
      nutritionInsights.push({ emoji: '🟡', text: `${Math.round(caloriesRemaining)} cal remaining — nearly at your goal.`, tone: 'warning' });
    } else {
      nutritionInsights.push({ emoji: '🟢', text: `${Math.round(caloriesRemaining)} cal remaining of ${data.goals.calories} kcal goal.`, tone: 'positive' });
    }
    const proteinPct = data.goals.protein > 0 ? data.totals.protein / data.goals.protein : 0;
    if (proteinPct < 0.5 && calorieProgress > 0.5) {
      nutritionInsights.push({ emoji: '🥩', text: `Protein is only ${Math.round(proteinPct * 100)}% of target — consider a protein-rich meal.`, tone: 'warning' });
    } else if (proteinPct >= 1) {
      nutritionInsights.push({ emoji: '💪', text: `Protein goal hit! ${Math.round(data.totals.protein)}g of ${data.goals.protein}g.`, tone: 'positive' });
    }
    if (data.goals.carbs > 0 && data.totals.carbs > data.goals.carbs) {
      nutritionInsights.push({ emoji: '🍞', text: `Carbs over limit — ${Math.round(data.totals.carbs)}g of ${data.goals.carbs}g max.`, tone: 'warning' });
    }
  }

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

            {/* Insights */}
            <InsightBanner insights={nutritionInsights} />
            {nutritionAgentInsights.map((ai) => (
              <AgentInsightCard key={ai.agentId} insight={ai} />
            ))}

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
                <Pressable
                  key={entry.id}
                  onPress={() => setSelectedEntry(entry)}
                  onLongPress={() => handleDeleteEntry(entry.id, entry.name)}
                >
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
                      <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
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

      <MealDetailModal
        entry={selectedEntry}
        visible={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onDelete={handleDeleteEntry}
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
  mealRight: { alignItems: 'flex-end', marginRight: 4 },
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
