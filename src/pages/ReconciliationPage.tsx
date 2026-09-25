import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Landmark, Search, CheckCircle2, AlertTriangle, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react'

interface BankTxn {
  id: string
  sno: number
  txn_date: string
  particulars: string
  amount: number
  dr_cr: 'DR' | 'CR'
  balance: number
  category: string
  linked_client?: string | null
  sheet_ref?: string | null
  notes?: string | null
}

const CATEGORY_STYLE: Record<string, string> = {
  capital: 'bg-indigo-100 text-indigo-700',
  bank_fee: 'bg-slate-200 text-slate-700',
  client_advance: 'bg-green-100 text-green-700',
  service_expense: 'bg-rose-100 text-rose-700',
  company_expense: 'bg-purple-100 text-purple-700',
  owner_transfer: 'bg-cyan-100 text-cyan-700',
  personal: 'bg-gray-100 text-gray-500',
  unclassified: 'bg-amber-100 text-amber-800',
}

const CATEGORY_LABEL: Record<string, string> = {
  capital: 'Capital',
  bank_fee: 'Bank Fee',
  client_advance: 'Client Income',
  service_expense: 'Service Cost',
  company_expense: 'Company Cost',
  owner_transfer: 'Owner Transfer',
  personal: 'Pass-through',
  unclassified: 'Needs Review',
}

const STATEMENT_CLOSING = 40571.76

export default function ReconciliationPage() {
  const [txns, setTxns] = useState<BankTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [onlyGaps, setOnlyGaps] = useState(false)

  useEffect(() => {
    supabase.from('bank_transactions').select('*').order('sno').then(({ data, error }) => {
      if (error) setTableMissing(true)
      else setTxns((data as any) ?? [])
      setLoading(false)
    })
  }, [])

  const totals = useMemo(() => {
    const cr = txns.filter((t) => t.dr_cr === 'CR').reduce((s, t) => s + Number(t.amount), 0)
    const dr = txns.filter((t) => t.dr_cr === 'DR').reduce((s, t) => s + Number(t.amount), 0)
    const closing = txns.length ? Number(txns[txns.length - 1].balance) : 0
    const gaps = txns.filter((t) => t.category === 'unclassified')
    const matched = txns.length - gaps.length
    return { cr, dr, closing, gaps, matched }
  }, [txns])

  const cats = useMemo(() => {
    const m = new Map<string, number>()
    txns.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1))
    return Array.from(m.entries())
  }, [txns])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return txns.filter((t) => {
      if (onlyGaps && t.category !== 'unclassified') return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (!q) return true
      return (
        t.particulars.toLowerCase().includes(q) ||
        (t.linked_client ?? '').toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q) ||
        String(t.sno) === q
      )
    })
  }, [txns, search, catFilter, onlyGaps])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  if (tableMissing) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Landmark className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <h1 className="text-xl font-bold text-gray-900">Bank Statement not loaded</h1>
        <p className="text-sm text-gray-500 mt-2">Run <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">supabase-bank-statement.sql</code> once in your Supabase SQL editor to load all 53 Axis transactions with sheet mapping.</p>
      </div>
    )
  }

  const verified = Math.abs(totals.closing - STATEMENT_CLOSING) < 0.01

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bank Reconciliation</h1>
          <p className="text-xs text-gray-500">Axis A/c 925020049305366 · 01/01/2026 – 25/09/2026 · every line mapped to the books</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide flex items-center gap-1"><ArrowDownLeft className="w-3 h-3 text-green-600" /> Total Credits</p>
          <p className="text-lg font-bold text-green-600 font-mono">{formatCurrency(totals.cr)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-rose-600" /> Total Debits</p>
          <p className="text-lg font-bold text-rose-600 font-mono">{formatCurrency(totals.dr)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Closing Balance</p>
          <p className="text-lg font-bold text-gray-900 font-mono">{formatCurrency(totals.closing)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Mapped</p>
          <p className="text-lg font-bold text-brand-700">{totals.matched}/{txns.length}</p>
        </div>
        <div className={`card p-4 ${verified ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Statement Check</p>
          <p className={`text-sm font-bold flex items-center gap-1.5 mt-1 ${verified ? 'text-green-700' : 'text-red-600'}`}>
            {verified ? <><CheckCircle2 className="w-4 h-4" /> Verified ✓</> : <><AlertTriangle className="w-4 h-4" /> Mismatch</>}
          </p>
        </div>
      </div>

      {/* Gaps callout */}
      {totals.gaps.length > 0 && (
        <div className="card p-4 border-amber-200 bg-amber-50/60">
          <button onClick={() => setOnlyGaps(!onlyGaps)} className="flex items-center gap-2 w-full text-left">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-gray-900">
              {totals.gaps.length} transactions need your confirmation
              <span className="ml-2 text-xs font-normal text-amber-700">{onlyGaps ? '(showing only gaps — click to show all)' : '(click to filter)'}</span>
            </p>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9 text-xs" placeholder="Search particulars, client, no..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setCatFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${catFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
          All ({txns.length})
        </button>
        {cats.map(([c, n]) => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? 'all' : c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${catFilter === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {CATEGORY_LABEL[c] ?? c} ({n})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-center w-12">#</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Particulars</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Maps To</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-brand-50/50 even:bg-gray-50/60">
                  <td className="px-3 py-2.5 text-center text-gray-400 font-mono">{t.sno}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{formatDate(t.txn_date)}</td>
                  <td className="px-3 py-2.5 min-w-[220px]">
                    <p className="font-medium text-gray-800 leading-snug">{t.particulars}</p>
                    {t.notes && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">📝 {t.notes}</p>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`badge text-[11px] ${CATEGORY_STYLE[t.category] ?? 'bg-gray-100 text-gray-600'}`}>{CATEGORY_LABEL[t.category] ?? t.category}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">
                    {t.linked_client && <span className="font-medium text-gray-800">{t.linked_client} </span>}
                    {t.sheet_ref
                      ? <Link to="/financial-performance" className="text-brand-600 hover:underline font-mono text-[11px]">{t.sheet_ref}</Link>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap ${t.dr_cr === 'CR' ? 'text-green-600' : 'text-rose-600'}`}>
                    {t.dr_cr === 'CR' ? '+' : '−'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-500 whitespace-nowrap">{formatCurrency(t.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No transactions match</p>}
      </div>
    </div>
  )
}
