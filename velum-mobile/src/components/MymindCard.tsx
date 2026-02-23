import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { MymindItem, mymindApi, bookmarksApi } from '../api/client';

// Type-specific config
const TYPE_CONFIG: Record<
  MymindItem['type'],
  { icon: string; label: string; accentColor: string; iconName: keyof typeof Ionicons.glyphMap }
> = {
  bookmark: {
    icon: '🔖',
    label: 'Bookmark',
    accentColor: colors.accent,
    iconName: 'bookmark-outline',
  },
  note: {
    icon: '📝',
    label: 'Note',
    accentColor: colors.info,
    iconName: 'document-text-outline',
  },
  quote: {
    icon: '💬',
    label: 'Quote',
    accentColor: colors.purple,
    iconName: 'chatbubble-outline',
  },
  highlight: {
    icon: '✏️',
    label: 'Highlight',
    accentColor: colors.success,
    iconName: 'pencil-outline',
  },
  image: {
    icon: '🖼️',
    label: 'Image',
    accentColor: colors.fat,
    iconName: 'image-outline',
  },
};

interface Props {
  item: MymindItem;
  onDismiss: (mymindId: string) => void;
}

export function MymindCard({ item, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [yapping, setYapping] = useState(false);
  const [bullets, setBullets] = useState<string[]>([]);

  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.bookmark;
  const displayText = item.content || item.title;
  const isLong = displayText.length > 180;

  const handleYap = async () => {
    if (bullets.length > 0) {
      setBullets([]);
      return;
    }
    setYapping(true);
    try {
      const text = [item.title, item.content].filter(Boolean).join('\n\n');
      const author = item.source || item.type;
      const result = await bookmarksApi.yap(text, author);
      setBullets(result.bullets.length > 0 ? result.bullets : ['Could not summarise this one.']);
    } catch {
      setBullets(['Could not summarise this one.']);
    } finally {
      setYapping(false);
    }
  };

  const handleOpen = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <Card style={[styles.card, { borderLeftColor: config.accentColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: config.accentColor + '18' }]}>
          <Text style={styles.typeEmoji}>{config.icon}</Text>
          <Text style={[styles.typeLabel, { color: config.accentColor }]}>{config.label}</Text>
        </View>
        <View style={styles.headerActions}>
          {item.url ? (
            <Pressable onPress={handleOpen} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="open-outline" size={15} color={colors.textLight} />
            </Pressable>
          ) : null}
          <Pressable onPress={() => onDismiss(item.mymind_id)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="checkmark" size={15} color={colors.textLight} />
          </Pressable>
        </View>
      </View>

      {/* Cover image (bookmarks and images) */}
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Title */}
      {item.title ? (
        <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
          {item.title}
        </Text>
      ) : null}

      {/* Content text */}
      {item.content ? (
        item.type === 'quote' || item.type === 'highlight' ? (
          <View style={[styles.quoteBlock, { borderLeftColor: config.accentColor }]}>
            <Text
              style={[styles.quoteText, { color: config.accentColor }]}
              numberOfLines={expanded ? undefined : 4}
            >
              {item.content}
            </Text>
          </View>
        ) : (
          <Pressable onPress={() => isLong && setExpanded((e) => !e)}>
            <Text style={styles.bodyText} numberOfLines={expanded ? undefined : 4}>
              {item.content}
            </Text>
            {isLong && (
              <Text style={styles.expandHint}>{expanded ? 'show less' : 'show more'}</Text>
            )}
          </Pressable>
        )
      ) : null}

      {/* Source attribution */}
      {item.source ? (
        <Text style={styles.source}>— {item.source}</Text>
      ) : null}

      {/* Tags */}
      {item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.map((tag) => (
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

      {/* Yap button — only for text-rich items */}
      {(item.content || item.title) && (
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
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 14,
    borderLeftWidth: 3,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeEmoji: { fontSize: 11 },
  typeLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },

  // Cover image
  coverImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: colors.hover,
  },

  // Title
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },

  // Body text (notes, bookmarks)
  bodyText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  expandHint: { fontSize: 12, color: colors.accent, marginTop: 4 },

  // Quote / highlight block
  quoteBlock: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginVertical: 4,
  },
  quoteText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  // Source
  source: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },

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
  yapBtnOn: { borderColor: colors.accent, backgroundColor: colors.accent + '12' },
  yapIcon: { fontSize: 12 },
  yapLabel: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  yapLabelOn: { color: colors.accent },
});
