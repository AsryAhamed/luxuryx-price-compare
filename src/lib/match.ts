import { modelLabel, parseListing, ramLabel, storageLabel } from './parse'
import type { Category, ExtractResponse, Listing, LuxConfig, ResultRow, Specs } from './types'

// ---------------------------------------------------------------------------
// LuxuryX side: one configuration per model + RAM/storage (+ chip setup), colours merged.
// ---------------------------------------------------------------------------

function luxuryxBelongs(l: Listing, category: Category): boolean {
  const brand = (l.brand || '').trim().toLowerCase()
  if (category === 'samsung') return brand === 'samsung' // excludes "Samsung Tab"
  if (category === 'iphone') return brand === 'apple' || brand === ''
  return /\bmacbook\b/i.test(l.title)
}

export function configKey(s: Specs, category: Category): string | null {
  if (!s.model || s.storage === null) return null
  if (category === 'iphone') return [s.model, s.storage].join('|')
  if (s.ram === null) return null
  if (category === 'samsung') return [s.model, s.ram, s.storage].join('|')
  if (!s.family || (!s.chip && s.family !== 'neo')) return null
  return [s.family, s.screen ?? '-', s.family === 'neo' ? '-' : s.chip, s.display, s.glass, s.cores ?? '-', s.ram, s.storage].join('|')
}

export function buildLuxConfigs(listings: Listing[], category: Category): LuxConfig[] {
  const map = new Map<string, LuxConfig & { sims: Set<string> }>()
  const productOrder = new Map<string, number>() // keep LuxuryX's own page order
  for (const l of listings) {
    if (!luxuryxBelongs(l, category)) continue
    const specs = parseListing(l.title, l.options, category)
    if (!specs) continue
    const key = configKey(specs, category)
    if (!key) continue
    if (!productOrder.has(l.title.trim())) productOrder.set(l.title.trim(), productOrder.size)
    let c = map.get(key)
    if (!c) {
      c = {
        key,
        category,
        productName: l.title.trim(),
        modelLabel: modelLabel(specs, category),
        specs,
        ramLabel: ramLabel(specs.ram),
        storageLabel: storageLabel(specs.storage),
        price: null,
        url: l.url,
        simNote: null,
        sims: new Set(),
      }
      map.set(key, c)
    }
    if (l.price !== null && (c.price === null || l.price < c.price)) c.price = l.price
    if (specs.sim) c.sims.add(specs.sim)
  }
  return [...map.values()]
    .map(({ sims, ...c }) => ({ ...c, simNote: sims.size ? [...sims].join(' / ') : null }))
    .sort((a, b) => productOrder.get(a.productName)! - productOrder.get(b.productName)! || (a.specs.ram ?? 0) - (b.specs.ram ?? 0) || (a.specs.storage ?? 0) - (b.specs.storage ?? 0))
}

// ---------------------------------------------------------------------------
// Competitor side: find the one LuxuryX configuration a listing describes.
// ---------------------------------------------------------------------------

interface Assignment {
  config: LuxConfig | null
  ambiguous: boolean
  notes: string[]
}

/**
 * MacBook rule (client decision 8): a listing that doesn't state the screen size
 * or the CPU core count is used only if exactly one LuxuryX configuration fits it.
 * If more than one could fit, it isn't used and the row shows Not Found.
 */
function macFits(l: Specs, c: Specs): { ok: boolean; notes: string[] } {
  const notes: string[] = []
  if (l.family !== c.family) return { ok: false, notes }
  if (c.family !== 'neo') {
    if (!l.chip || l.chip !== c.chip) return { ok: false, notes }
  }
  if (l.ram !== c.ram || l.storage !== c.storage) return { ok: false, notes }
  if (l.display !== c.display || l.glass !== c.glass) return { ok: false, notes }
  if (l.screen && c.screen && l.screen !== c.screen) return { ok: false, notes }
  if (!l.screen && c.screen) notes.push('screen size not stated by shop')
  if (l.cores && c.cores && l.cores !== c.cores) return { ok: false, notes }
  if (!l.cores && c.cores) notes.push('CPU core count not stated by shop')
  return { ok: true, notes }
}

export function assign(specs: Specs, configs: LuxConfig[], category: Category): Assignment {
  if (category === 'macbook') {
    const fits = configs.map((c) => ({ c, f: macFits(specs, c.specs) })).filter((x) => x.f.ok)
    if (fits.length === 1) return { config: fits[0].c, ambiguous: false, notes: fits[0].f.notes }
    return { config: null, ambiguous: fits.length > 1, notes: [] }
  }
  const key = configKey(specs, category)
  const config = key ? configs.find((c) => c.key === key) ?? null : null
  return { config, ambiguous: false, notes: [] }
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

interface Candidate {
  listing: Listing
  specs: Specs
  notes: string[]
}

function describeMatch(c: Candidate, category: Category): string {
  const parts: string[] = [c.specs.warranty ?? 'Warranty not stated']
  if (category !== 'macbook') parts.push(c.specs.sim ?? 'SIM not stated')
  parts.push(c.listing.priceType === 'cash' ? 'Cash price' : 'Listed selling price')
  return parts.concat(c.notes).join(' · ')
}

const availabilityRank = (a: string) => (a === 'In Stock' ? 0 : a === 'Pre-order' ? 1 : a === 'Not Shown' ? 2 : 3)

export interface CompetitorSummary {
  shopId: string
  shopName: string
  shopUrl: string
  response: ExtractResponse
  ambiguousListings: number
  matchedListings: number
}

export function buildRows(
  configs: LuxConfig[],
  shops: { id: string; name: string; url: string; response: ExtractResponse }[],
  category: Category,
): { rows: ResultRow[]; summaries: CompetitorSummary[] } {
  const rows: ResultRow[] = []
  const summaries: CompetitorSummary[] = []

  for (const shop of shops) {
    const r = shop.response
    const buckets = new Map<string, Candidate[]>()
    let ambiguous = 0
    let matched = 0
    if (r.ok) {
      for (const l of r.listings ?? []) {
        const specs = parseListing(l.title, l.options, category)
        if (!specs) continue
        const a = assign(specs, configs, category)
        if (a.ambiguous) ambiguous++
        if (!a.config) continue
        matched++
        const list = buckets.get(a.config.key) ?? []
        list.push({ listing: l, specs, notes: a.notes })
        buckets.set(a.config.key, list)
      }
    }
    summaries.push({ shopId: shop.id, shopName: shop.name, shopUrl: shop.url, response: r, ambiguousListings: ambiguous, matchedListings: matched })

    for (const c of configs) {
      const base = {
        id: c.key + '@' + shop.id,
        category,
        configKey: c.key,
        productName: c.productName,
        model: c.modelLabel,
        ram: c.ramLabel,
        storage: c.storageLabel,
        luxuryxPrice: c.price,
        luxuryxUrl: c.url,
        competitorId: shop.id,
        competitorName: shop.name,
        cheapestCompetitor: '',
        isCheapest: false,
        lastChecked: r.checkedAt,
      }
      if (!r.ok) {
        const notComparable = r.status === 'not_comparable'
        rows.push({
          ...base,
          competitorPrice: null,
          priceDifference: null,
          matchStatus: notComparable ? 'Not Comparable' : 'Website Inaccessible',
          matchDetail: r.message ?? '',
          availability: '',
          productUrl: shop.url,
        })
        continue
      }
      const found = buckets.get(c.key) ?? []
      const priced = found.filter((f) => f.listing.price !== null)
      if (!found.length) {
        rows.push({ ...base, competitorPrice: null, priceDifference: null, matchStatus: 'Not Found', matchDetail: '', availability: '', productUrl: '' })
        continue
      }
      if (!priced.length) {
        const f = found[0]
        rows.push({
          ...base,
          competitorPrice: null,
          priceDifference: null,
          matchStatus: 'Price Unavailable',
          matchDetail: 'Listed without a price',
          availability: f.listing.availability,
          productUrl: f.listing.url,
        })
        continue
      }
      // Lowest price across colours/options of the exact configuration (decision 7).
      priced.sort((a, b) => a.listing.price! - b.listing.price! || availabilityRank(a.listing.availability) - availabilityRank(b.listing.availability))
      const best = priced[0]
      rows.push({
        ...base,
        competitorPrice: best.listing.price,
        priceDifference: c.price !== null ? best.listing.price! - c.price : null,
        matchStatus: 'Matched',
        matchDetail: describeMatch(best, category),
        availability: best.listing.availability,
        productUrl: best.listing.url,
      })
    }
  }

  // Cheapest competitor per LuxuryX configuration.
  const byConfig = new Map<string, ResultRow[]>()
  for (const row of rows) byConfig.set(row.configKey, [...(byConfig.get(row.configKey) ?? []), row])
  for (const group of byConfig.values()) {
    const priced = group.filter((r) => r.matchStatus === 'Matched' && r.competitorPrice !== null)
    const min = priced.length ? Math.min(...priced.map((r) => r.competitorPrice!)) : null
    const winners = min === null ? [] : priced.filter((r) => r.competitorPrice === min)
    const label = winners.length ? winners.map((w) => w.competitorName).join(' / ') : 'None found'
    for (const r of group) {
      r.cheapestCompetitor = label
      r.isCheapest = winners.includes(r)
    }
  }

  const order = new Map(configs.map((c, i) => [c.key, i]))
  const shopOrder = new Map(shops.map((s, i) => [s.id, i]))
  rows.sort((a, b) => order.get(a.configKey)! - order.get(b.configKey)! || shopOrder.get(a.competitorId)! - shopOrder.get(b.competitorId)!)
  return { rows, summaries }
}

export function statusText(r: ResultRow): string {
  return r.matchDetail ? r.matchStatus + ' – ' + r.matchDetail : r.matchStatus
}
