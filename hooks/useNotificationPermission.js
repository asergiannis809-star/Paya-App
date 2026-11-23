import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getPermissionState } from '../utils/reminders'

// 'granted' | 'undetermined' | 'denied' | 'unsupported' (web) | null while checking.
// Re-checked when the app comes back to the foreground (e.g. from the phone's settings).
export default function useNotificationPermission() {
  const [state, setState] = useState(null)
  const refresh = useCallback(() => getPermissionState().then(setState).catch(() => {}), [])

  useEffect(() => {
    refresh()
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh())
    return () => sub.remove()
  }, [refresh])

  return [state, refresh]
}
