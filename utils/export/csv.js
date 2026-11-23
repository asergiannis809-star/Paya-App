import { cycleLabel, formatDate } from '../subscriptions'
import { categoryLabel, t } from '../../i18n'

const COLUMNS = [
  ['name', (s) => s.name],
  ['category', (s) => categoryLabel(s.category)],
  ['price', (s) => s.price.toFixed(2)],
  ['currency', (s) => s.currency],
  ['cycle', (s) => cycleLabel(s.cycle, s.customDays)],
  ['monthly', (s) => s.monthly.toFixed(2)],
  ['first', (s) => formatDate(s.firstDate)],
  ['next', (s) => formatDate(s.nextDate)],
]

// Quote a value if it contains a comma, quote or newline.
const cell = (v) => {
  const text = String(v ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const subscriptionsToCsv = (subs) =>
  [COLUMNS.map(([key]) => t(`csv.${key}`)), ...subs.map((s) => COLUMNS.map(([, get]) => get(s)))]
    .map((row) => row.map(cell).join(','))
    .join('\r\n')

export const exportFileName = () => `paya-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`
