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
import { format, subDays, addDays } from 'date-fns';
import { colors } from '../../src/theme/colors';
import { useNutrition } from '../../src/hooks/useNutrition';
import { DarkCard, Card, SectionHeader, EmptyState } from '../../src/components/Card';
import { MacroBar } from '../../src/components/MacroBar';
import { ProgressRing } from '../../src/components/ProgressRing';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';

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

export default function NutritionScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const { data, loading, refresh, addEntry, deleteEntry } = useNutrition(dateStr);
  const [showAddModal, setShowAddModal] = useState(false);

  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

  const handleAddMeal = useCallback(
    async (values: Record<string, string>) => {
      await addEntry({
        id: `${Date.now()}`,
        name: values.name,
        calories: Number(values.calories) || 0,
        protein: Number(values.protein) || 0,
        carbs: Number(values.carbs) || 0,
        fat: Number(values.fat) || 0,
        time:
          values.time ||
          format(new Date(), 'HH:mm'),
      });
      setShowAddModal(false);
    },
    [addEntry],
  );

  const handleDeleteEntry = useCallback(
    (entryId: string, name: string) => {
      Alert.alert('Delete Entry', `Remove "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteEntry(entryId),
        },
      ]);
    },
    [deleteEntry],
  );

  const caloriesRemaining = data.goals.calories - data.totals.calories;
  const calorieProgress = data.goals.calories > 0
    ? data.totals.calories / data.goals.calories
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        {/* Date Navigator */}
        <View style={styles.dateNav}>
          <Pressable onPress={() => setCurrentDate(subDays(currentDate, 1))} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setCurrentDate(new Date())}>
            <Text style={styles.dateText}>
              {isToday ? 'Today' : format(currentDate, 'EEE, MMM d')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!isToday) setCurrentDate(addDays(currentDate, 1));
            }}
            hitSlop={12}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={isToday ? colors.border : colors.text}
            />
          </Pressable>
        </View>

        {/* Hero Card — Calorie Summary */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Calories</Text>
              <Text style={styles.heroValue}>
                {Math.round(data.totals.calories)}
              </Text>
              <Text style={styles.heroSub}>
                of {data.goals.calories} kcal goal
              </Text>
              <Text
                style={[
                  styles.heroRemaining,
                  caloriesRemaining < 0 && { color: colors.error },
                ]}
              >
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

        {/* Macro Breakdown */}
        <Card style={styles.macroCard}>
          <SectionHeader title="Macros" />
          <MacroBar
            label="Protein"
            current={data.totals.protein}
            goal={data.goals.protein}
            color={colors.protein}
          />
          <MacroBar
            label="Carbs"
            current={data.totals.carbs}
            goal={data.goals.carbs}
            color={colors.carbs}
          />
          <MacroBar
            label="Fat"
            current={data.totals.fat}
            goal={data.goals.fat}
            color={colors.fat}
          />
        </Card>

        {/* Meal Log */}
        <SectionHeader
          title="Meal Log"
          action={{ label: '+ Add', onPress: () => setShowAddModal(true) }}
        />

        {data.entries.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="No meals logged"
            subtitle={isToday ? 'Tap + Add to log your first meal' : 'No entries for this day'}
          />
        ) : (
          data.entries.map((entry) => (
            <Pressable
              key={entry.id}
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
                </View>
              </Card>
            </Pressable>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>

      {/* Add Meal Modal */}
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
  container: {
    flex: 1,
    backgroundColor: colors.sidebar,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    minWidth: 140,
    textAlign: 'center',
  },
  heroCard: {
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 13,
    color: '#a8a29e',
    fontWeight: '500',
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: '#a8a29e',
    marginTop: 2,
  },
  heroRemaining: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginTop: 4,
  },
  macroCard: {
    marginBottom: 12,
  },
  mealCard: {
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  mealMacros: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  mealRight: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  mealTime: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
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
