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
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format, subDays } from 'date-fns';
import { colors } from '../../src/theme/colors';
import { useNutrition } from '../../src/hooks/useNutrition';
import { DarkCard, Card, EmptyState } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { useInsights } from '../../src/hooks/useInsights';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { nutritionApi } from '../../src/api/client';
import { API_BASE } from '../../src/api/config';
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

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return String(n);
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
          {/* Handle */}
          <View style={detailStyles.handle} />

          {/* Photo — full bleed at top if available */}
          {entry.photoUrl ? (
            <Image
              source={{ uri: entry.photoUrl }}
              style={detailStyles.photo}
              resizeMode="cover"
            />
          ) : null}

          {/* Header */}
          <View style={detailStyles.header}>
            <View style={detailStyles.headerLeft}>
              {!entry.photoUrl && (
                <Text style={detailStyles.emoji}>{getMealEmoji(entry.time)}</Text>
              )}
              <View style={{ flex: 1 }}>
                <Text style={detailStyles.name}>{entry.name}</Text>
                <Text style={detailStyles.time}>{entry.time}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </Pressable>
          </View>

          <ScrollView style={detailStyles.body} bounces={false}>
            {/* Calories hero */}
            <View style={detailStyles.calorieRow}>
              <Text style={detailStyles.calorieValue}>{Math.round(entry.calories)}</Text>
              <Text style={detailStyles.calorieUnit}> kcal</Text>
            </View>

            {/* Macro breakdown — 3 boxes */}
            <View style={detailStyles.macroGrid}>
              {[
                { label: 'Protein', value: entry.protein, color: colors.protein, pct: proteinPct },
                { label: 'Carbs', value: entry.carbs, color: colors.carbs, pct: carbsPct },
                { label: 'Fat', value: entry.fat, color: colors.fat, pct: fatPct },
              ].map((m) => (
                <View key={m.label} style={[detailStyles.macroBox, { borderTopColor: m.color }]}>
                  <Text style={[detailStyles.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                  <Text style={detailStyles.macroLabel}>{m.label}</Text>
                  <Text style={detailStyles.macroPct}>{m.pct}%</Text>
                </View>
              ))}
            </View>

            {/* Stacked macro bar */}
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
            onPress={() => { onClose(); onDelete(entry.id, entry.name); }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: colors.sidebar,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  emoji: { fontSize: 26 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  time: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  body: { paddingHorizontal: 20, paddingTop: 14 },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  calorieValue: { fontSize: 40, fontWeight: '800', color: colors.text },
  calorieUnit: { fontSize: 16, color: colors.textLight },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  macroBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderTopWidth: 3,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroLabel: { fontSize: 11, color: colors.textLight },
  macroPct: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  stackedBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  stackedSegment: { height: '100%' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error + '30',
    backgroundColor: colors.error + '08',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: colors.error },
});

// ==================== 30-DAY CALENDAR VIEW ====================

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

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

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
  const avgCalories = daysWithEntries.length > 0
    ? Math.round(daysWithEntries.reduce((sum, d) => sum + d.totals.calories, 0) / daysWithEntries.length)
    : 0;

  const circleSize = Math.floor((SCREEN_WIDTH - 32 - 50) / 6);

  return (
    <View>
      <DarkCard style={calStyles.summaryCard}>
        <Text style={calStyles.summaryTitle}>Last 30 Days</Text>
        <View style={calStyles.summaryRow}>
          {[
            { value: greenDays.length, label: 'On track', color: colors.success },
            { value: redDays.length, label: 'Over', color: colors.error },
            { value: days.length - daysWithEntries.length, label: 'No data', color: colors.darkTextSecondary },
            { value: avgCalories, label: 'Avg kcal', color: colors.accent },
          ].map((s) => (
            <View key={s.label} style={calStyles.summaryItem}>
              <Text style={[calStyles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={calStyles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </DarkCard>

      <Card style={calStyles.gridCard}>
        <View style={calStyles.circleGrid}>
          {days.map((day) => {
            const hasEntries = day.entries.length > 0;
            const isOver = hasEntries && (day.totals.calories > day.goals.calories || day.totals.carbs > day.goals.carbs);
            const isGood = hasEntries && !isOver;
            const fill = hasEntries ? Math.min(day.totals.calories / day.goals.calories, 1) : 0;
            const borderColor = !hasEntries ? colors.border : isGood ? colors.success : colors.error;
            const bgColor = !hasEntries ? colors.sidebar : isGood ? colors.success + '20' : colors.error + '20';
            const dateObj = new Date(day.date + 'T12:00:00');

            return (
              <View key={day.date} style={[calStyles.circleWrapper, { width: circleSize }]}>
                <View style={[calStyles.circle, {
                  width: circleSize - 8, height: circleSize - 8,
                  borderRadius: (circleSize - 8) / 2,
                  backgroundColor: bgColor, borderColor, borderWidth: hasEntries ? 2 : 1,
                }]}>
                  <Text style={[calStyles.circleDay, {
                    color: hasEntries ? (isGood ? colors.success : colors.error) : colors.textLight,
                    fontWeight: hasEntries ? '700' : '400',
                  }]}>
                    {format(dateObj, 'd')}
                  </Text>
                </View>
                {hasEntries && (
                  <View style={calStyles.miniBar}>
                    <View style={[calStyles.miniBarFill, {
                      width: `${Math.round(fill * 100)}%`,
                      backgroundColor: isGood ? colors.success : colors.error,
                    }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <View style={calStyles.legend}>
        {[
          { color: colors.success, label: 'On track' },
          { color: colors.error, label: 'Over limit' },
          { color: colors.border, label: 'No data' },
        ].map((l) => (
          <View key={l.label} style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: l.color }]} />
            <Text style={calStyles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  loading: { alignItems: 'center', paddingTop: 40, gap: 12 },
  loadingText: { fontSize: 13, color: colors.textLight },
  summaryCard: { marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.darkText, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: colors.darkTextSecondary, marginTop: 2 },
  gridCard: { marginBottom: 12, paddingVertical: 10, paddingHorizontal: 8 },
  circleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  circleWrapper: { alignItems: 'center', marginBottom: 10 },
  circle: { justifyContent: 'center', alignItems: 'center' },
  circleDay: { fontSize: 13 },
  miniBar: {
    width: '70%', height: 3, borderRadius: 1.5,
    backgroundColor: colors.border, marginTop: 3, overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 1.5 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textLight },
});

// ==================== FOOD SCAN MODAL ====================

interface ScanResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
  source?: string;
}

function FoodScanModal({
  visible,
  scanning,
  result,
  photoUri,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  scanning: boolean;
  result: ScanResult | null;
  photoUri: string | null;
  onClose: () => void;
  onConfirm: (r: ScanResult) => void;
}) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    if (result) {
      setName(result.name);
      setCalories(String(result.calories));
      setProtein(String(result.protein));
      setCarbs(String(result.carbs));
      setFat(String(result.fat));
    }
  }, [result]);

  const handleConfirm = () => {
    onConfirm({
      name: name || 'Unknown food',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      serving: result?.serving || '1 serving',
      confidence: result?.confidence || 'medium',
    });
  };

  const confidenceColor =
    result?.confidence === 'high' ? colors.success
    : result?.confidence === 'medium' ? colors.warning
    : colors.error;

  const sourceLabel =
    result?.source === 'fatsecret' ? 'FatSecret'
    : result?.source === 'ai-estimate' ? 'AI estimate'
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={scanStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={scanStyles.backdrop} onPress={onClose} />
        <View style={scanStyles.sheet}>
          <View style={scanStyles.handle} />

          {scanning ? (
            <>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={scanStyles.previewPhoto} resizeMode="cover" />
              ) : null}
              <View style={scanStyles.loadingBox}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={scanStyles.loadingText}>Identifying food...</Text>
                <Text style={scanStyles.loadingSubtext}>AI is analyzing your photo</Text>
              </View>
            </>
          ) : result ? (
            <>
              {/* Header */}
              <View style={scanStyles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={scanStyles.headerTitle}>Food Detected</Text>
                  {result.note ? (
                    <Text style={scanStyles.note} numberOfLines={1}>{result.note}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[scanStyles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
                    <Text style={[scanStyles.confidenceText, { color: confidenceColor }]}>
                      {result.confidence === 'high' ? '✓ High' : result.confidence === 'medium' ? '~ Medium' : '? Low'}
                    </Text>
                  </View>
                  {sourceLabel ? (
                    <Text style={scanStyles.sourceText}>{sourceLabel}</Text>
                  ) : null}
                </View>
              </View>

              {/* Name field */}
              <View style={scanStyles.nameRow}>
                <TextInput
                  style={scanStyles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Food name"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Macro grid — 4 compact inputs */}
              <View style={scanStyles.macroGrid}>
                {[
                  { label: 'kcal', value: calories, set: setCalories, color: colors.accent },
                  { label: 'Protein', value: protein, set: setProtein, color: colors.protein },
                  { label: 'Carbs', value: carbs, set: setCarbs, color: colors.carbs },
                  { label: 'Fat', value: fat, set: setFat, color: colors.fat },
                ].map((f) => (
                  <View key={f.label} style={scanStyles.macroItem}>
                    <TextInput
                      style={[scanStyles.macroInput, { borderColor: f.color + '60' }]}
                      value={f.value}
                      onChangeText={f.set}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                    />
                    <Text style={[scanStyles.macroLabel, { color: f.color }]}>{f.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={scanStyles.serving}>Per: {result.serving}</Text>

              <View style={scanStyles.buttons}>
                <Pressable style={scanStyles.cancelBtn} onPress={onClose}>
                  <Text style={scanStyles.cancelText}>Discard</Text>
                </Pressable>
                <Pressable style={scanStyles.confirmBtn} onPress={handleConfirm}>
                  <Ionicons name="checkmark" size={18} color={colors.darkText} />
                  <Text style={scanStyles.confirmText}>Log Meal</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const scanStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingBottom: 36,
    paddingTop: 10,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14,
  },
  previewPhoto: {
    width: '100%', height: 140, borderRadius: 12,
    marginBottom: 12, backgroundColor: colors.sidebar,
  },
  loadingBox: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  loadingText: { fontSize: 16, fontWeight: '700', color: colors.text },
  loadingSubtext: { fontSize: 13, color: colors.textLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  confidenceText: { fontSize: 11, fontWeight: '600' },
  sourceText: { fontSize: 10, color: colors.textLight },
  note: { fontSize: 11, color: colors.warning, marginTop: 2, fontStyle: 'italic' },
  nameRow: { marginBottom: 12 },
  nameInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: '600',
    color: colors.text, backgroundColor: colors.card,
  },
  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  macroItem: { flex: 1, alignItems: 'center', gap: 4 },
  macroInput: {
    width: '100%', borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 10, fontSize: 16, fontWeight: '700',
    color: colors.text, backgroundColor: colors.card, textAlign: 'center',
  },
  macroLabel: { fontSize: 10, fontWeight: '700' },
  serving: { fontSize: 11, color: colors.textLight, marginBottom: 16 },
  buttons: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  confirmBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.dark,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.darkText },
});

// ==================== MAIN SCREEN ====================

export default function NutritionScreen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, loading, refresh, addEntry, deleteEntry } = useNutrition(today);
  const { insights: nutritionAgentInsights } = useInsights('nutrition');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedEntry, setSelectedEntry] = useState<NutritionEntry | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanPhotoUri, setScanPhotoUri] = useState<string | null>(null);

  const handleScanFood = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission required', 'Please allow camera access in Settings to scan food.');
      return;
    }

    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });

    if (picked.canceled || !picked.assets?.[0]?.base64) return;

    const asset = picked.assets[0];
    setShowScanModal(true);
    setScanning(true);
    setScanResult(null);
    setScanPhotoUri(asset.uri);

    try {
      const res = await fetch(`${API_BASE}/api/nutrition/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg = `Server error (${res.status})`;
        try { const j = JSON.parse(errBody); if (j.error) errMsg = j.error; } catch { /* not JSON */ }
        throw new Error(errMsg);
      }

      const json = await res.json();
      if (json.result) {
        setScanResult(json.result as ScanResult);
      } else {
        throw new Error(json.error || 'No result from AI');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to analyze photo';
      Alert.alert('Scan Failed', msg);
      setShowScanModal(false);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleConfirmScan = useCallback(
    async (result: ScanResult) => {
      await addEntry({
        id: `${Date.now()}`,
        name: result.name,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        time: format(new Date(), 'HH:mm'),
        photoUrl: scanPhotoUri ?? undefined,
      });
      setShowScanModal(false);
      setScanResult(null);
      setScanPhotoUri(null);
    },
    [addEntry, scanPhotoUri],
  );

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
        {(['today', '30days'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
              {t === 'today' ? 'Today' : '30 Days'}
            </Text>
          </Pressable>
        ))}
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
            {/* ── Compact Hero Card ── */}
            <DarkCard style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroLabel}>Calories today</Text>
                  <View style={styles.heroValueRow}>
                    <Text style={styles.heroValue}>{fmt(Math.round(data.totals.calories))}</Text>
                    <Text style={styles.heroGoal}> / {fmt(data.goals.calories)}</Text>
                  </View>
                  <Text style={[styles.heroRemaining, caloriesRemaining < 0 && { color: colors.error }]}>
                    {caloriesRemaining >= 0
                      ? `${fmt(Math.round(caloriesRemaining))} kcal remaining`
                      : `${fmt(Math.round(Math.abs(caloriesRemaining)))} kcal over`}
                  </Text>
                </View>

                {/* Simple arc ring */}
                <View style={styles.ringWrap}>
                  <View style={[styles.ringTrack, {
                    borderColor: calorieProgress > 1 ? colors.error
                      : calorieProgress > 0.8 ? colors.warning : colors.success,
                    opacity: 0.2,
                  }]} />
                  <View style={[styles.ringFill, {
                    borderColor: calorieProgress > 1 ? colors.error
                      : calorieProgress > 0.8 ? colors.warning : colors.success,
                    borderRightColor: 'transparent',
                    borderBottomColor: 'transparent',
                    transform: [{ rotate: `${Math.min(calorieProgress, 1) * 270 - 135}deg` }],
                  }]} />
                  <Text style={styles.ringPct}>{Math.round(calorieProgress * 100)}%</Text>
                </View>
              </View>

              {/* P / C / F bars */}
              <View style={styles.macroBars}>
                {[
                  { label: 'P', current: data.totals.protein, goal: data.goals.protein, color: colors.protein },
                  { label: 'C', current: data.totals.carbs, goal: data.goals.carbs, color: colors.carbs },
                  { label: 'F', current: data.totals.fat, goal: data.goals.fat, color: colors.fat },
                ].map((m) => {
                  const pct = m.goal > 0 ? Math.min(m.current / m.goal, 1) : 0;
                  return (
                    <View key={m.label} style={styles.macroBarItem}>
                      <View style={styles.macroBarRow}>
                        <Text style={[styles.macroBarLabel, { color: m.color }]}>{m.label}</Text>
                        <Text style={styles.macroBarValue}>
                          {Math.round(m.current)}
                          <Text style={styles.macroBarGoal}>/{Math.round(m.goal)}g</Text>
                        </Text>
                      </View>
                      <View style={styles.macroBarTrack}>
                        <View style={[styles.macroBarFill, { backgroundColor: m.color, width: `${pct * 100}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </DarkCard>

            {/* Agent insights (if any) */}
            {nutritionAgentInsights.map((ai) => (
              <AgentInsightCard key={ai.agentId} insight={ai} />
            ))}

            {/* ── Meal Log ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Meal Log</Text>
              <Pressable style={styles.manualBtn} onPress={() => setShowAddModal(true)}>
                <Ionicons name="pencil-outline" size={13} color={colors.textLight} />
                <Text style={styles.manualBtnText}>Manual</Text>
              </Pressable>
            </View>

            {data.entries.length === 0 ? (
              <EmptyState icon="🍽️" title="No meals logged" subtitle="Tap the camera button to scan food" />
            ) : (
              <View style={styles.mealList}>
                {data.entries.map((entry, idx) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => setSelectedEntry(entry)}
                    onLongPress={() => handleDeleteEntry(entry.id, entry.name)}
                  >
                    <View style={[
                      styles.mealRow,
                      idx < data.entries.length - 1 && styles.mealRowBorder,
                    ]}>
                      {/* Thumb: photo or emoji */}
                      <View style={styles.mealThumb}>
                        {entry.photoUrl ? (
                          <Image source={{ uri: entry.photoUrl }} style={styles.mealThumbImg} />
                        ) : (
                          <Text style={styles.mealThumbEmoji}>{getMealEmoji(entry.time)}</Text>
                        )}
                      </View>

                      {/* Name + time */}
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName} numberOfLines={1}>{entry.name}</Text>
                        <Text style={styles.mealTime}>{entry.time}</Text>
                      </View>

                      {/* Calories + macro dots */}
                      <View style={styles.mealRight}>
                        <Text style={styles.mealCalories}>{fmt(Math.round(entry.calories))}</Text>
                        <View style={styles.mealMacros}>
                          <Text style={[styles.mealMacro, { color: colors.protein }]}>{Math.round(entry.protein)}P</Text>
                          <Text style={styles.mealMacroDot}>·</Text>
                          <Text style={[styles.mealMacro, { color: colors.carbs }]}>{Math.round(entry.carbs)}C</Text>
                          <Text style={styles.mealMacroDot}>·</Text>
                          <Text style={[styles.mealMacro, { color: colors.fat }]}>{Math.round(entry.fat)}F</Text>
                        </View>
                      </View>

                      <Ionicons name="chevron-forward" size={13} color={colors.border} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : (
          <ThirtyDayView />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB — camera icon, scan food (primary action) */}
      {activeTab === 'today' && (
        <Pressable style={styles.fab} onPress={handleScanFood}>
          <Ionicons name="camera" size={26} color={colors.darkText} />
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

      <FoodScanModal
        visible={showScanModal}
        scanning={scanning}
        result={scanResult}
        photoUri={scanPhotoUri}
        onClose={() => { setShowScanModal(false); setScanResult(null); setScanPhotoUri(null); }}
        onConfirm={handleConfirmScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Tabs
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
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.sidebar,
  },
  tabBtnActive: { backgroundColor: colors.dark },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
  tabBtnTextActive: { color: colors.darkText },

  // Hero card
  heroCard: { marginBottom: 12 },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroLabel: { fontSize: 12, color: colors.darkTextSecondary },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  heroValue: { fontSize: 32, fontWeight: '800', color: colors.darkText },
  heroGoal: { fontSize: 14, color: colors.darkTextMuted, fontWeight: '500' },
  heroRemaining: { fontSize: 13, fontWeight: '600', color: colors.success, marginTop: 2 },

  // Progress ring (CSS border trick)
  ringWrap: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  ringTrack: {
    position: 'absolute', width: 64, height: 64,
    borderRadius: 32, borderWidth: 7,
  },
  ringFill: {
    position: 'absolute', width: 64, height: 64,
    borderRadius: 32, borderWidth: 7,
  },
  ringPct: { fontSize: 12, fontWeight: '700', color: colors.darkText },

  // Macro bars
  macroBars: { gap: 7 },
  macroBarItem: {},
  macroBarRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  macroBarLabel: { fontSize: 11, fontWeight: '700' },
  macroBarValue: { fontSize: 11, fontWeight: '700', color: colors.darkText },
  macroBarGoal: { fontSize: 10, fontWeight: '400', color: colors.darkTextMuted },
  macroBarTrack: { height: 5, borderRadius: 3, backgroundColor: colors.darkInner, overflow: 'hidden' as const },
  macroBarFill: { height: '100%', borderRadius: 3 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1,
  },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  manualBtnText: { fontSize: 11, fontWeight: '600', color: colors.textLight },

  // Meal list — flat with dividers (no card-per-item)
  mealList: {
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  mealRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  mealThumb: {
    width: 40, height: 40,
    borderRadius: 8,
    backgroundColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mealThumbImg: { width: 40, height: 40 },
  mealThumbEmoji: { fontSize: 20 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: colors.text },
  mealTime: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  mealRight: { alignItems: 'flex-end' },
  mealCalories: { fontSize: 15, fontWeight: '700', color: colors.text },
  mealMacros: { flexDirection: 'row', alignItems: 'center', marginTop: 1, gap: 2 },
  mealMacro: { fontSize: 10, fontWeight: '600' },
  mealMacroDot: { fontSize: 10, color: colors.border },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24, right: 20,
    width: 56, height: 56,
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
