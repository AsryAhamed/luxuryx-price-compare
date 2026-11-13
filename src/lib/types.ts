export type Category = 'iphone' | 'samsung' | 'macbook'

export const CATEGORY_LABEL: Record<Category, string> = {
  iphone: 'iPhone',
  samsung: 'Samsung Phone',
  macbook: 'MacBook',
}

export type PriceType = 'cash' | 'listed'

/** One product option as read from a website by the n8n extractor. */
export interface Listing {
  title: string
  /** "Storage: 256GB, SIM Type: eSIM" – option names and values, colour removed for LuxuryX. */
  options: string
  /** Price in LKR, or null when the site shows no price / 0. */
  price: number | null
  priceType: PriceType
  availability: string
  url: string
  /** LuxuryX only */
  brand?: string
}

export interface SourceInfo {
  id: string
  name: string
  url: string
}

export type ExtractStatus = 'ok' | 'inaccessible' | 'not_comparable' | 'error'

export interface ExtractResponse {
  ok: boolean
  status: ExtractStatus
  shop?: SourceInfo
  category?: Category
  listings?: Listing[]
  notes?: string[]
  message?: string
  requests?: number
  ms?: number
  checkedAt: string
}

/** Attributes read from a title + options text. Missing values are null. */
export interface Specs {
  /** Canonical model key, e.g. "iphone 17 pro max", "galaxy a17 5g", "macbook pro" */
  model: string | null
  ram: number | null // GB
  storage: number | null // GB (1TB = 1024)
  // MacBook only
  family?: 'air' | 'pro' | 'neo' | null
  screen?: number | null
  chip?: string | null // "m5", "m5 pro", "m5 max"
  cores?: number | null // CPU cores
  glass?: 'nano' | 'standard'
  display?: 'oled' | 'standard'
  // Phones
  sim?: 'eSIM' | 'Physical SIM' | null
  warranty?: 'Official warranty' | 'Company warranty' | null
}

/** One LuxuryX configuration to compare (colours merged). */
export interface LuxConfig {
  key: string
  category: Category
  productName: string
  modelLabel: string
  specs: Specs
  ramLabel: string
  storageLabel: string
  /** Lowest LuxuryX cash price across colours, or null when LuxuryX shows no price. */
  price: number | null
  url: string
  simNote: string | null
}

export type MatchStatus =
  | 'Matched'
  | 'Not Found'
  | 'Price Unavailable'
  | 'Website Inaccessible'
  | 'Not Comparable'

export interface ResultRow {
  id: string
  category: Category
  configKey: string
  productName: string
  model: string
  ram: string
  storage: string
  luxuryxPrice: number | null
  luxuryxUrl: string
  competitorId: string
  competitorName: string
  competitorPrice: number | null
  cheapestCompetitor: string
  /** competitor price − LuxuryX price (negative = competitor is cheaper) */
  priceDifference: number | null
  matchStatus: MatchStatus
  matchDetail: string
  availability: string
  productUrl: string
  lastChecked: string
  isCheapest: boolean
}
