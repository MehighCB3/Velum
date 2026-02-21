import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { colors } from '../../src/theme/colors';
import { Card } from '../../src/components/Card';

type FeedSource = 'x' | 'mymind';
type FilterTab = 'all' | 'x' | 'mymind';

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

// Placeholder feed — will be replaced with real API data
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
    title: 'Minimal dashboard inspiration — dark mode wellness tracker',
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
      <View style={[styles.sourceIcon, { backgroundColor: '#1a1a1a' }]}>
        <Text style={styles.sourceIconText}>𝕏</Text>
      </View>
    );
  }
  return (
    <View style={[styles.sourceIcon, { backgroundColor: '#c44dff' }]}>
      <Text style={[styles.sourceIconText, { fontSize: 10 }]}>m</Text>
    </View>
  );
}

function PillFilter({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FeedScreen() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allItems = MOCK_FEED.filter((item) => !dismissed.has(item.id));
  const filtered =
    tab === 'all'
      ? allItems
      : allItems.filter((item) => item.source === tab);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>{allItems.length} unread items</Text>

        <View style={styles.filterRow}>
          <PillFilter label="All" active={tab === 'all'} onPress={() => setTab('all')} />
          <PillFilter label="𝕏 Posts" active={tab === 'x'} onPress={() => setTab('x')} />
          <PillFilter label="MyMind" active={tab === 'mymind'} onPress={() => setTab('mymind')} />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>All caught up!</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} style={styles.feedCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.authorRow}>
                  <SourceIcon source={item.source} />
                  <Text style={styles.authorText}>
                    {item.author || 'mymind'}
                  </Text>
                </View>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>

              {/* Content */}
              <Text style={styles.cardTitle}>{item.title}</Text>

              {/* Source note (MyMind) */}
              {item.note && (
                <Text style={styles.noteText}>{item.note}</Text>
              )}

              {/* Tags */}
              <View style={styles.tagRow}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.actionBar}>
                <Pressable
                  onPress={() => {
                    if (item.url) Linking.openURL(item.url);
                  }}
                >
                  <Text style={styles.actionRead}>Read</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.actionMuted}>Save</Text>
                </Pressable>
                <Pressable onPress={() => handleDismiss(item.id)}>
                  <Text style={styles.actionMuted}>Dismiss</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 12, color: colors.textLight, marginBottom: 16 },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 2,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  pillActive: { backgroundColor: colors.text },
  pillText: { fontSize: 11, fontWeight: '600', color: colors.textLight },
  pillTextActive: { color: '#ffffff' },
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
  cardTitle: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: colors.hover,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { fontSize: 10, fontWeight: '500', color: colors.darkTextMuted },
  actionBar: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  actionRead: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  actionMuted: { fontSize: 11, color: colors.textLight },
  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.textLight },
});
