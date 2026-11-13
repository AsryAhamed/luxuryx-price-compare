import { buildLuxConfigs, buildRows, type CompetitorSummary } from './match'
import { COMPETITORS, type ShopInfo } from './shops'
import type { Category, ExtractResponse, LuxConfig, ResultRow } from './types'

/**
 * The only setting the app needs: the n8n webhook address. It is a public URL,
 * not a secret. Nothing secret is ever placed in this front end.
 */
export const WEBHOOK_URL: string = (import.meta.env.VITE_N8N_WEBHOOK_URL ?? '').trim()

const SHOP_TIMEOUT_MS = 290_000 // a slow shop gets up to ~5 minutes
const PARALLEL_SHOPS = 3

export class ComparisonError extends Error {}

async function callWebhook(params: Record<string, string>, signal: AbortSignal): Promise<ExtractResponse> {
  if (!WEBHOOK_URL) throw new ComparisonError('The n8n webhook address is not set. Add VITE_N8N_WEBHOOK_URL to the .env file and rebuild.')
  const url = WEBHOOK_URL + (WEBHOOK_URL.includes('?') ? '&' : '?') + new URLSearchParams(params).toString()
  const timeout = AbortSignal.timeout(SHOP_TIMEOUT_MS)
  const combined = AbortSignal.any([signal, timeout])
  let res: Response
  try {
    // A plain GET keeps this a "simple" CORS request (no pre-flight).
    res = await fetch(url, { method: 'GET', signal: combined })
  } catch (e) {
    if (signal.aborted) throw e
    if (timeout.aborted) throw new ComparisonError('The n8n workflow took too long to answer.')
    throw new ComparisonError('Could not reach the n8n workflow. Check that n8n is running, the workflow is active and its allowed origin includes this app.')
  }
  if (!res.ok) throw new ComparisonError(`The n8n workflow answered with HTTP ${res.status}. Check that the workflow is active.`)
  try {
    return (await res.json()) as ExtractResponse
  } catch {
    throw new ComparisonError('The n8n workflow sent an unreadable answer.')
  }
}

export type ShopState = 'waiting' | 'checking' | 'done' | 'blocked' | 'not_comparable' | 'failed'

export interface Progress {
  phase: 'luxuryx' | 'competitors' | 'matching'
  luxuryxProducts: number
  configs: number
  shops: { shop: ShopInfo; state: ShopState; listings: number; message?: string }[]
  shopsDone: number
}

export interface ComparisonResult {
  category: Category
  configs: LuxConfig[]
  rows: ResultRow[]
  summaries: CompetitorSummary[]
  startedAt: string
  finishedAt: string
}

export async function runComparison(
  category: Category,
  onProgress: (p: Progress) => void,
  signal: AbortSignal,
): Promise<ComparisonResult> {
  const startedAt = new Date().toISOString()
  const shops = COMPETITORS[category]
  const progress: Progress = {
    phase: 'luxuryx',
    luxuryxProducts: 0,
    configs: 0,
    shops: shops.map((shop) => ({ shop, state: 'waiting', listings: 0 })),
    shopsDone: 0,
  }
  const emit = () => onProgress({ ...progress, shops: progress.shops.map((s) => ({ ...s })) })
  emit()

  // 1) LuxuryX
  const lux = await callWebhook({ action: 'luxuryx', category }, signal)
  if (!lux.ok) throw new ComparisonError('Could not read the LuxuryX website: ' + (lux.message ?? 'unknown error'))
  const configs = buildLuxConfigs(lux.listings ?? [], category)
  if (!configs.length) throw new ComparisonError('No active LuxuryX products were found in this category.')
  progress.luxuryxProducts = new Set((lux.listings ?? []).map((l) => l.url)).size
  progress.configs = configs.length
  progress.phase = 'competitors'
  emit()

  // 2) Competitors, a few at a time
  const responses: ExtractResponse[] = new Array(shops.length)
  let next = 0
  async function worker() {
    while (next < shops.length) {
      const i = next++
      const entry = progress.shops[i]
      entry.state = 'checking'
      emit()
      let r: ExtractResponse
      try {
        r = await callWebhook({ action: 'competitor', category, shop: shops[i].id }, signal)
      } catch (e) {
        if (signal.aborted) throw e
        r = { ok: false, status: 'error', message: e instanceof Error ? e.message : String(e), checkedAt: new Date().toISOString() }
      }
      responses[i] = r
      entry.listings = r.listings?.length ?? 0
      entry.message = r.message
      entry.state = r.ok ? 'done' : r.status === 'not_comparable' ? 'not_comparable' : r.status === 'inaccessible' ? 'blocked' : 'failed'
      progress.shopsDone++
      emit()
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL_SHOPS, shops.length) }, worker))

  // 3) Matching (in the browser)
  progress.phase = 'matching'
  emit()
  const { rows, summaries } = buildRows(
    configs,
    shops.map((s, i) => ({ id: s.id, name: s.name, url: s.url, response: responses[i] })),
    category,
  )
  return { category, configs, rows, summaries, startedAt, finishedAt: new Date().toISOString() }
}
