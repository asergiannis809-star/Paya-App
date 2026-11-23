// Colour palettes. Names describe the role in light mode:
// - ivory: app background (also text on `ink` buttons)
// - ink: headlines, primary buttons
// - hero*: the dark feature cards (This month, Your account), which stay dark in both themes
export const LIGHT = {
  ivory: '#F7F5F0',
  ink: '#141414',
  stone: '#8C8780', // secondary text
  card: '#FFFFFF',
  border: '#E8E5DF',
  error: '#C62828',
  hero: '#141414',
  heroBorder: '#141414',
  heroText: '#F7F5F0',
  heroMuted: '#BDB8B0',
  heroRaised: '#2A2A2A',
  accent: '#E0A43A',
  accentSoft: 'rgba(224, 164, 58, 0.12)',
  backdrop: 'rgba(20, 20, 20, 0.35)',
  shadow: '#000000',
}

export const DARK = {
  ivory: '#121211',
  ink: '#F2EFE9',
  stone: '#9C968D',
  card: '#1C1B19',
  border: '#2E2C29',
  error: '#EF6B67',
  hero: '#232220',
  heroBorder: '#34322E',
  heroText: '#F2EFE9',
  heroMuted: '#A8A29A',
  heroRaised: '#34322E',
  accent: '#E8B04A',
  accentSoft: 'rgba(232, 176, 74, 0.14)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
}

const luminance = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return 0.5
  const n = parseInt(m[1], 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

// Subscription avatar colours. Light pastel tints don't work on a dark background,
// so dark mode uses a translucent version of the brand colour instead.
export const avatarColors = (item, dark, colors) => {
  if (!dark) return { bg: item.tint, fg: item.color }
  const fg = luminance(item.color) < 0.25 ? colors.ink : item.color
  const hex = /^#[0-9a-f]{6}$/i.test(fg) ? fg : colors.ink
  return { bg: `${hex}2E`, fg }
}
