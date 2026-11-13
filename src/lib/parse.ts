import type { Category, Specs } from './types'

/**
 * Reads model, RAM, storage and the other matching attributes from a product
 * title plus its option text. The same reader is used for LuxuryX and for
 * every competitor, so both sides are described in the same words.
 *
 * Anything the text does not state is returned as null. Nothing is guessed.
 */

export function normalise(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/–|—/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Products that are never a new phone or laptop of the compared model. */
const EXCLUDE =
  /\b(case|cases|cover|tempered|protector|charger|adapter|adaptor|cable|skin|lens|strap|band|pouch|sleeve|holder|mount|dock|hub|keyboard|mouse|airpods|watch|ipad|tab|tablet|buds|ring|pencil|stylus|battery|housing|replacement|dummy|demo|pre[-\s]?owned|used|refurb\w*|renewed|open[-\s]?box|second[-\s]?hand|like new|book)\b/

export function isExcluded(title: string): boolean {
  return EXCLUDE.test(normalise(title))
}

const toGb = (n: number, unit: string) => (unit.toLowerCase().startsWith('t') ? Math.round(n * 1024) : n)

interface Sizes {
  ram: number | null
  storage: number | null
}

/** RAM and storage in GB. */
export function parseSizes(raw: string, category: Category): Sizes {
  let text = normalise(raw)
  let ram: number | null = null
  let storage: number | null = null

  // Phones have at most 24GB RAM and at least 32GB storage; MacBooks at most 128GB RAM
  // and at least 128GB storage. A value outside its range is never taken for it.
  const maxRam = category === 'macbook' ? 128 : 24
  const minStorage = category === 'macbook' ? 128 : 32
  const firstValid = (re: RegExp, ok: (gb: number) => boolean) => {
    for (const m of text.matchAll(re)) {
      const gb = toGb(Number(m[1]), m[2] || 'gb')
      if (ok(gb)) return { gb, raw: m[0] }
    }
    return null
  }

  // 1) Labelled values: "Storage: 256GB", "256GB ROM", "RAM: 12GB", "12GB RAM", "Unified Memory: 16GB"
  const st =
    firstValid(/(?:\bstorage|\bcapacity|\brom|\bssd|\binternal)\s*[:\-]?\s*(\d{1,4}(?:\.\d)?)\s*(gb|tb)\b/g, (v) => v >= minStorage) ||
    firstValid(/(\d{1,4}(?:\.\d)?)\s*(gb|tb)\s*(?:of\s*)?(?:rom|storage|ssd|internal)\b/g, (v) => v >= minStorage)
  if (st) {
    storage = st.gb
    text = text.replace(st.raw, ' ')
  }
  const rm =
    firstValid(/(?:\bram|\bmemory|unified memory)\s*[:\-]?\s*(\d{1,3})\s*(gb)\b/g, (v) => v <= maxRam) ||
    firstValid(/(\d{1,3})\s*(gb)\s*(?:of\s*)?(?:ram|memory|unified|lpddr\w*)\b/g, (v) => v <= maxRam)
  if (rm) {
    ram = rm.gb
    text = text.replace(rm.raw, ' ')
  }

  // 2) Pairs written together: "12gb + 256gb", "16gb/512gb", "12gb|256gb", "24gb 1tb"
  if (ram === null || storage === null) {
    for (const pm of text.matchAll(/(\d{1,3})\s*gb\s*(?:[/+|,]|\band\b)?\s*(\d{2,4}|\d(?:\.\d)?)\s*(gb|tb)\b/g)) {
      const a = Number(pm[1])
      const b = toGb(Number(pm[2]), pm[3])
      if (a <= maxRam && b >= minStorage && a < b && (ram === null || ram === a) && (storage === null || storage === b)) {
        ram = a
        storage = b
        text = text.replace(pm[0], ' ')
        break
      }
    }
  }

  // 3) Remaining plain values, e.g. "256gb"
  const plain = [...text.matchAll(/(\d{1,4}(?:\.\d)?)\s*(gb|tb)\b/g)].map((m) => toGb(Number(m[1]), m[2]))
  if (plain.length) {
    const sorted = [...new Set(plain)].sort((a, b) => a - b)
    const storageFloor = category === 'macbook' ? 256 : 64
    if (storage === null) {
      const big = sorted.filter((v) => v >= storageFloor)
      // Exactly one storage-sized value: that is the storage. Two or more: unclear, leave it empty.
      if (big.length === 1) storage = big[0]
    }
    if (ram === null) {
      const small = sorted.filter((v) => v < (storage ?? Infinity) && v <= maxRam)
      if (small.length === 1) ram = small[0]
    }
  }
  return { ram, storage }
}

export function parseSim(raw: string): Specs['sim'] {
  const t = normalise(raw)
  // "phisycal" is a real spelling seen on a shop's option list.
  if (/\bph[a-z]*cal\s*sim|nano[-\s]?sim|dual[-\s]?sim|sim\s*\+\s*e-?sim/.test(t)) return 'Physical SIM'
  if (/\be-?sim\b/.test(t)) return 'eSIM'
  return null
}

export function parseWarranty(raw: string): Specs['warranty'] {
  const t = normalise(raw)
  if (/(company|checking|shop|store|seller|local|dealer)\s*warranty/.test(t)) return 'Company warranty'
  if (/\bgnext\b|official|apple\s*care|applecare|brand\s*warranty|agent\s*warranty|authori[sz]ed|samsung\s*(sri\s*lanka\s*)?warranty/.test(t))
    return 'Official warranty'
  return null
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export function parseIphoneModel(title: string): string | null {
  const t = normalise(title)
  const named = t.match(/\biphone\s*(air|duo)\b/)
  if (named) return 'iphone ' + named[1]
  const m = t.match(/\biphone\s*(\d{2})\s*(e\b)?\s*(pro\s*max|pro|plus|mini)?\b/)
  if (!m) return null
  return ['iphone', m[1] + (m[2] ? 'e' : ''), m[3] ? m[3].replace(/\s+/g, ' ') : ''].join(' ').trim()
}

/**
 * Samsung model key. For A/M/F-series the 4G/5G marker is part of the model
 * (client decision 9: never assume 4G or 5G when it isn't stated).
 * S and Z models are only sold as 5G, so the marker is dropped there.
 */
export function parseSamsungModel(title: string, options = ''): string | null {
  const t = normalise(title)
  const z = t.match(/\bgalaxy\s*z\s*(fold|flip)\s*(\d{1,2})\s*(ultra|fe|plus|\+)?/)
  if (z) return ['galaxy z', z[1] + z[2], plusWord(z[3])].join(' ').trim()
  const s = t.match(/\bgalaxy\s*s\s*(\d{2})\s*(ultra|fe|plus|edge|\+)?/)
  if (s) return ['galaxy s' + s[1], plusWord(s[2])].join(' ').trim()
  const a = t.match(/\bgalaxy\s*([amf])\s*(\d{2})(s)?\b/)
  if (a) {
    const net = (t + ' ' + normalise(options)).match(/\b([45])g\b/)
    return ['galaxy ' + a[1] + a[2] + (a[3] || ''), net ? net[1] + 'g' : ''].join(' ').trim()
  }
  return null
}

function plusWord(x?: string): string {
  if (!x) return ''
  return x === '+' ? 'plus' : x
}

export interface MacParts {
  family: 'air' | 'pro' | 'neo' | null
  chip: string | null
  screen: number | null
  cores: number | null
  glass: 'nano' | 'standard'
  display: 'oled' | 'standard'
}

export function parseMac(title: string, options = ''): MacParts | null {
  const t = normalise(title)
  if (!/\bmacbook\b/.test(t)) return null
  const all = t + ' | ' + normalise(options)
  const family: MacParts['family'] = /\bneo\b/.test(t) ? 'neo' : /\bair\b/.test(t) ? 'air' : /\bpro\b/.test(t) ? 'pro' : null

  const chipMatch = t.match(/(?:^|[\s(,])m(\d)\s*(pro|max|ultra)?\b/)
  const chip = chipMatch ? 'm' + chipMatch[1] + (chipMatch[2] ? ' ' + chipMatch[2] : '') : null

  let screen: number | null = null
  const withUnit = t.match(/\b(1[3-6])(?:\.\d)?\s*(?:-|\s)?(?:inch(?:es)?|in\b|"|''|-in\b)/)
  if (withUnit) screen = Number(withUnit[1])
  else {
    const noSizes = t.replace(/\d+(?:\.\d)?\s*(?:gb|tb)\b/g, ' ')
    const bare = noSizes.match(/\b(1[3-6])\b(?!\s*(?:-?\s*core|c\b|\.\d|th\b|gb|tb))/)
    if (bare) screen = Number(bare[1])
  }

  const coreMatch =
    all.match(/(\d{1,2})\s*-?\s*core\s*cpu/) ||
    all.match(/(?:core|processor)\s*[:\-]?\s*(\d{1,2})\s*-?\s*core/) ||
    all.match(/(\d{1,2})\s*-?\s*core\b/) ||
    all.match(/\b(\d{1,2})c\s*\|/)
  const cores = coreMatch ? Number(coreMatch[1]) : null

  return {
    family,
    chip,
    screen,
    cores,
    glass: /nano[-\s]?texture/.test(all) ? 'nano' : 'standard',
    display: /\bpro\s*oled\b|\bproled\b|\boled\b/.test(t) ? 'oled' : 'standard',
  }
}

/** Full attribute read for one listing. Returns null when it isn't a product of this category. */
export function parseListing(title: string, options: string, category: Category): Specs | null {
  if (isExcluded(title)) return null
  const both = title + ' | ' + options
  const { ram, storage } = parseSizes(both, category)
  if (category === 'iphone') {
    const model = parseIphoneModel(title)
    if (!model) return null
    return { model, ram, storage, sim: parseSim(both), warranty: parseWarranty(both) }
  }
  if (category === 'samsung') {
    const model = parseSamsungModel(title, options)
    if (!model) return null
    return { model, ram, storage, sim: parseSim(both), warranty: parseWarranty(both) }
  }
  const mac = parseMac(title, options)
  if (!mac || !mac.family) return null
  return {
    model: 'macbook ' + mac.family,
    ram,
    storage,
    family: mac.family,
    chip: mac.chip,
    screen: mac.screen,
    cores: mac.cores,
    glass: mac.glass,
    display: mac.display,
    warranty: parseWarranty(both),
  }
}

export function storageLabel(gb: number | null): string {
  if (gb === null) return ''
  return gb >= 1024 ? gb / 1024 + 'TB' : gb + 'GB'
}

export function ramLabel(gb: number | null): string {
  return gb === null ? '' : gb + 'GB'
}

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (c) => c.toUpperCase())

export function modelLabel(specs: Specs, category: Category): string {
  if (category === 'iphone') return (specs.model || '').replace(/^iphone/, 'iPhone').replace(/\b(pro|max|plus|mini|air|duo)\b/g, (w) => titleCase(w))
  if (category === 'samsung')
    return titleCase(specs.model || '')
      .replace(/\b(\d)g\b/gi, '$1G')
      .replace(/\bFe\b/, 'FE')
      .replace(/ Plus\b/, '+')
  const parts = ['MacBook ' + titleCase(specs.family || '')]
  if (specs.screen) parts.push(specs.screen + '-inch')
  if (specs.chip) parts.push(specs.chip.toUpperCase().replace(' PRO', ' Pro').replace(' MAX', ' Max'))
  if (specs.cores) parts.push('(' + specs.cores + '-core CPU)')
  if (specs.display === 'oled') parts.push('OLED')
  if (specs.glass === 'nano') parts.push('Nano-texture')
  return parts.join(' ')
}
