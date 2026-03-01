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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { useBudget } from '../../src/hooks/useBudget';
import { budgetApi } from '../../src/api/client';
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { ArcRing } from '../../src/components/ArcRing';
import { InsightBanner, InsightItem } from '../../src/components/InsightBanner';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { useInsights } from '../../src/hooks/useInsights';
import { WeekSelector, getISOWeekKey } from '../../src/components/WeekSelector';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { ScreenTitle } from '../../src/components/ScreenTitle';
import { FAB } from '../../src/components/FAB';
import { BudgetCategory, BudgetWeek } from '../../src/types';
import { fmtDecimal as fmt } from '../../src/utils/formatters';

const WEEKLY_BUDGET = 70;

// ---- Category config matching redesign mockup ----

const CATEGORY_CONFIG: { key: BudgetCategory; icon: string; color: string }[] = [
  { key: 'Food', icon: '\u{1F958}', color: colors.food },
  { key: 'Fun', icon: '\u{1F389}', color: colors.fun },
  { key: 'Transport', icon: '\u{1F68C}', color: colors.transport },
  { key: 'Subscriptions', icon: '\u{1F4E6}', color: colors.subscriptions },
  { key: 'Other', icon: '\u{1F4B3}', color: colors.other },
];

// ---- Month comparison data types & helpers ----

interface WeekSummary {
  weekKey: string;
  weekLabel: string;
  totalSpent: number;
  isCurrent: boolean;
  isFuture: boolean;
}

function getMonthWeekKeys(centerDate: Date): string[] {
  const keys: string[] = [];
  const base = new Date(centerDate);
  base.setDate(base.getDate() - 7);
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
        const label = wk.split('-')[1] || wk;
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
  { key: 'amount', label: 'Amount (\u20AC)', placeholder: '0.00', type: 'number', required: true },
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

// ---- Tabbed Widget (By Week / By Category) — matching redesign mockup ----

const BAR_HEIGHT = 90;

function TabbedSpendingWidget({
  weeks,
  budget,
  categories,
  totalSpent,
}: {
  weeks: WeekSummary[];
  budget: number;
  categories: Record<string, number>;
  totalSpent: number;
}) {
  const [tab, setTab] = useState<'week' | 'cat'>('week');
  const maxBar = Math.max(budget, ...weeks.map((w) => w.totalSpent));

  return (
    <Card style={tabStyles.card}>
      {/* Tab bar */}
      <View style={tabStyles.tabBar}>
        {([
          { id: 'week' as const, label: 'By Week' },
          { id: 'cat' as const, label: 'By Category' },
        ]).map((t) => (
          <Pressable
            key={t.id}
            style={tabStyles.tab}
            onPress={() => setTab(t.id)}
          >
            <Text style={[
              tabStyles.tabText,
              tab === t.id && tabStyles.tabTextActive,
            ]}>
              {t.label}
            </Text>
            {tab === t.id && <View style={tabStyles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <View style={tabStyles.content}>
        {tab === 'week' && (
          <>
            {/* Budget limit label */}
            <Text style={tabStyles.limitLabel}>
              {'\u2014'} {'\u20AC'}{fmt(budget)} limit
            </Text>

            {/* Bar chart */}
            <View style={tabStyles.chartArea}>
              {/* Dashed budget line */}
              <View style={[
                tabStyles.budgetLine,
                { bottom: maxBar > 0 ? (budget / maxBar) * BAR_HEIGHT : 0 },
              ]}>
                <View style={tabStyles.budgetDash} />
              </View>

              <View style={tabStyles.barsRow}>
                {weeks.map((w) => {
                  const h = maxBar > 0 ? (w.totalSpent / maxBar) * BAR_HEIGHT : 0;
                  const isOver = w.totalSpent > budget;
                  let barColor = 'rgba(45,42,38,0.15)';
                  if (w.isFuture) barColor = colors.borderLight;
                  else if (w.isCurrent) barColor = colors.accent;
                  else if (isOver) barColor = colors.error;

                  return (
                    <View key={w.weekKey} style={tabStyles.barCol}>
                      <View style={tabStyles.barTrack}>
                        <View style={[
                          tabStyles.bar,
                          {
                            height: Math.max(h, w.totalSpent === 0 && !w.isCurrent ? 2 : 0),
                            backgroundColor: barColor,
                          },
                          w.isCurrent && {
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 2,
                          },
                        ]} />
                      </View>
                      <Text style={[
                        tabStyles.barLabel,
                        w.isCurrent && { color: colors.accent, fontWeight: '700' },
                      ]}>
                        {w.weekLabel}
                      </Text>
                      <Text style={tabStyles.barAmount}>
                        {w.isFuture ? '\u2014' : `\u20AC${fmt(w.totalSpent)}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {tab === 'cat' && (
          <View>
            {CATEGORY_CONFIG.map((c, i) => {
              const amount = categories[c.key] || 0;
              return (
                <View
                  key={c.key}
                  style={[
                    tabStyles.catRow,
                    i < CATEGORY_CONFIG.length - 1 && tabStyles.catRowBorder,
                  ]}
                >
                  {/* Emoji icon box */}
                  <View style={tabStyles.catIconBox}>
                    <Text style={tabStyles.catIcon}>{c.icon}</Text>
                  </View>
                  <View style={tabStyles.catInfo}>
                    <View style={tabStyles.catHeader}>
                      <Text style={tabStyles.catName}>{c.key}</Text>
                      <Text style={tabStyles.catAmount}>
                        {'\u20AC'}{amount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={tabStyles.catBarBg}>
                      <View style={[
                        tabStyles.catBarFill,
                        {
                          backgroundColor: c.color,
                          width: `${Math.min((amount / budget) * 100, 100)}%`,
                        },
                      ]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Card>
  );
}

// ---- Main Screen ----

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
    budgetInsights.push({ emoji: '\u{1F6A8}', text: `You're \u20AC${Math.abs(data.remaining).toFixed(2)} over your \u20AC${WEEKLY_BUDGET} weekly budget.`, tone: 'negative' });
  } else if (spentPercent > 0.8) {
    budgetInsights.push({ emoji: '\u26A0\uFE0F', text: `\u20AC${data.remaining.toFixed(2)} left \u2014 ${Math.round((1 - spentPercent) * 100)}% of your budget remaining.`, tone: 'warning' });
  } else if (data.totalSpent > 0) {
    budgetInsights.push({ emoji: '\u{1F4B0}', text: `\u20AC${data.remaining.toFixed(2)} remaining of \u20AC${WEEKLY_BUDGET} budget (${Math.round(spentPercent * 100)}% spent).`, tone: 'positive' });
  }
  const catEntries = Object.entries(data.categories).filter(([, v]) => v > 0) as [string, number][];
  if (catEntries.length > 0) {
    const top = catEntries.sort((a, b) => b[1] - a[1])[0];
    const pct = data.totalSpent > 0 ? Math.round((top[1] / data.totalSpent) * 100) : 0;
    budgetInsights.push({ emoji: '\u{1F4CA}', text: `${top[0]} is your top category \u2014 \u20AC${top[1].toFixed(2)} (${pct}% of spending).`, tone: 'neutral' });
  }
  const dayOfWeek = new Date().getDay() || 7;
  if (data.totalSpent > 0 && dayOfWeek < 7) {
    const dailyPace = data.totalSpent / dayOfWeek;
    const projected = dailyPace * 7;
    if (projected > WEEKLY_BUDGET) {
      budgetInsights.push({ emoji: '\u{1F4C8}', text: `At this pace you'll spend ~\u20AC${projected.toFixed(0)} by Sunday \u2014 \u20AC${(projected - WEEKLY_BUDGET).toFixed(0)} over budget.`, tone: 'warning' });
    }
  }

  const getCategoryEmoji = (cat: string) => {
    const found = CATEGORY_CONFIG.find((c) => c.key === cat);
    return found?.icon || '\u{1F4B3}';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <ScreenTitle title="Budget" />

        <WeekSelector currentDate={weekDate} onWeekChange={setWeekDate} />

        {/* Budget Hero */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>WEEKLY BUDGET</Text>
              <Text style={styles.heroValue}>
                {'\u20AC'}{data.remaining.toFixed(0)}
              </Text>
              <Text style={[styles.heroSub, isOverBudget && { color: colors.error }]}>
                {isOverBudget ? 'over budget' : `remaining \u00B7 \u20AC${data.totalSpent.toFixed(2)} spent`}
              </Text>
            </View>
            <ArcRing
              pct={Math.min(spentPercent * 100, 100)}
              size={72}
              stroke={7}
              fg={spentPercent > 0.8 ? colors.error : colors.accentWarm}
              bg="rgba(255,255,255,0.08)"
            >
              <Text style={styles.arcPct}>{Math.round(spentPercent * 100)}%</Text>
            </ArcRing>
          </View>

          {/* Budget progress bar */}
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetBarFill,
                {
                  width: `${Math.min(spentPercent * 100, 100)}%`,
                  backgroundColor: isOverBudget ? colors.error : colors.accent,
                },
              ]}
            />
          </View>
        </DarkCard>

        {/* Tabbed Widget — By Week / By Category */}
        {monthWeeks.length > 0 && (
          <TabbedSpendingWidget
            weeks={monthWeeks}
            budget={WEEKLY_BUDGET}
            categories={data.categories}
            totalSpent={data.totalSpent}
          />
        )}

        {/* Insights */}
        <InsightBanner insights={budgetInsights} />
        {budgetAgentInsights.map((ai) => (
          <AgentInsightCard key={ai.agentId} insight={ai} />
        ))}

        {/* Spending Log */}
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>SPENDING LOG</Text>
        </View>

        {data.entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>{'\u{1F4B3}'}</Text>
              <Text style={styles.emptyTitle}>No spending yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to log an expense</Text>
            </View>
          </Card>
        ) : (
          [...data.entries].reverse().map((entry) => (
            <Pressable
              key={entry.id}
              onLongPress={() => handleDeleteEntry(entry.id, entry.description)}
            >
              <Card style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <View style={styles.entryIconBox}>
                    <Text style={styles.entryEmoji}>{getCategoryEmoji(entry.category)}</Text>
                  </View>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryDesc} numberOfLines={1}>
                      {entry.description || entry.category}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {entry.category} {'\u00B7'} {entry.date.slice(5)}
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text style={styles.entryAmount}>{'\u20AC'}{entry.amount.toFixed(2)}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB icon="add" onPress={() => setShowAddModal(true)} />

      <AddEntryModal
        visible={showAddModal}
        title="Log Expense"
        fields={budgetFields}
        onSubmit={handleAddEntry}
        onClose={() => setShowAddModal(false)}
      />
    </SafeAreaView>
  );
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  heroCard: { marginBottom: 12 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: {},
  heroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.7, marginBottom: 6 },
  heroValue: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -2 },
  heroSub: { fontSize: 12, color: colors.success, fontWeight: '500', marginTop: 4 },
  arcPct: { fontSize: 13, fontWeight: '700', color: '#fff' },
  budgetBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 18,
    overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', borderRadius: 2 },

  // Section label
  sectionLabelRow: { marginTop: 16, marginBottom: 10 },
  sectionLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyCard: { marginBottom: 12 },
  emptyInner: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },

  // Spending log entries
  entryCard: { marginBottom: 8, padding: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryEmoji: { fontSize: 20 },
  entryInfo: { flex: 1, minWidth: 0 },
  entryDesc: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  entryMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  entryRight: { alignItems: 'flex-end' },
  entryAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
});

// ---- Tabbed Widget Styles ----

const tabStyles = StyleSheet.create({
  card: { marginBottom: 12, padding: 0, overflow: 'hidden' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.muted,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  content: { padding: 16 },

  // By Week tab
  limitLabel: {
    fontSize: 9.5,
    color: colors.muted,
    textAlign: 'right',
    marginBottom: 6,
  },
  chartArea: {
    position: 'relative',
    height: BAR_HEIGHT + 40,
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
    borderColor: colors.border,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    height: BAR_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '400',
    marginTop: 6,
  },
  barAmount: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },

  // By Category tab
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    marginBottom: 12,
  },
  catRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIcon: { fontSize: 18 },
  catInfo: { flex: 1, minWidth: 0 },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  catName: { fontSize: 13, fontWeight: '500', color: colors.text },
  catAmount: { fontSize: 12, color: colors.textSub },
  catBarBg: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 2 },
});
