// Scheduled local notifications aren't available on web; everything is a no-op here.
export const remindersSupported = false
export const getPermissionState = async () => 'unsupported'
export const requestPermission = async () => 'unsupported'
export const openSystemSettings = () => {}
export const cancelAllReminders = async () => {}
export const syncReminders = async () => {}
export const onReminderTap = () => () => {}
