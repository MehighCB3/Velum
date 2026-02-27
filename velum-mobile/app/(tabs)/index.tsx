import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Paths, File as FSFile } from 'expo-file-system';
import { colors } from '../../src/theme/colors';
import { DarkCard, Card } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
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

// ==================== EVENT TYPES & PERSISTENCE ====================

interface YearEvent {
  id: string;
  week: number;
  label: string;
  color: string;
}

const EVENT_COLORS = [
  '#e85c5c', '#9b8ed6', '#e8a85c', '#6ba3d6', '#6ec87a', '#c4956a', '#e07eb4', '#5cc2c8',
];

const DEFAULT_EVENTS: YearEvent[] = [
  { id: '1', week: 12, label: 'Barcelona Marathon', color: '#e85c5c' },
  { id: '2', week: 24, label: 'Wedding Anniversary', color: '#9b8ed6' },
  { id: '3', week: 30, label: 'Ironman Training Camp', color: '#e8a85c' },
  { id: '4', week: 36, label: 'Product Hunt Launch', color: '#6ba3d6' },
  { id: '5', week: 48, label: 'Christmas in Romania', color: '#6ec87a' },
];

const eventsFile = new FSFile(Paths.document, 'year_events.json');

async function loadEvents(): Promise<YearEvent[]> {
  try {
    if (!eventsFile.exists) return DEFAULT_EVENTS;
    const content = await eventsFile.text();
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EVENTS;
  } catch {
    return DEFAULT_EVENTS;
  }
}

async function saveEvents(events: YearEvent[]): Promise<void> {
  try {
    await eventsFile.write(JSON.stringify(events));
  } catch { /* silently fail */ }
}

// ==================== MONTH LABELS ====================

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// ==================== EVENT MANAGER BOTTOM SHEET ====================

function EventManagerSheet({
  visible,
  events,
  onClose,
  onSave,
}: {
  visible: boolean;
  events: YearEvent[];
  onClose: () => void;
  onSave: (events: YearEvent[]) => void;
}) {
  const [localEvents, setLocalEvents] = useState<YearEvent[]>(events);
  const [editing, setEditing] = useState<YearEvent | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newWeek, setNewWeek] = useState('');
  const [newColor, setNewColor] = useState(EVENT_COLORS[0]);

  useEffect(() => {
    if (visible) {
      setLocalEvents(events);
      setEditing(null);
      setNewLabel('');
      setNewWeek('');
      setNewColor(EVENT_COLORS[0]);
    }
  }, [visible, events]);

  const handleSaveEdit = () => {
    if (!editing) return;
    const updated = localEvents.map((e) =>
      e.id === editing.id ? editing : e,
    );
    setLocalEvents(updated);
    onSave(updated);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const updated = localEvents.filter((e) => e.id !== id);
    setLocalEvents(updated);
    onSave(updated);
    setEditing(null);
  };

  const handleAddNew = () => {
    if (!newLabel.trim() || !newWeek) return;
    const id = `${Date.now()}`;
    const week = parseInt(newWeek, 10);
    if (week < 1 || week > 52) return;
    const updated = [...localEvents, { id, label: newLabel.trim(), week, color: newColor }].sort(
      (a, b) => a.week - b.week,
    );
    setLocalEvents(updated);
    onSave(updated);
    setNewLabel('');
    setNewWeek('');
    setNewColor(EVENT_COLORS[0]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={sheetStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />
        <View style={sheetStyles.sheet}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={sheetStyles.header}>
              <Text style={sheetStyles.headerTitle}>Manage Events</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={sheetStyles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {localEvents
              .sort((a, b) => a.week - b.week)
              .map((e) => (
                <View key={e.id} style={sheetStyles.eventItem}>
                  {editing?.id === e.id ? (
                    <View style={sheetStyles.editForm}>
                      <TextInput
                        value={editing.label}
                        onChangeText={(t) => setEditing({ ...editing, label: t })}
                        style={sheetStyles.editInput}
                        placeholder="Event name"
                        placeholderTextColor={colors.muted}
                      />
                      <View style={sheetStyles.editRow}>
                        <View style={sheetStyles.weekInputWrap}>
                          <Text style={sheetStyles.weekLabel}>Week</Text>
                          <TextInput
                            value={String(editing.week)}
                            onChangeText={(t) =>
                              setEditing({ ...editing, week: parseInt(t, 10) || 0 })
                            }
                            style={sheetStyles.weekInput}
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                        </View>
                        <View style={sheetStyles.colorPicker}>
                          {EVENT_COLORS.map((c) => (
                            <Pressable
                              key={c}
                              onPress={() => setEditing({ ...editing, color: c })}
                              style={[
                                sheetStyles.colorDot,
                                { backgroundColor: c },
                                editing.color === c && sheetStyles.colorDotSelected,
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                      <View style={sheetStyles.editActions}>
                        <Pressable style={sheetStyles.btnAccent} onPress={handleSaveEdit}>
                          <Text style={sheetStyles.btnAccentText}>Save</Text>
                        </Pressable>
                        <Pressable
                          style={sheetStyles.btnOutline}
                          onPress={() => setEditing(null)}
                        >
                          <Text style={sheetStyles.btnOutlineText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          style={[sheetStyles.btnOutline, { borderColor: colors.error }]}
                          onPress={() => handleDelete(e.id)}
                        >
                          <Text style={[sheetStyles.btnOutlineText, { color: colors.error }]}>
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={sheetStyles.eventRow}>
                      <View style={sheetStyles.eventLeft}>
                        <View
                          style={[sheetStyles.eventDot, { backgroundColor: e.color }]}
                        />
                        <View>
                          <Text style={sheetStyles.eventLabel}>{e.label}</Text>
                          <Text style={sheetStyles.eventWeek}>Week {e.week}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => setEditing({ ...e })}>
                        <Text style={sheetStyles.editLink}>Edit</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}

            <View style={sheetStyles.addSection}>
              <Text style={sheetStyles.addTitle}>Add New Event</Text>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Event name"
                placeholderTextColor={colors.muted}
                style={sheetStyles.addInput}
              />
              <View style={sheetStyles.editRow}>
                <View style={sheetStyles.weekInputWrap}>
                  <Text style={sheetStyles.weekLabel}>Week</Text>
                  <TextInput
                    value={newWeek}
                    onChangeText={setNewWeek}
                    placeholder="1-52"
                    placeholderTextColor={colors.muted}
                    style={sheetStyles.weekInput}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={sheetStyles.colorPicker}>
                  {EVENT_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setNewColor(c)}
                      style={[
                        sheetStyles.colorDot,
                        { backgroundColor: c },
                        newColor === c && sheetStyles.colorDotSelected,
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Pressable style={sheetStyles.addBtn} onPress={handleAddNew}>
                <Text style={sheetStyles.addBtnText}>+ Add Event</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(30,28,25,0.55)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 24,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: 20, color: colors.muted, lineHeight: 22 },
  eventItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventDot: { width: 12, height: 12, borderRadius: 3 },
  eventLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  eventWeek: { fontSize: 11, color: colors.muted },
  editLink: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  editForm: { gap: 8 },
  editInput: {
    padding: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  weekInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weekLabel: { fontSize: 11, color: colors.muted },
  weekInput: {
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#e0dcd5',
    fontSize: 13,
    color: colors.text,
    width: 52,
    textAlign: 'center',
    backgroundColor: colors.card,
  },
  colorPicker: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  colorDot: { width: 22, height: 22, borderRadius: 5 },
  colorDotSelected: { borderWidth: 2.5, borderColor: colors.text },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  btnAccent: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  btnAccentText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  btnOutline: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e0dcd5',
  },
  btnOutlineText: { fontSize: 11, fontWeight: '600', color: '#8a857d' },
  addSection: { marginTop: 18 },
  addTitle: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 10 },
  addInput: {
    width: '100%',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0dcd5',
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  addBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});

// ==================== HOME SCREEN ====================

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<YearEvent | null>(null);
  const [events, setEvents] = useState<YearEvent[]>(DEFAULT_EVENTS);
  const [showManager, setShowManager] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const currentWeek = getWeekOfYear(now);
  const weeksLeft = getWeeksLeftInYear(now);

  useEffect(() => {
    loadEvents().then(setEvents);
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await profileApi.get());
    } catch { /* silently fail */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveEvents = useCallback((updated: YearEvent[]) => {
    setEvents(updated);
    saveEvents(updated);
    if (selectedEvent && !updated.find((e) => e.id === selectedEvent.id)) {
      setSelectedEvent(null);
    }
  }, [selectedEvent]);

  const heroNumber = selectedEvent
    ? Math.max(0, selectedEvent.week - currentWeek)
    : weeksLeft;

  const dayName = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const age = profile?.currentAge || 32;
  const lifeExp = profile?.life_expectancy || 85;
  const yearsLeft = lifeExp - age;
  const weeksRemaining = yearsLeft * 52;
  const pctLived = Math.round((age / lifeExp) * 1000) / 10;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Year</Text>
          <Text style={styles.weekLabel}>WEEK {currentWeek} OF 52</Text>
        </View>

        {/* Hero DarkCard */}
        <DarkCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroDateLabel}>
                {selectedEvent ? 'COUNTDOWN TO' : dayName.toUpperCase()}
              </Text>
              <View style={styles.heroNumberRow}>
                <Text style={styles.heroNumber}>{heroNumber}</Text>
                <Text style={styles.heroWeeksSuffix}>weeks</Text>
              </View>
              <Text
                style={[
                  styles.heroSubtitle,
                  selectedEvent && { color: selectedEvent.color },
                ]}
              >
                {selectedEvent ? selectedEvent.label : `left in ${year}`}
              </Text>
            </View>
            <ProgressRing
              progress={currentWeek / 52}
              size={50}
              strokeWidth={4}
              color={colors.accent}
              value={`W${currentWeek}`}
            />
          </View>
          {selectedEvent && (
            <Pressable
              onPress={() => setSelectedEvent(null)}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>← Year overview</Text>
            </Pressable>
          )}
        </DarkCard>

        {/* Year Grid Card */}
        <Card style={styles.gridCard}>
          {/* Month labels */}
          <View style={styles.monthRow}>
            {MONTH_LABELS.map((m, i) => (
              <Text key={i} style={styles.monthLabel}>
                {m}
              </Text>
            ))}
          </View>

          {/* 52-week grid: column-first flow (4 rows × 13 columns) */}
          <View style={styles.weekGrid}>
            {Array.from({ length: 52 }, (_, i) => {
              const wn = i + 1;
              const evt = events.find((e) => e.week === wn);
              const isSel = selectedEvent?.week === wn;
              const isPast = wn < currentWeek;
              const isCurrent = wn === currentWeek;

              let bg = '#eae6df';
              if (isCurrent) bg = colors.accent;
              else if (evt) bg = evt.color;
              else if (isPast) bg = colors.text;

              return (
                <Pressable
                  key={wn}
                  onPress={() => evt && setSelectedEvent(isSel ? null : evt)}
                  style={[
                    styles.weekCell,
                    { backgroundColor: bg },
                    isSel && {
                      borderWidth: 2,
                      borderColor: evt!.color,
                      transform: [{ scale: 1.3 }],
                      zIndex: 2,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Event list */}
          <View style={styles.eventList}>
            {events
              .sort((a, b) => a.week - b.week)
              .map((e) => {
                const away = e.week - currentWeek;
                const isSel = selectedEvent?.id === e.id;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => setSelectedEvent(isSel ? null : e)}
                    style={[
                      styles.eventRow,
                      isSel && { backgroundColor: `${e.color}14` },
                    ]}
                  >
                    <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                    <Text style={styles.eventLabel} numberOfLines={1}>
                      {e.label}
                    </Text>
                    <Text style={styles.eventMeta}>
                      W{e.week} · {away > 0 ? `${away}w` : away === 0 ? 'now' : 'done'}
                    </Text>
                  </Pressable>
                );
              })}
          </View>

          {/* Manage Events button */}
          <Pressable style={styles.manageBtn} onPress={() => setShowManager(true)}>
            <Text style={styles.manageBtnPlus}>+</Text>
            <Text style={styles.manageBtnText}>Manage Events</Text>
          </Pressable>
        </Card>

        {/* Life in Weeks — compact single row */}
        <Card style={styles.lifeCard}>
          <View style={styles.lifeRow}>
            {[
              { v: String(age), l: 'Age' },
              { v: weeksRemaining.toLocaleString(), l: 'Weeks Left' },
              { v: String(yearsLeft), l: 'Years Left' },
            ].map((d) => (
              <View key={d.l} style={styles.lifeStat}>
                <Text style={styles.lifeVal}>{d.v}</Text>
                <Text style={styles.lifeLbl}>{d.l}</Text>
              </View>
            ))}
            <View style={styles.lifeBarWrap}>
              <View style={styles.lifeBarTrack}>
                <View
                  style={[styles.lifeBarFill, { width: `${pctLived}%` }]}
                />
              </View>
              <Text style={styles.lifeBarLabel}>
                {pctLived}% of {lifeExp}y
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 60 }} />
      </ScrollView>

      <EventManagerSheet
        visible={showManager}
        events={events}
        onClose={() => setShowManager(false)}
        onSave={handleSaveEvents}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  weekLabel: {
    fontSize: 10,
    color: colors.dimmed,
    fontWeight: '500',
    letterSpacing: 0.4,
  },

  // Hero
  heroCard: { padding: 14, paddingHorizontal: 18, marginBottom: 12 },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroDateLabel: {
    fontSize: 10,
    color: colors.faint,
    letterSpacing: 0.6,
  },
  heroNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3 },
  heroNumber: { fontSize: 40, fontWeight: '700', color: '#fff', lineHeight: 44 },
  heroWeeksSuffix: { fontSize: 13, color: colors.dimmed, fontWeight: '500' },
  heroSubtitle: { fontSize: 12, color: colors.dimmed, fontWeight: '500', marginTop: 1 },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 11, color: colors.accent, fontWeight: '500' },

  // Grid card
  gridCard: { marginBottom: 10, paddingVertical: 14, paddingHorizontal: 10 },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Week grid — column-first: 4 rows high, wraps into 13 columns
  weekGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: 4 * 18 + 3 * 5,
    gap: 5,
  },
  weekCell: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },

  // Event list
  eventList: { marginTop: 14, gap: 4 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  eventDot: { width: 10, height: 10, borderRadius: 3 },
  eventLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text },
  eventMeta: { fontSize: 10, color: colors.muted, fontWeight: '500' },

  // Manage button
  manageBtn: {
    width: '100%',
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d5d0c9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  manageBtnPlus: { fontSize: 15, color: colors.accent, lineHeight: 18 },
  manageBtnText: { fontSize: 12, fontWeight: '600', color: colors.accent },

  // Life in Weeks
  lifeCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
  },
  lifeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lifeStat: {},
  lifeVal: { fontSize: 16, fontWeight: '700', color: colors.text },
  lifeLbl: { fontSize: 9, color: colors.muted },
  lifeBarWrap: { flex: 1 },
  lifeBarTrack: {
    height: 4,
    backgroundColor: '#f0ece6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  lifeBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  lifeBarLabel: { fontSize: 8, color: colors.muted, marginTop: 2, textAlign: 'right' },
});
