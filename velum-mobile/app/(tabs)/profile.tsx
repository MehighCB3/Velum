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
import { colors } from '../../src/theme/colors';
import { profileApi, quickLogApi, QuickLogType } from '../../src/api/client';
import { UserProfile } from '../../src/types';
import { DarkCard, Card } from '../../src/components/Card';
import { SyncIndicator } from '../../src/components/SyncIndicator';
import { useSync } from '../../src/hooks/useSync';
import { useAppUpdate } from '../../src/hooks/useAppUpdate';
import { useOTAUpdate } from '../../src/hooks/useOTAUpdate';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatBirthDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function getAge(iso: string): number {
  const birth = new Date(iso);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
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
    status: otaStatus,
    isReady: otaReady,
    isChecking: otaChecking,
    isDownloading: otaDownloading,
    manualCheck: otaManualCheck,
    restart: otaRestart,
    error: otaError,
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Screen title */}
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Sync indicator */}
        <View style={styles.syncRow}>
          <SyncIndicator status={syncStatus} onSync={sync} />
        </View>

        {/* Hero — Profile Card */}
        <DarkCard style={styles.heroCard}>
          {!editing ? (
            <>
              <View style={styles.heroTop}>
                <View>
                  {age !== null && (
                    <Text style={styles.heroAge}>{age}</Text>
                  )}
                  <Text style={styles.heroLabel}>
                    {profile?.birth_date ? formatBirthDate(profile.birth_date) : 'Birth date not set'}
                  </Text>
                </View>
                <Pressable onPress={() => setEditing(true)} hitSlop={12}>
                  <Ionicons name="create-outline" size={20} color={colors.darkTextMuted} />
                </Pressable>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Ionicons name="location-outline" size={14} color={colors.darkTextMuted} />
                  <Text style={styles.heroStatText}>
                    {profile?.country || 'Not set'}
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Ionicons name="hourglass-outline" size={14} color={colors.darkTextMuted} />
                  <Text style={styles.heroStatText}>{lifeExp} yrs expectancy</Text>
                </View>
              </View>

              {/* Life progress bar */}
              {age !== null && (
                <View style={styles.lifeBarWrap}>
                  <View style={styles.lifeBarTrack}>
                    <View
                      style={[
                        styles.lifeBarFill,
                        { width: `${Math.min((age / lifeExp) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.lifeBarLabel}>
                    {Math.round((age / lifeExp) * 100)}% of {lifeExp} years
                  </Text>
                </View>
              )}
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

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Log</Text>
        </View>

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

        {/* Goals & Learning */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Space</Text>
        </View>

        <Card style={styles.settingsList}>
          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push('/goals')}
          >
            <Ionicons name="trophy-outline" size={18} color={colors.warning} />
            <Text style={styles.settingsLabel}>Goals</Text>
            <Text style={styles.settingsHint}>Year, 3-yr, bucket list</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.settingsDivider} />

          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push('/feed')}
          >
            <Ionicons name="bookmark-outline" size={18} color={colors.accent} />
            <Text style={styles.settingsLabel}>Feed</Text>
            <Text style={styles.settingsHint}>Bookmarks & reading</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>
        </Card>

        {/* Settings / Info — flat list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>

        <Card style={styles.settingsList}>
          {/* Force Sync */}
          <Pressable style={styles.settingsRow} onPress={sync}>
            <Ionicons name="sync-outline" size={18} color={colors.accent} />
            <Text style={styles.settingsLabel}>Force Sync</Text>
            <Text style={styles.settingsHint}>
              {syncStatus.isSyncing ? 'Syncing...' : syncStatus.lastSynced ? 'Synced' : 'Tap to sync'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.settingsDivider} />

          {/* Check Updates */}
          <Pressable
            style={styles.settingsRow}
            onPress={() => { checkAndUpdate(); otaManualCheck(); }}
            disabled={isChecking || otaChecking}
          >
            <Ionicons name="download-outline" size={18} color={colors.info} />
            <Text style={styles.settingsLabel}>Check for Updates</Text>
            <Text style={styles.settingsHint}>
              {isChecking || otaChecking
                ? 'Checking...'
                : updateStatus === 'up-to-date'
                ? 'Up to date'
                : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </Pressable>

          <View style={styles.settingsDivider} />

          {/* Version */}
          <View style={styles.settingsRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
            <Text style={styles.settingsLabel}>Version</Text>
            <Text style={styles.settingsValue}>v{currentVersion}</Text>
          </View>

          <View style={styles.settingsDivider} />

          {/* Database */}
          <View style={styles.settingsRow}>
            <Ionicons name="server-outline" size={18} color={colors.textLight} />
            <Text style={styles.settingsLabel}>Database</Text>
            <Text style={styles.settingsValue}>Postgres + Redis</Text>
          </View>

          <View style={styles.settingsDivider} />

          {/* Cache */}
          <View style={styles.settingsRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.textLight} />
            <Text style={styles.settingsLabel}>Local Cache</Text>
            <Text style={styles.settingsValue}>SQLite</Text>
          </View>
        </Card>

        {/* OTA Update banner — only when ready */}
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

        {/* APK Update — only when available/downloading/downloaded */}
        {(isUpdateAvailable || isDownloading || isDownloaded || isInstalling) && (
          <Card style={styles.updateBanner}>
            {isUpdateAvailable && !isDownloading && !isDownloaded && (
              <>
                <View style={styles.updateRow}>
                  <Ionicons name="arrow-up-circle" size={18} color={colors.success} />
                  <Text style={styles.updateText}>
                    v{remoteVersion} available
                  </Text>
                  {apkSizeBytes ? (
                    <Text style={styles.updateSize}>{formatBytes(apkSizeBytes)}</Text>
                  ) : null}
                </View>
                {releaseNotes ? (
                  <Text style={styles.releaseNotes} numberOfLines={3}>
                    {releaseNotes}
                  </Text>
                ) : null}
                <Pressable style={styles.updateBtn} onPress={downloadAndInstall}>
                  <Ionicons name="download-outline" size={16} color="#fff" />
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
                  <View
                    style={[
                      styles.dlBarFill,
                      { width: `${Math.min(downloadProgress * 100, 100)}%` },
                    ]}
                  />
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
                  <Ionicons name="open-outline" size={16} color="#fff" />
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

        {/* Update error */}
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
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveAction(null)}
          >
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.catScroll}
                >
                  {(activeAction.categories || []).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.catPill, inputCategory === cat && styles.catPillActive]}
                      onPress={() => setInputCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          inputCategory === cat && styles.catPillTextActive,
                        ]}
                      >
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
                  <Text style={styles.modalSubmitText}>
                    {submitting ? 'Saving...' : 'Log'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  screenTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },

  // Sync
  syncRow: { alignItems: 'flex-end', marginBottom: 8 },

  // Hero
  heroCard: { padding: 16, marginBottom: 12 },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  heroAge: { fontSize: 40, fontWeight: '700', color: colors.darkText, lineHeight: 44 },
  heroLabel: { fontSize: 12, color: colors.darkTextMuted, marginTop: 2 },
  heroDivider: { height: 1, backgroundColor: colors.darkInner, marginVertical: 12 },
  heroStatsRow: { flexDirection: 'row', gap: 20 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatText: { fontSize: 12, color: colors.darkTextMuted },
  lifeBarWrap: { marginTop: 12 },
  lifeBarTrack: {
    height: 4, backgroundColor: colors.darkInner, borderRadius: 2, overflow: 'hidden',
  },
  lifeBarFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  lifeBarLabel: { fontSize: 10, color: colors.darkTextMuted, marginTop: 4 },

  // Edit form inside hero
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

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.textLight, letterSpacing: 0.3 },

  // Quick actions
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

  // Settings list
  settingsList: { padding: 0, overflow: 'hidden', marginBottom: 12 },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  settingsLabel: { fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 },
  settingsHint: { fontSize: 12, color: colors.textLight },
  settingsValue: { fontSize: 12, color: colors.textLight },
  settingsDivider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 42 },

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

  // Download bar
  dlBarTrack: {
    height: 6, backgroundColor: colors.hover, borderRadius: 3, overflow: 'hidden',
  },
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
