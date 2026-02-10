import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { spanishApi } from '../../src/api/client';
import { SpanishCard, SpanishDeckStats } from '../../src/types';
import { Card, DarkCard, EmptyState } from '../../src/components/Card';

type ReviewResult = 'again' | 'hard' | 'good' | 'easy';

export default function LearnScreen() {
  const [cards, setCards] = useState<SpanishCard[]>([]);
  const [stats, setStats] = useState<SpanishDeckStats>({
    total: 0,
    new: 0,
    learning: 0,
    review: 0,
    dueToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<SpanishCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedToday, setReviewedToday] = useState(0);
  const [mode, setMode] = useState<'deck' | 'review'>('deck');

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await spanishApi.getCards();
      setCards(data.cards || []);
      setStats({
        total: data.stats?.total || data.cards?.length || 0,
        new: data.stats?.new || 0,
        learning: data.stats?.learning || 0,
        review: data.stats?.review || 0,
        dueToday: data.stats?.dueToday || 0,
      });
    } catch (err) {
      console.warn('Failed to load Spanish cards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const startReview = useCallback(async () => {
    try {
      const data = await spanishApi.getDueCards();
      if (data.cards && data.cards.length > 0) {
        setCards(data.cards);
        setCurrentCard(data.cards[0]);
        setShowAnswer(false);
        setMode('review');
      }
    } catch (err) {
      console.warn('Failed to load due cards:', err);
    }
  }, []);

  const handleReview = useCallback(
    async (result: ReviewResult) => {
      if (!currentCard) return;

      try {
        await spanishApi.reviewCard(currentCard.id, result);
        setReviewedToday((n) => n + 1);

        // Move to next card
        const currentIndex = cards.findIndex((c) => c.id === currentCard.id);
        const nextCard = cards[currentIndex + 1];

        if (nextCard) {
          setCurrentCard(nextCard);
          setShowAnswer(false);
        } else {
          // Done with session
          setMode('deck');
          setCurrentCard(null);
          fetchCards();
        }
      } catch (err) {
        console.warn('Review failed:', err);
      }
    },
    [currentCard, cards, fetchCards],
  );

  // Deck overview mode
  if (mode === 'deck') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchCards} tintColor={colors.accent} />
          }
        >
          {/* Deck Header */}
          <DarkCard style={styles.deckHero}>
            <Text style={styles.deckFlag}>🇪🇸</Text>
            <Text style={styles.deckTitle}>Spanish Vocabulary</Text>
            <Text style={styles.deckLevel}>A2 / B1 Level</Text>

            <View style={styles.deckStatsRow}>
              <View style={styles.deckStat}>
                <Text style={styles.deckStatValue}>{stats.total}</Text>
                <Text style={styles.deckStatLabel}>Total</Text>
              </View>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.info }]}>{stats.new}</Text>
                <Text style={styles.deckStatLabel}>New</Text>
              </View>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.warning }]}>
                  {stats.learning}
                </Text>
                <Text style={styles.deckStatLabel}>Learning</Text>
              </View>
              <View style={styles.deckStat}>
                <Text style={[styles.deckStatValue, { color: colors.success }]}>
                  {stats.review}
                </Text>
                <Text style={styles.deckStatLabel}>Review</Text>
              </View>
            </View>
          </DarkCard>

          {/* Today's Progress */}
          <Card style={styles.todayCard}>
            <View style={styles.todayRow}>
              <View>
                <Text style={styles.todayTitle}>Today's Progress</Text>
                <Text style={styles.todayCount}>
                  {reviewedToday} card{reviewedToday !== 1 ? 's' : ''} reviewed
                </Text>
              </View>
              <View style={styles.dueBadge}>
                <Text style={styles.dueText}>{stats.dueToday} due</Text>
              </View>
            </View>
          </Card>

          {/* Start Review Button */}
          <Pressable style={styles.startButton} onPress={startReview}>
            <Ionicons name="flash" size={20} color={colors.darkText} />
            <Text style={styles.startButtonText}>Start Review Session</Text>
          </Pressable>

          {/* Recent Cards Preview */}
          <Text style={styles.previewTitle}>Recent Cards</Text>
          {cards.slice(0, 8).map((card) => (
            <Card key={card.id} style={styles.previewCard}>
              <View style={styles.previewRow}>
                <View style={styles.previewLeft}>
                  <Text style={styles.previewSpanish}>{card.spanish_word}</Text>
                  <Text style={styles.previewEnglish}>{card.english_translation}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        card.status === 'review'
                          ? colors.success + '20'
                          : card.status === 'learning'
                          ? colors.warning + '20'
                          : colors.info + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          card.status === 'review'
                            ? colors.success
                            : card.status === 'learning'
                            ? colors.warning
                            : colors.info,
                      },
                    ]}
                  >
                    {card.status}
                  </Text>
                </View>
              </View>
            </Card>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // Review mode
  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.reviewProgress}>
        <View style={styles.reviewProgressBar}>
          <View
            style={[
              styles.reviewProgressFill,
              {
                width: `${
                  cards.length > 0
                    ? ((cards.findIndex((c) => c.id === currentCard?.id) + 1) / cards.length) * 100
                    : 0
                }%`,
              },
            ]}
          />
        </View>
        <Pressable onPress={() => setMode('deck')} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.textLight} />
        </Pressable>
      </View>

      {currentCard ? (
        <View style={styles.reviewContainer}>
          {/* Card */}
          <Pressable
            style={styles.flashcard}
            onPress={() => setShowAnswer(true)}
          >
            <Text style={styles.flashcardWord}>{currentCard.spanish_word}</Text>
            <Text style={styles.flashcardType}>{currentCard.word_type}</Text>

            {showAnswer ? (
              <View style={styles.answerSection}>
                <View style={styles.divider} />
                <Text style={styles.flashcardTranslation}>
                  {currentCard.english_translation}
                </Text>
                {currentCard.example_sentence_spanish && (
                  <View style={styles.exampleContainer}>
                    <Text style={styles.exampleSpanish}>
                      {currentCard.example_sentence_spanish}
                    </Text>
                    <Text style={styles.exampleEnglish}>
                      {currentCard.example_sentence_english}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.tapHint}>Tap to reveal answer</Text>
            )}
          </Pressable>

          {/* Review Buttons */}
          {showAnswer && (
            <View style={styles.reviewButtons}>
              <Pressable
                style={[styles.reviewBtn, { backgroundColor: colors.error + '15' }]}
                onPress={() => handleReview('again')}
              >
                <Text style={[styles.reviewBtnText, { color: colors.error }]}>Again</Text>
              </Pressable>
              <Pressable
                style={[styles.reviewBtn, { backgroundColor: colors.warning + '15' }]}
                onPress={() => handleReview('hard')}
              >
                <Text style={[styles.reviewBtnText, { color: colors.warning }]}>Hard</Text>
              </Pressable>
              <Pressable
                style={[styles.reviewBtn, { backgroundColor: colors.success + '15' }]}
                onPress={() => handleReview('good')}
              >
                <Text style={[styles.reviewBtnText, { color: colors.success }]}>Good</Text>
              </Pressable>
              <Pressable
                style={[styles.reviewBtn, { backgroundColor: colors.accent + '15' }]}
                onPress={() => handleReview('easy')}
              >
                <Text style={[styles.reviewBtnText, { color: colors.accent }]}>Easy</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        <EmptyState icon="🎉" title="All done!" subtitle="No more cards to review" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Deck mode
  deckHero: { marginBottom: 12, alignItems: 'center', paddingVertical: 24 },
  deckFlag: { fontSize: 40, marginBottom: 8 },
  deckTitle: { fontSize: 22, fontWeight: '800', color: colors.darkText },
  deckLevel: { fontSize: 14, color: colors.darkTextSecondary, marginTop: 4 },
  deckStatsRow: { flexDirection: 'row', marginTop: 20, gap: 24 },
  deckStat: { alignItems: 'center' },
  deckStatValue: { fontSize: 22, fontWeight: '700', color: colors.darkText },
  deckStatLabel: { fontSize: 11, color: colors.darkTextSecondary, marginTop: 2 },
  todayCard: { marginBottom: 12 },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  todayCount: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  dueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warning + '20',
  },
  dueText: { fontSize: 13, fontWeight: '600', color: colors.warning },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  startButtonText: { fontSize: 16, fontWeight: '700', color: colors.darkText },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  previewCard: { marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLeft: {},
  previewSpanish: { fontSize: 15, fontWeight: '600', color: colors.text },
  previewEnglish: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Review mode
  reviewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  reviewProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  reviewProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  reviewContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  flashcard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  flashcardWord: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  flashcardType: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 24,
  },
  answerSection: { alignItems: 'center', width: '100%' },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '80%',
    marginVertical: 20,
  },
  flashcardTranslation: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
  },
  exampleContainer: { marginTop: 16 },
  exampleSpanish: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  exampleEnglish: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
  },
  reviewBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewBtnText: { fontSize: 15, fontWeight: '700' },
});
