/**
 * SmartScanModal
 *
 * Universal camera → AI classify → confirm flow.
 * Opens camera automatically on mount, sends the photo to /api/vision/classify,
 * then shows an editable confirmation sheet for whichever section was detected
 * (nutrition / budget / fitness). On confirm, saves to the right API.
 *
 * Triggered by double-pressing volume-down (Android) via useVolumeShortcut.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { colors } from '../theme/colors'
import { nutritionApi, budgetApi, fitnessApi } from '../api/client'
import { API_BASE } from '../api/config'
import type { BudgetCategory, FitnessEntryType } from '../types'

// ==================== TYPES ====================

type Section = 'nutrition' | 'budget' | 'fitness'

interface ClassifyResult {
  section: Section
  confidence: 'high' | 'medium' | 'low'
  emoji: string
  data: Record<string, unknown>
}

const BUDGET_CATEGORIES: BudgetCategory[] = ['Food', 'Fun', 'Transport', 'Subscriptions', 'Other']
const FITNESS_TYPES: { key: FitnessEntryType; label: string }[] = [
  { key: 'run',      label: 'Run'   },
  { key: 'swim',     label: 'Swim'  },
  { key: 'cycle',    label: 'Cycle' },
  { key: 'steps',    label: 'Steps' },
  { key: 'jiujitsu', label: 'BJJ'   },
]

// ==================== PROPS ====================

interface Props {
  visible: boolean
  onClose: () => void
}

// ==================== COMPONENT ====================

export function SmartScanModal({ visible, onClose }: Props) {
  type State = 'idle' | 'scanning' | 'result' | 'saving'
  const [scanState, setScanState] = useState<State>('idle')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Prevent double camera launch if modal re-renders while open
  const launched = useRef(false)

  // ── Nutrition fields ─────────────────────────────────────────────────
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein,  setProtein]  = useState('')
  const [carbs,    setCarbs]    = useState('')
  const [fat,      setFat]      = useState('')

  // ── Budget fields ────────────────────────────────────────────────────
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState<BudgetCategory>('Food')

  // ── Fitness fields ───────────────────────────────────────────────────
  const [fitnessType, setFitnessType] = useState<FitnessEntryType>('run')
  const [distance,    setDistance]    = useState('')
  const [duration,    setDuration]    = useState('')
  const [fitCal,      setFitCal]      = useState('')
  const [steps,       setSteps]       = useState('')

  // Populate fields when classification result arrives
  useEffect(() => {
    if (!result) return
    const d = result.data

    if (result.section === 'nutrition') {
      setFoodName(String(d.name  ?? ''))
      setCalories(String(d.calories ?? ''))
      setProtein( String(d.protein  ?? ''))
      setCarbs(   String(d.carbs    ?? ''))
      setFat(     String(d.fat      ?? ''))
    } else if (result.section === 'budget') {
      setAmount(     String(d.amount      ?? ''))
      setDescription(String(d.description ?? ''))
      setCategory((d.category as BudgetCategory) || 'Food')
    } else if (result.section === 'fitness') {
      setFitnessType((d.type as FitnessEntryType) || 'run')
      setDistance(String(d.distance ?? ''))
      setDuration(String(d.duration ?? ''))
      setFitCal(  String(d.calories ?? ''))
      setSteps(   String(d.steps    ?? ''))
    }
  }, [result])

  // Auto-launch camera when modal becomes visible
  useEffect(() => {
    if (visible && !launched.current) {
      launched.current = true
      launchCamera()
    }
    if (!visible) {
      // Reset all state when modal closes
      launched.current = false
      setScanState('idle')
      setPhotoUri(null)
      setResult(null)
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const launchCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Allow camera access in Settings to use Smart Scan.',
      )
      onClose()
      return
    }

    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    })

    if (picked.canceled || !picked.assets?.[0]?.base64) {
      onClose()
      return
    }

    const asset = picked.assets[0]
    setPhotoUri(asset.uri)
    setScanState('scanning')

    try {
      const res = await fetch(`${API_BASE}/api/vision/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: asset.base64,
          mimeType: asset.mimeType || 'image/jpeg',
        }),
      })

      if (!res.ok) throw new Error(`classify ${res.status}`)

      const json = await res.json()
      if (!json.result) throw new Error('No result')

      setResult(json.result)
      setScanState('result')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      setError('Could not analyze the photo. Check your connection and try again.')
      setScanState('result')
    }
  }, [onClose])

  const handleConfirm = useCallback(async () => {
    if (!result) return
    setScanState('saving')

    try {
      const today = new Date().toISOString().split('T')[0]
      const time  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

      if (result.section === 'nutrition') {
        await nutritionApi.addEntry(today, {
          id:       `${Date.now()}-scan`,
          name:     foodName || 'Unknown food',
          calories: Number(calories) || 0,
          protein:  Number(protein)  || 0,
          carbs:    Number(carbs)    || 0,
          fat:      Number(fat)      || 0,
          time,
          date:     today,
          photoUrl: photoUri ?? undefined,
        })

      } else if (result.section === 'budget') {
        await budgetApi.addEntry({
          amount:      Number(amount) || 0,
          category,
          description: description || 'Scanned expense',
          date:        today,
        })

      } else if (result.section === 'fitness') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry: any = { type: fitnessType, date: today }
        if (fitnessType === 'steps') {
          if (steps) entry.steps = Number(steps)
        } else {
          if (distance) entry.distance = Number(distance)
          if (duration) entry.duration = Number(duration)
          if (fitCal)   entry.calories = Number(fitCal)
        }
        await fitnessApi.addEntry(entry)
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onClose()
    } catch {
      Alert.alert('Save failed', 'Could not save the entry. Please try again.')
      setScanState('result')
    }
  }, [result, foodName, calories, protein, carbs, fat, amount, description, category,
      fitnessType, distance, duration, fitCal, steps, photoUri, onClose])

  // ── Derived display values ───────────────────────────────────────────
  const sectionLabel =
    result?.section === 'nutrition' ? 'Food Detected'
    : result?.section === 'budget'  ? 'Expense Detected'
    : result?.section === 'fitness' ? 'Activity Detected'
    : 'Analyzing...'

  const sectionEmoji = result?.emoji
    || (result?.section === 'nutrition' ? '🍽️'
        : result?.section === 'budget'  ? '💳'
        : '🏃')

  const confidenceColor =
    result?.confidence === 'high'   ? colors.success
    : result?.confidence === 'medium' ? colors.warning
    : colors.error

  // ==================== RENDER ====================

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={s.backdrop} onPress={onClose} />

        <View style={s.sheet}>
          {/* Drag handle */}
          <View style={s.handle} />

          {/* Photo preview */}
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.photo} resizeMode="cover" />
          ) : null}

          {/* ── Scanning state ── */}
          {scanState === 'scanning' && (
            <View style={s.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={s.loadingTitle}>Smart Scan analyzing…</Text>
              <Text style={s.loadingSubtitle}>Identifying what this is</Text>
            </View>
          )}

          {/* ── Error state ── */}
          {scanState === 'result' && error && (
            <View style={s.centerBox}>
              <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
              <Text style={s.errorText}>{error}</Text>
              <Pressable
                style={s.retryBtn}
                onPress={() => { setError(null); setPhotoUri(null); launchCamera() }}
              >
                <Text style={s.retryText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* ── Result form ── */}
          {scanState === 'result' && result && !error && (
            <ScrollView
              style={s.form}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Header row */}
              <View style={s.header}>
                <View style={s.headerLeft}>
                  <Text style={s.emoji}>{sectionEmoji}</Text>
                  <Text style={s.headerTitle}>{sectionLabel}</Text>
                </View>
                <View style={[s.badge, { backgroundColor: confidenceColor + '22' }]}>
                  <Text style={[s.badgeText, { color: confidenceColor }]}>
                    {result.confidence === 'high'   ? '✓ High'
                      : result.confidence === 'medium' ? '~ Medium'
                      : '? Low'}
                  </Text>
                </View>
              </View>

              {/* ── Nutrition fields ── */}
              {result.section === 'nutrition' && (
                <>
                  <Field label="Name" value={foodName} onChangeText={setFoodName} />
                  <View style={s.row}>
                    <Field label="Calories" value={calories} onChangeText={setCalories} numeric flex />
                    <Field label="Protein (g)" value={protein} onChangeText={setProtein} numeric flex />
                  </View>
                  <View style={s.row}>
                    <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} numeric flex />
                    <Field label="Fat (g)" value={fat} onChangeText={setFat} numeric flex />
                  </View>
                </>
              )}

              {/* ── Budget fields ── */}
              {result.section === 'budget' && (
                <>
                  <Field label="Amount (€)" value={amount} onChangeText={setAmount} numeric />
                  <Field label="Description" value={description} onChangeText={setDescription} />
                  <Text style={s.fieldLabel}>Category</Text>
                  <View style={s.pills}>
                    {BUDGET_CATEGORIES.map((c) => (
                      <Pressable
                        key={c}
                        style={[s.pill, category === c && s.pillActive]}
                        onPress={() => setCategory(c)}
                      >
                        <Text style={[s.pillText, category === c && s.pillTextActive]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              {/* ── Fitness fields ── */}
              {result.section === 'fitness' && (
                <>
                  <Text style={s.fieldLabel}>Activity</Text>
                  <View style={s.pills}>
                    {FITNESS_TYPES.map(({ key, label }) => (
                      <Pressable
                        key={key}
                        style={[s.pill, fitnessType === key && s.pillActive]}
                        onPress={() => setFitnessType(key)}
                      >
                        <Text style={[s.pillText, fitnessType === key && s.pillTextActive]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {fitnessType === 'steps' ? (
                    <Field label="Steps" value={steps} onChangeText={setSteps} numeric />
                  ) : fitnessType !== 'jiujitsu' ? (
                    <View style={s.row}>
                      <Field label="Distance (km)" value={distance} onChangeText={setDistance} numeric flex />
                      <Field label="Duration (min)" value={duration} onChangeText={setDuration} numeric flex />
                    </View>
                  ) : null}

                  {fitnessType !== 'steps' && (
                    <Field label="Calories burned" value={fitCal} onChangeText={setFitCal} numeric />
                  )}
                </>
              )}

              {/* Actions */}
              <View style={s.actions}>
                <Pressable style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.confirmBtn, scanState === 'saving' && s.confirmDisabled]}
                  onPress={handleConfirm}
                  disabled={scanState === 'saving'}
                >
                  {scanState === 'saving' ? (
                    <ActivityIndicator size="small" color={colors.darkText} />
                  ) : (
                    <Text style={s.confirmText}>Log It</Text>
                  )}
                </Pressable>
              </View>

              {/* Bottom breathing room */}
              <View style={{ height: 16 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ==================== FIELD HELPER ====================

function Field({
  label,
  value,
  onChangeText,
  numeric,
  flex,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  numeric?: boolean
  flex?: boolean
}) {
  return (
    <View style={[s.fieldWrap, flex && { flex: 1 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
      />
    </View>
  )
}

// ==================== STYLES ====================

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 2,
  },
  photo: {
    width: '100%',
    height: 170,
    backgroundColor: colors.sidebar,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
    gap: 12,
  },
  loadingTitle:    { fontSize: 16, fontWeight: '700', color: colors.text },
  loadingSubtitle: { fontSize: 13, color: colors.textLight },
  errorText: {
    fontSize: 14, color: colors.textLight,
    textAlign: 'center', lineHeight: 20,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24, paddingVertical: 11,
    backgroundColor: colors.accent, borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: colors.darkText },
  form: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
  },
  emoji: { fontSize: 22 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11, fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: colors.text,
  },
  row: { flexDirection: 'row', gap: 10 },
  pills: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText:       { fontSize: 13, fontWeight: '600', color: colors.textLight },
  pillTextActive: { color: colors.darkText },
  actions: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textLight },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 15, fontWeight: '700', color: colors.darkText },
})
