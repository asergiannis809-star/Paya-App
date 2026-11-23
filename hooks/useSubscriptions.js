import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { firestoreErrorMessage } from '../utils/feedback'
import { t } from '../i18n'
import { monthlyAmount, nextPaymentDate, startOfDay } from '../utils/subscriptions'

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null)

// Avatar colours, picked by name when a document has no colour of its own.
const PALETTE = [
  { color: '#1DB954', tint: '#E6F7EC' },
  { color: '#E50914', tint: '#FDE8E8' },
  { color: '#141414', tint: '#EAEAEA' },
  { color: '#F59E0B', tint: '#FEF3E2' },
  { color: '#8B5CF6', tint: '#EFE9FE' },
  { color: '#0EA5E9', tint: '#E0F2FE' },
]

const paletteFor = (name = '') => {
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return PALETTE[sum % PALETTE.length]
}

// Firestore doc (users/{uid}/subscriptions/{id}) → item used by the UI.
// Saved by the Add subscription screen: name, price, currency, cycle, customDays,
// firstPaymentDate, category, ... The next payment date is worked out from firstPaymentDate.
const toSubscription = (snap) => {
  const data = snap.data()
  const fallback = paletteFor(data.name)
  // Older/hand-made docs may use "Monthly" etc. instead of "monthly".
  const cycle = String(data.cycle ?? 'monthly').toLowerCase()
  const customDays = data.customDays ?? 30
  const first = toDate(data.firstPaymentDate)
  const nextDate = first ? nextPaymentDate(first, cycle, customDays) : toDate(data.nextDate)
  const price = Number(data.price) || 0
  return {
    id: snap.id,
    name: data.name || t('common.untitled'),
    category: data.category ?? 'Other',
    price,
    currency: data.currency ?? 'EUR',
    cycle,
    customDays,
    monthly: monthlyAmount(price, cycle, customDays),
    // Anchor for working out every payment date (calendar).
    firstDate: first ? startOfDay(first) : nextDate ? startOfDay(nextDate) : null,
    nextDate,
    // Missing on older docs → no reminder.
    reminder: data.reminder?.enabled
      ? { enabled: true, daysBefore: Number(data.reminder.daysBefore) || 0 }
      : { enabled: false },
    color: data.color ?? fallback.color,
    tint: data.tint ?? fallback.tint,
  }
}

// Live list of the signed-in user's subscriptions from Firestore.
export default function useSubscriptions() {
  const { user } = useAuth()
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'users', user.uid, 'subscriptions')
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setSubscriptions(snapshot.docs.map(toSubscription))
        setError(null)
        setLoading(false)
      },
      (err) => {
        console.warn('Failed to load subscriptions', err?.code, err?.message)
        setError(err)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [user])

  // Message built at render time so it follows the current language.
  return { subscriptions, loading, error: error ? firestoreErrorMessage(error, 'loadSubscriptions') : '' }
}
