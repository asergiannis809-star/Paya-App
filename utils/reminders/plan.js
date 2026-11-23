import { formatDate, formatMoney, paymentsBetween } from '../subscriptions'
import { t } from '../../i18n'

export const REMINDER_HOUR = 9 // local time
export const PER_SUBSCRIPTION = 3 // upcoming payments scheduled ahead for each subscription
export const MAX_SCHEDULED = 60 // iOS keeps at most 64 pending local notifications

/**
 * Works out which reminders to schedule: for each subscription with "Remind me" on,
 * the next few payments, `daysBefore` days ahead at 9:00. Soonest first, capped.
 * Each subscription is expected to have { id, firstDate, cycle, customDays, reminder }.
 */
export function planReminders(subs, now = new Date()) {
  const horizon = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate() + 8)
  const plans = []
  for (const sub of subs) {
    if (!sub.reminder?.enabled || !sub.firstDate) continue
    const daysBefore = Number(sub.reminder.daysBefore) || 0
    let count = 0
    for (const payDate of paymentsBetween(sub.firstDate, sub.cycle, sub.customDays, now, horizon)) {
      const at = new Date(
        payDate.getFullYear(),
        payDate.getMonth(),
        payDate.getDate() - daysBefore,
        REMINDER_HOUR
      )
      if (at <= now) continue
      plans.push({ id: `reminder-${sub.id}-${payDate.getTime()}`, at, sub, payDate, daysBefore })
      if (++count >= PER_SUBSCRIPTION) break
    }
  }
  return plans.sort((a, b) => a.at - b.at).slice(0, MAX_SCHEDULED)
}

// Notification text, in the current language.
export function reminderContent({ sub, payDate, daysBefore }) {
  const name = sub.name
  const title =
    daysBefore === 0
      ? t('notifications.titleToday', { name })
      : daysBefore === 1
        ? t('notifications.titleTomorrow', { name })
        : t('notifications.titleDays', { name, count: daysBefore })
  return {
    title,
    body: t('notifications.body', {
      amount: formatMoney(sub.price, sub.currency),
      date: formatDate(payDate),
    }),
    data: { subscriptionId: sub.id },
  }
}
