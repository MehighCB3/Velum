import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { colors } from '../../src/theme/colors';
import { DarkCard, Card, SectionHeader } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useInsights } from '../../src/hooks/useInsights';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { profileApi } from '../../src/api/client';
import { UserProfile } from '../../src/types';

// ==================== YEAR CALCULATIONS ====================

function getWeekOfYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDaysLeftInYear(date: Date): number {
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  const diff = endOfYear.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getWeeksLeftInYear(date: Date): number {
  return Math.floor(getDaysLeftInYear(date) / 7);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTotalDaysInYear(year: number): number {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

// ==================== WEEK GRID ====================

function WeekGrid({ currentWeek, totalWeeks }: { currentWeek: number; totalWeeks: number }) {
  const rows = [];
  let week = 1;
  const cols = 13; // 4 rows of 13 = 52
  const rowCount = Math.ceil(totalWeeks / cols);

  for (let r = 0; r < rowCount; r++) {
    const cells = [];
    for (let c = 0; c < cols && week <= totalWeeks; c++) {
      const isPast = week < currentWeek;
      const isCurrent = week === currentWeek;
      cells.push(
        <View
          key={week}
          style={[
            gridStyles.cell,
            isPast && gridStyles.cellPast,
            isCurrent && gridStyles.cellCurrent,
          ]}
        />,
      );
      week++;
    }
    rows.push(
      <View key={r} style={gridStyles.row}>
        {cells}
      </View>,
    );
  }

  return <View style={gridStyles.container}>{rows}</View>;
}

const gridStyles = StyleSheet.create({
  container: { gap: 3 },
  row: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.hover,
  },
  cellPast: {
    backgroundColor: colors.darkTertiary,
  },
  cellCurrent: {
    backgroundColor: colors.accent,
  },
});

// ==================== HOME SCREEN ====================

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { insights } = useInsights();

  const now = new Date();
  const year = now.getFullYear();
  const currentWeek = getWeekOfYear(now);
  const weeksLeft = getWeeksLeftInYear(now);
  const daysLeft = getDaysLeftInYear(now);
  const dayOfYear = getDayOfYear(now);
  const totalDays = getTotalDaysInYear(year);
  const yearProgress = dayOfYear / totalDays;
  const totalWeeks = Math.ceil(totalDays / 7);

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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Hero: Weeks Left */}
        <DarkCard style={styles.heroCard}>
          <Text style={styles.heroDate}>{dayName}, {monthDay}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.weeksValue}>{weeksLeft}</Text>
              <Text style={styles.weeksLabel}>weeks left in {year}</Text>
            </View>
            <ProgressRing
              progress={yearProgress}
              size={90}
              strokeWidth={8}
              color={colors.accent}
              value={`W${currentWeek}`}
              label={`of ${totalWeeks}`}
            />
          </View>
          <View style={styles.daysRow}>
            <Text style={styles.daysText}>{daysLeft} days remaining</Text>
            <Text style={styles.daysText}>{Math.round(yearProgress * 100)}% of {year} elapsed</Text>
          </View>
        </DarkCard>

        {/* Week Grid */}
        <Card style={styles.gridCard}>
          <SectionHeader title={`${year} in Weeks`} />
          <WeekGrid currentWeek={currentWeek} totalWeeks={totalWeeks} />
          <View style={styles.gridLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.darkTertiary }]} />
              <Text style={styles.legendText}>Elapsed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendText}>This week</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.hover }]} />
              <Text style={styles.legendText}>Remaining</Text>
            </View>
          </View>
        </Card>

        {/* Life Stats (if profile loaded) */}
        {profile && profile.weeksRemaining !== undefined && (
          <Card style={styles.lifeCard}>
            <SectionHeader title="Life in Weeks" />
            <View style={styles.lifeRow}>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>{profile.currentAge}</Text>
                <Text style={styles.lifeLabel}>Age</Text>
              </View>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>
                  {(profile.weeksRemaining || 0).toLocaleString()}
                </Text>
                <Text style={styles.lifeLabel}>Weeks Left</Text>
              </View>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>{profile.yearsRemaining}</Text>
                <Text style={styles.lifeLabel}>Years Left</Text>
              </View>
            </View>
            <View style={styles.lifeProgressContainer}>
              <View style={styles.lifeProgressBar}>
                <View
                  style={[styles.lifeProgressFill, { width: `${profile.percentLived || 0}%` }]}
                />
              </View>
              <Text style={styles.lifeProgressText}>
                {profile.percentLived}% of life expectancy ({profile.life_expectancy} yrs)
              </Text>
            </View>
          </Card>
        )}

        {/* Agent Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsSection}>
            <SectionHeader title="Insights" />
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
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  heroCard: { marginBottom: 12 },
  heroDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkTextSecondary,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: { flex: 1 },
  weeksValue: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.darkText,
    lineHeight: 70,
  },
  weeksLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.darkTextSecondary,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.darkTertiary,
  },
  daysText: {
    fontSize: 12,
    color: colors.darkTextSecondary,
  },
  gridCard: { marginBottom: 12 },
  gridLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: colors.textLight },
  lifeCard: { marginBottom: 12 },
  lifeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  lifeItem: { alignItems: 'center' },
  lifeValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  lifeLabel: { fontSize: 11, color: colors.textLight, marginTop: 4 },
  lifeProgressContainer: { marginTop: 4 },
  lifeProgressBar: {
    height: 6,
    backgroundColor: colors.hover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  lifeProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  lifeProgressText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 6,
  },
  insightsSection: { marginBottom: 12 },
});
