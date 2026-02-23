import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { budgetApi } from '../../src/api/client';
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { InsightBanner, InsightItem } from '../../src/components/InsightBanner';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { useInsights } from '../../src/hooks/useInsights';
import { WeekSelector, getISOWeekKey } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { BudgetCategory, BudgetWeek } from '../../src/types';
import { fmtDecimal as fmt } from '../../src/utils/formatters';

const WEEKLY_BUDGET = 70;

// ---- Month comparison data types & helpers ----

interface WeekSummary {
  weekKey: string;
  weekLabel: string; // e.g. "W08"
  totalSpent: number;
  isCurrent: boolean;
  isFuture: boolean;
}

/** Get an array of 4 ISO week keys centred around the selected week */
function getMonthWeekKeys(centerDate: Date): string[] {
  const keys: string[] = [];
  // Go back 1 week, then forward 2 from that (4 weeks total)
  const base = new Date(centerDate);
  base.setDate(base.getDate() - 7); // start 1 week before
  for (let i = 0; i < 4; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    keys.push(getISOWeekKey(d));
  }
  return keys;
}

function useMonthWeeks(centerDate: Date): { weeks: WeekSummary[]; loading: boolean } {
  const weekKeys = useMemo(() => getMonthWeekKeys(centerDate), [centerDate]);
  const currentWeekKey = getISOWeekKey(new Date());

  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(
      weekKeys.map(async (wk): Promise<WeekSummary> => {
        const label = wk.split('-')[1] || wk; // "W08"
        const isCurrent = wk === currentWeekKey;
        const isFuture = wk > currentWeekKey;
        try {
          if (isFuture) {
            return { weekKey: wk, weekLabel: label, totalSpent: 0, isCurrent, isFuture };
          }
          const result: BudgetWeek = await budgetApi.getWeek(wk);
          return { weekKey: wk, weekLabel: label, totalSpent: result.totalSpent, isCurrent, isFuture };
        } catch {
          return { weekKey: wk, weekLabel: label, totalSpent: 0, isCurrent, isFuture };
        }
      }),
    ).then((results) => {
      if (!cancelled) {
        setWeeks(results);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [weekKeys.join(','), currentWeekKey]);

  return { weeks, loading };
}

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
      { label: 'Transport', value: 'Transport' },
      { label: 'Subscriptions', value: 'Subscriptions' },
      { label: 'Other', value: 'Other' },
    ],
  },
  { key: 'description', label: 'Description', placeholder: 'What did you spend on?', type: 'text' },
  { key: 'reason', label: 'Reason', placeholder: 'Optional reason...', type: 'text' },
];

// ---- Month Comparison Bar Chart ----

const BAR_MAX_HEIGHT = 120;

function MonthComparisonCard({
  weeks,
  budget,
}: {
  weeks: WeekSummary[];
  budget: number;
}) {
  // Determine the max value for bar scaling (at least the budget)
  const maxSpent = Math.max(budget, ...weeks.map((w) => w.totalSpent));

  // Build the summary callout
  const overWeek = weeks.find((w) => !w.isFuture && w.totalSpent > budget);
  const underWeek = [...weeks]
    .filter((w) => !w.isFuture && !w.isCurrent && w.totalSpent > 0 && w.totalSpent <= budget)
    .sort((a, b) => a.totalSpent - b.totalSpent)[0];

  const budgetLineBottom = (budget / maxSpent) * BAR_MAX_HEIGHT;

  return (
    <Card style={chartStyles.card}>
      <SectionHeader title="Month Comparison" />

      <View style={chartStyles.chartArea}>
        {/* Dashed budget line */}
        <View style={[chartStyles.budgetLine, { bottom: budgetLineBottom }]}>
          <View style={chartStyles.budgetDash} />
          <Text style={chartStyles.budgetLineLabel}>{'\u20AC'}{fmt(budget)}</Text>
        </View>

        {/* Bars */}
        <View style={chartStyles.barsRow}>
          {weeks.map((w) => {
            const barH = maxSpent > 0 ? (w.totalSpent / maxSpent) * BAR_MAX_HEIGHT : 0;
            const isOver = w.totalSpent > budget;

            let barColor: string = colors.text; // past, under budget
            if (w.isFuture) barColor = colors.border;
            else if (w.isCurrent) barColor = colors.accent;
            if (isOver && !w.isFuture) barColor = colors.error;

            const barOpacity = w.isFuture ? 0.4 : 1;

            return (
              <View key={w.weekKey} style={chartStyles.barCol}>
                <View style={chartStyles.barTrack}>
                  <View
                    style={[
                      chartStyles.bar,
                      {
                        height: Math.max(barH, 4),
                        backgroundColor: barColor,
                        opacity: barOpacity,
                      },
                    ]}
                  />
                </View>
                <Text style={chartStyles.barLabel}>{w.weekLabel}</Text>
                <Text style={chartStyles.barAmount}>
                  {'\u20AC'}{fmt(w.totalSpent)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Summary callout */}
      {(overWeek || underWeek) && (
        <View style={chartStyles.callout}>
          {overWeek && (
            <Text style={chartStyles.calloutText}>
              {overWeek.weekLabel} was {'\u20AC'}{fmt(overWeek.totalSpent - budget)} over budget.
            </Text>
          )}
          {underWeek && (
            <Text style={chartStyles.calloutText}>
              {underWeek.weekLabel} was {'\u20AC'}{fmt(budget - underWeek.totalSpent)} under.
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

export default function BudgetScreen() {
  const [weekDate, setWeekDate] = useState(new Date());
  const { data, loading, refresh, addEntry, deleteEntry } = useBudget(weekDate);
  const { insights: budgetAgentInsights } = useInsights('budget');
  const { weeks: monthWeeks } = useMonthWeeks(weekDate);
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

  // Compute budget insights
  const budgetInsights: InsightItem[] = [];
  if (isOverBudget) {
    budgetInsights.push({ emoji: '🚨', text: `You're €${Math.abs(data.remaining).toFixed(2)} over your €${WEEKLY_BUDGET} weekly budget.`, tone: 'negative' });
  } else if (spentPercent > 0.8) {
    budgetInsights.push({ emoji: '⚠️', text: `€${data.remaining.toFixed(2)} left — ${Math.round((1 - spentPercent) * 100)}% of your budget remaining.`, tone: 'warning' });
  } else if (data.totalSpent > 0) {
    budgetInsights.push({ emoji: '💰', text: `€${data.remaining.toFixed(2)} remaining of €${WEEKLY_BUDGET} budget (${Math.round(spentPercent * 100)}% spent).`, tone: 'positive' });
  }
  // Top spending category
  const catEntries = Object.entries(data.categories).filter(([, v]) => v > 0) as [string, number][];
  if (catEntries.length > 0) {
    const top = catEntries.sort((a, b) => b[1] - a[1])[0];
    const pct = data.totalSpent > 0 ? Math.round((top[1] / data.totalSpent) * 100) : 0;
    budgetInsights.push({ emoji: '📊', text: `${top[0]} is your top category — €${top[1].toFixed(2)} (${pct}% of spending).`, tone: 'neutral' });
  }
  // Daily pace projection
  const dayOfWeek = new Date().getDay() || 7; // 1=Mon..7=Sun
  if (data.totalSpent > 0 && dayOfWeek < 7) {
    const dailyPace = data.totalSpent / dayOfWeek;
    const projected = dailyPace * 7;
    if (projected > WEEKLY_BUDGET) {
      budgetInsights.push({ emoji: '📈', text: `At this pace you'll spend ~€${projected.toFixed(0)} by Sunday — €${(projected - WEEKLY_BUDGET).toFixed(0)} over budget.`, tone: 'warning' });
    }
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

        {/* Month Comparison Chart */}
        {monthWeeks.length > 0 && (
          <MonthComparisonCard weeks={monthWeeks} budget={WEEKLY_BUDGET} />
        )}

        {/* Insights */}
        <InsightBanner insights={budgetInsights} />
        {budgetAgentInsights.map((ai) => (
          <AgentInsightCard key={ai.agentId} insight={ai} />
        ))}

        {/* Category Breakdown */}
        <Card style={styles.categoryCard}>
          <SectionHeader title="By Category" />
          <View style={styles.categoryRow}>
            {([
              { key: 'Food', color: colors.food },
              { key: 'Fun', color: colors.fun },
              { key: 'Transport', color: colors.transport },
              { key: 'Subscriptions', color: colors.subscriptions },
              { key: 'Other', color: colors.other },
            ] as const)
              .filter(({ key }) => (data.categories[key] || 0) > 0)
              .map(({ key, color }) => (
                <View key={key} style={styles.categoryItem}>
                  <View style={[styles.categoryDot, { backgroundColor: color }]} />
                  <View>
                    <Text style={styles.categoryName}>{key}</Text>
                    <Text style={styles.categoryAmount}>€{(data.categories[key] || 0).toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            {Object.values(data.categories).every((v) => !v) && (
              <>
                <View style={styles.categoryItem}>
                  <View style={[styles.categoryDot, { backgroundColor: colors.food }]} />
                  <View>
                    <Text style={styles.categoryName}>Food</Text>
                    <Text style={styles.categoryAmount}>€0.00</Text>
                  </View>
                </View>
                <View style={styles.categoryItem}>
                  <View style={[styles.categoryDot, { backgroundColor: colors.fun }]} />
                  <View>
                    <Text style={styles.categoryName}>Fun</Text>
                    <Text style={styles.categoryAmount}>€0.00</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Category bars */}
          <View style={styles.categoryBars}>
            {([
              { key: 'Food', color: colors.food },
              { key: 'Fun', color: colors.fun },
              { key: 'Transport', color: colors.transport },
              { key: 'Subscriptions', color: colors.subscriptions },
              { key: 'Other', color: colors.other },
            ] as const)
              .filter(({ key }) => (data.categories[key] || 0) > 0)
              .map(({ key, color }) => (
                <View key={key} style={styles.categoryBarContainer}>
                  <Text style={styles.categoryBarLabel}>{key}</Text>
                  <View style={styles.categoryBarBg}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          backgroundColor: color,
                          width: `${data.totalSpent > 0 ? ((data.categories[key] || 0) / data.totalSpent) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
          </View>
        </Card>

        {/* Spending Log */}
        <SectionHeader title="Spending Log" />

        {data.entries.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No spending logged"
            subtitle="Tap + to log an expense"
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
                      { backgroundColor: {
                          Food: colors.food,
                          Fun: colors.fun,
                          Transport: colors.transport,
                          Subscriptions: colors.subscriptions,
                          Other: colors.other,
                        }[entry.category] || colors.other },
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
  container: { flex: 1, backgroundColor: colors.bg },
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

// ---- Chart styles ----

const chartStyles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  chartArea: {
    position: 'relative',
    height: BAR_MAX_HEIGHT + 40, // bars + labels
    justifyContent: 'flex-end',
  },
  budgetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  budgetDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.textLight,
  },
  budgetLineLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginLeft: 6,
    fontWeight: '600',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 0,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    width: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
  },
  barAmount: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  callout: {
    backgroundColor: '#fdf8f3',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  calloutText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
});
