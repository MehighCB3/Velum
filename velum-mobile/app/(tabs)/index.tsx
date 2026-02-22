import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { colors } from '../../src/theme/colors';
import { DarkCard, Card } from '../../src/components/Card';
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

function getWeeksLeftInYear(date: Date): number {
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  return Math.floor((endOfYear.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getTotalDaysInYear(year: number): number {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

function getWeekFromMonthDay(month: number, day: number, year: number): number {
  return getWeekOfYear(new Date(year, month - 1, day));
}

function formatMonthDay(month: number, day: number): string {
  return new Date(2000, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==================== EVENT TYPES & PERSISTENCE ====================

interface YearEvent {
  id: string;
  week: number;
  label: string;
  color: string;
  month: number;
  day: number;
}

const EVENT_COLORS = [
  '#e85c5c', '#9b8ed6', '#e8a85c', '#6ba3d6', '#6ec87a', '#c4956a',
];

const DEFAULT_EVENTS: YearEvent[] = [
  { id: '1', week: 12, label: 'Barcelona Marathon', color: '#e85c5c', month: 3, day: 22 },
  { id: '2', week: 24, label: 'Wedding Anniversary', color: '#9b8ed6', month: 6, day: 14 },
  { id: '3', week: 30, label: 'Ironman Training Camp', color: '#e8a85c', month: 7, day: 25 },
  { id: '4', week: 36, label: 'Product Hunt Launch', color: '#6ba3d6', month: 9, day: 5 },
  { id: '5', week: 48, label: 'Christmas in Romania', color: '#6ec87a', month: 11, day: 27 },
];

const EVENTS_FILE = `${FileSystem.documentDirectory}year_events.json`;

async function loadEvents(): Promise<YearEvent[]> {
  try {
    const info = await FileSystem.getInfoAsync(EVENTS_FILE);
    if (!info.exists) return DEFAULT_EVENTS;
    const content = await FileSystem.readAsStringAsync(EVENTS_FILE);
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EVENTS;
  } catch {
    return DEFAULT_EVENTS;
  }
}

async function saveEvents(events: YearEvent[]): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(EVENTS_FILE, JSON.stringify(events));
  } catch { /* silently fail */ }
}

// ==================== ADD EVENT MODAL ====================

function AddEventModal({
  visible,
  year,
  onClose,
  onAdd,
}: {
  visible: boolean;
  year: number;
  onClose: () => void;
  onAdd: (event: YearEvent) => void;
}) {
  const [label, setLabel] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [selectedColor, setSelectedColor] = useState(EVENT_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setLabel(''); setMonth(''); setDay('');
      setSelectedColor(EVENT_COLORS[0]);
    }
  }, [visible]);

  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  const validDate = monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31;
  const calculatedWeek = validDate ? getWeekFromMonthDay(monthNum, dayNum, year) : null;

  const handleAdd = () => {
    if (!label.trim()) { Alert.alert('Event name required'); return; }
    if (!validDate) { Alert.alert('Enter a valid month (1–12) and day (1–31)'); return; }
    onAdd({
      id: `${Date.now()}`,
      week: calculatedWeek!,
      label: label.trim(),
      color: selectedColor,
      month: monthNum,
      day: dayNum,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Add Event</Text>

          <Text style={modalStyles.fieldLabel}>Name</Text>
          <TextInput
            style={modalStyles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Barcelona Marathon"
            placeholderTextColor={colors.textLight}
            autoFocus
          />

          <Text style={modalStyles.fieldLabel}>Date</Text>
          <View style={modalStyles.dateRow}>
            <View style={modalStyles.dateField}>
              <TextInput
                style={[modalStyles.input, modalStyles.dateInput]}
                value={month}
                onChangeText={setMonth}
                placeholder="Month"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={modalStyles.dateHint}>1 – 12</Text>
            </View>
            <Text style={modalStyles.dateSep}>/</Text>
            <View style={modalStyles.dateField}>
              <TextInput
                style={[modalStyles.input, modalStyles.dateInput]}
                value={day}
                onChangeText={setDay}
                placeholder="Day"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={modalStyles.dateHint}>1 – 31</Text>
            </View>

            {/* Live week badge */}
            <View style={[modalStyles.weekBadge, { opacity: validDate ? 1 : 0.3 }]}>
              <Text style={modalStyles.weekBadgeNum}>{calculatedWeek ? `W${calculatedWeek}` : 'W—'}</Text>
              <Text style={modalStyles.weekBadgeDate}>
                {validDate ? formatMonthDay(monthNum, dayNum) : '···'}
              </Text>
            </View>
          </View>

          <Text style={modalStyles.fieldLabel}>Colour</Text>
          <View style={modalStyles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[modalStyles.colorDot, { backgroundColor: c }, selectedColor === c && modalStyles.colorDotSelected]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          <View style={modalStyles.buttons}>
            <Pressable style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[modalStyles.addBtn, { backgroundColor: selectedColor }]} onPress={handleAdd}>
              <Text style={modalStyles.addText}>Add Event</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.text, backgroundColor: colors.card, marginBottom: 14,
  },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  dateField: { flex: 1 },
  dateInput: { marginBottom: 2, textAlign: 'center' },
  dateHint: { fontSize: 10, color: colors.textLight, textAlign: 'center' },
  dateSep: { fontSize: 22, color: colors.textLight, marginTop: 8 },
  weekBadge: {
    flex: 1.2, backgroundColor: colors.dark, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  weekBadgeNum: { fontSize: 16, fontWeight: '800', color: colors.darkText },
  weekBadgeDate: { fontSize: 11, color: colors.darkTextSecondary, marginTop: 1 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text, transform: [{ scale: 1.15 }] },
  buttons: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  addBtn: { flex: 2, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  addText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ==================== WEEK GRID ====================

function WeekGrid({
  currentWeek,
  events,
  selectedEvent,
  onSelectEvent,
}: {
  currentWeek: number;
  events: YearEvent[];
  selectedEvent: YearEvent | null;
  onSelectEvent: (event: YearEvent | null) => void;
}) {
  return (
    <View style={gridStyles.grid}>
      {Array.from({ length: 52 }, (_, i) => i + 1).map((weekNum) => {
        const event = events.find((e) => e.week === weekNum);
        const isSelected = selectedEvent?.week === weekNum;
        const isPast = weekNum < currentWeek;
        const isCurrent = weekNum === currentWeek;

        let bg = colors.border;
        if (isPast) bg = colors.text;
        else if (isCurrent) bg = colors.accent;
        else if (event) bg = event.color;

        return (
          <Pressable
            key={weekNum}
            onPress={() => event && onSelectEvent(selectedEvent?.week === weekNum ? null : event)}
            style={[
              gridStyles.cell,
              { backgroundColor: bg },
              isSelected && { transform: [{ scale: 1.4 }], zIndex: 1 },
            ]}
          />
        );
      })}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell: { width: 11, height: 11, borderRadius: 2 },
});

// ==================== QUICK LOG BAR ====================

const LOG_ACTIONS = [
  { icon: 'nutrition-outline' as const, label: 'Meal', route: '/nutrition', color: colors.carbs },
  { icon: 'barbell-outline' as const, label: 'Workout', route: '/fitness', color: colors.fat },
  { icon: 'card-outline' as const, label: 'Expense', route: '/budget', color: colors.protein },
];

function QuickLogBar() {
  const router = useRouter();
  return (
    <Card style={shortcutStyles.bar}>
      {LOG_ACTIONS.map((a, i) => (
        <React.Fragment key={a.label}>
          {i > 0 && <View style={shortcutStyles.divider} />}
          <Pressable style={shortcutStyles.action} onPress={() => router.push(a.route as any)}>
            <Ionicons name={a.icon} size={20} color={a.color} />
            <Text style={shortcutStyles.label}>{a.label}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </Card>
  );
}

const shortcutStyles = StyleSheet.create({
  bar: { flexDirection: 'row', marginBottom: 10, paddingVertical: 4, paddingHorizontal: 0 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  divider: { width: 1, backgroundColor: colors.border, marginVertical: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
});

// ==================== HOME SCREEN ====================

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<YearEvent | null>(null);
  const [events, setEvents] = useState<YearEvent[]>(DEFAULT_EVENTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const { insights } = useInsights();

  const now = new Date();
  const year = now.getFullYear();
  const currentWeek = getWeekOfYear(now);
  const weeksLeft = getWeeksLeftInYear(now);
  const dayOfYear = getDayOfYear(now);
  const totalDays = getTotalDaysInYear(year);
  const yearProgress = dayOfYear / totalDays;

  useEffect(() => { loadEvents().then(setEvents); }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try { setProfile(await profileApi.get()); }
    catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleAddEvent = useCallback((event: YearEvent) => {
    const updated = [...events, event].sort((a, b) => a.week - b.week);
    setEvents(updated);
    saveEvents(updated);
    setShowAddModal(false);
  }, [events]);

  const handleDeleteEvent = useCallback((id: string, label: string) => {
    Alert.alert('Delete Event', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const updated = events.filter((e) => e.id !== id);
          setEvents(updated);
          saveEvents(updated);
          if (selectedEvent?.id === id) setSelectedEvent(null);
        },
      },
    ]);
  }, [events, selectedEvent]);

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const heroNumber = selectedEvent
    ? Math.max(0, selectedEvent.week - currentWeek)
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
        {/* ── Hero Card ── */}
        <DarkCard style={styles.heroCard}>
          {/* Date row + year ring */}
          <View style={styles.heroTopRow}>
            <Text style={styles.heroDate}>{dayName}, {monthDay}</Text>
            <ProgressRing
              progress={yearProgress}
              size={48}
              strokeWidth={4}
              color={colors.accent}
              value={`W${currentWeek}`}
            />
          </View>

          {/* Big week number */}
          <Text style={styles.heroNumber}>{heroNumber}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>

          {selectedEvent && (
            <Pressable onPress={() => setSelectedEvent(null)} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back to year view</Text>
            </Pressable>
          )}

          {/* Life strip — lower, separated by a divider */}
          {profile && profile.weeksRemaining !== undefined && (
            <View style={styles.lifeStrip}>
              <View style={styles.lifeRow}>
                <View style={styles.lifeStat}>
                  <Text style={styles.lifeVal}>{profile.currentAge}</Text>
                  <Text style={styles.lifeLbl}>age</Text>
                </View>
                <View style={styles.lifeSep} />
                <View style={styles.lifeStat}>
                  <Text style={styles.lifeVal}>{(profile.weeksRemaining || 0).toLocaleString()}</Text>
                  <Text style={styles.lifeLbl}>wks left</Text>
                </View>
                <View style={styles.lifeSep} />
                <View style={styles.lifeStat}>
                  <Text style={styles.lifeVal}>{profile.yearsRemaining}</Text>
                  <Text style={styles.lifeLbl}>yrs left</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.lifePct}>{profile.percentLived}%</Text>
              </View>
              <View style={styles.lifeBarTrack}>
                <View style={[styles.lifeBarFill, { width: `${Math.min(profile.percentLived || 0, 100)}%` }]} />
              </View>
            </View>
          )}
        </DarkCard>

        {/* ── Year in Weeks ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{year} in Weeks</Text>
          <Pressable style={styles.sectionBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={14} color={colors.textLight} />
            <Text style={styles.sectionBtnText}>Add event</Text>
          </Pressable>
        </View>

        <Card style={styles.gridCard}>
          <WeekGrid
            currentWeek={currentWeek}
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />

          {/* Events list inline below the grid */}
          {events.length > 0 && (
            <View style={styles.eventList}>
              {events.map((e) => {
                const weeksAway = e.week - currentWeek;
                const isPast = weeksAway < 0;
                return (
                  <Pressable
                    key={e.id}
                    style={[styles.eventRow, selectedEvent?.id === e.id && { backgroundColor: e.color + '15' }]}
                    onPress={() => setSelectedEvent(selectedEvent?.id === e.id ? null : e)}
                    onLongPress={() => handleDeleteEvent(e.id, e.label)}
                  >
                    <View style={[styles.eventDot, { backgroundColor: isPast ? e.color + '50' : e.color }]} />
                    <Text style={[styles.eventLabel, isPast && styles.eventLabelPast]} numberOfLines={1}>
                      {e.label}
                    </Text>
                    <View style={styles.eventRight}>
                      <Text style={styles.eventWeek}>W{e.week}</Text>
                      <Text style={styles.eventDate}>{formatMonthDay(e.month, e.day)}</Text>
                    </View>
                    {!isPast && (
                      <View style={[styles.eventPill, { backgroundColor: e.color + '22' }]}>
                        <Text style={[styles.eventPillText, { color: e.color }]}>
                          {weeksAway === 0 ? 'now' : `${weeksAway}w`}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* ── Quick Log ── */}
        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Quick Log</Text>
        <QuickLogBar />

        {/* ── Agent Insights ── */}
        {insights.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Insights</Text>
            {insights.map((insight) => (
              <AgentInsightCard key={insight.agentId} insight={insight} />
            ))}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <AddEventModal
        visible={showAddModal}
        year={year}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Hero
  heroCard: { marginBottom: 10 },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroDate: { fontSize: 12, color: colors.darkTextSecondary, fontWeight: '500' },
  heroNumber: {
    fontSize: 60,
    fontWeight: '800',
    color: colors.darkText,
    lineHeight: 66,
  },
  heroSubtitle: { fontSize: 14, color: colors.darkTextMuted, marginTop: 0 },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 11, color: colors.accent, fontWeight: '500' },

  // Life strip at the bottom of the hero
  lifeStrip: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.darkInner,
  },
  lifeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lifeStat: { alignItems: 'center', paddingHorizontal: 2 },
  lifeVal: { fontSize: 16, fontWeight: '700', color: colors.darkText },
  lifeLbl: { fontSize: 10, color: colors.darkTextMuted, marginTop: 1 },
  lifeSep: { width: 1, height: 22, backgroundColor: colors.darkInner, marginHorizontal: 10 },
  lifePct: { fontSize: 12, fontWeight: '600', color: colors.darkTextSecondary },
  lifeBarTrack: { height: 4, backgroundColor: colors.darkInner, borderRadius: 2, overflow: 'hidden' },
  lifeBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },

  // Section headers
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700',
    color: colors.textLight, textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionTitleSpaced: { marginBottom: 6 },
  sectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  sectionBtnText: { fontSize: 11, fontWeight: '600', color: colors.textLight },

  // Grid card
  gridCard: { padding: 12, marginBottom: 10 },

  // Events list
  eventList: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 8,
  },
  eventDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  eventLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  eventLabelPast: { opacity: 0.45 },
  eventRight: { alignItems: 'flex-end', gap: 1 },
  eventWeek: { fontSize: 12, fontWeight: '700', color: colors.text },
  eventDate: { fontSize: 10, color: colors.textLight },
  eventPill: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8, minWidth: 34, alignItems: 'center',
  },
  eventPillText: { fontSize: 10, fontWeight: '700' },
});
