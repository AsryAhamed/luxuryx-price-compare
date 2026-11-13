import { AlertTriangle, Ban, CheckCircle2, CircleDashed, HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MatchStatus } from '../lib/types'

export function lkr(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const hasCents = Math.round(n) !== n
  return 'Rs. ' + n.toLocaleString('en-US', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })
}

export function signedLkr(n: number | null): string {
  if (n === null) return '—'
  if (n === 0) return 'Same price'
  return (n > 0 ? '+' : '−') + lkr(Math.abs(n))
}

export function timeOf(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const STATUS_STYLE: Record<MatchStatus, { cls: string; icon: ReactNode }> = {
  Matched: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: <CheckCircle2 className="size-3.5" /> },
  'Not Found': { cls: 'bg-slate-100 text-slate-600 ring-slate-200', icon: <CircleDashed className="size-3.5" /> },
  'Price Unavailable': { cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: <HelpCircle className="size-3.5" /> },
  'Website Inaccessible': { cls: 'bg-rose-50 text-rose-700 ring-rose-200', icon: <AlertTriangle className="size-3.5" /> },
  'Not Comparable': { cls: 'bg-violet-50 text-violet-700 ring-violet-200', icon: <Ban className="size-3.5" /> },
}

export function StatusBadge({ status }: { status: MatchStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      {s.icon}
      {status}
    </span>
  )
}

export function Banner({ tone, title, children, onClose }: { tone: 'error' | 'success' | 'info'; title: string; children?: ReactNode; onClose?: () => void }) {
  const cls =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-sky-200 bg-sky-50 text-sky-900'
  const Icon = tone === 'error' ? AlertTriangle : tone === 'success' ? CheckCircle2 : HelpCircle
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="self-start rounded px-1 text-xs opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  )
}
