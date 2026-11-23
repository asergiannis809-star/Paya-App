import { locale, t } from '../i18n'

// Shared options and helpers for subscriptions.

export const CURRENCIES = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'CHF', symbol: 'CHF ' },
]

export const CATEGORIES = [
  'Streaming',
  'Music',
  'Software',
  'Utilities',
  'Health & fitness',
  'News',
  'Gaming',
  'Cloud storage',
  'Other',
]

export const PAYMENT_METHODS = [
  'Credit card',
  'Debit card',
  'PayPal',
  'Apple Pay',
  'Google Pay',
  'Bank transfer',
  'Other',
]

// Labels come from the translations: t(`cycles.${key}`).
export const CYCLES = [{ key: 'weekly' }, { key: 'monthly' }, { key: 'yearly' }, { key: 'custom' }]

// Labels come from the translations: t(`reminders.${days}`).
export const REMINDER_OPTIONS = [{ days: 0 }, { days: 1 }, { days: 3 }, { days: 7 }]

export const currencySymbol = (code) =>
  CURRENCIES.find((c) => c.code === code)?.symbol ?? '€'

export const formatMoney = (amount, code = 'EUR') =>
  `${currencySymbol(code)}${(Number(amount) || 0).toFixed(2)}`

// [{ amount, currency }] → { EUR: 12.5, USD: 3 }
export const sumByCurrency = (entries) => {
  const totals = {}
  entries.forEach(({ amount, currency }) => {
    totals[currency] = (totals[currency] ?? 0) + (Number(amount) || 0)
  })
  return totals
}

// "€87.45" or, with mixed currencies, "€80.00 + $10.00"
export const formatTotals = (entries) => {
  const parts = Object.entries(sumByCurrency(entries)).map(([code, sum]) => formatMoney(sum, code))
  return parts.length ? parts.join(' + ') : formatMoney(0, 'EUR')
}

export const formatDate = (d) => {
  if (!(d instanceof Date) || isNaN(d)) return ''
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatShortDate = (d) => {
  if (!(d instanceof Date) || isNaN(d)) return '—'
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
}

export const startOfDay = (d) => {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// The date of the n-th payment after `first` (n = 0 is `first` itself).
const nthPayment = (first, n, cycle, customDays) => {
  const d = new Date(first)
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * n)
      return d
    case 'yearly':
    case 'monthly': {
      const months = cycle === 'yearly' ? 12 * n : n
      const day = first.getDate()
      d.setDate(1)
      d.setMonth(d.getMonth() + months)
      // Keep e.g. "31st" as the last day of shorter months.
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      d.setDate(Math.min(day, lastDay))
      return d
    }
    case 'custom':
      d.setDate(d.getDate() + (Number(customDays) || 30) * n)
      return d
    default:
      return d
  }
}

// The first payment date that is today or later.
export const nextPaymentDate = (first, cycle, customDays, today = new Date()) => {
  if (!(first instanceof Date) || isNaN(first)) return null
  const start = startOfDay(first)
  const target = startOfDay(today)
  let n = 0
  let d = start
  while (d < target && n < 10000) {
    n += 1
    d = nthPayment(start, n, cycle, customDays)
  }
  return d
}

// Every payment date from `first` that falls within [from, to] (inclusive, by day).
export const paymentsBetween = (first, cycle, customDays, from, to) => {
  if (!(first instanceof Date) || isNaN(first)) return []
  const start = startOfDay(first)
  const lo = startOfDay(from)
  const hi = startOfDay(to)
  const dates = []
  for (let n = 0, d = start; d <= hi && n < 10000; n += 1, d = nthPayment(start, n, cycle, customDays)) {
    if (d >= lo) dates.push(d)
  }
  return dates
}

// Price converted to a monthly amount (for the total).
export const monthlyAmount = (price, cycle, customDays) => {
  const p = Number(price) || 0
  switch (cycle) {
    case 'weekly':
      return (p * 52) / 12
    case 'yearly':
      return p / 12
    case 'custom':
      return (p * 365.25) / 12 / (Number(customDays) || 30)
    default:
      return p
  }
}

export const cycleLabel = (cycle, customDays) => {
  if (cycle === 'custom') return t('cycles.every', { count: Number(customDays) })
  return t(`cycles.${CYCLES.some((c) => c.key === cycle) ? cycle : 'monthly'}`)
}

export const cycleSuffix = (cycle, customDays) => {
  switch (cycle) {
    case 'weekly':
      return t('cycles.perWeek')
    case 'yearly':
      return t('cycles.perYear')
    case 'custom':
      return t('cycles.perDays', { count: Number(customDays) })
    default:
      return t('cycles.perMonth')
  }
}
