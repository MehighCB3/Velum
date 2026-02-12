import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { colors } from '../../src/theme/colors';
import { spanishApi } from '../../src/api/client';
import { SpanishCard, SpanishDeckStats } from '../../src/types';
import { Card, DarkCard, EmptyState } from '../../src/components/Card';

type ReviewResult = 'again' | 'hard' | 'good' | 'easy';
type TopTab = 'cards' | 'exercises' | 'speak';

// ==================== TTS HELPER ====================

function speak(text: string, slow = false) {
  Speech.stop();
  Speech.speak(text, {
    language: 'es-ES',
    rate: slow ? 0.6 : 0.85,
    pitch: 1.0,
  });
}

function SpeakerButton({ text, size = 22 }: { text: string; size?: number }) {
  const [speaking, setSpeaking] = useState(false);

  const handlePress = useCallback(() => {
    setSpeaking(true);
    Speech.stop();
    Speech.speak(text, {
      language: 'es-ES',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [text]);

  const handleLongPress = useCallback(() => {
    setSpeaking(true);
    Speech.stop();
    Speech.speak(text, {
      language: 'es-ES',
      rate: 0.55,
      pitch: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [text]);

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} hitSlop={10}>
      <Ionicons
        name={speaking ? 'volume-high' : 'volume-medium-outline'}
        size={size}
        color={speaking ? colors.accent : colors.textLight}
      />
    </Pressable>
  );
}

// ==================== EXERCISES ====================

interface Exercise {
  id: string;
  type: 'verb_conjugation' | 'cloze' | 'translation' | 'grammar' | 'writing';
  difficulty: string;
  content: Record<string, unknown>;
  answer_key: Record<string, unknown>;
  tags: string[];
}

function ExercisesView() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${__DEV__ ? 'http://localhost:3000' : 'https://velum-five.vercel.app'}/api/spanish/exercises`,
        );
        const data = await res.json();
        setExercises(data.exercises || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={exStyles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (exercises.length === 0) {
    return <EmptyState icon="📝" title="No exercises" subtitle="Exercises will appear here" />;
  }

  const ex = exercises[currentIdx];
  if (!ex) {
    return (
      <DarkCard style={exStyles.doneCard}>
        <Text style={exStyles.doneEmoji}>🎉</Text>
        <Text style={exStyles.doneTitle}>Session Complete!</Text>
        <Text style={exStyles.doneScore}>
          {score.correct} / {score.total} correct
        </Text>
        <Pressable
          style={exStyles.restartBtn}
          onPress={() => {
            setCurrentIdx(0);
            setScore({ correct: 0, total: 0 });
            setSubmitted(false);
            setUserAnswer('');
          }}
        >
          <Text style={exStyles.restartText}>Restart</Text>
        </Pressable>
      </DarkCard>
    );
  }

  const checkAnswer = () => {
    if (!userAnswer.trim()) return;
    setSubmitted(true);
    const key = ex.answer_key;
    const answer = userAnswer.trim().toLowerCase();
    let isCorrect = false;

    if (ex.type === 'grammar') {
      const correctIdx = key.correct as number;
      const options = (ex.content.options as string[]) || [];
      isCorrect = answer === options[correctIdx]?.toLowerCase();
    } else if (key.answers) {
      isCorrect = (key.answers as string[]).some(
        (a) => a.toLowerCase() === answer,
      );
    } else if (key.answer) {
      isCorrect = (key.answer as string).toLowerCase() === answer;
    }
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
  };

  const nextExercise = () => {
    setCurrentIdx((i) => i + 1);
    setUserAnswer('');
    setSubmitted(false);
  };

  const getPrompt = () => {
    const c = ex.content;
    switch (ex.type) {
      case 'verb_conjugation':
        return `Conjugate "${c.verb}" (${c.hint}) in ${c.tense}, ${c.pronoun}`;
      case 'cloze':
        return String(c.text || '');
      case 'translation':
        return String(c.sourceText || '');
      case 'grammar':
        return String(c.question || '');
      case 'writing':
        return String(c.prompt || '');
      default:
        return '';
    }
  };

  const getCorrectAnswer = () => {
    const key = ex.answer_key;
    if (ex.type === 'grammar') {
      const options = (ex.content.options as string[]) || [];
      return options[key.correct as number] || '';
    }
    if (key.answers) return (key.answers as string[]).join(' / ');
    return String(key.answer || '');
  };

  const typeLabels: Record<string, string> = {
    verb_conjugation: '🔤 Conjugation',
    cloze: '📝 Fill in the Blank',
    translation: '🌐 Translation',
    grammar: '📖 Grammar',
    writing: '✍️ Writing',
  };

  const prompt = getPrompt();

  return (
    <View>
      {/* Progress */}
      <View style={exStyles.progressRow}>
        <Text style={exStyles.progressText}>
          {currentIdx + 1} / {exercises.length}
        </Text>
        <Text style={exStyles.scoreText}>
          Score: {score.correct}/{score.total}
        </Text>
      </View>

      <Card style={exStyles.card}>
        <Text style={exStyles.typeLabel}>{typeLabels[ex.type] || ex.type}</Text>
        <View style={exStyles.promptRow}>
          <Text style={exStyles.prompt}>{prompt}</Text>
          {(ex.type === 'cloze' || ex.type === 'translation') && (
            <SpeakerButton text={prompt} size={20} />
          )}
        </View>

        {ex.content.hint ? (
          <Text style={exStyles.hint}>Hint: {String(ex.content.hint)}</Text>
        ) : null}

        {/* Grammar multiple choice */}
        {ex.type === 'grammar' && !submitted ? (
          <View style={exStyles.optionsContainer}>
            {((ex.content.options as string[]) || []).map((opt, i) => (
              <Pressable
                key={i}
                style={[
                  exStyles.optionBtn,
                  userAnswer === opt && exStyles.optionSelected,
                ]}
                onPress={() => setUserAnswer(opt)}
              >
                <Text
                  style={[
                    exStyles.optionText,
                    userAnswer === opt && exStyles.optionSelectedText,
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : !submitted ? (
          <TextInput
            style={exStyles.input}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type your answer..."
            placeholderTextColor={colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}

        {/* Result */}
        {submitted && (
          <View style={exStyles.result}>
            {userAnswer.trim().toLowerCase() === getCorrectAnswer().split(' / ')[0].toLowerCase() ? (
              <Text style={[exStyles.resultText, { color: colors.success }]}>✓ Correct!</Text>
            ) : (
              <>
                <Text style={[exStyles.resultText, { color: colors.error }]}>✗ Incorrect</Text>
                <Text style={exStyles.correctAnswer}>Correct: {getCorrectAnswer()}</Text>
              </>
            )}
            {ex.content.explanation ? (
              <Text style={exStyles.explanation}>{String(ex.content.explanation)}</Text>
            ) : null}
          </View>
        )}

        {/* Action button */}
        {!submitted ? (
          <Pressable
            style={[exStyles.submitBtn, !userAnswer.trim() && { opacity: 0.4 }]}
            onPress={checkAnswer}
            disabled={!userAnswer.trim()}
          >
            <Text style={exStyles.submitText}>Check</Text>
          </Pressable>
        ) : (
          <Pressable style={exStyles.nextBtn} onPress={nextExercise}>
            <Text style={exStyles.nextText}>Next →</Text>
          </Pressable>
        )}
      </Card>
    </View>
  );
}

const exStyles = StyleSheet.create({
  loading: { alignItems: 'center', paddingTop: 40 },
  doneCard: { alignItems: 'center', paddingVertical: 32 },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.darkText },
  doneScore: { fontSize: 16, color: colors.darkTextSecondary, marginTop: 8 },
  restartBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  restartText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: { fontSize: 13, color: colors.textLight },
  scoreText: { fontSize: 13, fontWeight: '600', color: colors.text },
  card: { padding: 20 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: colors.accent, marginBottom: 12 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  prompt: { fontSize: 17, fontWeight: '600', color: colors.text, flex: 1 },
  hint: { fontSize: 13, color: colors.textLight, marginBottom: 16, fontStyle: 'italic' },
  optionsContainer: { gap: 8, marginBottom: 16 },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
  optionText: { fontSize: 15, color: colors.text },
  optionSelectedText: { color: colors.accent, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.sidebar,
    marginBottom: 16,
  },
  result: { marginBottom: 16, paddingVertical: 12 },
  resultText: { fontSize: 18, fontWeight: '700' },
  correctAnswer: { fontSize: 15, color: colors.text, marginTop: 4 },
  explanation: { fontSize: 13, color: colors.textLight, marginTop: 8, fontStyle: 'italic' },
  submitBtn: {
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '700', color: colors.darkText },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// ==================== PRONUNCIATION PRACTICE ====================

const API_BASE = __DEV__
  ? 'http://localhost:3000'
  : 'https://velum-five.vercel.app';

function PronunciationView({ cards }: { cards: SpanishCard[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [playback, setPlayback] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{ transcription: string; match: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [sttAvailable, setSttAvailable] = useState<boolean | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const practiceCards = cards.filter((c) => c.status !== 'parked').slice(0, 20);
  const card = practiceCards[currentIdx];

  useEffect(() => {
    return () => {
      if (playback) playback.unloadAsync();
    };
  }, [playback]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setIsRecording(true);
      setResult(null);
      setRecordingUri(null);
    } catch (err) {
      console.warn('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (err) {
      console.warn('Failed to stop recording:', err);
      setRecording(null);
    }
  }, [recording]);

  const playRecording = useCallback(async () => {
    if (!recordingUri) return;
    try {
      if (playback) await playback.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setPlayback(sound);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      await sound.playAsync();
    } catch (err) {
      console.warn('Playback error:', err);
      setIsPlaying(false);
    }
  }, [recordingUri, playback]);

  const checkPronunciation = useCallback(async () => {
    if (!recordingUri || !card) return;
    setChecking(true);
    try {
      const response = await uploadAsync(
        `${API_BASE}/api/spanish/pronounce`,
        recordingUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'audio',
          mimeType: 'audio/m4a',
          parameters: { expected: card.spanish_word },
        },
      );
      const data = JSON.parse(response.body);
      if (data.error === 'not_configured') {
        setSttAvailable(false);
      } else {
        setSttAvailable(true);
        setResult({ transcription: data.transcription || '', match: data.match || false });
        setScore((s) => ({
          correct: s.correct + (data.match ? 1 : 0),
          total: s.total + 1,
        }));
      }
    } catch {
      setSttAvailable(false);
    } finally {
      setChecking(false);
    }
  }, [recordingUri, card]);

  const nextCard = useCallback(() => {
    setCurrentIdx((i) => (i + 1) % practiceCards.length);
    setResult(null);
    setRecordingUri(null);
  }, [practiceCards.length]);

  if (practiceCards.length === 0) {
    return <EmptyState icon="🎤" title="No cards to practice" subtitle="Add cards to your deck first" />;
  }

  if (!card) {
    return <EmptyState icon="🎤" title="No cards to practice" subtitle="Add cards to your deck first" />;
  }

  return (
    <View>
      <View style={spkStyles.progressRow}>
        <Text style={spkStyles.progressText}>
          {currentIdx + 1} / {practiceCards.length}
        </Text>
        <Text style={spkStyles.scoreText}>
          Score: {score.correct}/{score.total}
        </Text>
      </View>

      <Card style={spkStyles.card}>
        <Text style={spkStyles.label}>Say this word:</Text>
        <View style={spkStyles.wordRow}>
          <Text style={spkStyles.word}>{card.spanish_word}</Text>
          <SpeakerButton text={card.spanish_word} size={28} />
        </View>
        <Text style={spkStyles.translation}>{card.english_translation}</Text>

        {/* Record button */}
        <Pressable
          style={[spkStyles.recordBtn, isRecording && spkStyles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={32}
            color={isRecording ? '#fff' : colors.dark}
          />
          <Text style={[spkStyles.recordText, isRecording && { color: '#fff' }]}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </Pressable>

        {/* Playback + Check */}
        {recordingUri && !isRecording && (
          <View style={spkStyles.actionsRow}>
            <Pressable style={spkStyles.playBtn} onPress={playRecording}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.text} />
              <Text style={spkStyles.playText}>Play back</Text>
            </Pressable>
            {sttAvailable !== false && (
              <Pressable
                style={[spkStyles.checkBtn, checking && { opacity: 0.5 }]}
                onPress={checkPronunciation}
                disabled={checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color={colors.darkText} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={colors.darkText} />
                    <Text style={spkStyles.checkText}>Check</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* STT Result */}
        {result && (
          <View style={spkStyles.resultBox}>
            {result.match ? (
              <Text style={[spkStyles.resultText, { color: colors.success }]}>
                ✓ Correct! "{result.transcription}"
              </Text>
            ) : (
              <>
                <Text style={[spkStyles.resultText, { color: colors.error }]}>
                  ✗ Heard: "{result.transcription}"
                </Text>
                <Text style={spkStyles.expectedText}>Expected: {card.spanish_word}</Text>
              </>
            )}
          </View>
        )}

        {/* Self-assessment fallback */}
        {sttAvailable === false && recordingUri && !isRecording && (
          <View style={spkStyles.selfAssess}>
            <Text style={spkStyles.selfAssessLabel}>How did you do?</Text>
            <View style={spkStyles.selfAssessRow}>
              <Pressable
                style={[spkStyles.selfBtn, { backgroundColor: colors.error + '15' }]}
                onPress={() => {
                  setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
                  nextCard();
                }}
              >
                <Text style={[spkStyles.selfBtnText, { color: colors.error }]}>Try Again</Text>
              </Pressable>
              <Pressable
                style={[spkStyles.selfBtn, { backgroundColor: colors.success + '15' }]}
                onPress={() => {
                  setScore((s) => ({ correct: s.correct + 1, total: s.total + 1 }));
                  nextCard();
                }}
              >
                <Text style={[spkStyles.selfBtnText, { color: colors.success }]}>Got It</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Next button (shown after STT result) */}
        {result && (
          <Pressable style={spkStyles.nextBtn} onPress={nextCard}>
            <Text style={spkStyles.nextText}>Next →</Text>
          </Pressable>
        )}
      </Card>

      {/* Tip */}
      <View style={spkStyles.tip}>
        <Text style={spkStyles.tipText}>
          💡 Tap the speaker to hear the pronunciation, then record yourself saying it
        </Text>
      </View>
    </View>
  );
}

const spkStyles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: { fontSize: 13, color: colors.textLight },
  scoreText: { fontSize: 13, fontWeight: '600', color: colors.text },
  card: { padding: 24, alignItems: 'center' },
  label: { fontSize: 14, color: colors.textLight, marginBottom: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  word: { fontSize: 32, fontWeight: '800', color: colors.text },
  translation: { fontSize: 16, color: colors.textLight, marginBottom: 24 },
  recordBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.sidebar,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordBtnActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  recordText: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 4 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playText: { fontSize: 14, fontWeight: '600', color: colors.text },
  checkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.dark,
  },
  checkText: { fontSize: 14, fontWeight: '700', color: colors.darkText },
  resultBox: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.sidebar,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultText: { fontSize: 16, fontWeight: '700' },
  expectedText: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  selfAssess: { width: '100%', marginBottom: 16 },
  selfAssessLabel: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  selfAssessRow: { flexDirection: 'row', gap: 12 },
  selfBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  selfBtnText: { fontSize: 15, fontWeight: '700' },
  nextBtn: {
    width: '100%',
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  tip: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipText: { fontSize: 13, color: colors.textLight, textAlign: 'center' },
});

// ==================== MAIN SCREEN ====================

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
  const [activeTab, setActiveTab] = useState<TopTab>('cards');

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
        const currentIndex = cards.findIndex((c) => c.id === currentCard.id);
        const nextCard = cards[currentIndex + 1];
        if (nextCard) {
          setCurrentCard(nextCard);
          setShowAnswer(false);
        } else {
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

  // ==================== REVIEW MODE ====================
  if (mode === 'review') {
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
            <Pressable style={styles.flashcard} onPress={() => setShowAnswer(true)}>
              <View style={styles.wordRow}>
                <Text style={styles.flashcardWord}>{currentCard.spanish_word}</Text>
                <SpeakerButton text={currentCard.spanish_word} size={26} />
              </View>
              <Text style={styles.flashcardType}>{currentCard.word_type}</Text>

              {showAnswer ? (
                <View style={styles.answerSection}>
                  <View style={styles.divider} />
                  <Text style={styles.flashcardTranslation}>
                    {currentCard.english_translation}
                  </Text>
                  {currentCard.example_sentence_spanish && (
                    <View style={styles.exampleContainer}>
                      <View style={styles.exampleRow}>
                        <Text style={styles.exampleSpanish}>
                          {currentCard.example_sentence_spanish}
                        </Text>
                        <SpeakerButton text={currentCard.example_sentence_spanish} size={18} />
                      </View>
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

  // ==================== DECK / EXERCISES MODE ====================
  return (
    <View style={styles.container}>
      {/* Top tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'cards' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cards')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'cards' && styles.tabBtnTextActive]}>
            Cards
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'exercises' && styles.tabBtnActive]}
          onPress={() => setActiveTab('exercises')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'exercises' && styles.tabBtnTextActive]}>
            Exercises
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'speak' && styles.tabBtnActive]}
          onPress={() => setActiveTab('speak')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'speak' && styles.tabBtnTextActive]}>
            Speak
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCards} tintColor={colors.accent} />
        }
      >
        {activeTab === 'cards' ? (
          <>
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
                  <Text style={[styles.deckStatValue, { color: colors.warning }]}>{stats.learning}</Text>
                  <Text style={styles.deckStatLabel}>Learning</Text>
                </View>
                <View style={styles.deckStat}>
                  <Text style={[styles.deckStatValue, { color: colors.success }]}>{stats.review}</Text>
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

            {/* Start Review */}
            <Pressable style={styles.startButton} onPress={startReview}>
              <Ionicons name="flash" size={20} color={colors.darkText} />
              <Text style={styles.startButtonText}>Start Review Session</Text>
            </Pressable>

            {/* Recent Cards */}
            <Text style={styles.previewTitle}>Recent Cards</Text>
            {cards.slice(0, 8).map((card) => (
              <Card key={card.id} style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <View style={styles.previewLeft}>
                    <View style={styles.previewWordRow}>
                      <Text style={styles.previewSpanish}>{card.spanish_word}</Text>
                      <SpeakerButton text={card.spanish_word} size={18} />
                    </View>
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
          </>
        ) : activeTab === 'exercises' ? (
          <ExercisesView />
        ) : (
          <PronunciationView cards={cards} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sidebar },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Top tabs
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
  previewTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  previewCard: { marginBottom: 8 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLeft: {},
  previewWordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  tapHint: { fontSize: 14, color: colors.textLight, marginTop: 24 },
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
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
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
