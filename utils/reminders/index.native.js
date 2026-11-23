import { Linking, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { t } from '../../i18n'
import { planReminders, reminderContent } from './plan'

const CHANNEL_ID = 'reminders'

export const remindersSupported = true

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Android needs a channel (and on Android 13+ it must exist before asking for permission).
const ensureChannel = () =>
  Platform.OS === 'android'
    ? Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('notifications.channelName'),
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    : Promise.resolve()

const toState = (s) => {
  if (s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted'
  return s.status === 'undetermined' ? 'undetermined' : 'denied'
}

// 'granted' | 'undetermined' (never asked) | 'denied'
export async function getPermissionState() {
  return toState(await Notifications.getPermissionsAsync())
}

// Shows the system prompt if the OS still allows it; returns the new state.
export async function requestPermission() {
  await ensureChannel()
  const current = await Notifications.getPermissionsAsync()
  if (toState(current) === 'granted' || !current.canAskAgain) return toState(current)
  return toState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    })
  )
}

export const openSystemSettings = () => Linking.openSettings()

export const cancelAllReminders = () => Notifications.cancelAllScheduledNotificationsAsync()

async function doSync(subscriptions, enabled) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!enabled) return
  const plans = planReminders(subscriptions)
  if (plans.length === 0) return

  // Ask the first time there's actually something to remind about.
  let state = await getPermissionState()
  if (state === 'undetermined') state = await requestPermission()
  if (state !== 'granted') return

  await ensureChannel()
  for (const plan of plans) {
    await Notifications.scheduleNotificationAsync({
      identifier: plan.id,
      content: { ...reminderContent(plan), sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.at,
        channelId: CHANNEL_ID,
      },
    })
  }
}

// Replaces all scheduled reminders. Calls run one after another, never in parallel.
let queue = Promise.resolve()
export function syncReminders(subscriptions, enabled) {
  queue = queue
    .then(() => doSync(subscriptions, enabled))
    .catch((err) => console.warn('Failed to schedule reminders', err?.message))
  return queue
}

// Calls `handler(subscriptionId)` when the user taps a reminder (also after a cold start).
export function onReminderTap(handler) {
  const handle = (response) => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
    const id = response.notification.request.content.data?.subscriptionId
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {})
    if (typeof id === 'string') handler(id)
  }
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {})
  const subscription = Notifications.addNotificationResponseReceivedListener(handle)
  return () => subscription.remove()
}
