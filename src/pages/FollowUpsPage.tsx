import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getDaysOverdue } from '@/lib/utils'
import { Plus, Bell, CheckCircle, X, Send, Loader2, CheckSquare, Square } from 'lucide-react'
import type { FollowUp, Profile } from '@/types'

type ProjectOption = { id: string; name: string }

const TYPES = ['maintenance', 'next-phase', 'payment', 'review', 'other'] as const
type TypeFilter = 'all' | typeof TYPES[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// due (reminder) defaults to 30 days before expiry
function thirtyBefore(expiry: string): string {
  const d = new Date(expiry)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [doneFilter, setDoneFilter] = useState<'pending' | 'done' | 'all'>('pending')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', due_date: '', expiry_date: '',
    client_name: '', client_email: '', assigned_to: '',
    type: 'other' as FollowUp['type'], auto_remind: true,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: fu }, { data: proj }, { data: t }] = await Promise.all([
      supabase.from('follow_ups').select('*, project:projects(title), assigned_user:profiles(full_name)').order('due_date'),
      supabase.from('projects').select('id, title'),
      supabase.from('profiles').select('*').eq('is_active', true),
    ])
    setFollowUps((fu as any) ?? [])
    setProjects((proj as any) ?? [])
    setTeam(t ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.type === 'maintenance' && !form.expiry_date) {
      alert('Expiry date is required for maintenance follow-ups.')
      return
    }
    if (form.client_email && !EMAIL_RE.test(form.client_email.trim().toLowerCase())) {
      alert('Client email looks invalid.')
      return
    }
    setSaving(true)
    await supabase.from('follow_ups').insert({
      project_id: form.project_id || null,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date,
      expiry_date: form.expiry_date || null,
      client_name: form.client_name || null,
      client_email: form.client_email.trim().toLowerCase() || null,
      assigned_to: form.assigned_to || null,
      type: form.type,
      auto_remind: form.auto_remind,
      is_done: false,
    })
    setShowForm(false)
    setForm({
      project_id: '', title: '', description: '', due_date: '', expiry_date: '',
      client_name: '', client_email: '', assigned_to: '', type: 'other', auto_remind: true,
    })
    load()
    setSaving(false)
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    await supabase.from('follow_ups').update({ is_done: !isDone }).eq('id', id)
    load()
  }

  const deleteFollowUp = async (id: string) => {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('follow_ups').delete().eq('id', id)
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
    load()
  }

  const callSendFollowup = async (ids: string[]) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ followup_ids: ids }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Send failed')
    return data as { sent: number; failed: number; emailed_to?: string[]; admin_copy?: string; results?: any[] }
  }

  const sendOne = async (fu: FollowUp) => {
    if (!fu.client_email || !EMAIL_RE.test(fu.client_email)) {
      alert(`No valid client email on "${fu.title}". Edit: add client email first.`)
      return
    }
    if (!confirm(`Send renewal mail to ${fu.client_email}?\n\n${fu.title}`)) return
    setSendingId(fu.id)
    try {
      const data = await callSendFollowup([fu.id])
      setResult(`Sent ${data.sent} mail${data.sent === 1 ? '' : 's'} ✓${data.failed ? `, ${data.failed} failed` : ''} — copy sent to contact@aise360.com`)
      load()
    } catch (e: any) {
      alert(e.message === undefined ? 'Send failed' : `Send failed: ${e.message}`)
    }
    setSendingId(null)
  }

  const sendBulk = async () => {
    const ids = filtered.filter((f) => selected.has(f.id) && !f.is_done).map((f) => f.id)
    if (ids.length === 0) { alert('Select at least one pending follow-up first.'); return }
    const missing = filtered.filter((f) => selected.has(f.id) && !f.client_email)
    if (missing.length > 0 && !confirm(`${missing.length} selected have no client email and will be skipped.\n\nContinue sending to the rest (${ids.length} with email)?`)) return
    else if (missing.length === 0 && !confirm(`Send renewal mails for ${ids.length} follow-ups?\nEach client gets their own mail + contact@aise360.com gets the full record.`)) return
    setSending(true)
    try {
      // only send ones that have a client email; server skips the rest and reports them
      const withMail = filtered.filter((f) => selected.has(f.id) && f.client_email && !f.is_done).map((f) => f.id)
      const data = await callSendFollowup(withMail.length > 0 ? withMail : ids)
      setResult(`Bulk done: ${data.sent} sent${data.failed ? `, ${data.failed} failed` : ''} ✓ — full record mailed to contact@aise360.com`)
      setSelected(new Set())
      load()
    } catch (e: any) {
      alert(`Bulk send failed: ${e.message ?? e}`)
    }
    setSending(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return followUps.filter((fu) => {
      if (doneFilter === 'pending' && fu.is_done) return false
      if (doneFilter === 'done' && !fu.is_done) return false
      if (typeFilter !== 'all' && fu.type !== typeFilter) return false
      if (!q) return true
      return (
        fu.title.toLowerCase().includes(q) ||
        (fu.description ?? '').toLowerCase().includes(q) ||
        (fu.client_email ?? '').toLowerCase().includes(q) ||
        (fu.client_name ?? '').toLowerCase().includes(q)
      )
    })
  }, [followUps, doneFilter, typeFilter, search])

  const allChecked = filtered.length > 0 && filtered.every((f) => selected.has(f.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allChecked) filtered.forEach((f) => next.delete(f.id))
      else filtered.forEach((f) => next.add(f.id))
      return next
    })
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: followUps.filter((f) => !f.is_done).length }
    TYPES.forEach((t) => { c[t] = followUps.filter((f) => !f.is_done && f.type === t).length })
    return c
  }, [followUps])

  const TYPE_COLORS: Record<string, string> = {
    maintenance: 'bg-blue-100 text-blue-700',
    'next-phase': 'bg-purple-100 text-purple-700',
    payment: 'bg-green-100 text-green-700',
    review: 'bg-yellow-100 text-yellow-700',
    other: 'bg-gray-100 text-gray-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Follow-Ups</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Follow-Up
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {(['pending', 'all', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDoneFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${doneFilter === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {followUps.filter(f => !f.is_done).length} pending
        </span>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mr-1">Category:</span>
        <button onClick={() => setTypeFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${typeFilter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          All ({counts.all ?? 0})
        </button>
        {TYPES.map((t) => (
          <button key={t} onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${typeFilter === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {t} ({counts[t] ?? 0})
          </button>
        ))}
        <input className="input !w-auto flex-1 min-w-[160px] !py-1.5 text-xs ml-auto" placeholder="Search title, client, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Bulk bar */}
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900">
          {allChecked ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4 text-gray-400" />}
          {allChecked ? 'Deselect all' : `Select all (${filtered.length})`}
        </button>
        <span className="text-xs text-gray-400">{selected.size} selected</span>
        <button onClick={sendBulk} disabled={sending || selected.size === 0} className="btn-primary text-xs ml-auto flex items-center gap-1.5 disabled:opacity-40">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? 'Sending...' : `Send mail to selected (${selected.size})`}
        </button>
      </div>

      {result && (
        <div className="card p-3 border-green-200 bg-green-50/60 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs font-medium text-gray-800">{result}</p>
          <button onClick={() => setResult(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">New Follow-Up</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Vision Surgical – Mail Renewal (info@vissol.in)" />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expiry Date {form.type === 'maintenance' ? '*' : '(maintenance only)'}</label>
              <input
                type="date" className="input" value={form.expiry_date}
                onChange={e => {
                  const v = e.target.value
                  setForm((f) => ({ ...f, expiry_date: v, due_date: f.due_date || thirtyBefore(v) }))
                }}
                required={form.type === 'maintenance'}
              />
            </div>
            <div>
              <label className="label">Reminder Date (auto 30 days before expiry) *</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div className="flex items-end pb-2">
              <button
                type="button"
                onClick={() => form.expiry_date && setForm({ ...form, due_date: thirtyBefore(form.expiry_date) })}
                className="text-[11px] text-brand-600 hover:underline font-medium"
              >
                ↺ Reset reminder to expiry − 30 days
              </button>
            </div>
            <div>
              <label className="label">Client Name</label>
              <input className="input" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="e.g. Shailesh Tiwari" />
            </div>
            <div>
              <label className="label">Client Email (gets the renewal mail)</label>
              <input type="email" className="input" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} placeholder="client@company.com" />
            </div>
            <div>
              <label className="label">Project</label>
              <select className="input" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name || (p as any).title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Anyone</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes (expiry stays in its own field — notes are just extra info)</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Standard Business Email, 2 mailboxes" />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.auto_remind} onChange={e => setForm({ ...form, auto_remind: e.target.checked })} className="accent-brand-600" />
              Auto-send 30-day reminder mail to client (daily cron)
            </label>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(fu => {
          const overdue = !fu.is_done ? getDaysOverdue(fu.due_date) : 0
          const checked = selected.has(fu.id)
          const busy = sendingId === fu.id
          return (
            <div key={fu.id} className={`card p-4 flex items-start gap-3 ${fu.is_done ? 'opacity-60' : ''} ${checked ? '!border-brand-400' : ''}`}>
              <button onClick={() => toggleOne(fu.id)} className="shrink-0 mt-1 text-gray-400 hover:text-brand-600" title="Select for bulk mail">
                {checked ? <CheckSquare className="w-5 h-5 text-brand-600" /> : <Square className="w-5 h-5" />}
              </button>
              <button
                onClick={() => toggleDone(fu.id, fu.is_done)}
                className={`shrink-0 mt-1 ${fu.is_done ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}`}
                title="Mark done"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${fu.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{fu.title}</p>
                  <span className={`badge ${TYPE_COLORS[fu.type]}`}>{fu.type}</span>
                  {fu.expiry_date && <span className="badge bg-orange-100 text-orange-800">Expires {formatDate(fu.expiry_date)}</span>}
                  {overdue > 0 && <span className="badge bg-red-100 text-red-700">{overdue}d overdue</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                  <span>⏰ Reminder {formatDate(fu.due_date)}</span>
                  {(fu as any).project && <span>📁 {(fu as any).project.name || (fu as any).project.title}</span>}
                  {(fu as any).assigned_user && <span>👤 {(fu as any).assigned_user.full_name}</span>}
                </div>
                {(fu.client_email || fu.client_name) && (
                  <p className="text-xs text-gray-600 mt-1 truncate" title={fu.client_email ?? ''}>
                    ✉️ {fu.client_name ? `${fu.client_name} · ` : ''}{fu.client_email ?? 'no email'}
                    {fu.remind_count ? <span className="text-gray-400"> · sent {fu.remind_count}×{fu.last_reminded_at ? ` · last ${formatDate(fu.last_reminded_at)}` : ''}</span> : null}
                  </p>
                )}
                {fu.description && <p className="text-xs text-gray-500 mt-1">📝 {fu.description}</p>}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => sendOne(fu)} disabled={busy || fu.is_done}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-semibold"
                  title={fu.client_email ? `Send renewal mail to ${fu.client_email}` : 'Add client email first'}
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {busy ? 'Sending' : 'Send Mail'}
                </button>
                <button onClick={() => deleteFollowUp(fu.id)} className="text-[11px] text-red-400 hover:text-red-600">Delete ✕</button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No follow-ups {doneFilter === 'pending' ? 'pending' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
