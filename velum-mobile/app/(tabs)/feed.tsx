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
import { booksApi } from '../../src/api/client';
import { DailyWisdom, BookPrinciple } from '../../src/types';

type TopTab = 'bookmarks' | 'knowledge';

// ==================== X BOOKMARKS ====================

type FeedSource = 'x' | 'mymind';

interface FeedItem {
  id: string;
  source: FeedSource;
  author?: string;
  time: string;
  title: string;
  tags: string[];
  note?: string;
  url?: string;
}

// Placeholder feed -- will be replaced with real API data
const MOCK_FEED: FeedItem[] = [
  {
    id: '1',
    source: 'x',
    author: '@levelsio',
    time: '2h ago',
    title: 'Built a $2M ARR product as a solo founder. Here\'s my stack in 2026...',
    tags: ['Indie', 'SaaS'],
  },
  {
    id: '2',
    source: 'mymind',
    time: 'Yesterday',
    title: 'The Psychology of Habit Loops in Product Design',
    tags: ['Product', 'UX'],
    note: 'Saved from Pocket',
  },
  {
    id: '3',
    source: 'x',
    author: '@naval',
    time: '5h ago',
    title: 'Specific knowledge is knowledge that you cannot be trained for.',
    tags: ['Philosophy'],
  },
  {
    id: '4',
    source: 'mymind',
    time: '2 days ago',
    title: 'Minimal dashboard inspiration -- dark mode wellness tracker',
    tags: ['Design', 'Inspo'],
    note: 'Saved from Dribbble',
  },
  {
    id: '5',
    source: 'x',
    author: '@paulg',
    time: '8h ago',
    title: 'The best founders I know all share one trait: they\'re relentlessly resourceful.',
    tags: ['Startups'],
  },
  {
    id: '6',
    source: 'mymind',
    time: '3 days ago',
    title: 'How Stripe Thinks About Developer Experience',
    tags: ['Product', 'DevEx'],
    note: 'Saved from blog.stripe.com',
  },
  {
    id: '7',
    source: 'x',
    author: '@andreasklinger',
    time: '1d ago',
    title: 'Hot take: Most PMs should learn to code. Not to ship code, but to understand constraints.',
    tags: ['Product', 'Career'],
  },
];

function SourceIcon({ source }: { source: FeedSource }) {
  if (source === 'x') {
    return (
      <View style={[bkStyles.sourceIcon, { backgroundColor: '#1a1a1a' }]}>
        <Text style={bkStyles.sourceIconText}>{'\u{1D54F}'}</Text>
      </View>
    );
  }
  return (
    <View style={[bkStyles.sourceIcon, { backgroundColor: '#c44dff' }]}>
      <Text style={[bkStyles.sourceIconText, { fontSize: 10 }]}>m</Text>
    </View>
  );
}

function BookmarksView() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'x' | 'mymind'>('all');

  const allItems = MOCK_FEED.filter((item) => !dismissed.has(item.id));
  const filtered = filter === 'all' ? allItems : allItems.filter((item) => item.source === filter);

  return (
    <View>
      {/* Filter pills */}
      <View style={bkStyles.filterRow}>
        {(['all', 'x', 'mymind'] as const).map((f) => (
          <Pressable
            key={f}
            style={[bkStyles.pill, filter === f && bkStyles.pillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[bkStyles.pillText, filter === f && bkStyles.pillTextActive]}>
              {f === 'all' ? 'All' : f === 'x' ? '\u{1D54F} Posts' : 'MyMind'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={bkStyles.countText}>{allItems.length} saved items</Text>

      {filtered.length === 0 ? (
        <EmptyState icon="All caught up!" title="No bookmarks" subtitle="Your saved articles will appear here" />
      ) : (
        filtered.map((item) => (
          <Card key={item.id} style={bkStyles.feedCard}>
            <View style={bkStyles.cardHeader}>
              <View style={bkStyles.authorRow}>
                <SourceIcon source={item.source} />
                <Text style={bkStyles.authorText}>{item.author || 'mymind'}</Text>
              </View>
              <Text style={bkStyles.timeText}>{item.time}</Text>
            </View>
            <Text style={bkStyles.cardTitle}>{item.title}</Text>
            {item.note && <Text style={bkStyles.noteText}>{item.note}</Text>}
            <View style={bkStyles.tagRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={bkStyles.tag}>
                  <Text style={bkStyles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <View style={bkStyles.actionBar}>
              <Pressable onPress={() => item.url && Linking.openURL(item.url)}>
                <Text style={bkStyles.actionRead}>Read</Text>
              </Pressable>
              <Pressable onPress={() => setDismissed((prev) => new Set(prev).add(item.id))}>
                <Text style={bkStyles.actionMuted}>Dismiss</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}
    </View>
  );
}

const bkStyles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  pill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 },
  pillActive: { backgroundColor: colors.text },
  pillText: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  pillTextActive: { color: '#ffffff' },
  countText: { fontSize: 12, color: colors.textLight, marginBottom: 12 },
  feedCard: { marginBottom: 8, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },
  authorText: { fontSize: 12, fontWeight: '600', color: colors.text },
  timeText: { fontSize: 10, color: colors.textLight },
  cardTitle: { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 8 },
  noteText: { fontSize: 11, color: colors.textLight, fontStyle: 'italic', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.hover, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '500', color: colors.textLight },
  actionBar: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRead: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  actionMuted: { fontSize: 11, color: colors.textLight },
});

// ==================== BOOKS / KNOWLEDGE ====================

function KnowledgeView() {
  const [wisdom, setWisdom] = useState<DailyWisdom | null>(null);
  const [allPrinciples, setAllPrinciples] = useState<BookPrinciple[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
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
    return <EmptyState icon="Unable to load" title="No wisdom today" subtitle="Pull to refresh" />;
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
          icon="No principles"
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.accent + '10',
    borderRadius: 8,
  },
  actionPromptText: { fontSize: 13, color: colors.accent, flex: 1, lineHeight: 20, fontWeight: '500' },
  quoteCard: { marginBottom: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.accent },
  quoteText: { fontSize: 15, color: colors.text, fontStyle: 'italic', lineHeight: 24 },
  quoteSource: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  domainScroll: { marginBottom: 12 },
  domainRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  domainPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

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
        {activeTab === 'knowledge' ? <KnowledgeView /> : <BookmarksView />}
        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.sidebar,
    gap: 6,
  },
  tabBtnActive: { backgroundColor: colors.dark },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  tabBtnTextActive: { color: colors.darkText },
});
