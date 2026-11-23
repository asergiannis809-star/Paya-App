import { createElement, useState } from 'react'
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { formatDate } from '../utils/subscriptions'
import { locale, t } from '../i18n'
import { makeStyles, useTheme } from '../context/ThemeContext'

/* ---------- Small icons drawn with Views (no icon library needed) ---------- */

export const ChevronDown = () => {
  const styles = useStyles()
  return (
    <View style={styles.chevron} />
  )
}

export const CalendarIcon = () => {
  const styles = useStyles()
  return (
    <View style={styles.calendar}>
      <View style={styles.calendarTop} />
      <View style={[styles.calendarRing, { left: 3 }]} />
      <View style={[styles.calendarRing, { right: 3 }]} />
    </View>
  )
}

/* ---------- Label ---------- */

export const FieldLabel = ({ children, optional }) => {
  const styles = useStyles()
  return (
    <Text style={styles.label}>
      {children}
      {optional && <Text style={styles.labelOptional}> {t('common.optional')}</Text>}
    </Text>
  )
}

/* ---------- Bottom sheet ---------- */

const Sheet = ({ visible, title, onClose, children }) => {
  const styles = useStyles()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        {children}
      </SafeAreaView>
    </Modal>
  )
}

/* ---------- Select (dropdown that opens a bottom sheet) ---------- */

export function Select({ value, options, placeholder, onChange, title, clearable, compact }) {
  const styles = useStyles()
  const [open, setOpen] = useState(false)
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const selected = items.find((o) => o.value === value)

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text
          style={[styles.fieldText, !selected && styles.placeholder, compact && styles.compactText]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown />
      </Pressable>

      <OptionSheet
        visible={open}
        title={title}
        options={items}
        value={value}
        clearable={clearable}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

/* ---------- Option sheet (bottom sheet with a list of choices) ---------- */

export function OptionSheet({ visible, title, options, value, onChange, onClose, clearable }) {
  const styles = useStyles()
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const choose = (v) => {
    onChange(v)
    onClose()
  }
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <ScrollView style={styles.sheetList}>
        {items.map((o) => {
          const active = o.value === value
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => choose(o.value)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</Text>
              {active && <Text style={styles.check}>✓</Text>}
            </Pressable>
          )
        })}
        {clearable && value != null && (
          <Pressable
            onPress={() => choose(null)}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text style={styles.clearText}>{t('common.clear')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </Sheet>
  )
}

/* ---------- Date field ---------- */

const toInputValue = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

export function DateField({ value, onChange, placeholder = t('common.selectDate'), title = t('common.selectDate'), clearable, minimumDate }) {
  const { colors, dark } = useTheme()
  const styles = useStyles()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value ?? new Date())

  // Web: use the browser's own date input.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        {createElement('input', {
          type: 'date',
          value: toInputValue(value),
          min: minimumDate ? toInputValue(minimumDate) : undefined,
          onChange: (e) => {
            const v = e.target.value
            onChange(v ? new Date(`${v}T00:00:00`) : null)
          },
          style: {
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 16,
            color: colors.ink,
            colorScheme: dark ? 'dark' : 'light',
            fontFamily: 'inherit',
          },
        })}
      </View>
    )
  }

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: 'date',
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date)
        },
      })
    } else {
      setDraft(value ?? new Date())
      setOpen(true)
    }
  }

  return (
    <>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Text style={[styles.fieldText, !value && styles.placeholder]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <CalendarIcon />
      </Pressable>

      {/* iOS: inline calendar in a bottom sheet */}
      {Platform.OS === 'ios' && (
        <Sheet visible={open} title={title} onClose={() => setOpen(false)}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            themeVariant={dark ? 'dark' : 'light'}
            locale={locale()}
            accentColor={colors.ink}
            onChange={(_, date) => date && setDraft(date)}
          />
          <View style={styles.sheetActions}>
            {clearable && value && (
              <Pressable
                onPress={() => {
                  onChange(null)
                  setOpen(false)
                }}
                style={({ pressed }) => [styles.sheetButtonSecondary, pressed && styles.pressed]}
              >
                <Text style={styles.sheetButtonSecondaryText}>{t('common.clear')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                onChange(draft)
                setOpen(false)
              }}
              style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed]}
            >
              <Text style={styles.sheetButtonText}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </Sheet>
      )}
    </>
  )
}

const useStyles = makeStyles((c) => ({
  label: {
    color: c.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelOptional: {
    color: c.stone,
    fontWeight: '500',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: c.ink,
  },
  compactText: {
    fontSize: 14,
  },
  placeholder: {
    color: c.stone,
  },
  pressed: {
    opacity: 0.7,
  },

  // Icons
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: c.stone,
    transform: [{ rotate: '45deg' }],
    marginTop: -4,
    marginLeft: 8,
    marginRight: 2,
  },
  calendar: {
    width: 16,
    height: 15,
    borderWidth: 1.5,
    borderColor: c.stone,
    borderRadius: 3,
    marginLeft: 8,
  },
  calendarTop: {
    height: 3,
    backgroundColor: c.stone,
  },
  calendarRing: {
    position: 'absolute',
    top: -4,
    width: 1.5,
    height: 4,
    backgroundColor: c.stone,
  },

  // Sheet
  backdrop: {
    flex: 1,
    backgroundColor: c.backdrop,
  },
  sheet: {
    backgroundColor: c.ivory,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginTop: 8,
    marginBottom: 12,
  },
  sheetTitle: {
    color: c.ink,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetList: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  optionPressed: {
    opacity: 0.6,
  },
  optionText: {
    color: c.ink,
    fontSize: 16,
  },
  optionTextActive: {
    fontWeight: '700',
  },
  check: {
    color: c.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  clearText: {
    color: c.error,
    fontSize: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  sheetButton: {
    flex: 1,
    backgroundColor: c.ink,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonText: {
    color: c.ivory,
    fontSize: 16,
    fontWeight: '700',
  },
  sheetButtonSecondary: {
    flex: 1,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonSecondaryText: {
    color: c.ink,
    fontSize: 16,
    fontWeight: '600',
  },
}))
