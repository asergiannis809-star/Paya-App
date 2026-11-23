import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Timestamp } from 'firebase/firestore'
import { DateField, FieldLabel, Select } from './FormControls'
import {
  CATEGORIES,
  CURRENCIES,
  CYCLES,
  PAYMENT_METHODS,
  REMINDER_OPTIONS,
  startOfDay,
} from '../utils/subscriptions'
import { confirmAsync, firestoreErrorMessage } from '../utils/feedback'
import useUserSettings from '../hooks/useUserSettings'
import { useT } from '../context/LanguageContext'
import { categoryLabel, paymentMethodLabel } from '../i18n'
import { makeStyles, useTheme } from '../context/ThemeContext'

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} ${c.symbol.trim()}`,
}))

/**
 * Add/edit subscription form.
 * - `initial`: existing values (edit mode) — dates as JS Dates.
 * - `onSubmit(data)`: saves the Firestore payload; should throw on failure.
 * - `onDelete()`: optional; shows a Delete button when given.
 */
export default function SubscriptionForm({
  title,
  subtitle,
  submitLabel,
  initial = {},
  onSubmit,
  onDelete,
}) {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t } = useT()
  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))
  const paymentMethodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: paymentMethodLabel(m) }))
  const [name, setName] = useState(initial.name ?? '')
  const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '')
  const [currency, setCurrency] = useState(initial.currency ?? 'EUR')
  // New subscriptions start in the user's default currency (Settings), once it has loaded,
  // unless they've already picked one.
  const { settings, loaded: settingsLoaded } = useUserSettings()
  const currencyTouched = useRef(initial.currency != null)
  useEffect(() => {
    if (settingsLoaded && !currencyTouched.current) setCurrency(settings.defaultCurrency)
  }, [settingsLoaded, settings.defaultCurrency])
  const [cycle, setCycle] = useState(initial.cycle ?? 'monthly')
  const [customDays, setCustomDays] = useState(String(initial.customDays ?? 30))
  const [firstPayment, setFirstPayment] = useState(initial.firstPaymentDate ?? startOfDay(new Date()))
  const [category, setCategory] = useState(initial.category ?? null)
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod ?? null)
  const [trialEndsAt, setTrialEndsAt] = useState(initial.trialEndsAt ?? null)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [remind, setRemind] = useState(initial.reminder?.enabled ?? true)
  const [reminderDays, setReminderDays] = useState(initial.reminder?.daysBefore ?? 3)

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null) // null | 'saving' | 'deleting'

  const handleSave = async () => {
    setError('')
    const parsedPrice = parseFloat(price.replace(',', '.'))
    const parsedDays = parseInt(customDays, 10)

    if (!name.trim()) return setError(t('form.errors.name'))
    if (!(parsedPrice > 0)) return setError(t('form.errors.price'))
    if (cycle === 'custom' && !(parsedDays > 0)) return setError(t('form.errors.days'))
    if (!firstPayment) return setError(t('form.errors.firstPayment'))
    if (!category) return setError(t('form.errors.category'))

    setBusy('saving')
    try {
      await onSubmit({
        name: name.trim(),
        price: Math.round(parsedPrice * 100) / 100,
        currency,
        cycle,
        customDays: cycle === 'custom' ? parsedDays : null,
        firstPaymentDate: Timestamp.fromDate(startOfDay(firstPayment)),
        category,
        paymentMethod: paymentMethod ?? null,
        trialEndsAt: trialEndsAt ? Timestamp.fromDate(startOfDay(trialEndsAt)) : null,
        notes: notes.trim(),
        reminder: { enabled: remind, daysBefore: remind ? reminderDays : null },
      })
      router.back()
    } catch (err) {
      console.warn('Failed to save subscription', err?.code, err?.message)
      setError(firestoreErrorMessage(err, 'save'))
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    const ok = await confirmAsync(
      t('subscriptions.deleteTitle'),
      t('subscriptions.deleteMessage', { name: name.trim() || t('form.thisSubscription') })
    )
    if (!ok) return
    setError('')
    setBusy('deleting')
    try {
      await onDelete()
      router.back()
    } catch (err) {
      console.warn('Failed to delete subscription', err?.code, err?.message)
      setError(firestoreErrorMessage(err, 'delete'))
      setBusy(null)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              accessibilityLabel={t('common.goBack')}
            >
              <View style={styles.backArrow} />
            </Pressable>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Name */}
          <View style={styles.group}>
            <FieldLabel>{t('form.name')}</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder={t('form.namePlaceholder')}
              placeholderTextColor={colors.stone}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Price + currency */}
          <View style={[styles.group, styles.row]}>
            <View style={styles.priceCol}>
              <FieldLabel>{t('form.price')}</FieldLabel>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.stone}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.currencyCol}>
              <FieldLabel>{t('form.currency')}</FieldLabel>
              <Select
                title={t('form.currency')}
                value={currency}
                options={CURRENCY_OPTIONS}
                onChange={(c) => {
                  currencyTouched.current = true
                  setCurrency(c)
                }}
                compact
              />
            </View>
          </View>

          {/* Billing cycle */}
          <View style={styles.group}>
            <FieldLabel>{t('form.billingCycle')}</FieldLabel>
            <View style={styles.segment}>
              {CYCLES.map((c) => {
                const active = c.key === cycle
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCycle(c.key)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {t(`cycles.${c.key}`)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {cycle === 'custom' && (
              <View style={styles.customRow}>
                <Text style={styles.customText}>{t('form.every')}</Text>
                <TextInput
                  style={[styles.input, styles.customInput]}
                  value={customDays}
                  onChangeText={setCustomDays}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.customText}>{t('form.days')}</Text>
              </View>
            )}
          </View>

          {/* First payment date */}
          <View style={styles.group}>
            <FieldLabel>{t('form.firstPayment')}</FieldLabel>
            <DateField
              title={t('form.firstPayment')}
              value={firstPayment}
              onChange={(d) => d && setFirstPayment(d)}
            />
          </View>

          {/* Category */}
          <View style={styles.group}>
            <FieldLabel>{t('form.category')}</FieldLabel>
            <Select
              title={t('form.category')}
              value={category}
              options={categoryOptions}
              placeholder={t('form.categoryPlaceholder')}
              onChange={setCategory}
            />
          </View>

          {/* Payment method */}
          <View style={styles.group}>
            <FieldLabel optional>{t('form.paymentMethod')}</FieldLabel>
            <Select
              title={t('form.paymentMethod')}
              value={paymentMethod}
              options={paymentMethodOptions}
              placeholder={t('form.paymentMethodPlaceholder')}
              onChange={setPaymentMethod}
              clearable
            />
          </View>

          {/* Free trial */}
          <View style={styles.group}>
            <FieldLabel optional>{t('form.trialEnds')}</FieldLabel>
            <DateField
              title={t('form.trialEnds')}
              value={trialEndsAt}
              onChange={setTrialEndsAt}
              placeholder={t('form.notSet')}
              clearable
            />
          </View>

          {/* Notes */}
          <View style={styles.group}>
            <FieldLabel optional>{t('form.notes')}</FieldLabel>
            <TextInput
              style={[styles.input, styles.notes]}
              placeholder={t('form.notesPlaceholder')}
              placeholderTextColor={colors.stone}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Reminder */}
          <View style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <View style={styles.flex}>
                <Text style={styles.reminderTitle}>{t('form.remindMe')}</Text>
                <Text style={styles.reminderSub}>{t('form.remindSub')}</Text>
              </View>
              <Switch
                value={remind}
                onValueChange={setRemind}
                trackColor={{ false: colors.border, true: colors.ink }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.border}
              />
            </View>
            <View style={[styles.chips, !remind && styles.disabled]}>
              {REMINDER_OPTIONS.map((o) => {
                const active = remind && o.days === reminderDays
                return (
                  <Pressable
                    key={o.days}
                    disabled={!remind}
                    onPress={() => setReminderDays(o.days)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(`reminders.${o.days}`)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={handleSave}
            disabled={!!busy}
            style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}
          >
            {busy === 'saving' ? (
              <ActivityIndicator color={colors.ivory} />
            ) : (
              <Text style={styles.buttonText}>{submitLabel}</Text>
            )}
          </Pressable>

          {onDelete ? (
            <Pressable
              onPress={handleDelete}
              disabled={!!busy}
              style={({ pressed }) => [styles.deleteButton, (pressed || busy) && styles.pressed]}
            >
              {busy === 'deleting' ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.deleteText}>{t('form.deleteButton')}</Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.footnote}>{t('form.footnote')}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.7,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 28,
    height: 32,
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: c.ink,
    transform: [{ rotate: '45deg' }],
    marginLeft: 4,
  },
  title: {
    color: c.ink,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: c.stone,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },

  // Fields
  group: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  priceCol: {
    flex: 1.4,
  },
  currencyCol: {
    flex: 1,
  },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    color: c.ink,
  },
  notes: {
    height: 96,
    paddingTop: 14,
  },

  // Billing cycle segment
  segment: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: c.ink,
  },
  segmentText: {
    color: c.stone,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: c.ivory,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  customText: {
    color: c.ink,
    fontSize: 15,
  },
  customInput: {
    width: 70,
    textAlign: 'center',
  },

  // Reminder card
  reminderCard: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    color: c.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  reminderSub: {
    color: c.stone,
    fontSize: 12,
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  disabled: {
    opacity: 0.4,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  chipText: {
    color: c.stone,
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: c.ivory,
    fontWeight: '700',
  },

  // Buttons
  error: {
    color: c.error,
    fontSize: 14,
    marginTop: 16,
  },
  button: {
    backgroundColor: c.ink,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: c.ivory,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  deleteText: {
    color: c.error,
    fontSize: 15,
    fontWeight: '700',
  },
  footnote: {
    color: c.stone,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
}))
