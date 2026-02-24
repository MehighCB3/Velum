import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Polygon, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../src/theme/colors';
import { useNutrition } from '../../src/hooks/useNutrition';
import { useFitness } from '../../src/hooks/useFitness';
import { useBudget } from '../../src/hooks/useBudget';
import { format } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SVG_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const CENTER = SVG_SIZE / 2;
const MAX_R = SVG_SIZE * 0.28; // radar radius

interface Metric {
  key: string;
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
  icon: string;
  sub: string;
  invert?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return format(new Date(), 'MMM d, yyyy');
}

export default function DashboardScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: nutritionData, loading: nutLoading, refresh: nutRefresh } = useNutrition(today);
  const { data: fitnessData, loading: fitLoading, refresh: fitRefresh } = useFitness(new Date());
  const { data: budgetData, loading: budLoading, refresh: budRefresh } = useBudget(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([nutRefresh(), fitRefresh(), budRefresh()]);
    setRefreshing(false);
  }, [nutRefresh, fitRefresh, budRefresh]);

  // Build metrics from live data
  const totalCals = Math.round(nutritionData.totals.calories);
  const calTarget = nutritionData.goals.calories || 2600;
  const totalDist = Number(fitnessData?.totals?.totalDistance) || 0;
  const budgetSpent = budgetData.totalSpent;
  const budgetLimit = 70;

  const metrics: Metric[] = [
    {
      key: 'cal', label: 'Calories', value: totalCals, target: calTarget,
      unit: 'kcal', color: colors.fat, icon: '🔥',
      sub: `${Math.max(0, calTarget - totalCals).toLocaleString()} left`,
    },
    {
      key: 'dist', label: 'Distance', value: Math.round(totalDist * 10) / 10, target: 25,
      unit: 'km', color: colors.accent, icon: '🏃',
      sub: `${(fitnessData?.entries ?? []).length} activities`,
    },
    {
      key: 'sleep', label: 'Sleep', value: 7.2, target: 8,
      unit: 'hrs', color: colors.purple, icon: '😴',
      sub: 'last night',
    },
    {
      key: 'budget', label: 'Budget', value: Math.round(budgetSpent), target: budgetLimit,
      unit: '€', color: colors.success, icon: '💰',
      sub: `€${Math.max(0, budgetLimit - budgetSpent).toFixed(0)} left`,
      invert: true,
    },
  ];

  const pcts = metrics.map((mt) => {
    const raw = (mt.value / mt.target) * 100;
    return Math.round(mt.invert ? Math.max(0, 100 - raw) : Math.min(raw, 100));
  });
  const score = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);

  // Spider geometry
  const n = metrics.length;
  const angleFor = (i: number) => ((2 * Math.PI) / n) * i - Math.PI / 2;
  const ptAt = (i: number, r: number) => ({
    x: CENTER + r * Math.cos(angleFor(i)),
    y: CENTER + r * Math.sin(angleFor(i)),
  });

  const polygon = (rFn: (i: number) => number) =>
    metrics.map((_, i) => {
      const p = ptAt(i, rFn(i));
      return `${p.x},${p.y}`;
    }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];

  // Info label positions for 4 axes: top, right, bottom, left
  const infoPositions = metrics.map((_, i) => {
    const tip = ptAt(i, MAX_R + 12);
    return tip;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Velum</Text>
          <Text style={styles.dateLabel}>{formatDate()}</Text>
        </View>
        <Text style={styles.greeting}>{getGreeting()}, Mihai</Text>

        {/* Spider Chart */}
        <View style={styles.chartContainer}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            <Defs>
              <RadialGradient id="spiderFill" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.08} />
              </RadialGradient>
            </Defs>

            {/* Grid polygons */}
            {gridLevels.map((g) => (
              <Polygon
                key={g}
                points={polygon(() => MAX_R * g)}
                fill="none"
                stroke={colors.border}
                strokeWidth={g === 1 ? 1.5 : 0.8}
                strokeDasharray={g < 1 ? '4,4' : 'none'}
              />
            ))}

            {/* Axis lines */}
            {metrics.map((_, i) => {
              const p = ptAt(i, MAX_R);
              return (
                <Line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke={colors.border}
                  strokeWidth={0.8}
                />
              );
            })}

            {/* Value polygon */}
            <Polygon
              points={polygon((i) => MAX_R * (pcts[i] / 100))}
              fill="url(#spiderFill)"
              stroke={colors.accent}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Dots at value points */}
            {metrics.map((mt, i) => {
              const p = ptAt(i, MAX_R * (pcts[i] / 100));
              return (
                <React.Fragment key={mt.key}>
                  <Circle cx={p.x} cy={p.y} r={8} fill={mt.color} opacity={0.15} />
                  <Circle cx={p.x} cy={p.y} r={5} fill={mt.color} />
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Center score overlay */}
          <View style={styles.centerScore}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>SCORE</Text>
          </View>

          {/* Metric info labels at each axis tip */}
          {metrics.map((mt, i) => {
            const pos = infoPositions[i];
            // Determine alignment based on angle
            const angle = angleFor(i);
            const isTop = Math.abs(angle + Math.PI / 2) < 0.1;
            const isBottom = Math.abs(angle - Math.PI / 2) < 0.1;
            const isRight = Math.abs(angle) < 0.1;
            const isLeft = Math.abs(angle - Math.PI) < 0.1 || Math.abs(angle + Math.PI) < 0.1;

            let align: 'center' | 'flex-start' | 'flex-end' = 'center';
            let labelStyle: any = {};

            if (isTop) {
              labelStyle = { position: 'absolute' as const, top: pos.y - 52, left: pos.x - 60, width: 120, alignItems: 'center' };
            } else if (isRight) {
              labelStyle = { position: 'absolute' as const, top: pos.y - 20, left: pos.x + 4, alignItems: 'flex-start' };
              align = 'flex-start';
            } else if (isBottom) {
              labelStyle = { position: 'absolute' as const, top: pos.y + 4, left: pos.x - 60, width: 120, alignItems: 'center' };
            } else if (isLeft) {
              labelStyle = { position: 'absolute' as const, top: pos.y - 20, right: SVG_SIZE - pos.x + 4, alignItems: 'flex-end' };
              align = 'flex-end';
            }

            return (
              <View key={mt.key} style={labelStyle}>
                <View style={[styles.metricLabelRow, { justifyContent: align === 'center' ? 'center' : align === 'flex-end' ? 'flex-end' : 'flex-start' }]}>
                  <Text style={styles.metricIcon}>{mt.icon}</Text>
                  <Text style={styles.metricName}>{mt.label}</Text>
                </View>
                <Text style={[styles.metricValue, { color: mt.color, textAlign: align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left' }]}>
                  {mt.unit === '€' ? `€${mt.value}` : mt.value}
                  {mt.unit !== '€' && <Text style={styles.metricUnit}> {mt.unit}</Text>}
                </Text>
                <Text style={[styles.metricSub, { textAlign: align === 'center' ? 'center' : align === 'flex-end' ? 'right' : 'left' }]}>
                  of {mt.unit === '€' ? `€${mt.target}` : `${mt.target} ${mt.unit}`} · {mt.sub}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  dateLabel: {
    fontSize: 10, color: colors.dimmed, fontWeight: '500',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },
  greeting: { fontSize: 12, color: colors.muted, marginBottom: 12 },

  chartContainer: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 40,
  },

  centerScore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: { fontSize: 42, fontWeight: '700', color: colors.text, lineHeight: 46 },
  scoreLabel: {
    fontSize: 9, color: colors.muted,
    letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4,
  },

  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metricIcon: { fontSize: 12 },
  metricName: { fontSize: 11, fontWeight: '700', color: colors.text },
  metricValue: { fontSize: 18, fontWeight: '700', lineHeight: 22, marginTop: 2 },
  metricUnit: { fontSize: 10, fontWeight: '500', color: colors.muted },
  metricSub: { fontSize: 9, color: colors.muted, marginTop: 1 },
});
