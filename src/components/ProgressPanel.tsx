import { AlertTriangle, Ban, Check, Loader2 } from 'lucide-react'
import type { Progress, ShopState } from '../lib/api'
import { CATEGORY_LABEL, type Category } from '../lib/types'

const ICON: Record<ShopState, React.ReactNode> = {
  waiting: <span className="size-2 rounded-full bg-slate-300" />,
  checking: <Loader2 className="size-3.5 animate-spin text-slate-700" />,
  done: <Check className="size-3.5 text-emerald-600" />,
  blocked: <AlertTriangle className="size-3.5 text-rose-600" />,
  failed: <AlertTriangle className="size-3.5 text-rose-600" />,
  not_comparable: <Ban className="size-3.5 text-violet-600" />,
}

const LABEL: Record<ShopState, string> = {
  waiting: 'Waiting',
  checking: 'Checking…',
  done: 'Done',
  blocked: 'Website inaccessible',
  failed: 'Could not read',
  not_comparable: 'Not comparable',
}

export function ProgressPanel({ category, progress }: { category: Category; progress: Progress }) {
  const total = progress.shops.length + 1
  const done = (progress.phase === 'luxuryx' ? 0 : 1) + progress.shopsDone
  const pct = Math.round((done / total) * 100)
  const phaseText =
    progress.phase === 'luxuryx'
      ? 'Reading LuxuryX products…'
      : progress.phase === 'competitors'
        ? `Checking competitors: ${progress.shopsDone} of ${progress.shops.length} done`
        : 'Matching products…'

  return (
    <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Loader2 className="size-4 animate-spin" /> Comparing {CATEGORY_LABEL[category]} prices
        </h2>
        <p className="text-sm tabular-nums text-slate-500">{pct}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-slate-900 transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-700">{phaseText}</p>
      {progress.configs > 0 && (
        <p className="text-sm text-slate-500">
          {progress.luxuryxProducts} LuxuryX products · {progress.configs} configurations to compare
        </p>
      )}
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {progress.shops.map((s) => (
          <li key={s.shop.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <span className="flex size-4 items-center justify-center">{ICON[s.state]}</span>
            <span className="font-medium">{s.shop.name}</span>
            <span className="ml-auto text-xs text-slate-500">{LABEL[s.state]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
