import { describe, expect, it } from 'vitest'
import { buildLuxConfigs, buildRows } from './match'
import type { ExtractResponse, Listing } from './types'

// Listings exactly as the extractors returned them from the live sites on 13 Nov 2026
// (MacBook subset). This checks the matching rules against real titles.

const lx = (title: string, options: string, price: number): Listing => ({
  title, options, price, priceType: 'cash', availability: 'In Stock', url: 'https://luxuryx.lk/x', brand: 'Apple',
})
const shop = (rows: [string, string, number | null, string?][]): ExtractResponse => ({
  ok: true, status: 'ok', checkedAt: '2026-11-13T08:30:00Z',
  listings: rows.map(([title, options, price, availability]) => ({ title, options, price, priceType: 'listed', availability: availability ?? 'Not Shown', url: 'https://shop/' + title })),
})

const luxuryx = [
  lx('MacBook Air 13 inch M5 Chip', 'ram: 16 GB, storage: 512 GB', 423000),
  lx('MacBook Air 13 inch M5 Chip', 'ram: 16 GB, storage: 1 TB', 505000),
  lx('MacBook Air 13 inch M5 Chip', 'ram: 24 GB, storage: 1 TB', 619000),
  lx('MacBook Air 15 inch M5 Chip', 'ram: 16 GB, storage: 512 GB', 494000),
  lx('MacBook Neo', 'ram: 8 GB, storage: 256 GB', 244000),
  lx('MacBook Neo', 'ram: 8 GB, storage: 512 GB', 284000),
  lx('MacBook Pro 14 inch M5 Chip', 'ram: 16 GB, storage: 512 GB', 627500),
  lx('MacBook Pro 14 inch M5 Chip', 'ram: 16 GB, storage: 1 TB', 665000),
  lx('MacBook Pro 14 inch M6 Chip', 'ram: 16 GB, storage: 1 TB, glass: Standard display', 750000),
  lx('MacBook Pro 14 inch M5 Pro Chip PROLED XDR Display', 'ram: 24 GB, storage: 1 TB, core: 15-core, model: Standard glass', 0),
  lx('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 1 TB, core: 15-core', 825000),
  lx('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 2 TB, core: 15-core', 1029500),
  lx('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 2 TB, core: 18-core', 1106500),
  lx('MacBook Pro 16 inch (M5 Pro)', 'ram: 24 GB, storage: 1 TB', 940000),
  lx('MacBook Pro 16 inch M5 Max', 'ram: 36 GB, storage: 2 TB', 1554500),
  lx('MacBook Pro 16 inch M5 Max', 'ram: 48 GB, storage: 2 TB', 1640000),
  lx('MacBook Pro 14 inch M5 Max', 'ram: 36 GB, storage: 2 TB', 1489000),
  lx('Mac Mini M6', 'ram: 16GB, storage: 256GB', 309000),
]

const nanotek = shop([
  ['APPLE MACBOOK AIR M5 13" 24GB 1TB', '', 649000, 'In Stock'],
  ['APPLE MACBOOK AIR M5 15" 16GB 512GB', '', 579000, 'In Stock'],
  ['APPLE MACBOOK AIR M5 13" 16GB 512GB', '', 490000, 'In Stock'],
  ['Apple Macbook Neo 8GB 256GB', '', 255000, 'In Stock'],
  ['APPLE MACBOOK PRO M5 14" 16GB 1TB', '', 649000, 'Out of Stock'],
  ['APPLE MACBOOK PRO M5 PRO 14" 24GB 1TB', '', 845000, 'Out of Stock'],
])
const rooter = shop([
  ['Macbook Neo 13" A18 Pro 8GB 512GB', 'Color: Silver', 277000],
  ['Macbook Neo 13" A18 Pro 8GB 512GB', 'Color: Blush', 278000],
  ['M5 Max MacBook Pro 16" 48GB 2TB', '', null],
  ['M5 Pro MacBook Pro 14" 24GB 2TB', '', null],
  ['M5 Pro MacBook Pro 14" 24GB 1TB', '', 839000],
  ['M5 Max MacBook Pro 14" 32GB 2TB', '', null],
  ['MacBook Air 13" M5 16GB 512GB', 'Case color: Silver', 418000],
  ['MacBook Air 13" M5 16GB 512GB', 'Case color: Midnight', 415000],
  ['Macbook Case', '', 8500],
  ['Protective Case for MacBook', 'size: Pro 14.2"', 8500],
])
const ispot = shop([
  ['Macbook Pro M5 Pro Chip 14 inch', 'Unified Memory: 24GB, Storage: 1TB', 848076.92],
  ['Macbook Pro M5 Pro Chip 14 inch', 'Unified Memory: 24GB, Storage: 2TB', 987500],
  ['MacBook Neo 13 inch (2026)', 'Storage: 256GB', 254326.92],
  ['MacBook Air M5 Chip 13 inch (2026)', 'Unified Memory: 16GB/1TB', 530769.23],
  ['Macbook Pro M5 Chip 14 inch 16GB / 512GB (2025)', '', 637500],
  ['MacBook Air M4 Chip 13 inch 16GB / 512GB (2025)', '', 443269.23],
])

describe('live MacBook sample', () => {
  const configs = buildLuxConfigs(luxuryx, 'macbook')
  const { rows, summaries } = buildRows(
    configs,
    [
      { id: 'ispot', name: 'iSpot', url: '', response: ispot },
      { id: 'nanotek', name: 'Nanotek', url: '', response: nanotek },
      { id: 'rooter', name: 'Rooter', url: '', response: rooter },
    ],
    'macbook',
  )
  const get = (model: string, storage: string, ram: string, shopId: string) =>
    rows.find((r) => r.model === model && r.storage === storage && r.ram === ram && r.competitorId === shopId)!

  it('builds LuxuryX MacBook configurations only', () => {
    expect(configs).toHaveLength(17)
    expect(configs.some((c) => c.productName.startsWith('Mac Mini'))).toBe(false)
  })
  it('matches exact configurations at the lowest colour price', () => {
    expect(get('MacBook Air 13-inch M5', '512GB', '16GB', 'rooter')).toMatchObject({ matchStatus: 'Matched', competitorPrice: 415000 })
    expect(get('MacBook Air 13-inch M5', '512GB', '16GB', 'nanotek')).toMatchObject({ matchStatus: 'Matched', competitorPrice: 490000, availability: 'In Stock' })
    expect(get('MacBook Neo', '512GB', '8GB', 'rooter')).toMatchObject({ competitorPrice: 277000 })
    expect(get('MacBook Pro 14-inch M5', '512GB', '16GB', 'ispot')).toMatchObject({ competitorPrice: 637500 })
  })
  it('keeps the OLED model and M4 models apart', () => {
    expect(get('MacBook Pro 14-inch M5 Pro (15-core CPU) OLED', '1TB', '24GB', 'nanotek').matchStatus).toBe('Not Found')
    expect(get('MacBook Air 13-inch M5', '512GB', '16GB', 'ispot').matchStatus).toBe('Not Found') // iSpot's 16/512 is M4
  })
  it('applies the missing core count rule', () => {
    expect(get('MacBook Pro 14-inch M5 Pro (15-core CPU)', '1TB', '24GB', 'nanotek')).toMatchObject({ matchStatus: 'Matched', competitorPrice: 845000 })
    expect(get('MacBook Pro 14-inch M5 Pro (15-core CPU)', '2TB', '24GB', 'ispot').matchStatus).toBe('Not Found') // 15- or 18-core?
    expect(summaries.find((s) => s.shopId === 'ispot')!.ambiguousListings).toBe(1)
  })
  it('reports listings without a price as Price Unavailable', () => {
    expect(get('MacBook Pro 16-inch M5 Max', '2TB', '48GB', 'rooter').matchStatus).toBe('Price Unavailable')
    expect(get('MacBook Pro 14-inch M5 Max', '2TB', '36GB', 'rooter').matchStatus).toBe('Not Found') // Rooter's is 32GB
  })
  it('picks the cheapest competitor per configuration', () => {
    const group = rows.filter((r) => r.model === 'MacBook Pro 14-inch M5 Pro (15-core CPU)' && r.storage === '1TB')
    expect(group[0].cheapestCompetitor).toBe('Rooter')
  })
})
