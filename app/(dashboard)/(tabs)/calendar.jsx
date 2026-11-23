import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import useSubscriptions from '../../../hooks/useSubscriptions'
import {
  cycleLabel,
  formatMoney,
  formatTotals,
  paymentsBetween,
  startOfDay,
} from '../../../utils/subscriptions'
import { makeStyles, useTheme } from '../../../context/ThemeContext'
import { avatarColors } from '../../../constants/theme'
import { useT } from '../../../context/LanguageContext'
import { categoryLabel, locale, upper } from '../../../i18n'

// Mon…Sun in the current language (1 Jan 2024 was a Monday).
const weekdayNames = () =>
  Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'short' })
  )

const capitalize = (text = '') => text.charAt(0).toUpperCase() + text.slice(1)
const MAX_DOTS = 3

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const sameDay = (a, b) => a && b && dayKey(a) === dayKey(b)

const toEntries = (payments) =>
  payments.map((p) => ({ amount: p.sub.price, currency: p.sub.currency }))

// Monday-first grid of weeks for the month; days outside the month are null.
const buildWeeks = (year, month) => {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const DayCell = ({ date, payments, isToday, isSelected, onPress }) => {
  const styles = useStyles()
  const { t } = useT()
  if (!date) return <View style={styles.cell} />
  const dots = payments.slice(0, MAX_DOTS)
  const extra = payments.length - dots.length
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('calendar.dayA11y', { day: date.getDate(), count: payments.length })}
      style={styles.cell}
    >
      <View
        style={[
          styles.dayCircle,
          isToday && styles.dayToday,
          isSelected && styles.daySelected,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isToday && styles.dayTextToday,
            isSelected && styles.dayTextSelected,
          ]}
        >
          {date.getDate()}
        </Text>
      </View>
      <View style={styles.dots}>
        {dots.map((p) => (
          <View key={p.sub.id} style={[styles.dot, { backgroundColor: p.sub.color }]} />
        ))}
        {extra > 0 && <Text style={styles.moreDots}>+{extra}</Text>}
      </View>
    </Pressable>
  )
}

const PaymentRow = ({ payment, isPast }) => {
  const styles = useStyles()
  const { sub } = payment
  const { colors, dark } = useTheme()
  const { t } = useT()
  const avatar = avatarColors(sub, dark, colors)
  return (
    <Pressable
      onPress={() => router.push(`/edit-subscription/${sub.id}`)}
      accessibilityRole="button"
      accessibilityHint={t('common.openSubscription')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
        <Text style={[styles.avatarText, { color: avatar.fg }]}>{sub.name.charAt(0)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{sub.name}</Text>
        <Text style={styles.cardSubtitle}>
          {cycleLabel(sub.cycle, sub.customDays)} • {categoryLabel(sub.category)}
        </Text>
      </View>
      <View style={styles.cardPrice}>
        <Text style={styles.priceText}>{formatMoney(sub.price, sub.currency)}</Text>
        <Text style={styles.priceSub}>{isPast ? t('calendar.paid') : t('calendar.due')}</Text>
      </View>
    </Pressable>
  )
}

export default function Calendar() {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t, lang } = useT()
  const { subscriptions, loading, error } = useSubscriptions()
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const weeks = useMemo(() => buildWeeks(year, monthIndex), [year, monthIndex])

  // All payments in the visible month, grouped by day.
  const { byDay, monthPayments } = useMemo(() => {
    const from = new Date(year, monthIndex, 1)
    const to = new Date(year, monthIndex + 1, 0)
    const map = {}
    const all = []
    subscriptions.forEach((sub) => {
      paymentsBetween(sub.firstDate, sub.cycle, sub.customDays, from, to).forEach((date) => {
        const p = { sub, date }
        ;(map[dayKey(date)] ??= []).push(p)
        all.push(p)
      })
    })
    return { byDay: map, monthPayments: all }
  }, [subscriptions, year, monthIndex])

  const changeMonth = (delta) => {
    const next = new Date(year, monthIndex + delta, 1)
    setMonth(next)
    // Keep a sensible selection: today if it's in that month, else the 1st.
    setSelected(
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
        ? today
        : next
    )
  }

  const goToday = () => {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(today)
  }

  const selectedPayments = (selected && byDay[dayKey(selected)]) ?? []
  const weekdays = useMemo(weekdayNames, [lang])
  const monthTitle = capitalize(
    month.toLocaleDateString(locale(), { month: 'long', year: 'numeric' })
  )
  const selectedTitle = selected?.toLocaleDateString(locale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const isCurrentMonth =
    year === today.getFullYear() && monthIndex === today.getMonth()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('calendar.title')}</Text>
        <Text style={styles.subtitle}>
          {t('calendar.summary', {
            count: monthPayments.length,
            total: formatTotals(toEntries(monthPayments)),
          })}
        </Text>

        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => changeMonth(-1)}
              hitSlop={10}
              accessibilityLabel={t('calendar.previousMonth')}
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={goToday}
              disabled={isCurrentMonth}
              accessibilityLabel={t('calendar.monthA11y', { month: monthTitle })}
              style={styles.monthTitleWrap}
            >
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              {!isCurrentMonth && <Text style={styles.todayLink}>{t('calendar.backToToday')}</Text>}
            </Pressable>
            <Pressable
              onPress={() => changeMonth(1)}
              hitSlop={10}
              accessibilityLabel={t('calendar.nextMonth')}
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.week}>
            {weekdays.map((d, i) => (
              <Text key={i} style={styles.weekday} numberOfLines={1}>{d}</Text>
            ))}
          </View>

          {weeks.map((week, i) => (
            <View key={i} style={styles.week}>
              {week.map((date, j) => (
                <DayCell
                  key={date ? dayKey(date) : `empty-${i}-${j}`}
                  date={date}
                  payments={date ? byDay[dayKey(date)] ?? [] : []}
                  isToday={sameDay(date, today)}
                  isSelected={sameDay(date, selected)}
                  onPress={() => setSelected(date)}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>{upper(selectedTitle)}</Text>
          {selectedPayments.length > 0 && (
            <Text style={styles.sectionTotal}>{formatTotals(toEntries(selectedPayments))}</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.empty} color={colors.ink} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : selectedPayments.length === 0 ? (
          <Text style={styles.empty}>
            {subscriptions.length === 0 ? t('calendar.noSubs') : t('calendar.noPaymentsDay')}
          </Text>
        ) : (
          <View style={styles.list}>
            {selectedPayments.map((p) => (
              <PaymentRow key={p.sub.id} payment={p} isPast={p.date < today} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    color: c.ink,
    fontWeight: '700',
    fontSize: 32,
  },
  subtitle: {
    color: c.stone,
    fontSize: 14,
    marginTop: 4,
  },

  // Month grid
  calendarCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    marginTop: 20,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrap: {
    alignItems: 'center',
  },
  monthTitle: {
    color: c.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  todayLink: {
    color: c.stone,
    fontSize: 12,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: c.stone,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 50,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: c.ink,
  },
  daySelected: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  dayText: {
    color: c.ink,
    fontSize: 14,
  },
  dayTextToday: {
    fontWeight: '700',
  },
  dayTextSelected: {
    color: c.ivory,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 10,
    marginTop: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreDots: {
    color: c.stone,
    fontSize: 9,
    fontWeight: '700',
  },

  // Selected day
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabel: {
    color: c.stone,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTotal: {
    color: c.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: c.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: c.stone,
    fontSize: 13,
    marginTop: 2,
  },
  cardPrice: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  priceText: {
    color: c.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  priceSub: {
    color: c.stone,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    color: c.stone,
    textAlign: 'center',
    marginTop: 24,
  },
  pressed: {
    opacity: 0.7,
  },
}))
