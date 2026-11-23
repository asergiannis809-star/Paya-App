// Web: trigger a normal browser download.
export async function shareCsv(csv, fileName) {
  // BOM so Excel opens UTF-8 (e.g. "€", Greek) correctly.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
