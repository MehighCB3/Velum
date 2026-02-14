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
import { colors } from '../../src/theme/colors';
import { profileApi } from '../../src/api/client';
import { UserProfile, GoalHorizon, Goal } from '../../src/types';
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { SyncIndicator } from '../../src/components/SyncIndicator';
import { AddEntryModal, FormField } from '../../src/components/AddEntryModal';
import { useSync } from '../../src/hooks/useSync';
import { useGoals } from '../../src/hooks/useGoals';
import { useAppUpdate } from '../../src/hooks/useAppUpdate';

type SubTab = 'profile' | 'goals';

// ==================== GOALS CONTENT ====================

const HORIZONS: { key: GoalHorizon; label: string; icon: string }[] = [
  { key: 'year', label: 'This Year', icon: '🎯' },
  { key: '3years', label: '3 Years', icon: '🗓️' },
  { key: '5years', label: '5 Years', icon: '🌟' },
  { key: '10years', label: '10 Years', icon: '🏔️' },
  { key: 'bucket', label: 'Bucket List', icon: '✨' },
];

const goalFields: FormField[] = [
  { key: 'title', label: 'Goal Title', placeholder: 'e.g. Run a marathon', type: 'text', required: true },
  { key: 'area', label: 'Area', placeholder: 'e.g. Health, Career, Skills', type: 'text', required: true },
  { key: 'objective', label: 'Objective', placeholder: 'What does success look like?', type: 'text' },
  { key: 'keyMetric', label: 'Key Metric', placeholder: 'e.g. Distance, Revenue', type: 'text' },
  { key: 'targetValue', label: 'Target Value', placeholder: '0', type: 'number' },
  { key: 'unit', label: 'Unit', placeholder: 'e.g. km, €, hours', type: 'text' },
  {
    key: 'horizon',
    label: 'Horizon',
    placeholder: '',
    type: 'select',
    required: true,
    options: HORIZONS.map((h) => ({ label: h.label, value: h.key })),
  },
];

function GoalsContent() {
  const { goals, loading, refresh, createGoal, updateProgress, markComplete, removeGoal } =
    useGoals();
  const [activeHorizon, setActiveHorizon] = useState<GoalHorizon>('year');
  const [showAddModal, setShowAddModal] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('');

  const filteredGoals = goals.filter((g) => g.horizon === activeHorizon);

  const handleAddGoal = useCallback(
    async (values: Record<string, string>) => {
      await createGoal({
        title: values.title,
        area: values.area,
        objective: values.objective || '',
        keyMetric: values.keyMetric || '',
        targetValue: Number(values.targetValue) || 0,
        unit: values.unit || '',
        horizon: (values.horizon as GoalHorizon) || activeHorizon,
      });
      setShowAddModal(false);
    },
    [createGoal, activeHorizon],
  );

  const handleGoalAction = useCallback(
    (goal: Goal) => {
      const isComplete = goal.completedAt || (goal.targetValue > 0 && goal.currentValue >= goal.targetValue);
      Alert.alert(goal.title, goal.objective || 'Choose an action', [
        { text: 'Cancel', style: 'cancel' },
        ...(isComplete
          ? []
          : [
              {
                text: 'Update Progress',
                onPress: () => {
                  setProgressGoal(goal);
                  setProgressValue(String(goal.currentValue));
                },
              },
              {
                text: 'Mark Complete',
                onPress: () => markComplete(goal.id),
              },
            ]),
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeGoal(goal.id),
        },
      ]);
    },
    [markComplete, removeGoal],
  );

  const handleProgressSubmit = useCallback(() => {
    if (!progressGoal) return;
    const num = Number(progressValue);
    if (!isNaN(num)) {
      updateProgress(progressGoal.id, num);
    }
    setProgressGoal(null);
    setProgressValue('');
  }, [progressGoal, progressValue, updateProgress]);

  return (
    <>
      {/* Horizon Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={goalStyles.tabsContainer}>
        <View style={goalStyles.tabsRow}>
          {HORIZONS.map((h) => (
            <Pressable
              key={h.key}
              style={[goalStyles.tab, activeHorizon === h.key && goalStyles.tabActive]}
              onPress={() => setActiveHorizon(h.key)}
            >
              <Text style={goalStyles.tabIcon}>{h.icon}</Text>
              <Text
                style={[
                  goalStyles.tabLabel,
                  activeHorizon === h.key && goalStyles.tabLabelActive,
                ]}
              >
                {h.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Stats */}
      <View style={goalStyles.statsRow}>
        <Text style={goalStyles.statsText}>
          {filteredGoals.length} goal{filteredGoals.length !== 1 ? 's' : ''}
        </Text>
        <Text style={goalStyles.statsText}>
          {filteredGoals.filter((g) => g.completedAt).length} completed
        </Text>
      </View>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={HORIZONS.find((h) => h.key === activeHorizon)?.icon || '🎯'}
          title="No goals yet"
          subtitle="Tap + to add your first goal"
        />
      ) : (
        filteredGoals.map((goal) => {
          const progress =
            goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
          const isComplete =
            !!goal.completedAt || (goal.targetValue > 0 && goal.currentValue >= goal.targetValue);

          return (
            <Card
              key={goal.id}
              style={[goalStyles.goalCard, isComplete && goalStyles.goalCardComplete]}
              onPress={() => handleGoalAction(goal)}
            >
              <View style={goalStyles.goalHeader}>
                <View style={goalStyles.goalTitleRow}>
                  {isComplete && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.success}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[goalStyles.goalTitle, isComplete && goalStyles.goalTitleComplete]}
                    numberOfLines={1}
                  >
                    {goal.title}
                  </Text>
                </View>
                <View style={goalStyles.areaBadge}>
                  <Text style={goalStyles.areaText}>{goal.area}</Text>
                </View>
              </View>

              {goal.objective ? (
                <Text style={goalStyles.goalObjective} numberOfLines={2}>
                  {goal.objective}
                </Text>
              ) : null}

              {goal.targetValue > 0 && (
                <View style={goalStyles.progressContainer}>
                  <View style={goalStyles.progressRow}>
                    <Text style={goalStyles.progressText}>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </Text>
                    <Text style={goalStyles.progressPercent}>
                      {Math.round(Math.min(progress, 1) * 100)}%
                    </Text>
                  </View>
                  <View style={goalStyles.progressBar}>
                    <View
                      style={[
                        goalStyles.progressBarFill,
                        {
                          width: `${Math.min(progress * 100, 100)}%`,
                          backgroundColor: isComplete ? colors.success : colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        })
      )}

      {/* FAB */}
      <Pressable style={goalStyles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color={colors.darkText} />
      </Pressable>

      <AddEntryModal
        visible={showAddModal}
        title="New Goal"
        fields={goalFields}
        onSubmit={handleAddGoal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Progress update modal */}
      <Modal visible={!!progressGoal} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={goalStyles.progressOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={goalStyles.progressSheet}>
            <Text style={goalStyles.progressTitle}>Update Progress</Text>
            <Text style={goalStyles.progressSub}>
              {progressGoal?.title} — {progressGoal?.currentValue} / {progressGoal?.targetValue} {progressGoal?.unit}
            </Text>
            <TextInput
              style={goalStyles.progressInput}
              value={progressValue}
              onChangeText={setProgressValue}
              keyboardType="decimal-pad"
              placeholder="New value"
              placeholderTextColor={colors.textLight}
              autoFocus
            />
            <View style={goalStyles.progressButtons}>
              <Pressable
                style={goalStyles.progressCancel}
                onPress={() => { setProgressGoal(null); setProgressValue(''); }}
              >
                <Text style={goalStyles.progressCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={goalStyles.progressSubmit} onPress={handleProgressSubmit}>
                <Text style={goalStyles.progressSubmitText}>Update</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const goalStyles = StyleSheet.create({
  tabsContainer: { marginBottom: 12 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tabActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  tabLabelActive: { color: colors.darkText },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  statsText: { fontSize: 13, color: colors.textLight },
  goalCard: { marginBottom: 10 },
  goalCardComplete: { opacity: 0.75 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  goalTitleComplete: { textDecorationLine: 'line-through', color: colors.textLight },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.hover,
  },
  areaText: { fontSize: 11, color: colors.textLight, fontWeight: '500' },
  goalObjective: { fontSize: 13, color: colors.textLight, marginBottom: 8 },
  progressContainer: { marginTop: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontSize: 12, color: colors.textLight },
  progressPercent: { fontSize: 12, fontWeight: '600', color: colors.text },
  progressBar: {
    height: 6,
    backgroundColor: colors.hover,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 3 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
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
  progressOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 24,
  },
  progressSheet: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  progressTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  progressSub: { fontSize: 13, color: colors.textLight, marginBottom: 16 },
  progressInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.sidebar,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressButtons: { flexDirection: 'row', gap: 10 },
  progressCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  progressCancelText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  progressSubmit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.dark,
    alignItems: 'center',
  },
  progressSubmitText: { fontSize: 15, fontWeight: '700', color: colors.darkText },
});

// ==================== PROFILE CONTENT ====================

function ProfileContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editLifeExpectancy, setEditLifeExpectancy] = useState('85');
  const { status: syncStatus, sync } = useSync();
  const { status: updateStatus, isChecking, isUpdateAvailable, checkAndUpdate, applyUpdate, releaseNotes, error: updateError, currentVersion, remoteVersion } = useAppUpdate();

  const handleUpdateApp = useCallback(() => {
    if (isUpdateAvailable) {
      Alert.alert(
        'Update Available',
        releaseNotes
          ? `${releaseNotes}\n\nDownload and install the new APK?`
          : 'A new version is available. Download and install?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Download', onPress: applyUpdate },
        ],
      );
    } else {
      checkAndUpdate();
    }
  }, [isUpdateAvailable, checkAndUpdate, applyUpdate, releaseNotes]);

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
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile');
    }
  }, [editBirthDate, editCountry, editLifeExpectancy, fetchProfile]);

  return (
    <>
      {/* Sync Status */}
      <View style={styles.syncRow}>
        <SyncIndicator status={syncStatus} onSync={sync} />
      </View>

      {/* Profile Details */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <SectionHeader title="Profile" />
          <Pressable onPress={() => setEditing(!editing)} hitSlop={12}>
            <Ionicons
              name={editing ? 'close' : 'create-outline'}
              size={20}
              color={colors.accent}
            />
          </Pressable>
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Birth Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={editBirthDate}
                onChangeText={setEditBirthDate}
                placeholder="1990-01-01"
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.input}
                value={editCountry}
                onChangeText={setEditCountry}
                placeholder="e.g. Spain"
                placeholderTextColor={colors.textLight}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Life Expectancy (years)</Text>
              <TextInput
                style={styles.input}
                value={editLifeExpectancy}
                onChangeText={setEditLifeExpectancy}
                placeholder="85"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Birth Date</Text>
              <Text style={styles.detailValue}>
                {profile?.birth_date || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Country</Text>
              <Text style={styles.detailValue}>
                {profile?.country || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Life Expectancy</Text>
              <Text style={styles.detailValue}>
                {profile?.life_expectancy || 85} years
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* App Info */}
      <Card style={styles.infoCard}>
        <SectionHeader title="About Velum" />
        <View style={styles.infoRow}>
          <Ionicons name="phone-portrait-outline" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>Velum Mobile v{currentVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="sync-outline" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Syncs with Velum web app via shared API
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="server-outline" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Database: Vercel Postgres + Upstash Redis
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="hardware-chip-outline" size={16} color={colors.textLight} />
          <Text style={styles.infoText}>
            Local cache: SQLite (offline-first)
          </Text>
        </View>
      </Card>

      {/* Manual Sync */}
      <Pressable style={styles.syncButton} onPress={sync}>
        <Ionicons name="sync" size={18} color={colors.accent} />
        <Text style={styles.syncButtonText}>Force Sync Now</Text>
      </Pressable>

      {/* Update App */}
      <Pressable
        style={[
          styles.updateButton,
          isUpdateAvailable && styles.updateButtonReady,
        ]}
        onPress={handleUpdateApp}
        disabled={isChecking}
      >
        <Ionicons
          name={
            isUpdateAvailable
              ? 'download-outline'
              : isChecking
              ? 'hourglass-outline'
              : 'cloud-download-outline'
          }
          size={18}
          color={isUpdateAvailable ? colors.darkText : colors.accent}
        />
        <Text
          style={[
            styles.updateButtonText,
            isUpdateAvailable && styles.updateButtonTextReady,
          ]}
        >
          {isChecking
            ? 'Checking for Updates...'
            : isUpdateAvailable
            ? `Download v${remoteVersion}`
            : updateStatus === 'up-to-date'
            ? `v${currentVersion} — Up to Date`
            : updateStatus === 'error'
            ? `Update Failed — Tap to Retry`
            : 'Check for Updates'}
        </Text>
      </Pressable>
    </>
  );
}

// ==================== MAIN SCREEN ====================

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<SubTab>('profile');

  return (
    <View style={styles.container}>
      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'profile' && styles.tabBtnTextActive]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'goals' && styles.tabBtnActive]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'goals' && styles.tabBtnTextActive]}>
            Goals
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'profile' ? <ProfileContent /> : <GoalsContent />}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.sidebar,
  },
  tabBtnActive: { backgroundColor: colors.dark },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  tabBtnTextActive: { color: colors.darkText },
  syncRow: { alignItems: 'flex-end', marginBottom: 8 },
  profileCard: { marginBottom: 12 },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editForm: { marginTop: 8 },
  fieldContainer: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.sidebar,
  },
  saveButton: {
    backgroundColor: colors.dark,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: colors.darkText, fontSize: 15, fontWeight: '700' },
  profileDetails: { marginTop: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, color: colors.textLight },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  infoCard: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { fontSize: 13, color: colors.textLight },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 8,
  },
  syncButtonText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 8,
    marginTop: 10,
  },
  updateButtonReady: {
    backgroundColor: colors.dark,
    borderColor: colors.dark,
  },
  updateButtonText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  updateButtonTextReady: { color: colors.darkText },
});
