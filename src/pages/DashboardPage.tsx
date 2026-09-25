import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import {
  FolderKanban, Clock, TrendingUp, AlertCircle, Activity, ChevronDown, ChevronRight, X,
} from 'lucide-react'
import type { Project, DailyLog, Profile, Task } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Gauge from '../components/landing/Gauge'
import '../styles/fonts.css'

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4'
const POSTER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60'

const compactINR = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1,
  }).format(v || 0)

const DEFAULT_TARGETS = { month: '150000', year: '1200000' }

function loadTargets() {
  try {
    const raw = localStorage.getItem('aise-targets')
    if (raw) {
      const p = JSON.parse(raw)
      return { month: String(p.month ?? DEFAULT_TARGETS.month), year: String(p.year ?? DEFAULT_TARGETS.year) }
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_TARGETS }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [todayLogs, setTodayLogs] = useState<(DailyLog & { founder: Profile })[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [founders, setFounders] = useState<Profile[]>([])
  const [financials, setFinancials] = useState<{
    revenue: number
    pending: number
    netProfit: number
    charged: number
  } | null>(null)
  const [ideasCount, setIdeasCount] = useState<number>(0)
  const [targets, setTargets] = useState(loadTargets)
  const [draftTargets, setDraftTargets] = useState(loadTargets)
  const [savedTick, setSavedTick] = useState(false)
  const [collectView, setCollectView] = useState<'Collected' | 'Charged'>('Collected')
  const [pendingView, setPendingView] = useState<'Pending' | 'Profit'>('Pending')
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const [
        { data: proj },
        { data: logs },
        { data: tasks },
        { data: team },
        { data: fe },
        { data: ce },
        { count: ideasTotal },
      ] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('daily_logs').select('*, founder:profiles(*)').eq('date', today),
        supabase.from('tasks').select('*').in('status', ['todo', 'in-progress']).order('due_date'),
        supabase.from('profiles').select('*').eq('is_active', true),
        supabase.from('financial_entries').select('*'),
        supabase.from('company_expenses').select('*'),
        supabase.from('ideas').select('*', { count: 'exact', head: true }),
      ])
      setProjects(proj ?? [])
      setTodayLogs((logs as any) ?? [])
      setPendingTasks(tasks ?? [])
      setFounders(team ?? [])
      setIdeasCount(ideasTotal ?? 0)

      if (fe && fe.length > 0) {
        const charged = fe.reduce((s, e) => s + Number(e.charged_amount), 0)
        const advance = fe.reduce((s, e) => s + Number(e.advance_amount), 0)
        const serviceExp = fe.reduce((s, e) => s + Number(e.expense_amount), 0)
        const compExp = (ce ?? []).reduce((s, c) => s + Number(c.amount), 0)
        const pending = Math.max(0, charged - advance)
        const profit = charged - serviceExp - compExp
        setFinancials({ revenue: advance, pending, netProfit: profit, charged })
      }

      setLoading(false)
    }
    load()
  }, [today])

  const activeProjects = projects.filter(p => p.status === 'active').length
  const totalRevenue = financials?.revenue ?? projects.reduce((s, p) => s + (p.upfront_received ?? 0), 0)
  const totalCharged = financials?.charged ?? projects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const pendingAmount = financials?.pending ?? 0
  const netProfit = financials?.netProfit ?? 0

  const monthTarget = parseFloat(targets.month) || 0
  const collectBasis = monthTarget > 0 ? monthTarget : totalCharged
  const collectPct = collectBasis > 0 ? Math.min(100, Math.round((totalRevenue / collectBasis) * 100)) : 0
  const pendingPct = totalCharged > 0 ? Math.min(100, Math.round((pendingAmount / totalCharged) * 100)) : 0

  const saveTargets = () => {
    setTargets(draftTargets)
    try { localStorage.setItem('aise-targets', JSON.stringify(draftTargets)) } catch { /* ignore */ }
    setSavedTick(true)
    setTimeout(() => setSavedTick(false), 2000)
  }

  const revenueData = projects
    .filter(p => p.status === 'completed')
    .slice(0, 6)
    .map(p => ({ name: (p.name ?? (p as any).title ?? '').slice(0, 10), budget: p.budget, received: p.upfront_received }))

  const loggedFounderIds = new Set(todayLogs.map(l => l.founder_id))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Video hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#d9d9d9]">
        <video
          ref={(v) => {
            if (v) {
              v.muted = true
              ;(v as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true
              v.play().catch(() => {})
            }
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          src={BG_VIDEO}
          poster={POSTER}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          {...({ 'webkit-playsinline': 'true', 'x5-playsinline': 'true' } as Record<string, string>)}
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex flex-col items-center px-4 pb-10 pt-10 text-center sm:pb-12 sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#ef4d23]" />
            AISE360 Operations
          </span>
          <h1
            className="mt-5 max-w-4xl text-white"
            style={{ fontSize: 'clamp(34px, 7vw, 64px)', lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Shaping{' '}
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>
              Agencies
            </span>
            <br />
            of tomorrow
          </h1>
          <p
            className="mt-4 px-2 text-white/85"
            style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}
          >
            {formatDate(today)} — Here&apos;s what&apos;s happening
          </p>
          <Link
            to="/financial-performance"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#0b0f1a] py-2 pl-6 pr-2 text-[14px] font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 sm:pl-7 sm:py-2.5"
          >
            View Performance
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 sm:h-7 sm:w-7">
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* ── Live gauge tray ── */}
      <div className="rounded-3xl bg-[#f5f2ee] p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {/* Collections */}
          <div className="rounded-2xl bg-white p-5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-[#ef4d23]">Collections</span>
              <span className="text-neutral-500">This Month</span>
            </div>
            <p className="mt-2 text-[28px] font-semibold leading-none text-neutral-900">
              {formatCurrency(collectView === 'Collected' ? totalRevenue : totalCharged)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <Clock className="h-3 w-3" />
                {formatCurrency(pendingAmount)} pending
              </span>
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">Uncollected receivables</p>
            <p className="mt-4 text-center text-xs font-medium text-neutral-700">Collection target achieved</p>
            <div className="mt-1">
              <Gauge value={collectPct} color="#ef4d23" showLabels min="₹0" max={compactINR(collectBasis)} />
            </div>
            <div className="mt-3 flex rounded-full bg-neutral-100 p-1">
              {(['Collected', 'Charged'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCollectView(v)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${collectView === v ? 'bg-white text-neutral-900 shadow' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div className="rounded-2xl bg-white p-5">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-700">Show figures for</label>
                <div className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800">
                  This month
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-700">Compare period by</label>
                <div className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800">
                  Month-to-date (MTD)
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-700">Collection target (This month)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">#</span>
                  <input
                    type="number" min="0"
                    value={draftTargets.month}
                    onChange={e => setDraftTargets({ ...draftTargets, month: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-3 text-sm text-neutral-900 focus:border-[#ef4d23] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-700">Profit target (This year)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">#</span>
                  <input
                    type="number" min="0"
                    value={draftTargets.year}
                    onChange={e => setDraftTargets({ ...draftTargets, year: e.target.value })}
                    className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-3 text-sm text-neutral-900 focus:border-[#ef4d23] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-1 flex items-center">
                <button
                  type="button"
                  onClick={saveTargets}
                  className="rounded-lg bg-[#ef4d23] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                >
                  {savedTick ? 'Saved ✓' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setDraftTargets(targets)}
                  className="ml-3 text-sm text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  aria-label="Reset targets"
                  onClick={() => { setDraftTargets({ ...DEFAULT_TARGETS }); setTargets({ ...DEFAULT_TARGETS }); try { localStorage.removeItem('aise-targets') } catch { /* ignore */ } }}
                  className="ml-auto rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="rounded-2xl bg-white p-5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-[#ef4d23]">Pending</span>
              <span className="text-neutral-500">today</span>
            </div>
            <p className="mt-2 text-[28px] font-semibold leading-none text-neutral-900">
              {formatCurrency(pendingView === 'Pending' ? pendingAmount : Math.max(0, netProfit))}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${netProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(netProfit)}
              </span>
              <span className="text-xs text-gray-500">net profit</span>
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">Across all services</p>
            <div className="mt-6">
              <Gauge value={pendingPct} color="#9ca3af" showLabels min="₹0" max={compactINR(totalCharged)} />
            </div>
            <div className="mt-3 flex rounded-full bg-neutral-100 p-1">
              {(['Pending', 'Profit'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPendingView(v)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${pendingView === v ? 'bg-white text-neutral-900 shadow' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Ideas Vault Card */}
      <div className="card p-4 bg-gradient-to-r from-amber-50/60 via-white to-slate-50 border border-amber-200/50 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
            💡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900">Ideas</h3>
              <span className="text-[10px] font-semibold bg-amber-100/80 text-amber-800 px-2 py-0.5 rounded-full">
                {ideasCount} {ideasCount === 1 ? 'idea' : 'ideas'} captured
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Capture SaaS, startup & business ideas before they get forgotten.
            </p>
          </div>
        </div>
        <Link
          to="/ideas"
          className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1 hover:underline shrink-0 ml-4"
        >
          View Ideas →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Activity Today */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Team Today</h2>
          </div>
          <div className="space-y-3">
            {founders.map(founder => {
              const isLogged = loggedFounderIds.has(founder.id)
              const log = todayLogs.find(l => l.founder_id === founder.id)
              return (
                <div key={founder.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLogged ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {founder.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{founder.full_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${isLogged ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isLogged ? 'Active' : 'No log'}
                      </span>
                    </div>
                    {log && <p className="text-xs text-gray-500 truncate mt-0.5">{log.description}</p>}
                  </div>
                </div>
              )
            })}
            {founders.length === 0 && <p className="text-sm text-gray-400">No team members yet</p>}
          </div>
          <Link to="/daily-log" className="mt-4 block text-center text-sm text-brand-600 hover:underline">
            + Add today&apos;s log
          </Link>
        </div>

        {/* Active Projects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Active Projects</h2>
              <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{activeProjects}</span>
            </div>
            <Link to="/projects" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {projects.filter(p => p.status === 'active').slice(0, 5).map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{project.name ?? (project as any).title}</p>
                    <p className="text-xs text-gray-500">
                      {project.deadline ? `Due ${formatDate(project.deadline)}` : 'No deadline'}
                    </p>
                  </div>
                  <span className={`badge ml-2 ${getStatusColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>
              </Link>
            ))}
            {projects.filter(p => p.status === 'active').length === 0 && (
              <p className="text-sm text-gray-400">No active projects</p>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <h2 className="font-semibold text-gray-900">Pending Tasks</h2>
            </div>
            <Link to="/tasks" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 6).map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <p className="text-sm text-gray-800 truncate flex-1">{task.title}</p>
                <span className={`badge ml-2 ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
            ))}
            {pendingTasks.length === 0 && <p className="text-sm text-gray-400">All caught up! 🎉</p>}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Completed Projects — Budget vs Received</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="budget" fill="#e0e9ff" radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="received" fill="#6366f1" radius={[4, 4, 0, 0]} name="Received" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
