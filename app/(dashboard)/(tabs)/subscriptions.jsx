import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { deleteDoc, doc } from 'firebase/firestore'
import { confirmAsync, firestoreErrorMessage, showMessage } from '../../../utils/feedback'
import { db } from '../../../firebase/config'
import { router } from 'expo-router'
import { useAuth } from '../../../context/AuthContext'
import useSubscriptions from '../../../hooks/useSubscriptions'
import {
  cycleLabel,
  cycleSuffix,
  formatMoney,
  formatShortDate,
} from '../../../utils/subscriptions'
import { makeStyles, useTheme } from '../../../context/ThemeContext'
import { avatarColors } from '../../../constants/theme'
import { useT } from '../../../context/LanguageContext'
import { categoryLabel, upper } from '../../../i18n'

const ALL = 'All'
const CATEGORIES = [ALL, 'Streaming', 'Music', 'Software']

// "€87.45" or, with mixed currencies, "€80.00 + $10.00"
const formatTotals = (subs) => {
  const byCurrency = {}
  subs.forEach((s) => {
    byCurrency[s.currency] = (byCurrency[s.currency] ?? 0) + s.monthly
  })
  const parts = Object.entries(byCurrency).map(([code, sum]) => formatMoney(sum, code))
  return parts.length ? parts.join(' + ') : formatMoney(0, 'EUR')
}

const SearchIcon = () => {
  const styles = useStyles()
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchIconCircle} />
      <View style={styles.searchIconHandle} />
    </View>
  )
}

const SubscriptionCard = ({ item, onPress, onLongPress }) => {
  const styles = useStyles()
  const { colors, dark } = useTheme()
  const { t } = useT()
  const avatar = avatarColors(item, dark, colors)
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityHint={t('subscriptions.cardHint')}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
        <Text style={[styles.avatarText, { color: avatar.fg }]}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>
          {cycleLabel(item.cycle, item.customDays)} • {formatShortDate(item.nextDate)}
        </Text>
      </View>
      <View style={styles.cardPrice}>
        <Text style={styles.priceText}>{formatMoney(item.price, item.currency)}</Text>
        <Text style={styles.priceSub}>{cycleSuffix(item.cycle, item.customDays)}</Text>
      </View>
    </Pressable>
  )
}

const Subscriptions = () => {
  const { colors } = useTheme()
  const styles = useStyles()
  const { t, lang } = useT()
  const { user } = useAuth()
  const { subscriptions, loading, error: loadError } = useSubscriptions()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [sortBy, setSortBy] = useState('date') // 'date' | 'price'

  const openEdit = (item) => router.push(`/edit-subscription/${item.id}`)

  const deleteSubscription = async (item) => {
    const ok = await confirmAsync(
      t('subscriptions.deleteTitle'),
      t('subscriptions.deleteMessage', { name: item.name })
    )
    if (!ok) return
    try {
      // The list updates automatically through onSnapshot.
      await deleteDoc(doc(db, 'users', user.uid, 'subscriptions', item.id))
    } catch (err) {
      console.warn('Failed to delete subscription', err?.code, err?.message)
      showMessage(t('subscriptions.deleteFailed'), firestoreErrorMessage(err, 'delete'))
    }
  }

  // Long-press menu: Edit / Delete
  const showActions = (item) => {
    if (Platform.OS === 'web') return deleteSubscription(item) // no action sheet on web
    Alert.alert(item.name, undefined, [
      { text: t('common.edit'), onPress: () => openEdit(item) },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteSubscription(item) },
      { text: t('common.cancel'), style: 'cancel' },
    ])
  }

  const total = useMemo(() => formatTotals(subscriptions), [subscriptions])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subscriptions
      .filter((s) => category === ALL || s.category === category)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) =>
        sortBy === 'price'
          ? b.monthly - a.monthly
          : (a.nextDate ?? Infinity) - (b.nextDate ?? Infinity)
      )
  }, [subscriptions, query, category, sortBy])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('subscriptions.title')}</Text>
          <Pressable
            onPress={() => router.push('/add-subscription')}
            hitSlop={8}
            accessibilityLabel={t('common.addSubscription')}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {t('subscriptions.summary', { count: subscriptions.length, total })}
        </Text>

        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder={t('subscriptions.search')}
            placeholderTextColor={colors.stone}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = c === category
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c === ALL ? t('subscriptions.all') : categoryLabel(c)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>
            {category === ALL ? t('subscriptions.allLabel') : upper(categoryLabel(category))}
          </Text>
          <Pressable
            onPress={() => setSortBy((s) => (s === 'date' ? 'price' : 'date'))}
            hitSlop={8}
            style={({ pressed }) => [styles.sortButton, pressed && styles.pressed]}
          >
            <Text style={styles.sortText}>
              ⇅ <Text style={sortBy === 'date' && styles.sortActive}>{t('subscriptions.date')}</Text>
              {' / '}
              <Text style={sortBy === 'price' && styles.sortActive}>{t('subscriptions.price')}</Text>
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        extraData={lang} // re-render rows when the language changes
        renderItem={({ item }) => (
          <SubscriptionCard
            item={item}
            onPress={() => openEdit(item)}
            onLongPress={() => showActions(item)}
          />
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.empty} color={colors.ink} />
          ) : (
            <Text style={styles.empty}>
              {loadError ||
                (subscriptions.length === 0
                  ? t('subscriptions.emptyNone')
                  : t('subscriptions.emptyFiltered'))}
            </Text>
          )
        }
      />
    </SafeAreaView>
  )
}

export default Subscriptions

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.ivory,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: c.ink,
    fontWeight: '700',
    fontSize: 32,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: c.ivory,
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 24,
  },
  subtitle: {
    color: c.stone,
    fontSize: 14,
    marginTop: 4,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 20,
  },
  searchIcon: {
    width: 16,
    height: 16,
    marginRight: 10,
  },
  searchIconCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.stone,
  },
  searchIconHandle: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: c.stone,
    right: 0,
    bottom: 2,
    transform: [{ rotate: '45deg' }],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.ink,
    paddingVertical: 0,
  },

  // Category chips
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
  },
  chipActive: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  chipText: {
    color: c.stone,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: c.ivory,
    fontWeight: '700',
  },

  // Section header
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
  sortButton: {
    paddingVertical: 2,
  },
  sortText: {
    color: c.stone,
    fontSize: 13,
  },
  sortActive: {
    color: c.ink,
    fontWeight: '700',
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
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
  cardPressed: {
    opacity: 0.7,
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
    marginTop: 32,
  },
  pressed: {
    opacity: 0.7,
  },
}))
