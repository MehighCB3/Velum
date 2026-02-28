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
import { Tag } from '../../src/components/Tag';
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
  type?: 'life' | 'work';
}

const EVENT_COLORS = [
  '#e85c5c', '#9b8ed6', '#e8a85c', '#6ba3d6', '#6ec87a', '#c4956a', '#e07eb4', '#5cc2c8',
];

const DEFAULT_EVENTS: YearEvent[] = [
  { id: '1', week: 12, label: 'Barcelona Marathon', color: '#e85c5c', type: 'life' },
  { id: '2', week: 24, label: 'Wedding Anniversary', color: '#9b8ed6', type: 'life' },
  { id: '3', week: 30, label: 'Ironman Training Camp', color: '#e8a85c', type: 'life' },
  { id: '4', week: 36, label: 'Product Hunt Launch', color: '#6ba3d6', type: 'work' },
  { id: '5', week: 48, label: 'Christmas in Romania', color: '#6ec87a', type: 'life' },
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
          <View>
            <Text style={styles.title}>My Year</Text>
            <Text style={styles.weekSubLabel}>{year} {'\u00B7'} Week {currentWeek} of 52</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerWeeksLeft}>{weeksLeft}</Text>
            <Text style={styles.headerWeeksLabel}>WEEKS LEFT</Text>
          </View>
        </View>

        {/* DarkCard with week grid — redesign style */}
        <DarkCard style={styles.heroCard}>
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

              let bg = 'rgba(255,255,255,0.04)';
              let border = 'transparent';
              if (isPast) bg = 'rgba(255,255,255,0.18)';
              if (isCurrent) { bg = 'transparent'; border = colors.accentWarm; }
              if (evt) bg = evt.color;
              if (isSel) bg = colors.accent;

              return (
                <Pressable
                  key={wn}
                  onPress={() => evt && setSelectedEvent(isSel ? null : evt)}
                  style={[
                    styles.weekCell,
                    { backgroundColor: bg, borderColor: border, borderWidth: isCurrent ? 1.5 : 0 },
                    isSel && {
                      transform: [{ scale: 1.3 }],
                      zIndex: 2,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {[
              { dot: colors.accentWarm, label: 'Life' },
              { dot: 'rgba(255,255,255,0.55)', label: 'Work' },
              { dot: 'transparent', label: 'Now', border: colors.accentWarm },
              { dot: 'rgba(255,255,255,0.18)', label: 'Done' },
            ].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[
                  styles.legendDot,
                  { backgroundColor: l.dot },
                  l.border ? { borderWidth: 1.5, borderColor: l.border } : undefined,
                ]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Selected event tooltip */}
          {selectedEvent && (
            <View style={styles.selectedEvent}>
              <View>
                <Text style={styles.selectedEventLabel}>{selectedEvent.label}</Text>
                <Text style={styles.selectedEventMeta}>
                  Week {selectedEvent.week} {'\u00B7'} {selectedEvent.week >= currentWeek
                    ? `${selectedEvent.week - currentWeek}w away`
                    : `${currentWeek - selectedEvent.week}w ago`}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowManager(true)}
                style={styles.selectedEventBtn}
              >
                <Text style={styles.selectedEventBtnText}>Edit</Text>
              </Pressable>
            </View>
          )}
        </DarkCard>

        {/* Life Progress */}
        <Card style={styles.lifeCard}>
          <View style={styles.lifeHeader}>
            <Text style={styles.lifeTitle}>Life Progress</Text>
            <Text style={styles.lifeSubtitle}>{age} yrs {'\u00B7'} {yearsLeft} left {'\u00B7'} {lifeExp}y lifespan</Text>
          </View>
          <View style={styles.lifeBarTrack}>
            <View
              style={[styles.lifeBarFill, { width: `${pctLived}%` }]}
            />
          </View>
          <View style={styles.lifeBarFooter}>
            <Text style={styles.lifeBarLabel}>{pctLived}% of life</Text>
            <Text style={styles.lifeBarLabel}>{weeksRemaining.toLocaleString()} weeks remain</Text>
          </View>
        </Card>

        {/* Upcoming Events */}
        <Text style={styles.sectionLabel}>UPCOMING</Text>
        {events
          .filter(e => e.week >= currentWeek)
          .sort((a, b) => a.week - b.week)
          .map((e, i, arr) => (
            <Pressable
              key={e.id}
              onPress={() => setSelectedEvent(selectedEvent?.id === e.id ? null : e)}
              style={[
                styles.eventRow,
                i < arr.length - 1 && styles.eventRowBorder,
              ]}
            >
              <View style={[styles.eventDot, { backgroundColor: e.color }]} />
              <Text style={styles.eventLabel} numberOfLines={1}>
                {e.label}
              </Text>
              {e.type && (
                <Tag variant={e.type === 'life' ? 'accent' : 'muted'}>
                  {e.type}
                </Tag>
              )}
              <Text style={styles.eventMeta}>
                W{e.week} {'\u00B7'} {e.week - currentWeek}w
              </Text>
            </Pressable>
          ))}

        {/* Manage Events button */}
        <Pressable style={styles.manageBtn} onPress={() => setShowManager(true)}>
          <Text style={styles.manageBtnPlus}>+</Text>
          <Text style={styles.manageBtnText}>Add Event</Text>
        </Pressable>

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
    alignItems: 'flex-end',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  weekSubLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerWeeksLeft: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  headerWeeksLabel: { fontSize: 10, color: colors.muted, letterSpacing: 0.4 },

  // DarkCard hero — contains week grid
  heroCard: { padding: 16, marginBottom: 12 },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  monthLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '500',
    letterSpacing: 0.4,
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

  // Legend
  legendRow: { flexDirection: 'row', gap: 14, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },

  // Selected event inside DarkCard
  selectedEvent: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedEventLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  selectedEventMeta: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  selectedEventBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentWarm,
  },
  selectedEventBtnText: { fontSize: 11, fontWeight: '600', color: colors.accentWarm },

  // Life Progress card
  lifeCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  lifeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lifeTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  lifeSubtitle: { fontSize: 11, color: colors.muted },
  lifeBarTrack: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  lifeBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  lifeBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  lifeBarLabel: { fontSize: 10, color: colors.muted },

  // Section label
  sectionLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.7,
    marginBottom: 10,
  },

  // Event list (outside card)
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  eventRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventDot: { width: 8, height: 8, borderRadius: 2 },
  eventLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  eventMeta: { fontSize: 12, color: colors.textSub, fontWeight: '500' },

  // Manage button
  manageBtn: {
    width: '100%',
    paddingVertical: 13,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  manageBtnPlus: { fontSize: 15, color: colors.accent, lineHeight: 18 },
  manageBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },
});
