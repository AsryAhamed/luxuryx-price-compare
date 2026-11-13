import { Laptop, Loader2, Play, Smartphone, TabletSmartphone } from 'lucide-react'
import { useRef, useState } from 'react'
import { ProgressPanel } from './components/ProgressPanel'
import { Results } from './components/Results'
import { Banner, timeOf } from './components/ui'
import { ComparisonError, runComparison, WEBHOOK_URL, type ComparisonResult, type Progress } from './lib/api'
import { COMPETITORS } from './lib/shops'
import { CATEGORY_LABEL, type Category } from './lib/types'

const CATEGORIES: { id: Category; icon: React.ReactNode; blurb: string }[] = [
  { id: 'iphone', icon: <Smartphone className="size-5" />, blurb: 'Model + storage' },
  { id: 'samsung', icon: <TabletSmartphone className="size-5" />, blurb: 'Model + RAM + storage' },
  { id: 'macbook', icon: <Laptop className="size-5" />, blurb: 'Model + chip + RAM + storage' },
]

type Message = { tone: 'error' | 'success'; title: string; text?: string } | null

export default function App() {
  // Everything lives in memory only. Nothing is stored; refreshing the page clears it.
  const [results, setResults] = useState<Partial<Record<Category, ComparisonResult>>>({})
  const [shown, setShown] = useState<Category | null>(null)
  const [running, setRunning] = useState<Category | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function compare(category: Category) {
    if (running) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRunning(category)
    setShown(category)
    setMessage(null)
    setProgress(null)
    try {
      const result = await runComparison(category, setProgress, ctrl.signal)
      setResults((r) => ({ ...r, [category]: result }))
      const matched = new Set(result.rows.filter((r) => r.matchStatus === 'Matched').map((r) => r.configKey)).size
      const issues = result.summaries.filter((s) => !s.response.ok && s.response.status !== 'not_comparable').map((s) => s.shopName)
      setMessage({
        tone: 'success',
        title: `${CATEGORY_LABEL[category]} comparison complete`,
        text:
          `${result.configs.length} LuxuryX configurations checked against ${COMPETITORS[category].length} competitors; ${matched} found at one or more competitors.` +
          (issues.length ? ` Could not read: ${issues.join(', ')}.` : ''),
      })
    } catch (e) {
      if (ctrl.signal.aborted) {
        setMessage({ tone: 'error', title: 'Comparison stopped', text: 'You stopped the comparison. Previous results, if any, are unchanged.' })
      } else {
        setMessage({
          tone: 'error',
          title: `${CATEGORY_LABEL[category]} comparison failed`,
          text: e instanceof ComparisonError ? e.message : 'Unexpected error: ' + (e instanceof Error ? e.message : String(e)),
        })
      }
    } finally {
      setRunning(null)
      setProgress(null)
      abortRef.current = null
    }
  }

  const current = shown ? results[shown] : undefined

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold tracking-tight text-white">LX</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Luxury X Price Comparison</h1>
            <p className="text-xs text-slate-500">Compare LuxuryX prices with competitors in one click, then download the CSV.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6">
        {!WEBHOOK_URL && (
          <Banner tone="error" title="Setup needed">
            The n8n webhook address is missing. Copy <code>.env.example</code> to <code>.env</code>, set <code>VITE_N8N_WEBHOOK_URL</code>, then rebuild.
          </Banner>
        )}

        <section aria-label="Categories" className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {CATEGORIES.map((c) => {
            const r = results[c.id]
            const isRunning = running === c.id
            return (
              <div
                key={c.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition ${shown === c.id ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">{c.icon}</div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{CATEGORY_LABEL[c.id]}</h2>
                    <p className="text-xs text-slate-500">
                      {COMPETITORS[c.id].length} competitors · matches on {c.blurb.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => compare(c.id)}
                    disabled={!!running || !WEBHOOK_URL}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold tracking-wide text-white hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    {isRunning ? 'COMPARING…' : 'COMPARE'}
                  </button>
                  {r && !isRunning && (
                    <button onClick={() => setShown(c.id)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium hover:bg-slate-50">
                      View
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">{r ? `Last compared ${timeOf(r.finishedAt)}` : 'Not compared yet'}</p>
              </div>
            )
          })}
        </section>

        {message && (
          <Banner tone={message.tone} title={message.title} onClose={() => setMessage(null)}>
            {message.text}
          </Banner>
        )}

        {running && progress && (
          <div className="flex flex-col gap-2">
            <ProgressPanel category={running} progress={progress} />
            <button onClick={() => abortRef.current?.abort()} className="self-start text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800">
              Stop
            </button>
          </div>
        )}
        {running && !progress && (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="size-4 animate-spin" /> Starting…
          </p>
        )}

        {current && running !== shown && <Results key={current.finishedAt} result={current} />}

        {!current && !running && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Choose a category and press <strong>COMPARE</strong>. Results appear here and can be downloaded as a CSV file.
          </p>
        )}
      </main>
    </div>
  )
}
