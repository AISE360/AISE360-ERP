import { useState } from 'react'
import { ChevronDown, TrendingDown, TrendingUp, X } from 'lucide-react'
import Gauge from './Gauge'

function TogglePill({ options, active, onChange }: { options: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-full bg-neutral-100 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            active === opt ? 'bg-white text-neutral-900 shadow' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-5">{children}</div>
}

export default function DashboardPreview() {
  const [clicksTab, setClicksTab] = useState('Impressions')
  const [videoTab, setVideoTab] = useState('Video Clicks')

  return (
    <div className="mx-auto w-full max-w-[880px] rounded-3xl bg-[#f5f2ee] p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {/* Card 1 — Clicks */}
        <CardShell>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-[#ef4d23]">Clicks</span>
            <span className="text-neutral-500">This Month</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-neutral-900">6,896</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
              <TrendingDown className="h-3 w-3" />
              -3,382 (33%)
            </span>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Compared to yesterday</p>
          <p className="mt-4 text-center text-xs font-medium text-neutral-700">Month Target achieved</p>
          <div className="mt-1">
            <Gauge value={92} color="#ef4d23" showLabels min="389K" max="425K" />
          </div>
          <div className="mt-3">
            <TogglePill options={['Impressions', 'Clicks']} active={clicksTab} onChange={setClicksTab} />
          </div>
        </CardShell>

        {/* Card 2 — Form */}
        <CardShell>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-700">Show figures for</label>
              <button type="button" className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 transition-colors hover:border-neutral-300">
                This month
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-700">Compare period by</label>
              <button type="button" className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 transition-colors hover:border-neutral-300">
                Month-to-date (MTD)
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-700">Ste targets (This month)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">#</span>
                <input type="number" defaultValue={10} className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-3 text-sm text-neutral-900 focus:border-[#ef4d23] focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-700">Ste targets (This year)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">#</span>
                <input type="number" defaultValue={100} className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-3 text-sm text-neutral-900 focus:border-[#ef4d23] focus:outline-none" />
              </div>
            </div>
            <div className="mt-1 flex items-center">
              <button type="button" className="rounded-lg bg-[#ef4d23] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
                Save
              </button>
              <button type="button" className="ml-3 text-sm text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900">
                Cancel
              </button>
              <button type="button" aria-label="Close" className="ml-auto rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardShell>

        {/* Card 3 — Video Starts */}
        <CardShell>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-[#ef4d23]">Video Starts</span>
            <span className="text-neutral-500">today</span>
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-neutral-900">0</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
              <TrendingUp className="h-3 w-3" />
            </span>
            <span className="text-xs font-semibold text-neutral-700">0</span>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Compared to yesterday</p>
          <div className="mt-6">
            <Gauge value={68} color="#9ca3af" />
          </div>
          <div className="mt-3">
            <TogglePill options={['Video Clicks', 'Video Starts']} active={videoTab} onChange={setVideoTab} />
          </div>
        </CardShell>
      </div>
    </div>
  )
}
