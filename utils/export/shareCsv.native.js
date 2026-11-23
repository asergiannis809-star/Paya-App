import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { t } from '../../i18n'

// Writes the CSV to the cache folder and opens the share sheet.
export async function shareCsv(csv, fileName) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(t('settings.sharingUnavailable'))
  }
  const file = new File(Paths.cache, fileName)
  if (file.exists) file.delete()
  file.create()
  await file.write(csv)
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: t('settings.exportDialogTitle'),
  })
}
