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
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { Card, DarkCard, SectionHeader, EmptyState } from '../../src/components/Card';
import { AgentInsightCard } from '../../src/components/AgentInsightCard';
import { useInsights } from '../../src/hooks/useInsights';
import { booksApi, bookmarksApi, mymindApi, XBookmark, MymindItem } from '../../src/api/client';
import { BookmarkQueueCard } from '../../src/components/BookmarkQueueCard';
import { MymindCard } from '../../src/components/MymindCard';
import { DailyWisdom, BookPrinciple } from '../../src/types';

type TopTab = 'bookmarks' | 'knowledge';

// ==================== HELPERS ====================

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

// Day-seeded shuffle — same order all day, rotates tomorrow
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==================== X BOOKMARKS ====================

function BookmarksView({ onRefreshDone }: { onRefreshDone?: () => void }) {
  const [bookmarks, setBookmarks] = useState<XBookmark[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    try {
      const data = await bookmarksApi.getAll({ limit: 100 });
      setBookmarks(data.bookmarks);
      setTotal(data.total);
      setActive(data.active);
    } catch {
      // silently fail — empty state will show
    } finally {
      setLoading(false);
      onRefreshDone?.();
    }
  }, [onRefreshDone]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleDismiss = useCallback(async (tweetId: string) => {
    // Optimistic UI update
    setBookmarks((prev) => prev.filter((b) => b.tweet_id !== tweetId));
    setActive((prev) => prev - 1);
    try {
      await bookmarksApi.dismiss(tweetId);
    } catch {
      // revert on error
      fetchBookmarks();
    }
  }, [fetchBookmarks]);

  if (loading) {
    return (
      <View style={bkStyles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View>
        <DarkCard style={bkStyles.heroCard}>
          <View style={bkStyles.heroRow}>
            <View style={bkStyles.heroStat}>
              <Text style={bkStyles.heroNumber}>{total}</Text>
              <Text style={bkStyles.heroLabel}>Total</Text>
            </View>
            <View style={[bkStyles.heroStat, bkStyles.heroStatCenter]}>
              <Text style={bkStyles.heroNumber}>{active}</Text>
              <Text style={bkStyles.heroLabel}>Unread</Text>
            </View>
            <View style={bkStyles.heroStat}>
              <Text style={[bkStyles.heroNumber, { color: colors.success }]}>
                {total - active}
              </Text>
              <Text style={bkStyles.heroLabel}>Read</Text>
            </View>
          </View>
        </DarkCard>

        <EmptyState
          icon="📚"
          title="No bookmarks yet"
          subtitle={'Run the sync script to import\nyour X bookmarks'}
        />
      </View>
    );
  }

  return (
    <View>
      {/* Hero stats */}
      <DarkCard style={bkStyles.heroCard}>
        <View style={bkStyles.heroRow}>
          <View style={bkStyles.heroStat}>
            <Text style={bkStyles.heroNumber}>{total}</Text>
            <Text style={bkStyles.heroLabel}>Total</Text>
          </View>
          <View style={[bkStyles.heroStat, bkStyles.heroStatCenter]}>
            <Text style={[bkStyles.heroNumber, { color: colors.accent }]}>{active}</Text>
            <Text style={bkStyles.heroLabel}>Unread</Text>
          </View>
          <View style={bkStyles.heroStat}>
            <Text style={[bkStyles.heroNumber, { color: colors.success }]}>
              {total - active}
            </Text>
            <Text style={bkStyles.heroLabel}>Read</Text>
          </View>
        </View>
      </DarkCard>

      {/* Bookmarks list — flat card */}
      <Card style={bkStyles.listCard}>
        {bookmarks.map((bk, idx) => (
          <Pressable
            key={bk.tweet_id}
            style={[
              bkStyles.bookmarkRow,
              idx < bookmarks.length - 1 && bkStyles.bookmarkRowBorder,
            ]}
            onPress={() => bk.url && Linking.openURL(bk.url)}
          >
            {/* X icon */}
            <View style={bkStyles.xIcon}>
              <Text style={bkStyles.xIconText}>{'\u{1D54F}'}</Text>
            </View>

            {/* Content */}
            <View style={bkStyles.bookmarkContent}>
              <View style={bkStyles.bookmarkHeader}>
                <Text style={bkStyles.authorHandle}>{bk.author_handle}</Text>
                <Text style={bkStyles.bookmarkTime}>
                  {timeAgo(bk.bookmarked_at)}
                </Text>
              </View>
              <Text style={bkStyles.bookmarkText} numberOfLines={3}>
                {bk.text}
              </Text>
              {bk.tags.length > 0 && (
                <View style={bkStyles.tagRow}>
                  {bk.tags.map((tag) => (
                    <View key={tag} style={bkStyles.tag}>
                      <Text style={bkStyles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Dismiss button */}
            <Pressable
              style={bkStyles.dismissBtn}
              onPress={(e) => {
                e.stopPropagation();
                handleDismiss(bk.tweet_id);
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.textLight} />
            </Pressable>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const bkStyles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', paddingTop: 40 },

  // Hero
  heroCard: { padding: 16, marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatCenter: {
    borderLeftWidth: 1, borderRightWidth: 1,
    borderLeftColor: colors.darkInner, borderRightColor: colors.darkInner,
  },
  heroNumber: { fontSize: 24, fontWeight: '700', color: colors.darkText },
  heroLabel: { fontSize: 10, color: colors.darkTextMuted, marginTop: 2, letterSpacing: 0.3 },

  // List
  listCard: { padding: 0, overflow: 'hidden' },
  bookmarkRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  bookmarkRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },

  xIcon: {
    width: 24, height: 24, borderRadius: 6, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  xIconText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },

  bookmarkContent: { flex: 1 },
  bookmarkHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  authorHandle: { fontSize: 12, fontWeight: '600', color: colors.text },
  bookmarkTime: { fontSize: 10, color: colors.textLight },
  bookmarkText: { fontSize: 13, color: colors.text, lineHeight: 19 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    backgroundColor: colors.hover, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: '500', color: colors.textLight },

  dismissBtn: { paddingTop: 2 },
});

// ==================== BOOKS / KNOWLEDGE ====================

// Queue item union type for the merged feed
type QueueItem =
  | { source: 'x'; data: XBookmark; key: string }
  | { source: 'mymind'; data: MymindItem; key: string };

function KnowledgeView() {
  const [wisdom, setWisdom] = useState<DailyWisdom | null>(null);
  const [allPrinciples, setAllPrinciples] = useState<BookPrinciple[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const { insights: knowledgeInsights } = useInsights('knowledge');

  const fetchWisdom = useCallback(async () => {
    setLoading(true);
    try {
      const [daily, princData] = await Promise.all([
        booksApi.getDaily(),
        booksApi.getPrinciples(),
      ]);
      setWisdom(daily);
      setAllPrinciples(princData.principles || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch both sources, merge and shuffle by day seed (same 5 all day, rotate tomorrow)
  useEffect(() => {
    const daySeed = Math.floor(Date.now() / 86400000);

    Promise.allSettled([
      bookmarksApi.getAll({ limit: 50 }),
      mymindApi.getAll({ limit: 50 }),
    ]).then(([xResult, mmResult]) => {
      const xItems: QueueItem[] = xResult.status === 'fulfilled'
        ? xResult.value.bookmarks
            .filter((b) => !b.dismissed)
            .map((b) => ({ source: 'x' as const, data: b, key: `x-${b.tweet_id}` }))
        : [];

      const mmItems: QueueItem[] = mmResult.status === 'fulfilled'
        ? mmResult.value.items
            .filter((i) => !i.dismissed)
            .map((i) => ({ source: 'mymind' as const, data: i, key: `mm-${i.mymind_id}` }))
        : [];

      const merged = seededShuffle([...xItems, ...mmItems], daySeed).slice(0, 6);
      setQueue(merged);
    });
  }, []);

  const handleXDismiss = useCallback(async (tweetId: string) => {
    setQueue((prev) => prev.filter((q) => q.key !== `x-${tweetId}`));
    try { await bookmarksApi.dismiss(tweetId); } catch { /* silent */ }
  }, []);

  const handleMymindDismiss = useCallback(async (mymindId: string) => {
    setQueue((prev) => prev.filter((q) => q.key !== `mm-${mymindId}`));
    try { await mymindApi.dismiss(mymindId); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchWisdom();
  }, [fetchWisdom]);

  if (loading) {
    return (
      <View style={kStyles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!wisdom) {
    return <EmptyState icon="📖" title="No wisdom today" subtitle="Pull to refresh" />;
  }

  const filteredPrinciples = activeDomain
    ? allPrinciples.filter((p) => p.domain === activeDomain)
    : allPrinciples.filter((p) => p.domain === wisdom.currentDomain);

  return (
    <View>
      {/* Domain Hero */}
      <DarkCard style={kStyles.heroCard}>
        <Text style={kStyles.heroLabel}>
          Week {wisdom.domainIndex} of {wisdom.totalDomains}
        </Text>
        <Text style={kStyles.heroDomain}>{wisdom.currentDomain}</Text>
        <Text style={kStyles.heroInsight}>{wisdom.contextInsight}</Text>
      </DarkCard>

      {/* Daily Principle */}
      {wisdom.weekPrinciple && (
        <Card style={kStyles.principleCard}>
          <View style={kStyles.principleHeader}>
            <Ionicons name="bulb-outline" size={16} color={colors.accent} />
            <Text style={kStyles.principleLabel}>Today's Principle</Text>
          </View>
          <Text style={kStyles.principleTitle}>{wisdom.weekPrinciple.title}</Text>
          <Text style={kStyles.principleText}>{wisdom.weekPrinciple.principle}</Text>
          <Text style={kStyles.principleSource}>{wisdom.weekPrinciple.source}</Text>
          <View style={kStyles.actionPromptBox}>
            <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.accent} />
            <Text style={kStyles.actionPromptText}>{wisdom.weekPrinciple.actionPrompt}</Text>
          </View>
        </Card>
      )}

      {/* Daily Quote */}
      {wisdom.rawCapture && (
        <Card style={kStyles.quoteCard}>
          <Text style={kStyles.quoteText}>{wisdom.rawCapture.text}</Text>
          <Text style={kStyles.quoteSource}>-- {wisdom.rawCapture.source}</Text>
        </Card>
      )}

      {/* Agent Insights */}
      {knowledgeInsights.map((ai) => (
        <AgentInsightCard key={ai.agentId} insight={ai} />
      ))}

      {/* Read Queue — shuffled X bookmarks + mymind items */}
      {queue.length > 0 && (
        <>
          <SectionHeader title={`Your Queue · ${queue.length}`} />
          {queue.map((item) =>
            item.source === 'mymind' ? (
              <MymindCard
                key={item.key}
                item={item.data}
                onDismiss={handleMymindDismiss}
              />
            ) : (
              <BookmarkQueueCard
                key={item.key}
                bookmark={item.data}
                onDismiss={handleXDismiss}
              />
            )
          )}
        </>
      )}

      {/* Domain Explorer */}
      <SectionHeader title="Explore Domains" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={kStyles.domainScroll}>
        <View style={kStyles.domainRow}>
          {wisdom.allDomains.map((domain) => (
            <Pressable
              key={domain}
              style={[
                kStyles.domainPill,
                (activeDomain === domain || (!activeDomain && domain === wisdom.currentDomain)) && kStyles.domainPillActive,
              ]}
              onPress={() => setActiveDomain(domain === activeDomain ? null : domain)}
            >
              <Text
                style={[
                  kStyles.domainPillText,
                  (activeDomain === domain || (!activeDomain && domain === wisdom.currentDomain)) && kStyles.domainPillTextActive,
                ]}
              >
                {domain}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Principles for selected/current domain */}
      {filteredPrinciples.map((principle) => (
        <Card key={principle.id} style={kStyles.smallPrincipleCard}>
          <Text style={kStyles.smallPrincipleTitle}>{principle.title}</Text>
          <Text style={kStyles.smallPrincipleText} numberOfLines={3}>
            {principle.principle}
          </Text>
          <Text style={kStyles.smallPrincipleSource}>{principle.source}</Text>
        </Card>
      ))}

      {filteredPrinciples.length === 0 && (
        <EmptyState
          icon="📚"
          title="No principles"
          subtitle={`No principles found for ${activeDomain || wisdom.currentDomain}`}
        />
      )}
    </View>
  );
}

const kStyles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', paddingTop: 40 },
  heroCard: { marginBottom: 12, paddingVertical: 20 },
  heroLabel: { fontSize: 11, color: colors.darkTextSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroDomain: { fontSize: 24, fontWeight: '800', color: colors.darkText, marginTop: 4 },
  heroInsight: { fontSize: 13, color: colors.darkTextSecondary, marginTop: 8, lineHeight: 20 },
  principleCard: { marginBottom: 12, padding: 16 },
  principleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  principleLabel: { fontSize: 11, fontWeight: '600', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  principleTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  principleText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  principleSource: { fontSize: 12, color: colors.textLight, marginTop: 8, fontStyle: 'italic' },
  actionPromptBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 12, padding: 12, backgroundColor: colors.accent + '10', borderRadius: 8,
  },
  actionPromptText: { fontSize: 13, color: colors.accent, flex: 1, lineHeight: 20, fontWeight: '500' },
  quoteCard: { marginBottom: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.accent },
  quoteText: { fontSize: 15, color: colors.text, fontStyle: 'italic', lineHeight: 24 },
  quoteSource: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  domainScroll: { marginBottom: 12 },
  domainRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  domainPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  domainPillActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  domainPillText: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  domainPillTextActive: { color: colors.darkText },
  smallPrincipleCard: { marginBottom: 8, padding: 14 },
  smallPrincipleTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  smallPrincipleText: { fontSize: 13, color: colors.textLight, lineHeight: 20 },
  smallPrincipleSource: { fontSize: 11, color: colors.textLight, marginTop: 6, fontStyle: 'italic' },
});

// ==================== MAIN SCREEN ====================

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<TopTab>('knowledge');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    // Knowledge tab refresh handled by remount; bookmarks by onRefreshDone
    if (activeTab === 'knowledge') {
      await new Promise((r) => setTimeout(r, 800));
      setRefreshing(false);
    }
  }, [activeTab]);

  return (
    <View style={styles.container}>
      {/* Top tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'knowledge' && styles.tabBtnActive]}
          onPress={() => setActiveTab('knowledge')}
        >
          <Ionicons
            name="book-outline"
            size={15}
            color={activeTab === 'knowledge' ? colors.darkText : colors.textLight}
          />
          <Text style={[styles.tabBtnText, activeTab === 'knowledge' && styles.tabBtnTextActive]}>
            Knowledge
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'bookmarks' && styles.tabBtnActive]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <Ionicons
            name="bookmark-outline"
            size={15}
            color={activeTab === 'bookmarks' ? colors.darkText : colors.textLight}
          />
          <Text style={[styles.tabBtnText, activeTab === 'bookmarks' && styles.tabBtnTextActive]}>
            Bookmarks
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {activeTab === 'knowledge' ? (
          <KnowledgeView key={`k-${refreshKey}`} />
        ) : (
          <BookmarksView
            key={`b-${refreshKey}`}
            onRefreshDone={() => setRefreshing(false)}
          />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: colors.sidebar, gap: 6,
  },
  tabBtnActive: { backgroundColor: colors.dark },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  tabBtnTextActive: { color: colors.darkText },
});
