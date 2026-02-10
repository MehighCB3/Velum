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
import { useBudget } from '../../src/hooks/useBudget';
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { WeekSelector } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { BudgetCategory } from '../../src/types';

const WEEKLY_BUDGET = 70;

const budgetFields: FormField[] = [
  { key: 'amount', label: 'Amount (€)', placeholder: '0.00', type: 'number', required: true },
  {
    key: 'category',
    label: 'Category',
    placeholder: '',
    type: 'select',
    required: true,
    options: [
      { label: 'Food', value: 'Food' },
      { label: 'Fun', value: 'Fun' },
    ],
  },
  { key: 'description', label: 'Description', placeholder: 'What did you spend on?', type: 'text' },
  { key: 'reason', label: 'Reason', placeholder: 'Optional reason...', type: 'text' },
];

export default function BudgetScreen() {
  const [weekDate, setWeekDate] = useState(new Date());
  const { data, loading, refresh, addEntry, deleteEntry } = useBudget(weekDate);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddEntry = useCallback(
    async (values: Record<string, string>) => {
      await addEntry({
        amount: Number(values.amount) || 0,
        category: values.category as BudgetCategory,
        description: values.description,
        reason: values.reason,
      });
      setShowAddModal(false);
    },
    [addEntry],
  );

  const handleDeleteEntry = useCallback(
    (entryId: string, description: string) => {
      Alert.alert('Delete Entry', `Remove "${description || 'this entry'}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entryId) },
      ]);
    },
    [deleteEntry],
  );

  const spentPercent = data.totalSpent / WEEKLY_BUDGET;
  const isOverBudget = data.remaining < 0;

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

        {/* Budget Hero */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Weekly Budget</Text>
              <View style={styles.heroAmountRow}>
                <Text style={styles.heroCurrency}>€</Text>
                <Text style={styles.heroValue}>{data.remaining.toFixed(0)}</Text>
              </View>
              <Text style={[styles.heroSub, isOverBudget && { color: colors.error }]}>
                {isOverBudget ? 'over budget' : 'remaining'}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroSpent}>€{data.totalSpent.toFixed(2)} spent</Text>
              <Text style={styles.heroTotal}>of €{WEEKLY_BUDGET}</Text>
            </View>
          </View>

          {/* Budget bar */}
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetBarFill,
                {
                  width: `${Math.min(spentPercent * 100, 100)}%`,
                  backgroundColor: isOverBudget
                    ? colors.error
                    : spentPercent > 0.8
                    ? colors.warning
                    : colors.success,
                },
              ]}
            />
          </View>
        </DarkCard>

        {/* Category Breakdown */}
        <Card style={styles.categoryCard}>
          <SectionHeader title="By Category" />
          <View style={styles.categoryRow}>
            <View style={styles.categoryItem}>
              <View style={[styles.categoryDot, { backgroundColor: colors.food }]} />
              <View>
                <Text style={styles.categoryName}>Food</Text>
                <Text style={styles.categoryAmount}>€{(data.categories.Food || 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.categoryItem}>
              <View style={[styles.categoryDot, { backgroundColor: colors.fun }]} />
              <View>
                <Text style={styles.categoryName}>Fun</Text>
                <Text style={styles.categoryAmount}>€{(data.categories.Fun || 0).toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Category bars */}
          <View style={styles.categoryBars}>
            <View style={styles.categoryBarContainer}>
              <Text style={styles.categoryBarLabel}>Food</Text>
              <View style={styles.categoryBarBg}>
                <View
                  style={[
                    styles.categoryBarFill,
                    {
                      backgroundColor: colors.food,
                      width: `${data.totalSpent > 0 ? ((data.categories.Food || 0) / data.totalSpent) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.categoryBarContainer}>
              <Text style={styles.categoryBarLabel}>Fun</Text>
              <View style={styles.categoryBarBg}>
                <View
                  style={[
                    styles.categoryBarFill,
                    {
                      backgroundColor: colors.fun,
                      width: `${data.totalSpent > 0 ? ((data.categories.Fun || 0) / data.totalSpent) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Spending Log */}
        <SectionHeader
          title="Spending Log"
          action={{ label: '+ Add', onPress: () => setShowAddModal(true) }}
        />

        {data.entries.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No spending logged"
            subtitle="Tap + Add to log an expense"
          />
        ) : (
          [...data.entries].reverse().map((entry) => (
            <Pressable
              key={entry.id}
              onLongPress={() => handleDeleteEntry(entry.id, entry.description)}
            >
              <Card style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <View
                    style={[
                      styles.entryDot,
                      { backgroundColor: entry.category === 'Food' ? colors.food : colors.fun },
                    ]}
                  />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryDesc}>
                      {entry.description || entry.category}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {entry.category} · {entry.date.slice(5)}
                    </Text>
                  </View>
                  <Text style={styles.entryAmount}>€{entry.amount.toFixed(2)}</Text>
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
        title="Log Expense"
        fields={budgetFields}
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
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: {},
  heroLabel: { fontSize: 13, color: colors.darkTextSecondary, fontWeight: '500' },
  heroAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  heroCurrency: { fontSize: 20, fontWeight: '600', color: colors.darkTextSecondary, marginRight: 2 },
  heroValue: { fontSize: 40, fontWeight: '800', color: colors.darkText },
  heroSub: { fontSize: 13, color: colors.success, fontWeight: '500', marginTop: 2 },
  heroRight: { alignItems: 'flex-end', marginTop: 4 },
  heroSpent: { fontSize: 15, fontWeight: '600', color: colors.darkText },
  heroTotal: { fontSize: 13, color: colors.darkTextSecondary, marginTop: 2 },
  budgetBar: {
    height: 6,
    backgroundColor: colors.darkTertiary,
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', borderRadius: 3 },
  categoryCard: { marginBottom: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 14, fontWeight: '600', color: colors.text },
  categoryAmount: { fontSize: 13, color: colors.textLight },
  categoryBars: { gap: 8 },
  categoryBarContainer: { gap: 4 },
  categoryBarLabel: { fontSize: 12, color: colors.textLight },
  categoryBarBg: {
    height: 6,
    backgroundColor: colors.hover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: { height: '100%', borderRadius: 3 },
  entryCard: { marginBottom: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryDot: { width: 8, height: 8, borderRadius: 4 },
  entryInfo: { flex: 1 },
  entryDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  entryMeta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  entryAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
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
