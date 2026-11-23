import { Image } from 'react-native'
import { useTheme } from '../context/ThemeContext'

const LIGHT_LOGO = require('../assets/paya-new-logo.png')
const DARK_LOGO = require('../assets/paya-new-logo-dark.png')

// The Paya logo in the version that matches the current theme.
export default function Logo({ size = 72, style }) {
  const { dark } = useTheme()
  return (
    <Image
      source={dark ? DARK_LOGO : LIGHT_LOGO}
      style={[{ width: size, height: size }, style]}
      accessibilityIgnoresInvertColors
      accessible
      accessibilityLabel="Paya"
    />
  )
}
