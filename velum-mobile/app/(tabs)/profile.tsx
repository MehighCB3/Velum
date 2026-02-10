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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { profileApi } from '../../src/api/client';
import { UserProfile, SyncStatus } from '../../src/types';
import { Card, DarkCard, SectionHeader } from '../../src/components/Card';
import { SyncIndicator } from '../../src/components/SyncIndicator';
import { useSync } from '../../src/hooks/useSync';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editLifeExpectancy, setEditLifeExpectancy] = useState('85');
  const { status: syncStatus, sync } = useSync();

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
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={colors.accent} />
        }
      >
        {/* Sync Status */}
        <View style={styles.syncRow}>
          <SyncIndicator status={syncStatus} onSync={sync} />
        </View>

        {/* Life Stats Hero */}
        {profile && profile.ageInWeeks !== undefined && (
          <DarkCard style={styles.heroCard}>
            <Text style={styles.heroTitle}>Your Life in Weeks</Text>
            <View style={styles.lifeGrid}>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>{profile.currentAge}</Text>
                <Text style={styles.lifeLabel}>Age</Text>
              </View>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>
                  {(profile.ageInWeeks || 0).toLocaleString()}
                </Text>
                <Text style={styles.lifeLabel}>Weeks Lived</Text>
              </View>
              <View style={styles.lifeItem}>
                <Text style={[styles.lifeValue, { color: colors.accent }]}>
                  {(profile.weeksRemaining || 0).toLocaleString()}
                </Text>
                <Text style={styles.lifeLabel}>Weeks Left</Text>
              </View>
              <View style={styles.lifeItem}>
                <Text style={styles.lifeValue}>{profile.yearsRemaining}</Text>
                <Text style={styles.lifeLabel}>Years Left</Text>
              </View>
            </View>

            {/* Life progress bar */}
            <View style={styles.lifeProgressContainer}>
              <View style={styles.lifeProgressBar}>
                <View
                  style={[
                    styles.lifeProgressFill,
                    { width: `${profile.percentLived || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.lifeProgressText}>
                {profile.percentLived}% of life expectancy
              </Text>
            </View>
          </DarkCard>
        )}

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
            <Text style={styles.infoText}>Velum Mobile v1.0.0</Text>
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

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  syncRow: { alignItems: 'flex-end', marginBottom: 8 },
  heroCard: { marginBottom: 12 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: 16,
  },
  lifeGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  lifeItem: { alignItems: 'center' },
  lifeValue: { fontSize: 22, fontWeight: '800', color: colors.darkText },
  lifeLabel: { fontSize: 11, color: colors.darkTextSecondary, marginTop: 4 },
  lifeProgressContainer: { marginTop: 20 },
  lifeProgressBar: {
    height: 6,
    backgroundColor: colors.darkTertiary,
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
    color: colors.darkTextSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
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
});
