import type { Workbook } from 'exceljs'
import { CSV_COLUMNS, formatDateTime } from './csv'
import { statusText } from './match'
import { CATEGORY_LABEL, type ResultRow } from './types'

// Excel copy of the CSV: same 14 columns, same rows, plus colour.
// Competitor prices higher than LuxuryX's price are shown in red (as on screen).

const RED_TEXT = 'FFB91C1C'
const RED_FILL = 'FFFDE8E8'
const GREEN_TEXT = 'FF047857'
const HEADER_FILL = 'FFE2E8F0'

const WIDTHS: Record<(typeof CSV_COLUMNS)[number], number> = {
  Category: 14,
  'Product Name': 34,
  Model: 34,
  RAM: 8,
  Storage: 9,
  'Luxury X Price': 15,
  'Competitor Name': 18,
  'Competitor Price': 16,
  'Cheapest Competitor': 22,
  'Price Difference': 16,
  'Match Status': 60,
  Availability: 14,
  'Product URL': 45,
  'Last Checked': 17,
}

export const isHigherThanLuxuryx = (r: ResultRow) =>
  r.competitorPrice !== null && r.luxuryxPrice !== null && r.competitorPrice > r.luxuryxPrice

export async function buildWorkbook(rows: ResultRow[]): Promise<Workbook> {
  // Loaded only when someone downloads Excel, so the page itself stays small.
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Luxury X Price Comparison'
  wb.created = new Date()
  const ws = wb.addWorksheet('Price comparison', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = CSV_COLUMNS.map((h) => ({ header: h, key: h, width: WIDTHS[h] }))

  const header = ws.getRow(1)
  header.font = { bold: true }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  header.alignment = { vertical: 'middle' }

  for (const r of rows) {
    const row = ws.addRow([
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
      r.productUrl ? { text: r.productUrl, hyperlink: r.productUrl } : '',
      formatDateTime(r.lastChecked),
    ])
    for (const col of [6, 8, 10]) row.getCell(col).numFmt = '#,##0.##'
    if (r.productUrl) row.getCell(13).font = { color: { argb: 'FF0369A1' }, underline: true }

    if (isHigherThanLuxuryx(r)) {
      const price = row.getCell(8)
      price.font = { bold: true, color: { argb: RED_TEXT } }
      price.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } }
      row.getCell(10).font = { color: { argb: RED_TEXT } }
    } else if (r.priceDifference !== null && r.priceDifference < 0) {
      row.getCell(10).font = { color: { argb: GREEN_TEXT } }
    }
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CSV_COLUMNS.length } }
  return wb
}

export async function downloadExcel(rows: ResultRow[], filename: string): Promise<void> {
  const wb = await buildWorkbook(rows)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}