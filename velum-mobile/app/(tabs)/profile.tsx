import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { profileApi, quickLogApi, QuickLogType } from '../../src/api/client';
import { UserProfile } from '../../src/types';
import { DarkCard, Card } from '../../src/components/Card';
import { SyncIndicator } from '../../src/components/SyncIndicator';
import { useSync } from '../../src/hooks/useSync';
import { useAppUpdate } from '../../src/hooks/useAppUpdate';
import { useOTAUpdate } from '../../src/hooks/useOTAUpdate';

function getAge(iso: string): number {
  const birth = new Date(iso);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getCurrentWeek(): number {
  const d = new Date();
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ==================== QUICK ACTIONS ====================

interface QuickAction {
  key: QuickLogType;
  icon: string;
  label: string;
  color: string;
  placeholder: string;
  unit: string;
  hasDescription?: boolean;
  hasCategory?: boolean;
  categories?: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'steps', icon: 'footsteps-outline', label: 'Steps', color: colors.success, placeholder: '8000', unit: 'steps' },
  { key: 'expense', icon: 'card-outline', label: 'Expense', color: colors.warning, placeholder: '15', unit: '\u20AC', hasDescription: true, hasCategory: true, categories: ['Food', 'Fun', 'Transport', 'Subscriptions', 'Other'] },
  { key: 'meal', icon: 'restaurant-outline', label: 'Meal', color: colors.accent, placeholder: '500', unit: 'cal', hasDescription: true },
  { key: 'weight', icon: 'scale-outline', label: 'Weight', color: colors.info, placeholder: '78.5', unit: 'kg' },
];

// ==================== STREAKS CONFIG (matching mockup) ====================

const STREAKS = [
  { label: 'Nutrition logging', count: 14, unit: 'days', icon: '\u{1F37D}\uFE0F' },
  { label: 'Weekly workout', count: 6, unit: 'weeks', icon: '\u{1F3CB}\uFE0F' },
  { label: 'Budget tracking', count: 21, unit: 'days', icon: '\u{1F4B0}' },
];

// ==================== GOALS (matching mockup) ====================

const GOALS = [
  { label: 'Run Barcelona Marathon', pct: 62, deadline: 'W12 \u00B7 3w', color: colors.accent },
  { label: 'Reach 52kg body weight', pct: 45, deadline: 'W20 \u00B7 11w', color: colors.carbsGreen },
  { label: 'Log food 30 days straight', pct: 80, deadline: 'W11 \u00B7 2w', color: colors.fatBlue },
  { label: 'Launch Velum 1.0', pct: 90, deadline: 'W10 \u00B7 1w', color: colors.accentWarm },
];

// ==================== MAIN SCREEN ====================

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editLifeExpectancy, setEditLifeExpectancy] = useState('85');
  const { status: syncStatus, sync } = useSync();
  const {
    status: updateStatus,
    isChecking,
    isUpdateAvailable,
    isDownloading,
    isDownloaded,
    isInstalling,
    checkAndUpdate,
    downloadAndInstall,
    installUpdate,
    releaseNotes,
    error: updateError,
    currentVersion,
    remoteVersion,
    downloadProgress,
    apkSizeBytes,
    formatBytes,
  } = useAppUpdate();
  const {
    isReady: otaReady,
    isChecking: otaChecking,
    isDownloading: otaDownloading,
    manualCheck: otaManualCheck,
    restart: otaRestart,
  } = useOTAUpdate();

  // Quick actions state
  const [activeAction, setActiveAction] = useState<QuickAction | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputDesc, setInputDesc] = useState('');
  const [inputCategory, setInputCategory] = useState('Food');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: string; success: boolean } | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileApi.get();
      setProfile(data);
      if (data) {
        setEditBirthDate(data.birth_date || '');
        setEditCountry(data.country || '');
        setEditLifeExpectancy(String(data.life_expectancy || 85));
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = useCallback(async () => {
    if (!editBirthDate) {
      Alert.alert('Error', 'Birth date is required');
      return;
    }
    try {
      await profileApi.update({
        birthDate: editBirthDate,
        country: editCountry || undefined,
        lifeExpectancy: Number(editLifeExpectancy) || 85,
      });
      setEditing(false);
      fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    }
  }, [editBirthDate, editCountry, editLifeExpectancy, fetchProfile]);

  const handleQuickLog = useCallback(async () => {
    if (!activeAction || !inputValue.trim()) return;
    setSubmitting(true);
    try {
      await quickLogApi.log({
        type: activeAction.key,
        value: Number(inputValue) || 0,
        description: inputDesc || undefined,
        category: activeAction.hasCategory ? inputCategory : undefined,
      });
      setLastResult({ type: activeAction.label, success: true });
      setActiveAction(null);
      setInputValue('');
      setInputDesc('');
      setTimeout(() => setLastResult(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Log Failed', msg);
      setLastResult({ type: activeAction.label, success: false });
    } finally {
      setSubmitting(false);
    }
  }, [activeAction, inputValue, inputDesc, inputCategory]);

  const age = profile?.birth_date ? getAge(profile.birth_date) : null;
  const lifeExp = profile?.life_expectancy || 85;
  const currentWeek = getCurrentWeek();

  const stats = [
    { label: 'Year', val: age !== null ? String(age) : '--' },
    { label: 'Week', val: `W${currentWeek}` },
    { label: 'City', val: profile?.country?.substring(0, 3)?.toUpperCase() || 'BCN' },
    { label: 'Language', val: 'ES B1' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Sync indicator */}
        <View style={styles.syncRow}>
          <SyncIndicator status={syncStatus} onSync={sync} />
        </View>

        {/* ── Hero section (matching redesign mockup) ── */}
        <DarkCard style={styles.heroCard}>
          {!editing ? (
            <>
              <View style={styles.heroRow}>
                {/* Avatar */}
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>M</Text>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroName}>Mihai</Text>
                  <Text style={styles.heroSubtitle}>
                    {profile?.country || 'Barcelona'} {'\u00B7'} Ironman & PM
                  </Text>
                  {/* Stat pills */}
                  <View style={styles.statPills}>
                    {stats.map((s) => (
                      <View key={s.label} style={styles.statPill}>
                        <Text style={styles.statPillVal}>{s.val}</Text>
                        <Text style={styles.statPillLabel}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable onPress={() => setEditing(true)} hitSlop={12}>
                  <Ionicons name="create-outline" size={20} color={colors.darkTextMuted} />
                </Pressable>
              </View>
            </>
          ) : (
            <View>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Profile</Text>
                <Pressable onPress={() => setEditing(false)} hitSlop={12}>
                  <Ionicons name="close" size={22} color={colors.darkTextMuted} />
                </Pressable>
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Birth Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editBirthDate}
                  onChangeText={setEditBirthDate}
                  placeholder="1990-01-01"
                  placeholderTextColor={colors.darkTextMuted}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Country</Text>
                <TextInput
                  style={styles.editInput}
                  value={editCountry}
                  onChangeText={setEditCountry}
                  placeholder="e.g. Spain"
                  placeholderTextColor={colors.darkTextMuted}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Life Expectancy</Text>
                <TextInput
                  style={styles.editInput}
                  value={editLifeExpectancy}
                  onChangeText={setEditLifeExpectancy}
                  placeholder="85"
                  placeholderTextColor={colors.darkTextMuted}
                  keyboardType="number-pad"
                />
              </View>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          )}
        </DarkCard>

        {/* ── Active Streaks (3 separate cards, matching mockup) ── */}
        <Text style={styles.sectionLabel}>ACTIVE STREAKS</Text>
        <View style={styles.streakCards}>
          {STREAKS.map((s) => (
            <Card key={s.label} style={styles.streakCard}>
              <Text style={styles.streakIcon}>{s.icon}</Text>
              <Text style={styles.streakCount}>{s.count}</Text>
              <Text style={styles.streakUnit}>{s.unit}</Text>
              <Text style={styles.streakName}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* ── Goals (matching mockup) ── */}
        <View style={styles.goalHeader}>
          <Text style={styles.sectionLabel}>GOALS</Text>
          <Pressable onPress={() => router.push('/goals')}>
            <Text style={styles.goalAdd}>+ Add</Text>
          </Pressable>
        </View>
        {GOALS.map((g, i) => (
          <Card key={i} style={styles.goalCard}>
            <View style={styles.goalTop}>
              <Text style={styles.goalName}>{g.label}</Text>
              <Text style={styles.goalDeadline}>{g.deadline}</Text>
            </View>
            <View style={styles.goalBarRow}>
              <View style={styles.goalBarTrack}>
                <View style={[styles.goalBarFill, { width: `${g.pct}%`, backgroundColor: g.color }]} />
              </View>
              <Text style={[styles.goalPct, { color: g.color }]}>{g.pct}%</Text>
            </View>
          </Card>
        ))}

        {/* ── Quick Log ── */}
        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>QUICK LOG</Text>
        <View style={styles.quickRow}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.quickBtn}
              onPress={() => {
                setActiveAction(action);
                setInputValue('');
                setInputDesc('');
                setInputCategory('Food');
              }}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '15' }]}>
                <Ionicons
                  name={action.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={action.color}
                />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {lastResult && (
          <View
            style={[
              styles.toast,
              { backgroundColor: lastResult.success ? colors.success + '15' : colors.error + '15' },
            ]}
          >
            <Ionicons
              name={lastResult.success ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={lastResult.success ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.toastText,
                { color: lastResult.success ? colors.success : colors.error },
              ]}
            >
              {lastResult.type} {lastResult.success ? 'logged!' : 'failed'}
            </Text>
          </View>
        )}

        {/* ── Settings (emoji icons, matching mockup) ── */}
        <Card style={styles.settingsList}>
          {[
            { label: 'Notifications', icon: '\u{1F514}', onPress: undefined },
            { label: 'Goals & Targets', icon: '\u{1F3AF}', onPress: () => router.push('/goals') },
            { label: 'Connected Apps', icon: '\u{1F517}', onPress: undefined },
            { label: 'Teky Settings', icon: '\u{1F916}', onPress: () => router.push('/avatar') },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <Pressable
                style={styles.settingsRow}
                onPress={item.onPress}
              >
                <Text style={styles.settingsEmoji}>{item.icon}</Text>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
              {i < arr.length - 1 && <View style={styles.settingsDivider} />}
            </React.Fragment>
          ))}
        </Card>

        {/* ── System settings ── */}
        <Card style={styles.settingsList}>
          <Pressable style={styles.settingsRow} onPress={sync}>
            <Text style={styles.settingsEmoji}>{'\u{1F504}'}</Text>
            <Text style={styles.settingsLabel}>Force Sync</Text>
            <Text style={styles.settingsHint}>
              {syncStatus.isSyncing ? 'Syncing...' : syncStatus.lastSynced ? 'Synced' : 'Tap to sync'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.settingsDivider} />

          <Pressable
            style={styles.settingsRow}
            onPress={() => { checkAndUpdate(); otaManualCheck(); }}
            disabled={isChecking || otaChecking}
          >
            <Text style={styles.settingsEmoji}>{'\u{1F4E5}'}</Text>
            <Text style={styles.settingsLabel}>Check for Updates</Text>
            <Text style={styles.settingsHint}>
              {isChecking || otaChecking ? 'Checking...' : updateStatus === 'up-to-date' ? 'Up to date' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <View style={styles.settingsDivider} />

          <View style={styles.settingsRow}>
            <Text style={styles.settingsEmoji}>{'\u2139\uFE0F'}</Text>
            <Text style={styles.settingsLabel}>Version</Text>
            <Text style={styles.settingsHint}>v{currentVersion}</Text>
          </View>
        </Card>

        {/* OTA Update banner */}
        {(otaReady || otaDownloading) && (
          <Card style={styles.updateBanner}>
            {otaDownloading && (
              <View style={styles.updateRow}>
                <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
                <Text style={styles.updateText}>Downloading update...</Text>
              </View>
            )}
            {otaReady && (
              <>
                <View style={styles.updateRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.updateText}>Update ready to install</Text>
                </View>
                <Pressable style={styles.updateBtn} onPress={otaRestart}>
                  <Text style={styles.updateBtnText}>Restart Now</Text>
                </Pressable>
              </>
            )}
          </Card>
        )}

        {/* APK Update */}
        {(isUpdateAvailable || isDownloading || isDownloaded || isInstalling) && (
          <Card style={styles.updateBanner}>
            {isUpdateAvailable && !isDownloading && !isDownloaded && (
              <>
                <View style={styles.updateRow}>
                  <Ionicons name="arrow-up-circle" size={18} color={colors.success} />
                  <Text style={styles.updateText}>v{remoteVersion} available</Text>
                  {apkSizeBytes ? <Text style={styles.updateSize}>{formatBytes(apkSizeBytes)}</Text> : null}
                </View>
                {releaseNotes ? <Text style={styles.releaseNotes} numberOfLines={3}>{releaseNotes}</Text> : null}
                <Pressable style={styles.updateBtn} onPress={downloadAndInstall}>
                  <Text style={styles.updateBtnText}>Download & Install</Text>
                </Pressable>
              </>
            )}
            {isDownloading && (
              <>
                <View style={styles.updateRow}>
                  <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
                  <Text style={styles.updateText}>Downloading v{remoteVersion}...</Text>
                  <Text style={styles.updatePct}>{Math.round(downloadProgress * 100)}%</Text>
                </View>
                <View style={styles.dlBarTrack}>
                  <View style={[styles.dlBarFill, { width: `${Math.min(downloadProgress * 100, 100)}%` }]} />
                </View>
              </>
            )}
            {isDownloaded && (
              <>
                <View style={styles.updateRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.updateText}>v{remoteVersion} downloaded</Text>
                </View>
                <Pressable style={styles.updateBtn} onPress={installUpdate}>
                  <Text style={styles.updateBtnText}>Install Now</Text>
                </Pressable>
              </>
            )}
            {isInstalling && (
              <View style={styles.updateRow}>
                <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
                <Text style={styles.updateText}>Opening installer...</Text>
              </View>
            )}
          </Card>
        )}

        {updateStatus === 'error' && updateError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{updateError}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Quick-log input modal */}
      <Modal visible={!!activeAction} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setActiveAction(null)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Ionicons
                  name={(activeAction?.icon as keyof typeof Ionicons.glyphMap) || 'add'}
                  size={20}
                  color={activeAction?.color || colors.accent}
                />
                <Text style={styles.modalTitle}>Log {activeAction?.label}</Text>
              </View>

              <TextInput
                style={styles.modalInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={activeAction?.placeholder || '0'}
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.modalUnit}>{activeAction?.unit}</Text>

              {activeAction?.hasDescription && (
                <TextInput
                  style={[styles.modalInput, { marginTop: 10 }]}
                  value={inputDesc}
                  onChangeText={setInputDesc}
                  placeholder={activeAction.key === 'meal' ? 'What did you eat?' : 'Description'}
                  placeholderTextColor={colors.textLight}
                />
              )}

              {activeAction?.hasCategory && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {(activeAction.categories || []).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.catPill, inputCategory === cat && styles.catPillActive]}
                      onPress={() => setInputCategory(cat)}
                    >
                      <Text style={[styles.catPillText, inputCategory === cat && styles.catPillTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancel} onPress={() => setActiveAction(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmit, submitting && { opacity: 0.5 }]}
                  onPress={handleQuickLog}
                  disabled={submitting || !inputValue.trim()}
                >
                  <Text style={styles.modalSubmitText}>{submitting ? 'Saving...' : 'Log'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  syncRow: { alignItems: 'flex-end', marginBottom: 8 },

  // Hero card
  heroCard: { padding: 16, marginBottom: 16 },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentWarm,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statPills: { flexDirection: 'row', gap: 6, marginTop: 8 },
  statPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6,
    alignItems: 'center',
  },
  statPillVal: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statPillLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.4 },

  // Edit form
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  editTitle: { fontSize: 16, fontWeight: '700', color: colors.darkText },
  editField: { marginBottom: 12 },
  editLabel: { fontSize: 11, color: colors.darkTextMuted, marginBottom: 4 },
  editInput: {
    borderWidth: 1, borderColor: colors.darkInner, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    color: colors.darkText, backgroundColor: colors.darkInner,
  },
  saveBtn: {
    backgroundColor: colors.accent, paddingVertical: 12,
    borderRadius: 8, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Streak cards (3 equal-width)
  streakCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  streakIcon: { fontSize: 22, marginBottom: 4 },
  streakCount: { fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 22 },
  streakUnit: { fontSize: 9, color: colors.muted, marginTop: 2 },
  streakName: { fontSize: 10, color: colors.textSub, marginTop: 4, textAlign: 'center', lineHeight: 13 },

  // Goals
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalAdd: { fontSize: 11, fontWeight: '600', color: colors.accent },
  goalCard: { marginBottom: 8, padding: 13 },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalName: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1, marginRight: 12, lineHeight: 17 },
  goalDeadline: { fontSize: 10, color: colors.muted, marginTop: 2 },
  goalBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 3 },
  goalPct: { fontSize: 12, fontWeight: '700' },

  // Quick log
  quickRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
  },
  quickBtn: { alignItems: 'center', flex: 1 },
  quickIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  quickLabel: { fontSize: 11, fontWeight: '600', color: colors.text },

  // Toast
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12,
  },
  toastText: { fontSize: 13, fontWeight: '600' },

  // Settings list (emoji icons)
  settingsList: { padding: 0, overflow: 'hidden', marginBottom: 12 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingsEmoji: { fontSize: 18 },
  settingsLabel: { fontSize: 13.5, color: colors.text, flex: 1 },
  settingsHint: { fontSize: 12, color: colors.muted },
  settingsDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 46 },

  // Update banners
  updateBanner: { marginBottom: 12, padding: 14 },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  updateText: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  updateSize: { fontSize: 12, color: colors.textLight },
  updatePct: { fontSize: 14, fontWeight: '700', color: colors.accent },
  releaseNotes: { fontSize: 12, color: colors.textLight, marginBottom: 10, lineHeight: 17 },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, paddingVertical: 11, borderRadius: 8,
  },
  updateBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  dlBarTrack: { height: 6, backgroundColor: colors.hover, borderRadius: 3, overflow: 'hidden' },
  dlBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.error + '10', borderRadius: 8,
    padding: 10, marginBottom: 12,
  },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', padding: 24,
  },
  modalSheet: {
    backgroundColor: colors.bg, borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 340,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 18,
    color: colors.text, backgroundColor: colors.card, textAlign: 'center',
  },
  modalUnit: { fontSize: 13, color: colors.textLight, textAlign: 'center', marginTop: 4 },
  catScroll: { marginTop: 12, flexGrow: 0 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, marginRight: 8,
  },
  catPillActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  catPillText: { fontSize: 13, fontWeight: '600', color: colors.textLight },
  catPillTextActive: { color: colors.darkText },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  modalSubmit: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
