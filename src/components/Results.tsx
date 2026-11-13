import { Download, ExternalLink, Search, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ComparisonResult } from '../lib/api'
import { downloadCsv, formatDateTime } from '../lib/csv'
import { CATEGORY_LABEL, type MatchStatus, type ResultRow } from '../lib/types'
import { lkr, signedLkr, StatusBadge, timeOf } from './ui'

const STATUSES: MatchStatus[] = ['Matched', 'Not Found', 'Price Unavailable', 'Website Inaccessible', 'Not Comparable']

function DiffCell({ row }: { row: ResultRow }) {
  const d = row.priceDifference
  if (d === null) return <span className="text-slate-400">—</span>
  const cls = d < 0 ? 'text-rose-700' : d > 0 ? 'text-emerald-700' : 'text-slate-600'
  return (
    <span className={`whitespace-nowrap font-medium tabular-nums ${cls}`} title={d < 0 ? 'Competitor is cheaper than LuxuryX' : d > 0 ? 'Competitor is dearer than LuxuryX' : 'Same price'}>
      {signedLkr(d)}
    </span>
  )
}

// Shop-level messages (blocked site, not comparable) repeat on every row, so they are shown
// once under "Competitor check details" and as a tooltip; the CSV still carries them in full.
const showDetail = (r: ResultRow) => r.matchStatus === 'Matched' || r.matchStatus === 'Price Unavailable'

function SourceLink({ url }: { url: string }) {
  if (!url) return <span className="text-slate-400">—</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 underline-offset-2 hover:underline" title={url}>
      Open <ExternalLink className="size-3.5" />
    </a>
  )
}

export function Results({ result }: { result: ComparisonResult }) {
  const [query, setQuery] = useState('')
  const [shop, setShop] = useState('all')
  const [status, setStatus] = useState<'all' | MatchStatus>('all')
  const [cheapestOnly, setCheapestOnly] = useState(false)

  const shopNames = useMemo(() => [...new Map(result.rows.map((r) => [r.competitorId, r.competitorName])).entries()], [result])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return result.rows.filter(
      (r) =>
        (!q || [r.productName, r.model, r.ram, r.storage, r.competitorName].join(' ').toLowerCase().includes(q)) &&
        (shop === 'all' || r.competitorId === shop) &&
        (status === 'all' || r.matchStatus === status) &&
        (!cheapestOnly || r.isCheapest),
    )
  }, [result, query, shop, status, cheapestOnly])

  const stats = useMemo(() => {
    const configs = new Set(result.rows.map((r) => r.configKey))
    const withMatch = new Set(result.rows.filter((r) => r.matchStatus === 'Matched').map((r) => r.configKey))
    const undercut = new Set(result.rows.filter((r) => r.isCheapest && r.priceDifference !== null && r.priceDifference < 0).map((r) => r.configKey))
    return { configs: configs.size, withMatch: withMatch.size, undercut: undercut.size }
  }, [result])

  const fileName = `luxuryx-${result.category}-price-comparison-${formatDateTime(result.finishedAt).replace(/[: ]/g, '-')}.csv`
  // Group shading: alternate background per LuxuryX configuration.
  const groupIndex = new Map<string, number>()
  for (const r of rows) if (!groupIndex.has(r.configKey)) groupIndex.set(r.configKey, groupIndex.size)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => downloadCsv(result.rows, fileName)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Download className="size-4" /> Download CSV
          </button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{CATEGORY_LABEL[result.category]} results</h2>
            <p className="text-xs text-slate-500">Checked {timeOf(result.finishedAt)} · CSV includes all {result.rows.length} rows</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center sm:max-w-xl">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Configurations</dt>
            <dd className="text-lg font-semibold tabular-nums">{stats.configs}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Found at a competitor</dt>
            <dd className="text-lg font-semibold tabular-nums">{stats.withMatch}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Cheaper elsewhere</dt>
            <dd className="text-lg font-semibold tabular-nums text-rose-700">{stats.undercut}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto]">
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, model, storage…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </label>
          <select value={shop} onChange={(e) => setShop(e.target.value)} aria-label="Competitor" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none">
            <option value="all">All competitors</option>
            {shopNames.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as MatchStatus | 'all')} aria-label="Match status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none">
            <option value="all">All match statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={cheapestOnly} onChange={(e) => setCheapestOnly(e.target.checked)} className="size-4 accent-slate-900" />
            Cheapest only
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Showing {rows.length} of {result.rows.length} rows. Price difference = competitor price − LuxuryX price; red means the competitor is cheaper. All prices LKR.
        </p>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              {['Product Name', 'Model', 'RAM', 'Storage', 'Luxury X Price', 'Competitor', 'Competitor Price', 'Cheapest Competitor', 'Price Difference', 'Match Status', 'Availability', 'Source'].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const shade = (groupIndex.get(r.configKey) ?? 0) % 2 === 1
              return (
                <tr
                  key={r.id}
                  className={`border-t border-slate-100 align-top ${r.isCheapest ? 'bg-emerald-50 shadow-[inset_3px_0_0_0_var(--color-emerald-500)]' : shade ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.productName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{r.model}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.ram || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.storage}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{lkr(r.luxuryxPrice)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.competitorName}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                    {r.isCheapest ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                        <Trophy className="size-3.5" />
                        {lkr(r.competitorPrice)}
                      </span>
                    ) : (
                      lkr(r.competitorPrice)
                    )}
                  </td>
                  <td className="px-3 py-2.5">{r.cheapestCompetitor}</td>
                  <td className="px-3 py-2.5">
                    <DiffCell row={r} />
                  </td>
                  <td className="min-w-[13rem] px-3 py-2.5">
                    <span title={r.matchDetail || undefined}>
                      <StatusBadge status={r.matchStatus} />
                    </span>
                    {r.matchDetail && showDetail(r) && <p className="mt-1 text-xs leading-snug text-slate-500">{r.matchDetail}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{r.availability || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <SourceLink url={r.productUrl} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={`p-4 ${r.isCheapest ? 'bg-emerald-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.model}</p>
                <p className="text-xs text-slate-500">
                  {[r.ram, r.storage].filter(Boolean).join(' · ')} · LuxuryX {lkr(r.luxuryxPrice)}
                </p>
              </div>
              <StatusBadge status={r.matchStatus} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-sm">
                <span className="font-medium">{r.competitorName}</span>{' '}
                <span className="tabular-nums">{lkr(r.competitorPrice)}</span>
                {r.isCheapest && <Trophy className="ml-1 inline size-3.5 text-emerald-700" aria-label="Cheapest" />}
              </p>
              <DiffCell row={r} />
            </div>
            {r.matchDetail && showDetail(r) && <p className="mt-1 text-xs text-slate-500">{r.matchDetail}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>Cheapest: {r.cheapestCompetitor}</span>
              {r.availability && <span>{r.availability}</span>}
              <SourceLink url={r.productUrl} />
            </div>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="p-6 text-center text-sm text-slate-500">No rows match these filters.</p>}

      <ShopNotes result={result} />
    </section>
  )
}

function ShopNotes({ result }: { result: ComparisonResult }) {
  return (
    <details className="border-t border-slate-200 p-4 text-sm sm:p-5">
      <summary className="cursor-pointer font-medium text-slate-700">Competitor check details</summary>
      <ul className="mt-3 space-y-2">
        {result.summaries.map((s) => (
          <li key={s.shopId} className="flex flex-wrap gap-x-2 text-slate-600">
            <span className="font-medium text-slate-900">{s.shopName}</span>
            {s.response.ok ? (
              <span>
                read {s.response.listings?.length ?? 0} product options, {s.matchedListings} matched a LuxuryX configuration
                {s.ambiguousListings ? `, ${s.ambiguousListings} skipped because more than one configuration was possible` : ''}
                {s.response.notes?.length ? ' · ' + s.response.notes.join(' ') : ''}
              </span>
            ) : (
              <span className="text-rose-700">{s.response.message}</span>
            )}
            <span className="text-xs text-slate-400">({formatDateTime(s.response.checkedAt)})</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
