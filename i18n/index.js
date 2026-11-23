import en from './en'
import el from './el'

const DICTS = { en, el }

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'el', label: 'Ελληνικά' },
]

// The active language. Set by LanguageProvider; components re-render through useT().
let current = 'en'

export const setLanguage = (lang) => {
  current = DICTS[lang] ? lang : 'en'
}

export const getLanguage = () => current

// Locale for dates (toLocaleDateString).
export const locale = () => (current === 'el' ? 'el-GR' : 'en-GB')

const lookup = (dict, key) =>
  key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)

/**
 * t('home.title') → string in the active language (falls back to English, then the key).
 * t('home.inDays', { count: 3 }) uses 'home.inDays_one' / 'home.inDays_other'.
 * {placeholders} are filled from params.
 */
export function t(key, params) {
  const keys =
    params?.count != null ? [`${key}_${params.count === 1 ? 'one' : 'other'}`, key] : [key]
  let text
  for (const k of keys) {
    text = lookup(DICTS[current], k) ?? lookup(en, k)
    if (typeof text === 'string') break
  }
  if (typeof text !== 'string') return key
  return params ? text.replace(/\{(\w+)\}/g, (m, name) => (params[name] ?? m)) : text
}

// Upper-case for labels. Greek capitals drop the accent marks (Τρίτη → ΤΡΙΤΗ).
export const upper = (text = '') =>
  current === 'el'
    ? text.normalize('NFD').replace(/[́΄]/g, '').toUpperCase().normalize('NFC')
    : text.toUpperCase()

// Display labels for values saved in English in Firestore (unknown values are shown as-is).
const valueLabel = (group, value) => DICTS[current][group]?.[value] ?? en[group]?.[value] ?? value
export const categoryLabel = (value) => valueLabel('categories', value)
export const paymentMethodLabel = (value) => valueLabel('paymentMethods', value)
