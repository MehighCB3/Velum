import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { DarkCard, Card, SectionHeader } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useInsights } from '../../src/hooks/useInsights';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { profileApi } from '../../src/api/client';
import { UserProfile } from '../../src/types';

// Safe number formatting (avoids Hermes toLocaleString crash)
function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return n >= 1000
    ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : String(n);
}

// ==================== YEAR CALCULATIONS ====================

function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeeksLeftInYear(date: Date): number {
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  const diff = endOfYear.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24) / 7);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getTotalDaysInYear(year: number): number {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

// ==================== EVENT MARKERS ====================

interface YearEvent {
  week: number;
  label: string;
  color: string;
}

const YEAR_EVENTS: YearEvent[] = [
  { week: 12, label: 'Barcelona Marathon', color: '#e85c5c' },
  { week: 24, label: 'Wedding Anniversary', color: '#9b8ed6' },
  { week: 30, label: 'Ironman Training Camp', color: '#e8a85c' },
  { week: 36, label: 'Product Hunt Launch', color: '#6ba3d6' },
  { week: 48, label: 'Christmas in Romania', color: '#6ec87a' },
];

// ==================== WEEK GRID WITH EVENTS ====================

function WeekGrid({
  currentWeek,
  selectedEvent,
  onSelectEvent,
}: {
  currentWeek: number;
  selectedEvent: YearEvent | null;
  onSelectEvent: (event: YearEvent | null) => void;
}) {
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <View style={gridStyles.container}>
      <View style={gridStyles.grid}>
        {weeks.map((weekNum) => {
          const event = YEAR_EVENTS.find((e) => e.week === weekNum);
          const isSelected = selectedEvent?.week === weekNum;
          const isPast = weekNum < currentWeek;
          const isCurrent = weekNum === currentWeek;

          let bg = colors.border; // future — #f0ece6
          if (isPast) bg = colors.text; // #2d2a26
          else if (isCurrent) bg = colors.accent; // #c4956a
          else if (event) bg = event.color;

          return (
            <Pressable
              key={weekNum}
              onPress={() => event && onSelectEvent(event)}
              style={[
                gridStyles.cell,
                { backgroundColor: bg },
                isSelected && { borderWidth: 2, borderColor: event!.color, transform: [{ scale: 1.4 }] },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={gridStyles.legend}>
        <View style={gridStyles.legendItem}>
          <View style={[gridStyles.legendDot, { backgroundColor: colors.text }]} />
          <Text style={gridStyles.legendText}>Done</Text>
        </View>
        <View style={gridStyles.legendItem}>
          <View style={[gridStyles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={gridStyles.legendText}>Now</Text>
        </View>
        {YEAR_EVENTS.map((e) => (
          <Pressable
            key={e.label}
            style={gridStyles.legendItem}
            onPress={() => onSelectEvent(e)}
          >
            <View style={[gridStyles.legendDot, { backgroundColor: e.color }]} />
            <Text style={gridStyles.legendText}>{e.label.split(' ')[0]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {},
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendText: { fontSize: 10, color: colors.textLight },
});

// ==================== SHORTCUTS ====================

const SHORTCUTS = [
  { icon: 'nutrition-outline' as const, label: 'Log Meal', route: '/nutrition', color: '#6ec87a' },
  { icon: 'barbell-outline' as const, label: 'Log Workout', route: '/fitness', color: '#e8a85c' },
  { icon: 'card-outline' as const, label: 'Log Expense', route: '/budget', color: '#6ba3d6' },
  { icon: 'book-outline' as const, label: 'Daily Wisdom', route: '/feed', color: '#c4956a' },
  { icon: 'flag-outline' as const, label: 'Goals', route: '/goals', color: '#9b8ed6' },
  { icon: 'language-outline' as const, label: 'Spanish', route: '/learn', color: '#e85c5c' },
];

function ShortcutGrid() {
  const router = useRouter();
  return (
    <View style={shortcutStyles.grid}>
      {SHORTCUTS.map((s) => (
        <Pressable
          key={s.label}
          style={shortcutStyles.item}
          onPress={() => router.push(s.route as any)}
        >
          <View style={[shortcutStyles.iconCircle, { backgroundColor: s.color + '18' }]}>
            <Ionicons name={s.icon} size={20} color={s.color} />
          </View>
          <Text style={shortcutStyles.label}>{s.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const shortcutStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  item: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 11, fontWeight: '600', color: colors.text },
});

// ==================== HOME SCREEN ====================

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<YearEvent | null>(null);
  const { insights } = useInsights();

  const now = new Date();
  const year = now.getFullYear();
  const currentWeek = getWeekOfYear(now);
  const weeksLeft = getWeeksLeftInYear(now);
  const dayOfYear = getDayOfYear(now);
  const totalDays = getTotalDaysInYear(year);
  const yearProgress = dayOfYear / totalDays;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileApi.get();
      setProfile(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const heroNumber = selectedEvent
    ? selectedEvent.week - currentWeek
    : weeksLeft;
  const heroSubtitle = selectedEvent
    ? `weeks to ${selectedEvent.label}`
    : `weeks left in ${year}`;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Hero Card */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroDate}>{dayName}, {monthDay}</Text>
              <Text style={styles.heroNumber}>{heroNumber}</Text>
              <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            </View>
            <ProgressRing
              progress={yearProgress}
              size={56}
              strokeWidth={5}
              color={colors.accent}
              value={`W${currentWeek}`}
            />
          </View>
          {selectedEvent && (
            <Pressable onPress={() => setSelectedEvent(null)} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back to year view</Text>
            </Pressable>
          )}
        </DarkCard>

        {/* Year in Weeks Grid */}
        <SectionHeader title={`${year} in Weeks`} />
        <Card style={styles.gridCard}>
          <WeekGrid
            currentWeek={currentWeek}
            selectedEvent={selectedEvent}
            onSelectEvent={(e) =>
              setSelectedEvent((prev) => (prev?.week === e?.week ? null : e))
            }
          />
        </Card>

        {/* Life in Weeks */}
        {profile && profile.weeksRemaining !== undefined && (
          <>
            <SectionHeader title="Life in Weeks" />
            <Card style={styles.lifeCard}>
              <View style={styles.lifeRow}>
                {[
                  { val: String(profile.currentAge), label: 'Age' },
                  { val: fmt(profile.weeksRemaining || 0), label: 'Weeks Left' },
                  { val: String(profile.yearsRemaining), label: 'Years Left' },
                ].map((d) => (
                  <View key={d.label} style={styles.lifeItem}>
                    <Text style={styles.lifeValue}>{d.val}</Text>
                    <Text style={styles.lifeLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${Math.min(profile.percentLived || 0, 100)}%` }]}
                />
              </View>
              <Text style={styles.barCaption}>
                {profile.percentLived}% of {profile.life_expectancy || 85} yr expectancy
              </Text>
            </Card>
          </>
        )}

        {/* Quick Shortcuts */}
        <SectionHeader title="Quick Actions" />
        <ShortcutGrid />

        {/* Agent Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <SectionHeader title="Agent Insights" />
            {insights.map((insight) => (
              <AgentInsightCard key={insight.agentId} insight={insight} />
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  heroCard: { marginBottom: 8 },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: { flex: 1 },
  heroDate: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.darkText,
    lineHeight: 56,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  gridCard: { padding: 14, marginBottom: 8 },
  lifeCard: { padding: 16, marginBottom: 8 },
  lifeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lifeItem: { alignItems: 'center' },
  lifeValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  lifeLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  barTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  barCaption: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 6,
  },
  insightsSection: { marginBottom: 8 },
});
