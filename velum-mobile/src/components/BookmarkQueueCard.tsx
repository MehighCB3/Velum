import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { XBookmark, bookmarksApi } from '../api/client';

interface Props {
  bookmark: XBookmark;
  onDismiss: (tweetId: string) => void;
}

export function BookmarkQueueCard({ bookmark, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [yapping, setYapping] = useState(false);
  const [bullets, setBullets] = useState<string[]>([]);

  const handleYap = async () => {
    if (bullets.length > 0) {
      setBullets([]);
      return;
    }
    setYapping(true);
    try {
      const result = await bookmarksApi.yap(bookmark.text, bookmark.author_handle);
      setBullets(result.bullets.length > 0 ? result.bullets : ['Could not summarise this one.']);
    } catch {
      setBullets(['Could not summarise this one.']);
    } finally {
      setYapping(false);
    }
  };

  const isLong = bookmark.text.length > 180;

  return (
    <Card style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.xBadge}>
          <Text style={styles.xText}>{'\u{1D54F}'}</Text>
        </View>
        <View style={styles.authorBlock}>
          <Text style={styles.authorHandle}>{bookmark.author_handle}</Text>
          {bookmark.author_name && bookmark.author_name !== bookmark.author_handle && (
            <Text style={styles.authorName}>{bookmark.author_name}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => bookmark.url && Linking.openURL(bookmark.url)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="open-outline" size={15} color={colors.textLight} />
          </Pressable>
          <Pressable
            onPress={() => onDismiss(bookmark.tweet_id)}
            hitSlop={8}
            style={styles.iconBtn}
          >
            <Ionicons name="checkmark" size={15} color={colors.textLight} />
          </Pressable>
        </View>
      </View>

      {/* Tweet text — expandable */}
      <Pressable onPress={() => isLong && setExpanded((e) => !e)}>
        <Text style={styles.tweetText} numberOfLines={expanded ? undefined : 4}>
          {bookmark.text}
        </Text>
        {isLong && !expanded && (
          <Text style={styles.expandHint}>show more</Text>
        )}
        {isLong && expanded && (
          <Text style={styles.expandHint}>show less</Text>
        )}
      </Pressable>

      {/* Tags */}
      {bookmark.tags.length > 0 && (
        <View style={styles.tagRow}>
          {bookmark.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Yap bullets */}
      {bullets.length > 0 && (
        <View style={styles.bulletsBox}>
          {bullets.map((bullet, i) => (
            <Text key={i} style={styles.bullet}>
              {bullet}
            </Text>
          ))}
        </View>
      )}

      {/* Footer: Yap button */}
      <Pressable
        style={[styles.yapBtn, bullets.length > 0 && styles.yapBtnOn]}
        onPress={handleYap}
        disabled={yapping}
      >
        {yapping ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <>
            <Text style={styles.yapIcon}>⚡</Text>
            <Text style={[styles.yapLabel, bullets.length > 0 && styles.yapLabelOn]}>
              {bullets.length > 0 ? 'Hide yap' : 'Yap it'}
            </Text>
          </>
        )}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10, padding: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  xBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  xText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  authorBlock: { flex: 1 },
  authorHandle: { fontSize: 13, fontWeight: '700', color: colors.text },
  authorName: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },

  // Text
  tweetText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  expandHint: { fontSize: 12, color: colors.accent, marginTop: 4 },

  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: {
    backgroundColor: colors.hover,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: '500', color: colors.textLight },

  // Bullets
  bulletsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.accent + '12',
    borderRadius: 8,
    gap: 5,
  },
  bullet: { fontSize: 13, color: colors.text, lineHeight: 20 },

  // Yap button
  yapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sidebar,
    alignSelf: 'flex-start',
  },
  yapBtnOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  yapIcon: { fontSize: 12 },
  yapLabel: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  yapLabelOn: { color: colors.accent },
});
