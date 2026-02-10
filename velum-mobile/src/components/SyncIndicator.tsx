import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { SyncStatus } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface SyncIndicatorProps {
  status: SyncStatus;
  onSync: () => void;
}

export function SyncIndicator({ status, onSync }: SyncIndicatorProps) {
  const getStatusColor = () => {
    if (status.isSyncing) return colors.accent;
    if (!status.isOnline) return colors.textLight;
    if (status.pendingChanges > 0) return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (status.isSyncing) return 'Syncing...';
    if (!status.isOnline) return 'Offline';
    if (status.pendingChanges > 0) return `${status.pendingChanges} pending`;
    if (status.lastSynced) {
      return `Synced ${formatDistanceToNow(new Date(status.lastSynced), { addSuffix: true })}`;
    }
    return 'Not synced';
  };

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (status.isSyncing) return 'sync';
    if (!status.isOnline) return 'cloud-offline-outline';
    if (status.pendingChanges > 0) return 'cloud-upload-outline';
    return 'cloud-done-outline';
  };

  return (
    <Pressable style={styles.container} onPress={onSync}>
      <Ionicons name={getIcon()} size={14} color={getStatusColor()} />
      <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.sidebar,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
