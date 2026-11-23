import { Alert, Platform } from 'react-native'
import { t } from '../i18n'

// Yes/no confirmation that works on iOS, Android and web.
// The confirm button is shown in red unless `destructive` is false.
export function confirmAsync(title, message, confirmLabel = t('common.delete'), destructive = true) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`))
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  })
}

// Simple message popup that also works on web.
export function showMessage(title, message) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`)
  else Alert.alert(title, message)
}

// Friendly text for Firestore errors.
// `action` is a key of errors.actions: 'save', 'load', 'delete', 'saveSettings', 'loadSubscriptions'.
export function firestoreErrorMessage(err, action = 'save') {
  const actionText = t(`errors.actions.${action}`)
  switch (err?.code) {
    case 'permission-denied':
      return t('errors.permission', { action: actionText })
    case 'unavailable':
      return t('errors.unavailable')
    case 'not-found':
      return t('errors.notFound')
    default:
      return t('errors.generic', { action: actionText, code: err?.code ?? t('errors.unknown') })
  }
}
