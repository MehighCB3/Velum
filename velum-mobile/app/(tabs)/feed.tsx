import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../src/theme/colors';
import { Card } from '../../src/components/Card';
import { bookmarksApi, XBookmark } from '../../src/api/client';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function FeedScreen() {
  const [items, setItems] = useState<XBookmark[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const data = await bookmarksApi.getAll({ limit: 100 });
      setItems(data.bookmarks);
    } catch { /* silently fail */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems();
  }, [fetchItems]);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const savedCount = Object.values(saved).filter(Boolean).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Feed</Text>
          {savedCount > 0 && (
            <Text style={styles.savedCount}>{savedCount} saved</Text>
          )}
        </View>
        <Text style={styles.subtitle}>{items.length} items</Text>

        {/* Feed cards */}
        {items.map((it) => {
          const isSaved = saved[it.tweet_id];
          const isX = !it.tags?.includes('mymind');

          return (
            <Card key={it.tweet_id} style={styles.feedCard}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.sourceRow}>
                  {isX ? (
                    <View style={styles.xIcon}>
                      <Text style={styles.xIconText}>{'\u{1D54F}'}</Text>
                    </View>
                  ) : (
                    <View style={styles.mmIcon}>
                      <Text style={styles.mmIconText}>m</Text>
                    </View>
                  )}
                  <Text style={styles.authorName}>
                    {it.author_handle || 'mymind'}
                  </Text>
                  <Text style={styles.timestamp}>{timeAgo(it.bookmarked_at)}</Text>
                </View>

                {/* Bookmark toggle */}
                <Pressable
                  onPress={() => toggleSave(it.tweet_id)}
                  style={[
                    styles.bookmarkBtn,
                    isSaved && styles.bookmarkBtnSaved,
                  ]}
                  hitSlop={8}
                >
                  <Text
                    style={[
                      styles.bookmarkStar,
                      { color: isSaved ? colors.accent : colors.muted },
                    ]}
                  >
                    {isSaved ? '★' : '☆'}
                  </Text>
                </Pressable>
              </View>

              {/* Content */}
              <Pressable onPress={() => it.url && Linking.openURL(it.url)}>
                <Text style={styles.cardText} numberOfLines={4}>
                  {it.text}
                </Text>
              </Pressable>

              {/* Tags */}
              {it.tags && it.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {it.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📰</Text>
            <Text style={styles.emptyTitle}>No feed items yet</Text>
            <Text style={styles.emptySubtitle}>Pull to refresh</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  savedCount: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 20 },

  feedCard: { marginBottom: 8, padding: 14 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xIconText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  mmIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mmIconText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  authorName: { fontSize: 12, fontWeight: '600', color: colors.text },
  timestamp: { fontSize: 10, color: colors.muted },

  bookmarkBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBtnSaved: { backgroundColor: `${colors.accent}15` },
  bookmarkStar: { fontSize: 15 },

  cardText: { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 6 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.subtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: '500', color: '#8a857d' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
