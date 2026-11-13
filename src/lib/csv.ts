import { statusText } from './match'
import { CATEGORY_LABEL, type ResultRow } from './types'

export const CSV_COLUMNS = [
  'Category',
  'Product Name',
  'Model',
  'RAM',
  'Storage',
  'Luxury X Price',
  'Competitor Name',
  'Competitor Price',
  'Cheapest Competitor',
  'Price Difference',
  'Match Status',
  'Availability',
  'Product URL',
  'Last Checked',
] as const

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  // Neutralise spreadsheet formulas (a cell starting with = + - @ is run as a formula by Excel).
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe
}

export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function toCsv(rows: ResultRow[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const r of rows) {
    lines.push(
      [
        CATEGORY_LABEL[r.category],
        r.productName,
        r.model,
        r.ram,
        r.storage,
        r.luxuryxPrice,
        r.competitorName,
        r.competitorPrice,
        r.cheapestCompetitor,
        r.priceDifference,
        statusText(r),
        r.availability,
        r.productUrl,
        formatDateTime(r.lastChecked),
      ]
        .map(cell)
        .join(','),
    )
  }
  // BOM so Excel opens the file as UTF-8.
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function downloadCsv(rows: ResultRow[], filename: string): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
