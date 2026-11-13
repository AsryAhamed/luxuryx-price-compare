import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { buildLuxConfigs, buildRows } from './match'
import type { ExtractResponse, Listing } from './types'

const L = (title: string, options: string, price: number | null, extra: Partial<Listing> = {}): Listing => ({
  title,
  options,
  price,
  priceType: 'listed',
  availability: 'In Stock',
  url: 'https://example.lk/' + encodeURIComponent(title),
  ...extra,
})
const lux = (title: string, options: string, price: number | null, brand = 'Apple'): Listing => ({
  ...L(title, options, price, { priceType: 'cash' }),
  brand,
  url: 'https://luxuryx.lk/x',
})
const ok = (listings: Listing[]): ExtractResponse => ({ ok: true, status: 'ok', listings, checkedAt: '2026-11-13T08:30:00.000Z' })

describe('LuxuryX configurations', () => {
  it('merges colours at the lowest price and ignores zero prices', () => {
    const configs = buildLuxConfigs(
      [
        lux('iPhone 18 Pro', 'ram: 12GB, storage: 256GB', 480000),
        lux('iPhone 18 Pro', 'ram: 12GB, storage: 256GB', 473000),
        lux('iPhone 18 Pro', 'ram: 12GB, storage: 512GB', null),
      ],
      'iphone',
    )
    expect(configs.map((c) => [c.storageLabel, c.price])).toEqual([
      ['256GB', 473000],
      ['512GB', null],
    ])
  })
  it('keeps only Samsung phones (no Samsung Tab, no other brands)', () => {
    const configs = buildLuxConfigs(
      [
        lux('Samsung Galaxy S26', 'ram: 12 GB, storage: 256 GB', 242000, 'Samsung'),
        lux('Samsung Galaxy Tab S10 Lite 5G', 'ram: 6GB, storage: 128GB', 119000, 'Samsung Tab'),
        lux('Google Pixel 10', 'ram: 12 GB, storage: 128 GB', 194000, 'Google'),
      ],
      'samsung',
    )
    expect(configs.map((c) => c.modelLabel)).toEqual(['Galaxy S26'])
  })
  it('keeps only MacBooks', () => {
    const configs = buildLuxConfigs(
      [lux('MacBook Neo', 'ram: 8 GB, storage: 256 GB', 244000), lux('Mac Mini M6', 'ram: 16GB, storage: 256GB', 309000)],
      'macbook',
    )
    expect(configs).toHaveLength(1)
  })
})

describe('rows', () => {
  const configs = buildLuxConfigs(
    [
      lux('Samsung Galaxy S26 Ultra', 'ram: 12 GB, storage: 256 GB', 315000, 'Samsung'),
      lux('Samsung Galaxy A07', 'ram: 4 GB, storage: 64 GB', 42000, 'Samsung'),
      lux('Samsung Galaxy A57 5G', 'ram: 8 GB, storage: 256 GB', 139000, 'Samsung'),
    ],
    'samsung',
  )
  const shops = [
    {
      id: 'smartmobile',
      name: 'Smart Mobile',
      url: 'https://smartmobile.lk',
      response: ok([
        L('Samsung Galaxy S26 Ultra (12GB RAM|256GB)', '', 503990),
        L('Samsung Galaxy S26 Ultra (12GB RAM|256GB) Checking Warranty', '', 309990),
        L('Samsung Galaxy A07 4G (4GB RAM|64GB)', '', 56990),
        L('Samsung Galaxy A57 (8GB RAM|256GB)', '', 211990),
      ]),
    },
    {
      id: 'simplytek',
      name: 'Simplytek',
      url: 'https://www.simplytek.lk',
      response: ok([L('Galaxy S26 Ultra', 'Storage: 12GB RAM 256GB ROM', 549999), L('Galaxy A07', 'Storage: 4GB RAM 64GB ROM', null)]),
    },
    {
      id: 'presentsolution',
      name: 'Present Solution',
      url: 'https://presentsolution.lk',
      response: { ok: false, status: 'inaccessible', message: 'The website blocked automated access (HTTP 403).', checkedAt: '2026-11-13T08:30:00.000Z' } as ExtractResponse,
    },
  ]
  const { rows } = buildRows(configs, shops, 'samsung')
  const row = (model: string, shop: string) => rows.find((r) => r.model === model && r.competitorId === shop)!

  it('uses the lowest exact-configuration price and states the warranty', () => {
    const r = row('Galaxy S26 Ultra', 'smartmobile')
    expect(r.matchStatus).toBe('Matched')
    expect(r.competitorPrice).toBe(309990)
    expect(r.matchDetail).toContain('Company warranty')
    expect(r.priceDifference).toBe(309990 - 315000)
  })
  it('marks the cheapest competitor for each configuration', () => {
    const group = rows.filter((r) => r.model === 'Galaxy S26 Ultra')
    expect(group.every((r) => r.cheapestCompetitor === 'Smart Mobile')).toBe(true)
    expect(group.filter((r) => r.isCheapest).map((r) => r.competitorId)).toEqual(['smartmobile'])
  })
  it('does not assume 4G/5G', () => {
    expect(row('Galaxy A07', 'smartmobile').matchStatus).toBe('Not Found') // shop says "A07 4G", LuxuryX says "A07"
    expect(row('Galaxy A57 5G', 'smartmobile').matchStatus).toBe('Not Found') // shop says "A57", LuxuryX says "A57 5G"
  })
  it('reports Price Unavailable and Website Inaccessible', () => {
    expect(row('Galaxy A07', 'simplytek').matchStatus).toBe('Price Unavailable')
    expect(row('Galaxy S26 Ultra', 'presentsolution').matchStatus).toBe('Website Inaccessible')
  })
  it('writes the CSV with the agreed columns', () => {
    const csv = toCsv(rows)
    const [header, first] = csv.replace('﻿', '').split('\r\n')
    expect(header).toBe(
      'Category,Product Name,Model,RAM,Storage,Luxury X Price,Competitor Name,Competitor Price,Cheapest Competitor,Price Difference,Match Status,Availability,Product URL,Last Checked',
    )
    expect(first.startsWith('Samsung Phone,')).toBe(true)
  })
})

describe('MacBook rule for missing core count / screen size (decision 8)', () => {
  const configs = buildLuxConfigs(
    [
      lux('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 1 TB, core: 15-core', 825000),
      lux('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 2 TB, core: 15-core', 1029500),
      lux('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 2 TB, core: 18-core', 1100000),
      lux('MacBook Pro 16 inch M5 Max', 'ram: 48 GB, storage: 2 TB', 1640000),
      lux('MacBook Pro 14 inch M5 Max', 'ram: 36 GB, storage: 2 TB', 1489000),
    ],
    'macbook',
  )
  const { rows } = buildRows(
    configs,
    [
      {
        id: 'chama',
        name: 'Chama Computers',
        url: 'https://www.chamacomputers.lk',
        response: ok([
          L("MacBook Pro M5 Pro 14'' 24GB 1TB SILVER", '', 775000),
          L("MacBook Pro M5 Pro 14'' 24GB 2TB SILVER", '', 990000),
          L('MacBook Pro Apple M5 Max chip with 18-core CPU and 40-core GPU, 48GB, 2TB SSD - Space Black', '', 1545000),
        ]),
      },
    ],
    'macbook',
  )
  it('matches when only one LuxuryX configuration fits', () => {
    const r = rows.find((x) => x.model.includes('M5 Pro') && x.storage === '1TB')!
    expect(r.matchStatus).toBe('Matched')
    expect(r.matchDetail).toContain('core count not stated')
  })
  it('shows Not Found when more than one configuration fits', () => {
    expect(rows.filter((x) => x.model.includes('M5 Pro') && x.storage === '2TB').map((x) => x.matchStatus)).toEqual(['Not Found', 'Not Found'])
  })
  it('uses a listing without screen size only when one size fits', () => {
    const r = rows.find((x) => x.model.includes('16-inch M5 Max'))!
    expect(r.matchStatus).toBe('Matched')
    expect(r.matchDetail).toContain('screen size not stated')
  })
})
