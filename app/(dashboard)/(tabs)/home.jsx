import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import useSubscriptions from '../../../hooks/useSubscriptions'
import {
  cycleLabel,
  formatMoney,
  paymentsBetween,
  startOfDay,
  sumByCurrency,
} from '../../../utils/subscriptions'
import { makeStyles, useTheme } from '../../../context/ThemeContext'
import { avatarColors } from '../../../constants/theme'
import { useT } from '../../../context/LanguageContext'
import { categoryLabel, locale, t, upper } from '../../../i18n'

const UPCOMING_COUNT = 3
const DAY_MS = 24 * 60 * 60 * 1000

// Muted colours for the "Where it goes" bar, in order of spend.
const CATEGORY_COLORS = ['#D9534F', '#5E8B6A', '#C9A23A', '#B8A6E0', '#6FA8C7', '#C98A5E', '#8C8780']

// "Tuesday, 17 November" / "Τρίτη, 17 Νοεμβρίου"
const formatHeaderDate = (d) =>
  `${d.toLocaleDateString(locale(), { weekday: 'long' })}, ${d.toLocaleDateString(locale(), {
    day: 'numeric',
    month: 'long',
  })}`

const relativeDay = (date, today) => {
  const days = Math.round((startOfDay(date) - today) / DAY_MS)
  if (days <= 0) return t('home.today')
  if (days === 1) return t('home.tomorrow')
  return t('home.inDays', { count: days })
}

// Sum of the payments that actually fall in a month, per currency.
const monthTotals = (subs, year, month) =>
  sumByCurrency(
    subs.flatMap((s) =>
      paymentsBetween(
        s.firstDate,
        s.cycle,
        s.customDays,
        new Date(year, month, 1),
        new Date(year, month + 1, 0)
      ).map(() => ({ amount: s.price, currency: s.currency }))
    )
  )

const UpcomingRow = ({ sub, today }) => {
  const styles = useStyles()
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
        <Text style={styles.cardSubtitle}>{relativeDay(sub.nextDate, today)}</Text>
      </View>
      <View style={styles.cardPrice}>
        <Text style={styles.priceText}>{formatMoney(sub.price, sub.currency)}</Text>
        <Text style={styles.priceSub}>{cycleLabel(sub.cycle, sub.customDays)}</Text>
      </View>
    </Pressable>
  )
}

export default function Home() {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t } = useT()
  const { subscriptions, loading, error } = useSubscriptions()
  const today = startOfDay(new Date())
  const year = today.getFullYear()
  const month = today.getMonth()

  const summary = useMemo(() => {
    const thisMonth = monthTotals(subscriptions, year, month)
    const lastMonth = monthTotals(subscriptions, year, month - 1)

    // Main currency = the one with the most subscriptions; others are listed underneath.
    const counts = {}
    subscriptions.forEach((s) => (counts[s.currency] = (counts[s.currency] ?? 0) + 1))
    const main = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] ?? 'EUR'
    const others = Object.entries(thisMonth)
      .filter(([code]) => code !== main)
      .map(([code, sum]) => formatMoney(sum, code))

    const diff = (thisMonth[main] ?? 0) - (lastMonth[main] ?? 0)

    const upcoming = subscriptions
      .filter((s) => s.nextDate)
      .sort((a, b) => a.nextDate - b.nextDate)
      .slice(0, UPCOMING_COUNT)

    // Share of monthly spend per category (main currency only, so amounts are comparable).
    const byCategory = {}
    subscriptions
      .filter((s) => s.currency === main)
      .forEach((s) => (byCategory[s.category] = (byCategory[s.category] ?? 0) + s.monthly))
    const categoryTotal = Object.values(byCategory).reduce((a, b) => a + b, 0)
    const categories = Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        share: value / categoryTotal,
        color: CATEGORY_COLORS[Math.min(i, CATEGORY_COLORS.length - 1)],
      }))

    return { main, total: thisMonth[main] ?? 0, others, diff, upcoming, categories }
  }, [subscriptions, year, month])

  const { main, total, others, diff, upcoming, categories } = summary
  const diffText =
    Math.abs(diff) < 0.005
      ? t('home.sameAsLast')
      : t(diff < 0 ? 'home.lessThanLast' : 'home.moreThanLast', {
          amount: formatMoney(Math.abs(diff), main),
        })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.dateLabel}>{upper(formatHeaderDate(today))}</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={10}
            accessibilityLabel={t('home.reminderSettings')}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>
        <Text style={styles.title}>{t('home.title')}</Text>

        {/* This month */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{t('home.thisMonth')}</Text>
          {loading ? (
            <ActivityIndicator color={colors.heroText} style={styles.heroLoading} />
          ) : (
            <>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(total, main)}
              </Text>
              {others.length > 0 && (
                <Text style={styles.heroOthers}>+ {others.join(' + ')}</Text>
              )}
              {subscriptions.length > 0 && (
                <View style={styles.pill}>
                  <Ionicons
                    name={diff < 0 ? 'trending-down' : 'trending-up'}
                    size={12}
                    color={colors.accent}
                  />
                  <Text style={styles.pillText}>{diffText}</Text>
                </View>
              )}
              <Text style={styles.heroFooter}>
                {t('home.activeSubs', { count: subscriptions.length })}
              </Text>
            </>
          )}
        </View>

        {/* Upcoming */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.upcoming')}</Text>
          <Pressable onPress={() => router.push('/subscriptions')} hitSlop={8}>
            {({ pressed }) => (
              <Text style={[styles.viewAll, pressed && styles.pressed]}>{t('home.viewAll')}</Text>
            )}
          </Pressable>
        </View>
        {loading ? null : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : upcoming.length === 0 ? (
          <Text style={styles.empty}>{t('home.empty')}</Text>
        ) : (
          <View style={styles.list}>
            {upcoming.map((s) => (
              <UpcomingRow key={s.id} sub={s} today={today} />
            ))}
          </View>
        )}

        {/* Where it goes */}
        {categories.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.whereTitle]}>{t('home.whereItGoes')}</Text>
            <View style={styles.bar}>
              {categories.map((c) => (
                <View
                  key={c.name}
                  style={[styles.barSegment, { flex: c.share, backgroundColor: c.color }]}
                />
              ))}
            </View>
            <View style={styles.legend}>
              {categories.map((c) => (
                <View key={c.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                  <Text style={styles.legendText}>
                    {categoryLabel(c.name)} {Math.round(c.share * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/add-subscription')}
        accessibilityLabel={t('common.addSubscription')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={28} color={colors.ivory} />
      </Pressable>
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
    paddingBottom: 96, // room for the + button
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    color: c.stone,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: c.ink,
    fontSize: 30,
    fontWeight: '700',
    marginTop: 4,
  },

  // Hero card
  hero: {
    backgroundColor: c.hero,
    borderWidth: 1,
    borderColor: c.heroBorder,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  heroLabel: {
    color: c.heroMuted,
    fontSize: 13,
  },
  heroLoading: {
    marginVertical: 28,
  },
  heroAmount: {
    color: c.heroText,
    fontSize: 40,
    fontWeight: '700',
    marginTop: 6,
  },
  heroOthers: {
    color: c.heroMuted,
    fontSize: 13,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  pillText: {
    color: c.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  heroFooter: {
    color: c.heroMuted,
    fontSize: 13,
    marginTop: 14,
  },

  // Sections
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    color: c.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  viewAll: {
    color: c.ink,
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 12,
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
    marginTop: 8,
  },

  // Where it goes
  whereTitle: {
    marginTop: 28,
    marginBottom: 12,
  },
  bar: {
    flexDirection: 'row',
    gap: 4,
    height: 8,
  },
  barSegment: {
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 6,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: c.stone,
    fontSize: 12,
  },

  // Floating add button
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.7,
  },
}))
